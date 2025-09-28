import { assetManager, Enum, VideoClip } from "cc";
import { BundleName } from "../../resources/scripts/Core/Manager/Load/BundleName";
import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";
import { SocketManager } from "../../resources/scripts/Core/Manager/Net/SocketManager";
import { SocketData } from "../../resources/scripts/Core/Manager/Net/SocketData";
import { EventManager } from "../../resources/scripts/Core/Manager/Event/EventManager";
import { IFingerActivity, IFingerActivityResult, IFingerActivityScore } from "./FingerGameProtocol";
import { PersonalCenterManager } from "../../resources/scripts/Game/PersonalCenterManager/PersonalCenterManager";
import { GameType } from "../../resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { SceneManager } from "../../resources/scripts/Core/Manager/Scene/SceneManager";

export enum FingerGameType {
    //体验模式
    EXPERIENCE_MODE = "FingerGameType.experienceMode",
    //正式模式
    OFFICIAL_MODE = "FingerGameType.officialMode"
}

export enum FingerGameModelEvent {
    GET_LIST_FINISHED = "FingerGameModelEvent.getlistFinished",
    GET_ALL_TASK_ACTIVITIES_RESULT = "FingerGameModelEvent.getAllTaskActivitiesResult",
    SELECT_EXPERIENCE_SECTION = "FingerGameModelEvent.selectExperienceSection",
    SKEWERSGAME_NEXT = "FingerGameModelEvent.skewersGameNext"
}
export class FingerGameModel {
    private _videoClipCache: Map<string, VideoClip> = new Map();
    private _currentTaskId: number = 0;
    private _activities: IFingerActivity[] = [];
    private _currentSectionIndex: number = 0;

    private static START_TASK: string = "finger_exercise.start_task";//返回每一节的id
    private static START_TASK_ACTIVITY: string = "finger_exercise.start_task_activity";
    private static COMPLETE_TASK_ACTIVITY: string = "finger_exercise.complete_task_activity";
    private static GET_TASK_ACTIVITIES: string = "finger_exercise.get_task_activities";   
    private _eventHandlers: Map<string, Function[]> = new Map();

    public _ismember: boolean = false;   

    private _isExperienceMode: boolean = false;
    
    public on(eventName: FingerGameModelEvent, callback: Function, target?: any) {
        if (!this._eventHandlers.has(eventName)) {
            this._eventHandlers.set(eventName, []);
        }
        const handlers = this._eventHandlers.get(eventName);
        const handler = target ? callback.bind(target) : callback;
        handlers.push(handler);
    }

    public off(eventName: FingerGameModelEvent, callback: Function, target?: any) {
        if (!this._eventHandlers.has(eventName)) {
            return;
        }
        const handlers = this._eventHandlers.get(eventName);
        const targetCallback = target ? callback.bind(target) : callback;
        const index = handlers.indexOf(targetCallback);
        if (index !== -1) {
            handlers.splice(index, 1);
        }
    }

    public emit(eventName: string, data?: any) {
        if (!this._eventHandlers.has(eventName)) {
            return;
        }
        const handlers = this._eventHandlers.get(eventName);
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (err) {
                DebugLog.instance.error(`事件处理错误: ${eventName}`, err);
            }
        });
    }

    /**
     * 清除所有事件监听
     */
    public clearAllEvents() {
        this._eventHandlers.clear();
    }

    public init() {
        EventManager.getInstance().on(FingerGameModel.START_TASK, this.onGetListFinished, this);
        EventManager.getInstance().on(FingerGameModel.START_TASK_ACTIVITY, this.onStartTaskActivity, this);
        EventManager.getInstance().on(FingerGameModel.COMPLETE_TASK_ACTIVITY, this.onCompleteTaskActivity, this);
        EventManager.getInstance().on(FingerGameModel.GET_TASK_ACTIVITIES, this.onGetAllTaskActivitiesResult, this);

        this._isExperienceMode = SceneManager.getInstance().getRestoreData().gametype === GameType.GAME_CENTER;
    }

    public dispose() {
        EventManager.getInstance().off(FingerGameModel.START_TASK, this);
        EventManager.getInstance().off(FingerGameModel.START_TASK_ACTIVITY, this);
        EventManager.getInstance().off(FingerGameModel.COMPLETE_TASK_ACTIVITY, this);
        EventManager.getInstance().off(FingerGameModel.GET_TASK_ACTIVITIES, this);
        this._videoClipCache.clear();

        this.clearAllEvents();
    }

    public isMember(): boolean {
        let userInfoData = PersonalCenterManager.getInstance().userInfoData;
        return userInfoData.is_member;
    }

    public is_evaluable(index: number): boolean {
        return this._activities[index].is_evaluable;
    }

    public getTaskId(): number {
        return this._currentTaskId;
    }

    public get activities(): IFingerActivity[] {
        return this._activities;
    }

    public get activity(): IFingerActivity {
        return this._activities[this._currentSectionIndex];
    }

    public getNextActivity(): IFingerActivity {
        return this._activities[this._currentSectionIndex + 1];
    }

    public get currentSectionIndex(): number {
        return this._currentSectionIndex;
    }

    public get isLastSection(): boolean {
        return this._currentSectionIndex === this._activities.length - 1;
    }

    public addSectionIndex(){
        this._currentSectionIndex++;
    }

    public getVideoClip(path: string): VideoClip | null {
        if (this._videoClipCache.has(path)) {
            return this._videoClipCache.get(path);
        }
        return null;
    }

    public loadVideoClip(path: string): Promise<VideoClip> {
        const bundle = assetManager.getBundle(BundleName.FINGERGAME);
        return new Promise((resolve, reject) => {
            if(this._videoClipCache.has(path)){
                resolve(this._videoClipCache.get(path));
                return;
            }
            
            bundle.load(path, VideoClip, (err, clip) => {
                if (err) {
                    DebugLog.instance.error(`loadVideoClip error:${err},path:${path}`);
                    reject(err);
                } else {
                    this._videoClipCache.set(path, clip);
                    resolve(clip);
                }
            });
        });
    }

    public isExperienceMode(): boolean {
        return this._isExperienceMode;
    }

    public loadVideoClips(paths: string[]): Promise<VideoClip[]> {
        return Promise.all(paths.map(path => this.loadVideoClip(path)));
    }

    //socket request
    //获取手指操节信息
    public getTaskList() {
        let socketData = new SocketData({
            action: FingerGameModel.START_TASK
        });
        SocketManager.getInstance().send(socketData);
    }

    private onGetListFinished(data: any) {
        DebugLog.instance.log('onGetListFinished =============');
        DebugLog.instance.log(data);
        let rdata = data.data;

        if (rdata && typeof rdata.task_id === 'number' && Array.isArray(rdata.activities)) {
            this._currentTaskId = rdata.task_id;
            this._activities = rdata.activities;

            //获取到了手指操节信息
            this.emit(FingerGameModelEvent.GET_LIST_FINISHED, this._activities);
        } else {
            DebugLog.instance.error('onGetListFinished: 数据结构不正确', data);
        }
    }

    public startTaskActivity(){
        let socketData = new SocketData({
            action: FingerGameModel.START_TASK_ACTIVITY,
            data:{
                task_id:this._currentTaskId,
                activity_id:this._activities[this._currentSectionIndex].id
            }
        });

        SocketManager.getInstance().send(socketData);
    }

    private onStartTaskActivity(data: any){
        DebugLog.instance.log('onStartTaskActivity =============');
        DebugLog.instance.log(data.data);
    }

    public completeTaskActivity(data:IFingerActivityScore){
        let socketData = new SocketData({
            action: FingerGameModel.COMPLETE_TASK_ACTIVITY,
            data:data
        });

        SocketManager.getInstance().send(socketData);
    }

    private onCompleteTaskActivity(data: any){
        DebugLog.instance.log('onCompleteTaskActivity =============');
        DebugLog.instance.log(data.data);
    }

    public getAllTaskActivitiesResult(){
        let socketData = new SocketData({
            action: FingerGameModel.GET_TASK_ACTIVITIES,
            data:{
                task_id:this._currentTaskId
            },
            needTimeout: false,
            needTouchMask: false
        });
        SocketManager.getInstance().send(socketData);
    }

    private onGetAllTaskActivitiesResult(data: any){
        DebugLog.instance.log('onGetAllTaskActivitiesResult =============');
        DebugLog.instance.log(data.data);

        this.emit(FingerGameModelEvent.GET_ALL_TASK_ACTIVITIES_RESULT, data.data);
    }

}



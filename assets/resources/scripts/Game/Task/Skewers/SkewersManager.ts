import { SkewersGameType, SkewersGameData, SkewersGameTrainData } from "./SkewersGameData";
import { DebugLog } from "../../../Core/Util/DebugLog";
import { SceneManager } from "../../../Core/Manager/Scene/SceneManager";
import { Global } from "../../../Core/Manager/Config/Global";
import { SkewersGameStatus } from "../../../Core/Data/GameState";
import { SocketManager } from "../../../Core/Manager/Net/SocketManager";
import { SocketData } from "../../../Core/Manager/Net/SocketData";
import { EventManager } from "../../../Core/Manager/Event/EventManager";
import { AlertType, GameAlert } from "db://assets/resources/scripts/Game/UI/Alert/GameAlert";
import { Canvas, director, instantiate, Node, Prefab, resources, UITransform, Vec3 } from "cc";
import { TaskStatus } from "db://assets/resources/scripts/Game/Task/TaskData";
import {AlertManager,  AlertData } from "db://assets/resources/scripts/Core/Manager/Alert/AlertManager";
import { BundlePreloadEvent, BundlePreloadManager } from "db://assets/resources/scripts/Core/Manager/Load/BundlePreloadManager";
import { GuideManager } from "db://assets/resources/scripts/Core/Manager/Guide/GuideManager";
import { UIManager } from "../../../Core/Manager/UI/UIManager";
import { BrainTrainTipPanel } from "../../UI/Common/BrainTrainTipPanel";
import { BundleName } from "../../../Core/Manager/Load/BundleName";
import {SkewersSpecGameModel} from "db://assets/resources/scripts/Core/Scene/SceneModel/SkewersSpecGameModel";
import {GameType} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import {GameDataFactory} from "db://assets/resources/scripts/Core/Scene/SceneModelFactory/GameDataFactory";
import {GuidePanel} from "db://assets/resources/scripts/Game/UI/Alert/GuidePanel";
import { LoadPanel } from "../../UI/Load/LoadPanel";
/**
 * 脑力串烧管理器
 */
export class SkewersManager {

    private static _instance: SkewersManager;

    public static getInstance(): SkewersManager {
        if (SkewersManager._instance == null) {
            SkewersManager._instance = new SkewersManager();
        }
        return SkewersManager._instance;
    }

    public totalCompleteStr: string = '太棒了，恭喜你完成全部训练';

    public singleCompleteStr: string = '太棒了，请继续！';

    public normalCompleteStr: string = "太棒了";

    public reviseStr:string = "已完成全部训练，可做订正训练";

    public reviseCompleteStr:string = "已完成全部训练，可做订正训练";

    public reviseDZCompleteStr:string = "已完成全部订正";

    public failCompleteStr: string = "真遗憾，请加油";

    public singleBrainScore: string = "收获100点脑力值";

    public totalBrainScore: string = "收获600点脑力值";


    public get currentSkewersCompleteGameStr(): string {
        return `恭喜完成${Global.userData.curSkewerGameData.TypeName}维度训练`
    }

    public get currentSkewersCompleteGameDZStr(): string {
        return `恭喜完成${Global.userData.curSkewerGameData.TypeName}维度订正`
    }

    public get nextGameCompleteStr(): string {
        return `恭喜完成${Global.userData.curSkewerGameData.TypeName}维度训练\n接下进入${SkewersManager.getInstance().getUnCompleteGameData().TypeName}维度训练`
    }

    public get nextSkewersGameStr(): string {
        if(!SkewersManager.getInstance().getUnCompleteGameData()){
            return null;
        }
        return `接下来将进入${SkewersManager.getInstance().getUnCompleteGameData().TypeName}训练`;
    }

    public get nextSkewersGameDZStr(): string {
        if(!SkewersManager.getInstance().getUnCompleteGameData()){
            return null;
        }
        return `接下来将进入${SkewersManager.getInstance().getUnCompleteGameData().TypeName}订正`;
    }

    private _gameDatas: SkewersGameData[];

    /**
     * 当前训练索引
     * @private
     */
    private _curIndex: number = -1;



    //===== 脑力保健
    /**
     * 获取脑力保健任务 旧
     * @private
     */
    private task_get_brain_trainings: string = "task.get_brain_trainings";

    /**
     * 获取脑力保健任务队列 新
     * @private
     */
    private task_get_grouped_brain_trainings: string = "task.get_grouped_brain_trainings";

    /**
     * 完成脑力保健任务
     * @private
     */
    public task_complete_brain_training: string = "task.complete_brain_training";


    public static TASK_GET_BRAIN_TRAININGS: string = "TASK_GET_BRAIN_TRAININGS";

    /**
     * 请求上传串烧数据事件
     */
    public static REQUEST_SKEWERSGAME_COMPLETE = "REQUEST_SKEWERSGAME_COMPLETE";

    /**
     * 串烧训练加载错误事件
     */
    public static SKEWERS_LOAD_ERROR = "SKEWERS_LOAD_ERROR";

    private _iconUrlMap: Map<SkewersGameType, string>;

    public init() {
        GameDataFactory.registerGameType(GameType.SKEWERS, SkewersSpecGameModel);


        UIManager.getInstance().registerPanel(GuidePanel.NAME,BundleName.RESOURCES,"prefab/GuidePanel/GuidePanel",GuidePanel);


        this._gameDatas = [];
        this._iconUrlMap = new Map();
        this._iconUrlMap.set(SkewersGameType.Comprehension, "texture/game/icon/caimiIcon");
        this._iconUrlMap.set(SkewersGameType.Executionability, "texture/game/icon/puzzleicon");
        this._iconUrlMap.set(SkewersGameType.Language, "texture/game/icon/majiangIcon");
        this._iconUrlMap.set(SkewersGameType.Calculator, "texture/game/icon/fishicon");
        this._iconUrlMap.set(SkewersGameType.Judgment, "texture/game/icon/findingIcon");
        this._iconUrlMap.set(SkewersGameType.Memory, "texture/game/icon/memoryicon");

        UIManager.getInstance().registerPanel(BrainTrainTipPanel.NAME, BundleName.RESOURCES, "prefab/Common/BrainTrainTipPanel", BrainTrainTipPanel, false);
    }

    public get skewersSpecData(): SkewersSpecGameModel {
        return GameDataFactory.create(GameType.SKEWERS);
    }


    start(id:number) {
        Global.isSkewersGame = true;
        this.startGame(id);
    }


    /**
     * 请求脑力保健任务列表 新
     * @param taskID
     */
    public requestBranisTraining_list(taskID: number) {
        EventManager.getInstance().on(this.task_get_grouped_brain_trainings, this.requestBranisTraining_listCallBack, this,true);
        let requestBranisTrainingsSocket = new SocketData({ action: this.task_get_grouped_brain_trainings, data: { task_id: taskID } });
        SocketManager.getInstance().send(requestBranisTrainingsSocket);
    }

    private requestBranisTraining_listCallBack(data: any, context: any) {
        this._gameDatas = [];
        let status = data.status;
        if (status == 0) {
            DebugLog.instance.error(data.message);
            AlertManager.getInstance().showSocketAlert(data.message);
            return;
        } else {
            let result = data.data['result'];
            let len = result.length;
            for (let i = 0; i < len; i++) {
                let tmpData: any = result[i]; // skewersGameData_data
                let skewersGameData: SkewersGameData = new SkewersGameData();
                skewersGameData.refreshData(tmpData);
                skewersGameData.index = this._gameDatas.length;
                this._gameDatas.push(skewersGameData);
            }
            Global.userData.skewerGameDatas = this._gameDatas;
        }
        EventManager.getInstance().emit(SkewersManager.TASK_GET_BRAIN_TRAININGS, this._gameDatas);
    }

    // /**
    //  * 请求脑力保健任务列表 旧
    //  * @param taskID
    //  */
    //  public requestBranisTrainings(taskID:number){
    //     EventManager.getInstance().on(this.task_get_brain_trainings,this.requestBranisTrainingsCallback,this);
    //     let requestBranisTrainingsSocket = new SocketData({action:this.task_get_brain_trainings,data:{task_id:taskID}});
    //     SocketManager.getInstance().send(requestBranisTrainingsSocket);
    //  }
    //
    //  private requestBranisTrainingsCallback(data:any,context:any){
    //      context._gameDatas = [];
    //      EventManager.getInstance().off(context.task_get_brain_trainings,context);
    //      let status = data.status;
    //      if(status == 0){
    //          DebugLog.instance.error(data.message);
    //          return;
    //      }
    //      const result = data.data.result;
    //      const len = result.length;
    //      for(let i:number =0;i<len;i++){
    //           let tmpData:any = result[i];
    //           let data:SkewersGameData = new SkewersGameData();
    //           data.refreshData(tmpData);
    //           if(data.gameCode != "finding") context._gameDatas.push(data);
    //      }
    //      Global.userData.skewerGameDatas = context._gameDatas;
    //      context.startGame();
    //  }

    public getGameCount(): number {
        let curgameData = this.getUnCompleteGameData();
        if (curgameData == null) {
            curgameData = this._gameDatas[this._gameDatas.length - 1];
        }
        return curgameData.trains.length;
    }

    /**
     * 获取全部没有完成得训练数量
     */
    public getUnCompleteGameCount(): number {
        let len = this._gameDatas.length;
        let count = 0;
        for (let i: number = 0; i < len; i++) {
            let gameData = this._gameDatas[i];
            if (gameData != null) {
                if (gameData.status != TaskStatus.Completed && gameData.status != TaskStatus.Expired) {
                    count++;
                }
            }
        }
        return count;
    }

    public getCurGameIndex(): number {
        let curgameData = this.getUnCompleteGameData();
        if (curgameData == null) return 0;
        let trainData = curgameData.getCurTrainData();
        if (trainData == null) return 0;
        return trainData.seq;
    }

    public getTrainData(id: number): SkewersGameTrainData {
        for (let i = 0; i < this._gameDatas.length; i++) {
            let gameData = this._gameDatas[i];
            let trainData = gameData.getTrainDataByID(id);
            if (trainData) return trainData;
        }
        return null;
    }


    private checkAlertScale(parentNode:Node,alertNode){
        if(parentNode && parentNode.scale.x < 1||parentNode.scale.y < 1){
            alertNode.setScale(1/parentNode.scale.x,1/parentNode.scale.y,1);
        }else{
            alertNode.setScale(1,1,1);
        }
    }

    /**
     * 中途退出串烧训练接口
     * @param parentNode
     * @param goonCallBack
     * @param exitCallBack
     * @param context
     */
    public quitGame(parentNode: Node, curCount: number, maxCount: number, goonCallBack: Function, exitCallBack: Function, context) {
        resources.load("prefab/BrainTrainAlert",Prefab,(err,resource)=>{
            if(err){
                DebugLog.instance.error(err);
                return;
            }
            const alertNode = instantiate(resource);
            this.checkAlertScale(parentNode,alertNode);
            parentNode.addChild(alertNode);
            let alert = alertNode.getComponent("GameAlert");
            alertNode.setPosition(0, 0, 0);
            alert["setTitle"]("退出");
            alert["setDec"]("");
            alert["showView"](AlertType.Normal1);
            alert['setProgress'](curCount, maxCount);
            alert['bindCallBack'](goonCallBack, exitCallBack, context);
        });
    }

    /**
     * 显示训练弹窗
     * @param parentNode 父节点
     * @param type 弹窗类型
     * @param title 标题
     * @param desc 描述
     * @param curCount 当前计数
     * @param maxCount 最大计数
     * @param goonCallBack 继续回调
     * @param exitCallBack 退出回调
     * @param context 上下文
     */
    public showGameAlert(parentNode: Node = null, type: AlertType, title = "", desc = "", curCount: number, maxCount: number, goonCallBack: Function, exitCallBack: Function, context: any) {
        let gameType = type == AlertType.Next ? SkewersManager.getInstance().getUnCompleteGameData().type : Global.userData.curSkewerGameData.type;
        let iconUrl = this._iconUrlMap.get(gameType);
        let position = new Vec3(0, 0, 0);
        if (parentNode == null) {
            const scene = director.getScene(); // 直接获取场景根
            const canvas = scene.getComponentInChildren(Canvas); //
            parentNode = canvas.node;
        }

        resources.load("prefab/BrainTrainAlert",Prefab,(err,resource)=>{
            if(err){
                DebugLog.instance.error(err);
                return;
            }
            const alertNode = instantiate(resource);
            this.checkAlertScale(parentNode,alertNode);
            parentNode.addChild(alertNode);
            let alert = alertNode.getComponent("GameAlert");
            alertNode.setPosition(position.x, position.y, position.z);
            alert['setProgress'](curCount, maxCount);
            
            // 设置回调和基本信息
            alert['bindCallBack'](goonCallBack, exitCallBack, context);
            alert["setTitle"](title);
            alert["setDec"](desc);
            
            // 异步加载图标，然后显示弹窗
            if (iconUrl) {
                alert['setIcon'](iconUrl).then(() => {
                    // 图标加载完成后再显示弹窗
                    alert["showView"](type);
                }).catch(() => {
                    // 图标加载失败也要显示弹窗
                    alert["showView"](type);
                });
            } else {
                // 没有图标直接显示弹窗
                alert["showView"](type);
            }
        });
 
    }

    public showGameTip(title: string, curCount: number, maxCount: number) {
        UIManager.getInstance().showPanel(BrainTrainTipPanel.NAME, { title, curCount, maxCount }, true, null, false);
    }

    /**
     * 退出串烧训练
     */
    public exitCallBack() {
        Global.isAgain = false;
        Global.isSkewersGame = false;
        GuideManager.getInstance().quitGame();
        if (SkewersManager.getInstance().isRunOver()) {
            SceneManager.getInstance().backToTaskProgress();
        } else {
            SceneManager.getInstance().backToSkewersGameCenter();
        }
    }

    public remoteExitCallBack() {
        Global.isAgain = false;
        GuideManager.getInstance().quitGame();
        SceneManager.getInstance().showPingcePanel();
    }



    private _curRequestCompleteData: SocketData = null;

    /**
     * 请求完成脑力保健小关
     * @param data
     */
    public requestCompleteBrainsTrainings(data: any) {
        EventManager.getInstance().on(this.task_complete_brain_training, this.requestCompleteBrainsTrainingsCallback, this,true);
        this._curRequestCompleteData = new SocketData(data);
        SocketManager.getInstance().send(this._curRequestCompleteData);
    }

    private requestCompleteBrainsTrainingsCallback(data: any, context: any) {
        // EventManager.getInstance().off(context.task_complete_brain_training, context);
        let status = data.status;
        if (status == 0) {
            DebugLog.instance.error(data.message);
            AlertManager.getInstance().showSocketAlert(data.message);
            return;
        } else {
            if (!this._gameDatas || this._gameDatas.length <= 0) {
                DebugLog.instance.log("当前串烧训练已经全部完成");
                Global.isSkewersGame = false;
                this._curIndex = -1;
                return;
            }
            let curGame;
            for (let i = 0; i < this._gameDatas.length; i++) {
                curGame = this._gameDatas[i];
                if (curGame.status == TaskStatus.UnComplete) {
                    curGame.updateData(data.data["brain_training_id"], this._curRequestCompleteData);
                    break;
                }
            }
            //let curGame = this.getUnCompleteGameData();
            if (!curGame) {
                DebugLog.instance.log("当前串烧训练已经全部完成");
                Global.isSkewersGame = false;
                this._curIndex = -1;
                return;
            }
            Global.userData.curSkewerGameData.is_correction = data.data.is_correction;
            EventManager.getInstance().emit(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, data.data);
        }
    }

    private _game;

    public get curGame(): SkewersGameData {
        return this._game;
    }

    public startGame(id:number) {
        if (!this._gameDatas || this._gameDatas.length <= 0) {
            this._curIndex = -1;
            DebugLog.instance.error("当前没有训练可以运行");
            return;
        }
        this._game = this.getUnCompleteGameData();
        this._game.taskID = id;
        if (!this._game) {
            this._curIndex = -1;
            DebugLog.instance.error("当前脑力训练已经全部完成！");
            //   SceneManager.getInstance().backToHall();
            return;
        }
        const sceneName = this._game.gameCode;
        let url = Global.RES_Root + sceneName;
        Global.userData.curSkewerGameData = this._game;
        
        // 设置串烧训练错误处理监听器（仅在需要时添加）
        this.setupSkewersErrorHandling();
        
        // 设置预加载事件监听
        this.setupPreloadEventListeners(sceneName);
        
        // 模拟预加载超时测试（仅用于测试，生产环境请注释掉）
        // this.simulatePreloadTimeout(sceneName);
        
        // 开始预加载
        BundlePreloadManager.getInstance().preload(sceneName);
    }

    private onPreloadFinish(url: string, sceneName: string, data: any) {
        DebugLog.instance.log(`串烧训练预加载完成，开始切换场景: ${sceneName}`);
        
        SceneManager.getInstance().changeScene(sceneName, "", {gametype: GameType.SKEWERS}).then((scene) => {
            DebugLog.instance.log(`串烧训练 ${sceneName} 开始`);
            (scene as any).sceneModel = SkewersManager.getInstance().skewersSpecData;
            // (scene as any).sceneModel.scene = scene as any;
            
            // 清理事件监听器
            this.cleanupPreloadEventListeners();
        }).catch((error) => {
            DebugLog.instance.error(`串烧训练场景切换失败: ${sceneName}`, error);
            
            // 清理事件监听器
            this.cleanupPreloadEventListeners();
            
            // 触发串烧训练加载错误事件
            EventManager.getInstance().emit(SkewersManager.SKEWERS_LOAD_ERROR, {
                sceneName,
                error: error,
                type: 'scene_change_failed'
            });
            
            // 显示错误提示
            this.showLoadErrorAlert(sceneName);
        });
    }

    /**
     * 跳出串烧训练，记录当前训练index进度
     */
    public pauseGame() {
        SceneManager.getInstance().backToHall().then(() => {
            DebugLog.instance.log('退出串烧训练');
        });
    }

    /**
     * 返回串烧训练
     */
    public resumeGame() {
        this.runGame(this._curIndex);
    }

    /**
     * 指定 某index/某一类型 的串烧训练
     * @param index
     */
    public runGame(index: number = 0) {
        if (!this._gameDatas || this._gameDatas.length <= 0) {
            this._curIndex = -1;
            DebugLog.instance.error("当前没有训练可以运行");
            return;
        }
        this._game = this.getUnCompleteGameData();
        if (!this._game) {
            this._curIndex = -1;
            DebugLog.instance.error("当前脑力训练已经全部完成！");
            SceneManager.getInstance().backToHall();
            return;
        }
        this._curIndex = index;
        const sceneName = this._game.gameCode;
        let url = Global.RES_Root + sceneName;
        Global.userData.curSkewerGameData = this._game;
        
        // 设置串烧训练错误处理监听器（仅在需要时添加）
        this.setupSkewersErrorHandling();
        
        // 设置预加载事件监听
        this.setupPreloadEventListeners(sceneName);
        
        // 开始预加载
        BundlePreloadManager.getInstance().preload(sceneName);
    }

    /**
     * 是否完成了当前训练
     */
    public hasCompleteCurGame():boolean {
        if(!this._game)return false;
        let curType = this._game.type;
        this._game = this.getUnCompleteGameData();
        if(!this._game||curType!=this._game.type){
            return true;
        }
        return false;
    }


    /**
     * 运行下一个训练
     */
    public runNextGame(changeScene: boolean = true) {
        // 可能换到了下一个类型训练
        this._game = this.getUnCompleteGameData();
        Global.userData.curSkewerGameData = this._game;
        if (changeScene) {
            const sceneName = this._game.gameCode;
            let url = Global.RES_Root + sceneName;
            
            // 设置串烧训练错误处理监听器（仅在需要时添加）
            this.setupSkewersErrorHandling();
            
            // 设置预加载事件监听
            this.setupPreloadEventListeners(sceneName);
            
            // 开始预加载
            BundlePreloadManager.getInstance().preload(sceneName);
        }
    }

    /**
     * 上报训练完成数据
     */
    public requestGameComplete(complete: number, duration: number) {
        let curGame = this.getUnCompleteGameData();
        if (!curGame) {
            DebugLog.instance.error("当前串烧训练已经全部完成");
            return;
        }
        let curTrainData = curGame.getCurTrainData();
        let socketData = {
            action: this.task_complete_brain_training, data: {
                "brain_training_id": curTrainData.brain_training_id, // 脑力训练（训练小关）id （必填）
                "complete": complete, // 完成度
                "duration": duration, // 用时（秒）
                "status": 1
            }
        };
        this.requestCompleteBrainsTrainings(socketData);
    }


    /**
     * 是否全部通关
     */
    public isRunOver(): boolean {
        return this.getUnCompleteGameData() == null;
    }

    public get gameDatasLength(): number {
        return this._gameDatas.length;
    }

    /**
     * 显示所有任务完成弹窗
     * @param parentNode 父节点
     * @param context 上下文
     */
    public showAllTasksCompleteAlert(parentNode: Node, context: any) {
        const alertData = new AlertData();
        alertData.title = "恭喜！所有任务已完成！";
        alertData.message = "感谢您的努力训练！";
        alertData.confirmButtonText = "确定";
        alertData.cancelButtonVisible = false;
        alertData.enableCountdown = true; // 启用倒计时功能
        alertData.countdown = 5; // 5秒倒计时
        alertData.countdownCb = () => {
            // 倒计时结束后的回调
            if (context.exitCallBack) {
                context.exitCallBack();
            }
        };
        alertData.confirmCb = () => {
            // 点击确定按钮的回调
            if (context.exitCallBack) {
                context.exitCallBack();
            }
        };
        
        AlertManager.getInstance().showAlert(alertData);
    }


    /**
     * 训练列表中是否还有未完成得训练
     * @private
     */
    public getUnCompleteGameData(): SkewersGameData {
        let len = this._gameDatas.length;
        for (let i: number = 0; i < len; i++) {
            let gameData = this._gameDatas[i];
            if (!gameData) continue;
            if (gameData.status == SkewersGameStatus.unCompleted) {
                this._curIndex = i;
                return gameData;
            }
        }
        return null;
    }


    private getNextGameData() {
        if (!this._gameDatas) return null;
        let len = this._gameDatas.length;
        if (this._curIndex + 1 > len - 1) {
            return null;
        }
        let nextGame = this._gameDatas[this._curIndex + 1];
        if (!nextGame || nextGame.status == SkewersGameStatus.Completed) {
            return null;
        }
        return nextGame;
    }

    /**
     * 设置预加载事件监听器
     * @param sceneName 场景名称
     */
    private setupPreloadEventListeners(sceneName: string) {
        // 清理之前的事件监听器
        this.cleanupPreloadEventListeners();
        
        // 监听预加载完成事件
        EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onPreloadFinish.bind(this, "", sceneName), this, true);
        
        // 监听预加载失败事件
        EventManager.getInstance().on(BundlePreloadEvent.FAILED, this.onPreloadFailed.bind(this, sceneName), this, true);
        
        // 监听加载错误已处理事件
        EventManager.getInstance().on(BundlePreloadEvent.LOAD_ERROR_HANDLED, this.onLoadErrorHandled.bind(this, sceneName), this, true);
    }

    /**
     * 清理预加载事件监听器
     */
    private cleanupPreloadEventListeners() {
        EventManager.getInstance().off(BundlePreloadEvent.FINISH, this);
        EventManager.getInstance().off(BundlePreloadEvent.FAILED, this);
        EventManager.getInstance().off(BundlePreloadEvent.LOAD_ERROR_HANDLED, this);
    }

    /**
     * 清理串烧训练错误处理监听器
     */
    private cleanupSkewersErrorHandling() {
        EventManager.getInstance().off(SkewersManager.SKEWERS_LOAD_ERROR, this);
        EventManager.getInstance().off(BundlePreloadEvent.TIMEOUT, this);
        EventManager.getInstance().off(BundlePreloadEvent.FAILED, this);
    }

    /**
     * 预加载失败回调
     * @param sceneName 场景名称
     * @param data 失败数据
     */
    private onPreloadFailed(sceneName: string, data: any) {
        DebugLog.instance.error(`串烧训练预加载失败: ${sceneName}`, data);
        
        // 清理事件监听器
        this.cleanupPreloadEventListeners();
        
        // 触发串烧训练加载错误事件
        EventManager.getInstance().emit(SkewersManager.SKEWERS_LOAD_ERROR, {
            sceneName,
            error: data,
            type: 'preload_failed'
        });
        
        // 显示错误提示
        this.showLoadErrorAlert(sceneName);
    }

    /**
     * 加载错误已处理回调
     * @param sceneName 场景名称
     * @param data 处理结果数据
     */
    private onLoadErrorHandled(sceneName: string, data: any) {
        DebugLog.instance.log(`串烧训练加载错误已处理: ${sceneName}`, data);
        
        // 清理事件监听器
        this.cleanupPreloadEventListeners();
        
        if (data.handledSuccessfully) {
            // 错误已成功处理，用户已回到大厅
            DebugLog.instance.log(`串烧训练加载错误处理成功，用户已回到大厅: ${sceneName}`);
            
            // 重置串烧训练状态
            this.resetSkewersGameState();
        } else {
            // 错误处理失败
            DebugLog.instance.error(`串烧训练加载错误处理失败: ${sceneName}`, data.finalError);
            
            // 显示错误提示
            this.showLoadErrorAlert(sceneName);
        }
    }

    /**
     * 显示加载错误提示
     * @param sceneName 场景名称
     */
    private showLoadErrorAlert(sceneName: string, isTimeout: boolean = false, errorData: any = null) {
        DebugLog.instance.log(`SkewersManager.showLoadErrorAlert 被调用: ${sceneName}, isTimeout: ${isTimeout}`, errorData);
        
        // 使用AlertManager显示错误提示弹窗
        const alertData = new AlertData();
        
        if (isTimeout) {
            // 超时错误提示
            alertData.title = "网络不稳定";
            alertData.message = `加载资源超时，请检查网络连接后重试`;
        } else {
            // 其他错误提示
            alertData.title = "网络不稳定";
            alertData.message = `请检查网络连接后重试`;
        }
        
        alertData.cancelButtonVisible = true;
        alertData.cancelButtonText = "退出";
        alertData.confirmButtonText = "重试";
        alertData.cancelCb = () => {
            // 退出回调
            DebugLog.instance.log(`用户选择退出训练: ${sceneName}`);
            this.handleLoadErrorExit();
        };
        alertData.confirmCb = () => {
            // 重试回调
            DebugLog.instance.log(`用户选择重试加载训练: ${sceneName}`);
            
            // 先关闭当前弹窗
            AlertManager.getInstance().closeCurrentAlert();
            
            // 然后重试加载训练
            this.retryLoadGame(sceneName);
        };
        
        AlertManager.getInstance().showAlert(alertData);
    }

    /**
     * 重试加载训练
     * @param sceneName 场景名称
     */
    private retryLoadGame(sceneName: string) {
        DebugLog.instance.log(`重试加载训练: ${sceneName}`);
        
        // 延迟一段时间后重试，避免立即重试
        setTimeout(() => {
            // 重新开始训练加载
            if (this._game) {
                this.startGame(this._game.taskID);
            } else {
                DebugLog.instance.error("无法重试：训练数据为空");
                this.handleLoadErrorExit();
            }
        }, 1000);
    }

    /**
     * 处理加载错误退出
     */
    private async handleLoadErrorExit() {
        DebugLog.instance.log("处理串烧训练加载错误退出");
        
        // 重置串烧训练状态
        this.resetSkewersGameState();
        
        // 关闭LoadPanel
        try {
            await UIManager.getInstance().hidePanel(LoadPanel.NAME);
            DebugLog.instance.log("LoadPanel已关闭");
        } catch (error) {
            DebugLog.instance.error("关闭LoadPanel失败:", error);
        }
        
        // 回到串烧训练大厅
        try {
            await SceneManager.getInstance().backToSkewersGameCenter();
            DebugLog.instance.log("已回到串烧训练大厅");
        } catch (error) {
            DebugLog.instance.error("回到串烧训练大厅失败:", error);
        }
    }

    /**
     * 重置串烧训练状态
     */
    private resetSkewersGameState() {
        DebugLog.instance.log("重置串烧训练状态");
        
        // 重置全局状态
        Global.isSkewersGame = false;
        Global.isAgain = false;
        
        // 清理事件监听器
        this.cleanupPreloadEventListeners();
        this.cleanupSkewersErrorHandling();
        
        // 重置当前训练索引
        this._curIndex = -1;
        
        // 清理当前训练数据
        this._game = null;
        Global.userData.curSkewerGameData = null;
    }

    /**
     * 模拟预加载超时（仅用于测试）
     * @param sceneName 场景名称
     */
    private simulatePreloadTimeout(sceneName: string) {
        // 模拟3秒后触发超时事件
        setTimeout(() => {
            DebugLog.instance.log(`模拟串烧训练预加载超时: ${sceneName}`);
            
            // 直接调用串烧训练的超时处理方法，避免事件冲突
            this.showLoadErrorAlert(sceneName, true, {
                bundleName: sceneName,
                error: "模拟超时错误",
                timeout: 3000,
                currentSceneName: "skewers" // 明确标识这是串烧训练场景
            });
            
            // 同时触发超时事件（可选，用于日志记录）
            EventManager.getInstance().emit(BundlePreloadEvent.TIMEOUT, {
                bundleName: sceneName,
                error: "模拟超时错误",
                timeout: 3000,
                currentSceneName: "skewers"
            });
        }, 3000);
    }

    /**
     * 设置串烧训练错误处理
     */
    private setupSkewersErrorHandling() {
        // 先清理可能存在的监听器，避免重复监听
        this.cleanupSkewersErrorHandling();
        
        // 监听串烧训练加载错误事件
        EventManager.getInstance().on(SkewersManager.SKEWERS_LOAD_ERROR, (data) => {
            DebugLog.instance.error(`串烧训练加载错误事件: ${data.sceneName}`, data);
            
            // 可以在这里添加全局的错误处理逻辑
            // 比如记录错误日志、上报错误等
            
            // 根据错误类型进行不同的处理
            switch (data.type) {
                case 'preload_failed':
                    DebugLog.instance.error(`串烧训练预加载失败: ${data.sceneName}`);
                    break;
                case 'scene_change_failed':
                    DebugLog.instance.error(`串烧训练场景切换失败: ${data.sceneName}`);
                    break;
                default:
                    DebugLog.instance.error(`串烧训练未知错误类型: ${data.type}`);
                    break;
            }
        }, this);

        // 监听BundlePreloadManager的超时和失败事件
        EventManager.getInstance().on(BundlePreloadEvent.TIMEOUT, (data) => {
            DebugLog.instance.error(`串烧训练资源加载超时: ${data.bundleName}`, data);
            this.showLoadErrorAlert(data.bundleName, true, data);
        }, this);

        EventManager.getInstance().on(BundlePreloadEvent.FAILED, (data) => {
            DebugLog.instance.error(`串烧训练资源加载失败: ${data.bundleName}`, data);
            this.showLoadErrorAlert(data.bundleName, false, data);
        }, this);
    }
}

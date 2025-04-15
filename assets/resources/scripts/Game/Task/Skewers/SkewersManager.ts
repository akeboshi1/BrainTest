import { SkewersGameType, SkewersGameData, SkewersGameTrainData } from "./SkewersGameData";
import { DebugLog } from "../../../Core/Util/DebugLog";
import { SceneManager } from "../../../Core/Manager/Scene/SceneManager";
import { Global } from "../../../Core/Manager/Config/Global";
import { SkewersGameStatus } from "../../../Core/Data/GameState";
import { SocketManager } from "../../../Core/Manager/Net/SocketManager";
import { SocketData } from "../../../Core/Manager/Net/SocketData";
import { EventManager } from "../../../Core/Manager/Event/EventManager";
import { LoaderManager } from "db://assets/resources/scripts/Core/Manager/Load/LoaderManager";
import { AlertType, GameAlert } from "db://assets/resources/scripts/Game/UI/Alert/GameAlert";
import { Canvas, director, instantiate, Node, UITransform, Vec3 } from "cc";
import { TaskStatus } from "db://assets/resources/scripts/Game/Task/TaskData";
import AlertManager, { AlertData } from "db://assets/resources/scripts/Core/Manager/Alert/AlertManager";
import { BundlePreloadEvent, BundlePreloadManager } from "db://assets/resources/scripts/Core/Manager/Load/BundlePreloadManager";
import { GuideManager } from "db://assets/resources/scripts/Core/Manager/Guide/GuideManager";
import { UIManager } from "../../../Core/Manager/UI/UIManager";
import { BrainTrainTipPanel } from "../../UI/Common/BrainTrainTipPanel";
import { BundleName } from "../../../Core/Manager/Load/BundleName";
import {SkewersSpecGameModel} from "db://assets/resources/scripts/Core/Scene/SceneModel/SkewersSpecGameModel";
import {GameType} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import {GameDataFactory} from "db://assets/resources/scripts/Core/Scene/SceneModelFactory/GameDataFactory";
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
        return `恭喜你完成${Global.userData.curSkewerGameData.TypeName}训练`
    }

    public get currentSkewersCompleteGameDZStr(): string {
        return `恭喜你完成${Global.userData.curSkewerGameData.TypeName}订正`
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
     * 当前游戏索引
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

    private _alertInstance: Node = null;

    private _iconUrlMap: Map<SkewersGameType, string>;

    private _curSkewersSpecData: SkewersSpecGameModel;

    public init() {
        GameDataFactory.registerGameType(GameType.SKEWERS, SkewersSpecGameModel);
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
        if (!this._curSkewersSpecData) {
            this._curSkewersSpecData = GameDataFactory.create(GameType.SKEWERS);
        }
        return this._curSkewersSpecData;
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
            const ad: AlertData = new AlertData();
            ad.title = "";
            ad.message = data.message;
            AlertManager.getInstance().showAlert(ad);
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
     * 获取全部没有完成得游戏数量
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

    /**
     * 中途退出串烧游戏接口
     * @param parentNode
     * @param goonCallBack
     * @param exitCallBack
     * @param context
     */
    public quitGame(parentNode: Node, curCount: number, maxCount: number, goonCallBack: Function, exitCallBack: Function, context) {
        let alertNode = SkewersManager.getInstance()._alertInstance;
        if (alertNode == null||!alertNode.isValid) {
            LoaderManager.getInstance().resourcesLoadPrefab("prefab/BrainTrainAlert").then((resource) => {
                alertNode = SkewersManager.getInstance()._alertInstance = instantiate(resource);
                parentNode.addChild(alertNode);
                let alert = alertNode.getComponent("GameAlert");
                alertNode.setPosition(0, 0, 0);
                alert["setTitle"]("退出");
                alert["setDec"]("");
                alert["showView"](AlertType.Normal1);
                alert['setProgress'](curCount, maxCount);
                alert['bindCallBack'](goonCallBack, exitCallBack, context);
            });
        } else {
            alertNode.active = true;
            parentNode.addChild(alertNode);
            let alert = alertNode.getComponent("GameAlert");
            alertNode.setPosition(0, 0, 0);
            alert["reset"]();
            alert["setTitle"]("退出");
            alert["showView"](AlertType.Normal1);
            alert['setProgress'](curCount, maxCount);
            alert['bindCallBack'](goonCallBack, exitCallBack, context);
        }
    }

    /**
     * 显示游戏弹窗
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
        let alertNode = SkewersManager.getInstance()._alertInstance;
        let gameType = type == AlertType.Next ? SkewersManager.getInstance().getUnCompleteGameData().type : Global.userData.curSkewerGameData.type;
        let iconUrl = this._iconUrlMap.get(gameType);
        let position = new Vec3(0, 0, 0);
        if (parentNode == null) {
            const scene = director.getScene(); // 直接获取场景根
            const canvas = scene.getComponentInChildren(Canvas); //
            parentNode = canvas.node;
        }
        if (alertNode == null || alertNode.isValid==false) {
            LoaderManager.getInstance().resourcesLoadPrefab("prefab/BrainTrainAlert").then((resource) => {
                alertNode = SkewersManager.getInstance()._alertInstance = instantiate(resource);
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
        } else {
            alertNode.active = true;
            parentNode.addChild(alertNode);
            let alert = alertNode.getComponent("GameAlert");
            alert["reset"]();
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
        }
    }

    public showGameTip(title: string, curCount: number, maxCount: number) {
        UIManager.getInstance().showPanel(BrainTrainTipPanel.NAME, { title, curCount, maxCount }, true, null, false);
    }

    /**
     * 退出串烧游戏
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
        EventManager.getInstance().on(this.task_complete_brain_training, this.requestCompleteBrainsTrainingsCallback, this);
        this._curRequestCompleteData = new SocketData(data);
        SocketManager.getInstance().send(this._curRequestCompleteData);
    }

    private requestCompleteBrainsTrainingsCallback(data: any, context: any) {
        EventManager.getInstance().off(context.task_complete_brain_training, context);
        let status = data.status;
        if (status == 0) {
            DebugLog.instance.error(data.message);
            const ad: AlertData = new AlertData();
            ad.title = "";
            ad.message = data.message;
            AlertManager.getInstance().showAlert(ad);
            return;
        } else {
            if (!this._gameDatas || this._gameDatas.length <= 0) {
                DebugLog.instance.log("当前串烧游戏已经全部完成");
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
                DebugLog.instance.log("当前串烧游戏已经全部完成");
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
            DebugLog.instance.error("当前没有游戏可以运行");
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
        EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onPreloadFinish.bind(this, url, sceneName), this, true);
        BundlePreloadManager.getInstance().preload(sceneName);
    }

    private onPreloadFinish(url: string, sceneName: string, data: any) {
        SceneManager.getInstance().changeScene(url, sceneName).then((scene) => {
            DebugLog.instance.log(`串烧游戏 ${sceneName} 开始`);
            (scene as any).sceneModel = SkewersManager.getInstance().skewersSpecData;
            // (scene as any).sceneModel.scene = scene as any;
        });
    }

    /**
     * 跳出串烧游戏，记录当前游戏index进度
     */
    public pauseGame() {
        SceneManager.getInstance().backToHall().then(() => {
            DebugLog.instance.log('退出串烧游戏');
        });
    }

    /**
     * 返回串烧游戏
     */
    public resumeGame() {
        this.runGame(this._curIndex);
    }

    /**
     * 指定 某index/某一类型 的串烧游戏
     * @param index
     */
    public runGame(index: number = 0) {
        if (!this._gameDatas || this._gameDatas.length <= 0) {
            this._curIndex = -1;
            DebugLog.instance.error("当前没有游戏可以运行");
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
        EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onPreloadFinish.bind(this, url, sceneName), this, true);
        BundlePreloadManager.getInstance().preload(sceneName);

        // SceneManager.getInstance().changeScene(url,sceneName).then(()=>{
        //     DebugLog.instance.log(`串烧游戏 ${sceneName} 切换成功`);
        //     Global.userData.curSkewerGameData = game;
        // });
    }

    /**
     * 是否完成了当前游戏
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
     * 运行下一个游戏
     */
    public runNextGame(changeScene: boolean = true) {
        // 可能换到了下一个类型游戏
        this._game = this.getUnCompleteGameData();
        Global.userData.curSkewerGameData = this._game;
        if (changeScene) {
            const sceneName = this._game.gameCode;
            let url = Global.RES_Root + sceneName;
            EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onPreloadFinish.bind(this, url, sceneName), this, true);
            BundlePreloadManager.getInstance().preload(sceneName);
        }


        // SceneManager.getInstance().changeScene(url,sceneName).then(()=>{
        //     DebugLog.instance.log(`串烧游戏 ${sceneName} 切换成功`);
        //     Global.userData.curSkewerGameData = this._game;
        // });
    }

    /**
     * 上报游戏完成数据
     */
    public requestGameComplete(complete: number, duration: number) {
        let curGame = this.getUnCompleteGameData();
        if (!curGame) {
            DebugLog.instance.error("当前串烧游戏已经全部完成");
            return;
        }
        let curTrainData = curGame.getCurTrainData();
        let socketData = {
            action: this.task_complete_brain_training, data: {
                "brain_training_id": curTrainData.brain_training_id, // 脑力训练（游戏小关）id （必填）
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
     * 游戏列表中是否还有未完成得游戏
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
}

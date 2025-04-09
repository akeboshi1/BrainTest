import {director, Node} from "cc";
import {BaseGameModel, GameType, IBaseGameChild, IQuitGameConfig, IStartConfig} from "./BaseGameModel";
import {AlertType} from "../../../Game/UI/Alert/GameAlert";
import {SkewersGameData, SkewersGameTrainData, SkewersGameType} from "../../../Game/Task/Skewers/SkewersGameData";
import {SkewersManager} from "../../../Game/Task/Skewers/SkewersManager";
import {EventManager} from "../../Manager/Event/EventManager";
import {TaskManager} from "db://assets/resources/scripts/Game/Task/TaskManager";
import {SceneManager} from "../../Manager/Scene/SceneManager";
import {TaskType} from "db://assets/resources/scripts/Game/Task/TaskData";
import {Global} from "db://assets/resources/scripts/Core/Manager/Config/Global";

// 添加类型定义确保desc存在
interface AlertConfig {
    type: AlertType;
    title: string;
    desc: string;
    handlers: Function[];
}

// 串烧游戏特性
interface ISkewersSpecific extends IBaseGameChild {
    children: SkewersGameTrainData[];
    currentChild: SkewersGameTrainData | null;

    gameType: string;
    progress: number;
    hasGuide: boolean;

    showGameAlert();
    showGameTip();
    exitCallBack();
    completeCurrent(score: number): void;
}

// 游戏大厅退出上报参数
interface ISkewersGameEndConfig {
    trainID?: number;
    success?: boolean;
    isCorrection?: boolean;
    complete: number;
    duration: number;
    parentNode: Node;
    context: any;
}


export class SkewersSpecGameModel extends BaseGameModel<ISkewersSpecific> {
    constructor() {
        super();
        this.gameType = GameType.SKEWERS;
    }

    get game(): SkewersGameData {
        return SkewersManager.getInstance().curGame;
    }

    get level():number{
        return SkewersManager.getInstance().curGame.level;
    }

    get difficulty(): number {
        return SkewersManager.getInstance().curGame.difficulty;
    }

    get hasCompleteCurGame():boolean {
        return SkewersManager.getInstance().hasCompleteCurGame();
    }

    get scene(): any {
        return (director.getScene() as any); 
    }

    showStartAlert(config: IStartConfig) {
        SkewersManager.getInstance().showGameAlert(config.parentNode, AlertType.Init, "开始游戏!", "", 0, 0, config.start, null, config.context);
    }


    refreshData(data: ISkewersSpecific): void {
        // this.currentChild = data;
        // 具体刷新逻辑...
    }

    // 运行下一关游戏
    runNextGame(): void {
        // 串烧游戏特有逻辑...
    }

    // ========= 中途退出游戏 =======
    quitGame(config?: IQuitGameConfig): void {
        let trainData = SkewersManager.getInstance().getUnCompleteGameData();
        if(trainData){
            let maxCount = SkewersManager.getInstance().getGameCount();
            let curCount = trainData.seq - 1 < 0 ? 0 : trainData.seq - 1;
            // 退出逻辑...
            SkewersManager.getInstance().quitGame(config.parentNode, curCount, maxCount,
                config.context.resumeCallBack, config.context.exitCallBack, config.context);
        }else{
            SceneManager.getInstance().backToSkewersGameCenter();
        }
    }


    dzgoonHandler(context: any, win: boolean = true): void {
        const manager = SkewersManager.getInstance();
        const trainData = manager.curGame.getCurTrainData();
        const [maxCount, curCount] = [trainData.length, Math.max(trainData.seq, 0)];
        const isFinalStage = curCount == maxCount;
        let alertType,title,desc,exitHandler,goonHandler;
            if(isFinalStage){
                alertType = AlertType.Sucess_Normal;
               title= win?manager.normalCompleteStr:manager.failCompleteStr;
               desc= '';
               exitHandler = context.exitCallBack;
               goonHandler =  win?context.showNextSuccessHandler:context.showNextFailHandler;
               curCount;
                maxCount; 
            }else{
                alertType = AlertType.Normal;
                title=  win?manager.singleCompleteStr:manager.failCompleteStr;
                desc= ''; // 新增空描述
                exitHandler = context.exitCallBack;
                goonHandler = context.dzgoonHandler;
                curCount;
                maxCount;
            }
        
        // 继续下一个游戏
        context.goonHandler(context, true);
    }
    
    dzanswerHandler(context: any): void {
        const manager = SkewersManager.getInstance();
        const trainData = manager.curGame.getCurTrainData();
        const [maxCount, curCount] = [trainData.length, Math.max(trainData.seq, 0)];
        // const isFinalStage = curCount == maxCount;
        let self = this;
        let alertType,title,desc,exitHandler,goonHandler;
            alertType = AlertType.Normal;
            title= manager.failCompleteStr;
            desc= ''; // 新增空描述
            exitHandler = context.exitCallBack;
            goonHandler = function(){
                self.dzgoonHandler(context,false);
            }
            curCount;
            maxCount;
        // 显示弹窗
        manager.showGameAlert(
            context.viewNode,
            alertType,
            title,
            desc,
            curCount,maxCount,
            goonHandler,
            exitHandler,
            context
        );
    }

    /**
     * 请求上报串烧游戏数据
     * @param config
     */
    requestGameComplete(config?: ISkewersGameEndConfig): void {
        // 订正模式
        let curTask = TaskManager.getInstance().curTask;
        if(curTask && curTask.type == TaskType.Revise){
            let success = config.complete != 0;
            let manager = SkewersManager.getInstance();
            const trainData = manager.curGame.getCurTrainData();
            manager.curGame.is_correction = config.isCorrection;
            const [maxCount, curCount] = [trainData.length, Math.max(trainData.seq, 0)];
            const isFinalStage = curCount == maxCount;
            const isLastGameType = manager.isRunOver();
            let title, goonHandler, exitHandler, type;
            
            if(success){
               // 普通订正成功
               type = AlertType.Revise_Success;
               title = manager.singleCompleteStr;
               // 使用闭包函数包装dzgoonHandler，保存isFinalStage供后续使用
               const self = this;
               goonHandler = function() {
                   // 当函数被调用时，将context和isFinalStage传给dzgoonHandler
                   self.dzgoonHandler(this, true);
               }
               exitHandler = config.context.exitCallBack;
            } else {
               // 普通订正失败
               type = AlertType.Revise_Fail;
               title = manager.failCompleteStr;
               // 使用闭包函数包装onClickShowAnswer，保存isFinalStage供后续使用
               const originalShowAnswer = config.context.onClickShowAnswer;
    
               config.context.onClickShowAnswer = function() {
                   // 首先调用原始的onClickShowAnswer方法
                   if (originalShowAnswer) {
                       originalShowAnswer.call(this,isFinalStage);
                   }
      
               }
               
               goonHandler = config.context.onClickShowAnswer;
               exitHandler = config.context.retryHandler;
            }

            SkewersManager.getInstance().showGameAlert(
                config.parentNode,
                type,
                title,
                "",
                curCount, maxCount,
                goonHandler,
                exitHandler,
                config.context
            );
            return;
        }
        
        // 正常串烧模式
        const callbackWrapper = (data) => {
            config.trainID = data["brain_training_id"];
            config.success = data.success;
            config.isCorrection = data.is_correction;
            this.requestGameCompleteCallBack(config);
        };
        // 完成当前游戏请求...
        EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, callbackWrapper, this, true);
        SkewersManager.getInstance().requestGameComplete(config.complete, config.duration);
    }

    requestGameCompleteCallBack(config: ISkewersGameEndConfig): void {
        const { parentNode, trainID, context } = config;
        const manager = SkewersManager.getInstance();
        const trainData = manager.getTrainData(trainID);
        manager.curGame.is_correction = config.isCorrection;
        const [maxCount, curCount] = [trainData.length, Math.max(trainData.seq, 0)];
        const alertStrategies = {
            success: {
                [AlertType.Normal]: {
                    title: manager.singleCompleteStr,
                    desc: manager.singleBrainScore,
                    handlers: [context.goonHandler, context.exitCallBack],
                    curCount: 0,
                    maxCount: 0
                },
                [AlertType.Sucess_Normal]: {
                    title: manager.normalCompleteStr,
                    desc: manager.singleBrainScore,
                    handlers: [context.showNextSuccessHandler, context.exitCallBack],
                    curCount: 0,
                    maxCount: 0
                },
                [AlertType.Sucess_Small]: {
                    title: manager.currentSkewersCompleteGameStr,
                    desc: manager.singleBrainScore,
                    handlers: [context.nextHandler, context.exitCallBack],
                    curCount: 0,
                    maxCount: 0
                },
                [AlertType.Sucess_Big]: {
                    title: manager.totalCompleteStr,
                    desc: manager.totalBrainScore,
                    handlers: [context.exitCallBack, context.remoteHandler],
                    curCount: 0,
                    maxCount: 0
                },
                [AlertType.Revise_Success]: {
                    title: manager.singleCompleteStr,
                    desc: manager.singleBrainScore,
                    handlers: [context.goonHandler, context.exitCallBack],
                    curCount: 0,
                    maxCount: 0
                }
            },
            failure: {
                [AlertType.Normal]: {
                    title: manager.failCompleteStr,
                    desc: '', // 新增空描述
                    handlers: [context.goonHandler, context.exitCallBack],
                    curCount: 0,
                    maxCount: 0
                },
                [AlertType.Sucess_Normal]: {
                    title: manager.failCompleteStr,
                    desc: '', // 新增空描述
                    handlers: [context.showNextFailHandler, context.exitCallBack],
                    curCount: 0,
                    maxCount: 0
                },
                [AlertType.Revise_Fail]: {
                    title: manager.failCompleteStr,
                    desc: "",
                    handlers: [context.answerHandler, context.retryHandler],
                    curCount: 0,
                    maxCount: 0
                }
            },
            // 订正模式的配置
            revision: {
                [AlertType.Revise]: {
                    title: manager.reviseStr,
                    desc: "",
                    handlers: [context.nextHandler, context.exitCallBack],
                    curCount: 0,
                    maxCount: 0
                }
            }
        };
        if(manager.isRunOver() && TaskManager.getInstance().curTask.type != TaskType.Revise){
            // 请求任务列表 相当于刷新任务
            EventManager.getInstance().on(TaskManager.TaskListRequestCallBack,()=>{
                
                // 修改状态决策逻辑
                const getAlertConfig = (): {
                    type: AlertType;
                    title: string;
                    desc: string;
                    handlers: Function[]
                } => {

                    // 当complete为1时表示成功通关
                    if (config.success) {
                        const isFinalStage = curCount == maxCount;
                        let strategyKey = AlertType.Normal;
                        if (isFinalStage) {
                            strategyKey = AlertType.Sucess_Normal;
                            // AlertType.Sucess_Big : AlertType.Sucess_Normal;
                        }
        
                        return {
                            type: strategyKey,
                            curCount,
                            maxCount,
                            ...alertStrategies.success[strategyKey]
                        };
                    }
        
                    // 其他情况视为失败
                    const isFinalStage = curCount == maxCount;
                    let failureType = AlertType.Normal;
                    if (isFinalStage) {
                        failureType = AlertType.Sucess_Normal;
                    }
                    return {
                        type: failureType,
                        ...alertStrategies.failure[failureType]
                    };
                };
        
                // 统一调用（修复参数传递）
                const { type, title, desc, handlers } = getAlertConfig();
                const [goonHandler, exitHandler] = handlers;
                manager.showGameAlert(
                    parentNode,
                    type,
                    title,
                    desc,
                    curCount, maxCount,
                    goonHandler,
                    exitHandler,
                    context
                );


            }, this,true);
            TaskManager.getInstance().requestDingzhenTask("correction",TaskManager.getInstance().curTask.id);
        }else{
             // 修改状态决策逻辑
             const getAlertConfig = (): {
                type: AlertType;
                title: string;
                desc: string;
                handlers: Function[]
            } => {

                // 当complete为1时表示成功通关
                if (config.success) {
                    const isFinalStage = curCount == maxCount;
                    let strategyKey =AlertType.Normal;
                    if (isFinalStage) {
                        strategyKey = AlertType.Sucess_Normal;
                    }
                    
    
                    return {
                        type: strategyKey,
                        curCount,
                        maxCount,
                        ...alertStrategies.success[strategyKey]
                    };
                }
    
                // 其他情况视为失败
                const isFinalStage = curCount == maxCount;
                let failureType =AlertType.Normal;
                if(TaskManager.getInstance().curTask.type == TaskType.Revise) {
                    failureType = AlertType.Revise_Fail;
                }else{
                    if (isFinalStage) {
                        failureType = AlertType.Sucess_Normal;
                    }
                }

                return {
                    type: failureType,
                    ...alertStrategies.failure[failureType]
                };
            };
    
            // 统一调用（修复参数传递）
            const { type, title, desc, handlers } = getAlertConfig();
            const [goonHandler, exitHandler] = handlers;
            manager.showGameAlert(
                parentNode,
                type,
                title,
                desc,
                curCount, maxCount,
                goonHandler,
                exitHandler,
                context
            );
        }
    }

    // ===== 最后一个串烧游戏失败后，弹窗继续得回调 =====
    failCompleteHandler = (context: any) => {
    
    }

    // ========= 成功后进入下一类型游戏 =========
    showNextSuccessHandler(context) {
        const manager = SkewersManager.getInstance();
        const isRunOver = manager.isRunOver() ? context.totalCompleteHandler : context.nextHandler;
        manager.showGameAlert(
            context.viewNode,
            AlertType.Sucess_Small,
            manager['currentSkewersCompleteGameStr'],
            manager['singleBrainScore'],
            0, 0,
            isRunOver,
            context.exitCallBack,
            context
        );
    }

    // ======== 失败后进入下一类型游戏 =========
    showNextFailHandler(context) {
        const manager = SkewersManager.getInstance();
        const isRunOver = manager.isRunOver() ? context.totalCompleteHandler : context.nextHandler;
        SkewersManager.getInstance().showGameAlert(context.viewNode, AlertType.Sucess_Small, manager['currentSkewersCompleteGameStr'], manager['singleBrainScore'], 0, 0,
            isRunOver, context.exitCallBack, context);
    }

    // ======= 全部串烧游戏结束 =========
    totalCompleteHandler(context) {
        let alertType = AlertType.Sucess_Big;
        if (SkewersManager.getInstance().isRunOver() && TaskManager.getInstance().isRevise(TaskManager.getInstance().curTask.id)) {
            alertType = AlertType.Revise;
        }
        let exitFunc = alertType == AlertType.Revise ? context.reviseHandler:context.exitCallBack;
        let compStr = alertType == AlertType.Revise ? SkewersManager.getInstance().reviseCompleteStr:SkewersManager.getInstance().totalCompleteStr;
        let remoteHandler = SkewersManager.getInstance().curGame && SkewersManager.getInstance().curGame.is_correction ?null:context.remoteHandler;
        SkewersManager.getInstance().showGameAlert(context.viewNode, alertType, compStr, SkewersManager.getInstance().totalBrainScore, 0, 0,
            exitFunc, remoteHandler, context);
    }

    // ========= 订正任务 =========
    reviseHandler(context){
       SceneManager.getInstance().backToSkewersGameCenterByID(TaskManager.getInstance().curDingzhenTask.id);
    }

    // ========= 订正重玩 ==========
    retryHandler(context){
      if(context.onClickRetryGame){
          context.onClickRetryGame();
      }
    }

    // ========= 订正查看答案 =========
    answerHandler(context){
        if(context.onClickShowAnswer){
            context.onClickShowAnswer();
        }
    }

    // ========= 下一类型游戏 =========
    nextHandler(context) {
        SkewersManager.getInstance().showGameAlert(context.viewNode, AlertType.Next, SkewersManager.getInstance().nextSkewersGameStr, SkewersManager.getInstance().singleBrainScore, 0, 0,
            context.goonHandler, context.exitCallBack, context);
    }

    // ========= 继续下一局游戏 =========
    goonHandler(context?: any, changeScene: boolean = true): void {
        if (!SkewersManager.getInstance().isRunOver()) {
            SkewersManager.getInstance().runNextGame(changeScene);
        } else {
            SkewersManager.getInstance().exitCallBack();
        }
        this.destory();
    }

    // ======== 退出游戏 ========
    exitCallBack(): void {
        SkewersManager.getInstance().exitCallBack();
        this.destory();
    }

    remoteExitCallBack(){
        SkewersManager.getInstance().remoteExitCallBack();
        this.destory();
    }

    // ======== 恢复游戏 ========
    resumeCallBack(): boolean {
        if (SkewersManager.getInstance().isRunOver()) {
            return false;
        }
        return true;
    }

    // ======== 游戏中调用外部逻辑 ======
    remoteHandler() {

    }

    gameMatch(): void {

    }

    destory() {
        // 销毁所有监听
        EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this);
    }

}
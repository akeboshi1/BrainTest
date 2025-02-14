import { Node } from "cc";
import { EventManager } from "../../Core/Manager/Event/EventManager";
import { SkewersGameTrainData } from "../Task/Skewers/SkewersGameData";
import { SkewersManager } from "../Task/Skewers/SkewersManager";
import { BaseGameData, GameType, IBaseGameChild, IQuitGameConfig } from "./BaseGameData";
import { AlertType } from "../UI/Alert/GameAlert";

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
    complete: number;
    duration: number;
    parentNode: Node;
    context: any;
}


export class SkewersSpecGameData extends BaseGameData<ISkewersSpecific> {
    constructor() {
        super();
        this.gameType = GameType.SKEWERS;
    }

    refreshData(data: ISkewersSpecific): void {
        // this.currentChild = data;
        // 具体刷新逻辑...
    }

    runNextGame(): void {
        // 串烧游戏特有逻辑...
        this.nextConfig.nextGame();
    }

    startGame(): void {
        console.log(`Starting ${this.gameType} game...`);
        SkewersManager.getInstance().start();
    }

    quitGame(config?: IQuitGameConfig): void {
        let trainData = SkewersManager.getInstance().getUnCompleteGameData();
        let maxCount = SkewersManager.getInstance().getGameCount();
        let curCount = trainData.seq - 1 < 0 ? 0 : trainData.seq - 1;
        // 退出逻辑...
        SkewersManager.getInstance().quitGame(config.parentNode, curCount, maxCount,
            config.context.resumeCallBack, config.context.exitCallBack, config.context);
    }

    /**
     * 请求上报串烧游戏数据
     * @param config 
     */
    requestGameComplete(config?: ISkewersGameEndConfig): void {
        const callbackWrapper = (data: number) => {
            config.trainID = data;
            this.requestGameCompleteCallBack(config);
        };
        // 完成当前游戏请求...
        EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, callbackWrapper, this);
        SkewersManager.getInstance().requestGameComplete(config.complete, config.duration);
    }

    requestGameCompleteCallBack(config: ISkewersGameEndConfig): void {
        EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this);
    
        const { parentNode, trainID, context } = config;
        const trainData = SkewersManager.getInstance().getTrainData(trainID);
        const [maxCount, curCount] = [trainData.length, Math.max(trainData.seq, 0)];
        const manager = SkewersManager.getInstance();
    
        // 策略配置表（补充desc字段）
        const alertStrategies = {
            success: {
                [AlertType.Sucess_Small]: {
                    title: manager.currentSkewersCompleteGameStr,
                    desc: manager.singleBrainScore,
                    handlers: [context.nextHandler, context.exitCallBack]
                },
                [AlertType.Sucess_Big]: {
                    title: manager.totalCompleteStr,
                    desc: manager.totalBrainScore,
                    handlers: [context.exitCallBack, context.remoteHandler]
                }
            },
            failure: {
                normal: {
                    title: manager.failCompleteStr,
                    desc: '', // 新增空描述
                    handlers: [context.goonHandler, context.exitCallBack]
                },
                complete: {
                    title: manager.failCompleteStr,
                    desc: '', // 新增空描述
                    handlers: [context.failCompleteHandler, context.exitCallBack]
                }
            }
        };
    
        // 状态决策逻辑
        const getAlertConfig = (): { 
            type: AlertType; 
            title: string; 
            desc: string; 
            handlers: Function[] 
        } => {
            if (config.complete) {
                const isFinalStage = maxCount === curCount;
                const strategyKey = isFinalStage && !manager.isRunOver() ? 
                    AlertType.Sucess_Small : AlertType.Sucess_Big;
    
                return {
                    type: strategyKey,
                    ...alertStrategies.success[strategyKey]
                };
            }
    
            const isFailComplete = curCount === maxCount;
            const failureType = isFailComplete ? 'complete' : 'normal';
            return {
                type: AlertType.Normal,
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
            0, 0,
            goonHandler,
            exitHandler,
            context
        );
    }
    
    failCompleteHandler = (context: any) => {
        const manager = SkewersManager.getInstance();
        const alertType = manager.isRunOver() ? AlertType.Sucess_Big : AlertType.Sucess_Small;
        manager.showGameAlert(
            context.viewNode,
            alertType,
            manager[alertType === AlertType.Sucess_Small ? 
                'currentSkewersCompleteGameStr' : 'totalCompleteStr'],
            manager[alertType === AlertType.Sucess_Small ? 
                'singleCompleteStr' : 'totalBrainScore'],
            0, 0,
            alertType === AlertType.Sucess_Small ? 
                context.nextHandler : context.exitCallBack,
            alertType === AlertType.Sucess_Small ? 
                context.exitCallBack : context.remoteClick,
            context
        );

    }


    nextHandler(context) {
        SkewersManager.getInstance().showGameAlert(this.scene.viewNode, AlertType.Next, SkewersManager.getInstance().nextSkewersGameStr, '', 0, 0, 
        context.goonHandler, context.exitCallBack, context);
    }

    goonHandler(context?: any): void {
        if (!SkewersManager.getInstance().isRunOver()) {
            SkewersManager.getInstance().runNextGame();
        } else {
            SkewersManager.getInstance().exitCallBack();
        }
    }

    exitCallBack(): void {
        SkewersManager.getInstance().exitCallBack();
    }

    resumeCallBack(): boolean {
        if (SkewersManager.getInstance().isRunOver) {
            return false;
        }
        return true;
    }
    
    remoteHandler() {
      
    }

    gameMatch(): void {

    }


   exitHandler() {
       
   }
}
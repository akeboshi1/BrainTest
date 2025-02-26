import { director, Node } from "cc";
import { EventManager } from "../../Core/Manager/Event/EventManager";
import { SkewersGameData, SkewersGameTrainData } from "../Task/Skewers/SkewersGameData";
import { SkewersManager } from "../Task/Skewers/SkewersManager";
import { BaseGameData, GameType, IBaseGameChild, IQuitGameConfig, IStartConfig } from "./BaseGameData";
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

    get game(): SkewersGameData {
        return SkewersManager.getInstance().curGame;
    }

    get difficulty(): number {
        return SkewersManager.getInstance().curGame.difficulty;
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
        EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, callbackWrapper, this, true);
        SkewersManager.getInstance().requestGameComplete(config.complete, config.duration);
    }

    requestGameCompleteCallBack(config: ISkewersGameEndConfig): void {
        const { parentNode, trainID, context } = config;
        const trainData = SkewersManager.getInstance().getTrainData(trainID);
        trainData.length
        const [maxCount, curCount] = [trainData.length, Math.max(trainData.seq, 0)];
        const manager = SkewersManager.getInstance();

        // 策略配置表（补充desc字段）
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
                }
                // complete: {
                //     title: manager.failCompleteStr,
                //     desc: '', // 新增空描述
                //     handlers: [context.failCompleteHandler, context.exitCallBack],
                //     curCount:0,
                //     maxCount:0
                // }
            }
        };

        // 修改状态决策逻辑
        const getAlertConfig = (): {
            type: AlertType;
            title: string;
            desc: string;
            handlers: Function[]
        } => {
            // 当complete为1时表示成功通关
            if (config.complete === 1) {
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
    }

    // ===== 最后一个串烧游戏失败后，弹窗继续得回调 =====
    failCompleteHandler = (context: any) => {
        //     const manager = SkewersManager.getInstance();
        //     const alertType = manager.isRunOver() ? AlertType.Sucess_Big : AlertType.Sucess_Small;
        //     manager.showGameAlert(
        //         context.viewNode,
        //         alertType,
        //         manager[alertType === AlertType.Sucess_Small ?
        //             'currentSkewersCompleteGameStr' : 'totalCompleteStr'],
        //         manager[alertType === AlertType.Sucess_Small ?
        //             'singleCompleteStr' : 'totalBrainScore'],
        //         0, 0,
        //         alertType === AlertType.Sucess_Small ?
        //             context.nextHandler : context.exitCallBack,
        //         alertType === AlertType.Sucess_Small ?
        //             context.exitCallBack : context.remoteHandler,
        //         context
        //  );
    }

    // ========= 成功后进入下一类型游戏 =========
    showNextSuccessHandler(context) {
        const manager = SkewersManager.getInstance();
        const isRunOver = manager.isRunOver() ? context.totalCompleteHandler : context.nextHandler;
        manager.showGameAlert(
            context.viewNode,
            AlertType.Sucess_Small,
            manager['currentSkewersCompleteGameStr'],
            manager['singleCompleteStr'],
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
        SkewersManager.getInstance().showGameAlert(context.viewNode, AlertType.Sucess_Small, manager['currentSkewersCompleteGameStr'], manager['singleCompleteStr'], 0, 0,
            isRunOver, context.exitCallBack, context);
    }

    // ======= 全部串烧游戏结束 =========
    totalCompleteHandler(context) {
        SkewersManager.getInstance().showGameAlert(context.viewNode, AlertType.Sucess_Big, SkewersManager.getInstance().totalCompleteStr, SkewersManager.getInstance().totalBrainScore, 0, 0,
            context.exitCallBack, context.remoteHandler, context);
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
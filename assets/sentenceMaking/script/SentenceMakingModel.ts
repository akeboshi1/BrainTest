import { EventManager } from "../../scripts/Core/Manager/Event/EventManager";
import { DebugLog } from "../../scripts/Core/Util/DebugLog";
import { LayerUtil } from "../../scripts/Core/Util/LayerUtil";
import { GameType } from "../../scripts/Game/GameDataFactory/BaseGameData";
import { AlertType } from "../../scripts/Game/UI/Alert/GameAlert";
import { SentenceMakingConfig, SentenceMakingQuestion } from "./SentenceMakingConfig";
import { UIManager } from "db://assets/scripts/Core/Manager/UI/UIManager";
import { GenerateReport } from "db://assets/scripts/Game/UI/PersonalCenter/GenerateReport";
import { SentenceMakingScene } from "db://assets/sentenceMaking/script/SentenceMakingScene";

export class SentenceMakingModel {
    constructor() {
    }

    private binit: boolean = false;

    private config: SentenceMakingConfig = new SentenceMakingConfig();

    private selectedLevel: number = 0;
    private currentQuestionIndex: number = 0;

    private skewerGameQuestionDatas: { level: number, index: number }[] = null;

    private _gameTime: number = 180;

    private _view: SentenceMakingScene;

    async init(view: SentenceMakingScene) {
        if (this.binit) return;
        this.binit = true;

        await this.config.loadConfig();

        this._view = view;

        if (this._view.sceneData.gameType == GameType.SKEWERS) {
            let count = (this._view.sceneData as any).game.trains.length;
            this.skewerGameQuestionDatas = [];
            for (let i = 0; i < count; i++) {
                const trainData = (this._view.sceneData as any).game.trains[i];
                this.skewerGameQuestionDatas.push({ level: trainData.difficulty - 1, index: trainData.level - 1 });
            }

            this.currentQuestionIndex = (this._view.sceneData as any).game.seq - 1;
            let question = this.skewerGameQuestionDatas[this.currentQuestionIndex];
            this.setQuestionLevel(question.level);

            // EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this.onSkewersProgressUpdate, this);
        } else {
            let d = (this._view.sceneData as any).game;
            this.setQuestionLevel(d.difficulty - 1);
            this.currentQuestionIndex = d.level - 1;
        }
    }

    dispose() {
        //     EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this);
    }

    setQuestionLevel(level: number) {
        if (this.config.getQuestionsByLevel(this.selectedLevel).length != 0) {
            this.selectedLevel = level;
        } else {
            DebugLog.instance.warn("this question level is not exist in config! level: " + level);
        }
    }

    getCurrentQuestion(): SentenceMakingQuestion {
        let index = this.currentQuestionIndex;
        if (this._view.sceneData.gameType == GameType.SKEWERS) {
            index = this.skewerGameQuestionDatas[this.currentQuestionIndex].index % this.config.getQuestionsByLevel(this.selectedLevel).length;
        }
        return this.config.getQuestionByLevelAndIndex(this.selectedLevel, index);
    }

    goNextQuestion() {
        if (this._view.sceneData.gameType == GameType.SKEWERS) {
            this.currentQuestionIndex++;
            if (this.skewerGameQuestionDatas[this.currentQuestionIndex] == null) {
                this._view.gotoNextGame();
                // SkewersManager.getInstance().runNextGame();
            } else {
                this.setQuestionLevel(this.skewerGameQuestionDatas[this.currentQuestionIndex].level);
            }
        } else {
            this.selectedLevel = (this.selectedLevel + 1) % 3;//最多3个难度1,2,3
            if (this.selectedLevel == 0) {
                this.currentQuestionIndex = (this.currentQuestionIndex + 1) % this.config.getQuestionsByLevel(this.selectedLevel).length;
            }
        }
    }

    getCurrentLevel(): number {
        return this.selectedLevel;
    }

    getCurrentQuestionIndex(): number {
        return this.currentQuestionIndex;
    }

    hasNextLevel(): boolean {
        if (this._view.sceneData.gameType == GameType.SKEWERS && this.currentQuestionIndex == this.skewerGameQuestionDatas.length - 1) {
            return false;
        }

        return true;
    }

    get gameTime(): number {
        if (this._view.sceneData.gameType == GameType.SKEWERS && this.currentQuestionIndex <= this.skewerGameQuestionDatas.length - 1) {
            return (this._view.sceneData as any).game.timeLimit;
        }

        return this._gameTime;
    }

    private _resultBoo: boolean = false;

    postGameData(complete: boolean, duration: number) {
        this._resultBoo = complete;
        let result = Number(complete);
        if (this._view.sceneData.gameType == GameType.SKEWERS) {
            this._view.requestSkewersGameComplete(result, duration);
            // SkewersManager.getInstance().requestGameComplete(result, duration);
        } else {
            this._view.requestGameCenterComplete(result, this.getCurrentQuestionIndex() + 1, result, duration, this.gameTime, this.getCurrentLevel() + 1);
            // const curGame = GameCenterManager.getInstance().currentGame;
            // GameCenterManager.getInstance().gamePassLevel(curGame.sessionid, result, this.getCurrentQuestionIndex() + 1, result, duration, this.gameTime, this.getCurrentLevel() + 1);
        }
    }

    quitGame() {
        // this._view.pause();
        this._view.quitGame();
        // if (Global.isSkewersGame) {
        //     let trainData = SkewersManager.getInstance().getUnCompleteGameData();
        //     let maxCount = trainData.length;
        //     let curCount = trainData.seq - 1 < 0 ? 0 : trainData.seq - 1;
        //     SkewersManager.getInstance().quitGame(LayerUtil.getPanelLayer(), curCount, maxCount, this.goonHandler, this.exit, this);
        // } else {
        //     // 游戏大厅
        //     console.log("返回大厅")
        //     GameCenterManager.getInstance().quitGame(LayerUtil.getPanelLayer(), this.goonHandler, this.exit, this);
        // }
    }

    // private onSkewersProgressUpdate(data) {
    //     let trainid = data;
    //     let trainData = SkewersManager.getInstance().getTrainData(trainid);
    //     let maxCount = trainData.parentSkewersGameData.trains.length;
    //     let curCount = trainData.seq;

    //     // 游戏内界面提示
    //     if (this._resultBoo) {
    //         if (maxCount != curCount) {
    //             SkewersManager.getInstance().showGameTip(SkewersManager.getInstance().singleCompleteStr, curCount, maxCount);
    //         } else {
    //             if (!SkewersManager.getInstance().isRunOver()) {
    //                 SkewersManager.getInstance().showGameAlert(LayerUtil.getPanelLayer(), AlertType.Sucess_Small, SkewersManager.getInstance().currentSkewersCompleteGameStr, SkewersManager.getInstance().singleBrainScore, 0, 0, this.alertGoonHandler1, this.exit, this);
    //             } else {
    //                 SkewersManager.getInstance().showGameAlert(LayerUtil.getPanelLayer(), AlertType.Sucess_Big, SkewersManager.getInstance().totalCompleteStr, SkewersManager.getInstance().totalBrainScore, 0, 0, this.totalComplete, this.remoteClick, this);
    //             }
    //         }
    //     } else {
    //         if (curCount == maxCount) {
    //             SkewersManager.getInstance().showGameAlert(LayerUtil.getPanelLayer(), AlertType.Normal, SkewersManager.getInstance().failCompleteStr, "", curCount, maxCount, this.failCompleteHandler, this.exit, this);
    //         } else {
    //             SkewersManager.getInstance().showGameAlert(LayerUtil.getPanelLayer(), AlertType.Normal, SkewersManager.getInstance().failCompleteStr, "", curCount, maxCount, this.alertGoonHandler, this.exit, this);
    //         }
    //     }
    // }

    // private failCompleteHandler(context) {
    //     this._view.failCompleteHanlder(context);
    //     if (!SkewersManager.getInstance().isRunOver()) {
    //          SkewersManager.getInstance().showGameAlert(LayerUtil.getPanelLayer(), AlertType.Sucess_Small, SkewersManager.getInstance().currentSkewersCompleteGameStr, SkewersManager.getInstance().singleCompleteStr, 0, 0, context.skewersGoNext, context.exit, context);
    //     } else {
    //          SkewersManager.getInstance().showGameAlert(LayerUtil.getPanelLayer(), AlertType.Sucess_Big, SkewersManager.getInstance().totalCompleteStr, SkewersManager.getInstance().totalBrainScore, 0, 0, context.totalComplete, context.remoteClick, context);
    //     }
    // }

    // private skewersGoNext() {
    //     SkewersManager.getInstance().showGameAlert(LayerUtil.getPanelLayer(), AlertType.Next, SkewersManager.getInstance().nextSkewersGameStr, '', 0, 0, this.goNextGame, this.exit, this);
    // }

    // private nextHandler(context) {
    //     if (!SkewersManager.getInstance().isRunOver()) {
    //         SkewersManager.getInstance().runNextGame();
    //     } else {
    //         SkewersManager.getInstance().exitCallBack();
    //     }
    // }


    // private alertGoonHandler(context) {
    //     if (!SkewersManager.getInstance().isRunOver()) {
    //         SkewersManager.getInstance().runNextGame(false);
    //         context._view.clickNextLeve();
    //     } else {
    //         SkewersManager.getInstance().exitCallBack();
    //     }
    // }

    // private remoteClick() {
    //     this.exit();
    //     UIManager.getInstance().showPanel(GenerateReport.NAME);
    // }

    // private goNextGame(context) {
    //     if (Global.isSkewersGame) {
    //         SkewersManager.getInstance().runNextGame(false);
    //         context._view.clickNextLeve();
    //     }
    // }

    // private goonHandler(context) {
    //     let self = context;
    //     if (Global.isSkewersGame) {
    //         if (!SkewersManager.getInstance().isRunOver()) {
    //             self._view.resume();
    //         }
    //     } else {
    //         self._view.resume();
    //     }
    // }

    // private totalComplete() {
    //     SkewersManager.getInstance().exitCallBack();
    // }

    // private exit() {
    //     if (Global.isSkewersGame) {
    //         SkewersManager.getInstance().exitCallBack();
    //     } else {
    //         GameCenterManager.getInstance().exitCallBack();
    //     }
    // }
}

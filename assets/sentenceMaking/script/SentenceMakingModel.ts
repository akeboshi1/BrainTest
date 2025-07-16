import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";
import { SentenceMakingConfig, SentenceMakingQuestion } from "./SentenceMakingConfig";
import { SentenceMakingScene } from "db://assets/sentenceMaking/script/SentenceMakingScene";
import { GameType } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { EventManager } from "../../resources/scripts/Core/Manager/Event/EventManager";
import { SocketData } from "../../resources/scripts/Core/Manager/Net/SocketData";
import { SocketManager } from "../../resources/scripts/Core/Manager/Net/SocketManager";
import {Global} from "db://assets/resources/scripts/Core/Manager/Config/Global";

export class SentenceMakingModel {
    constructor() {
    }

    private binit: boolean = false;

    private sentence_making_evaluate: string = "sentence_making.evaluate";

    private config: SentenceMakingConfig = new SentenceMakingConfig();

    private selectedDifficult: number = 0;
    private currentQuestionLevel: number = 0;

    private skewerGameQuestionDatas;

    private _gameTime: number = 180;

    private _view: SentenceMakingScene;

    async init(view: SentenceMakingScene) {
        if (this.binit) return;
        this.binit = true;

        await this.config.loadConfig();

        this._view = view;

        if (this._view.sceneModel.gameType == GameType.SKEWERS) {
            this.skewerGameQuestionDatas = (this._view.sceneModel as any).game.trains;

            this.currentQuestionLevel = (this._view.sceneModel as any).game.level;
            this.setQuestionDifficult((this._view.sceneModel as any).difficulty);
        } else {
            let d = (this._view.sceneModel as any).game;
            this.setQuestionDifficult(d.difficulty);
            this.currentQuestionLevel = d.level;
        }
    }

    dispose() {
        EventManager.getInstance().off(this.sentence_making_evaluate, this);
    }

    setQuestionDifficult(difficult: number) {
        if (this.config.getQuestionsByDifficult(this.selectedDifficult).length != 0) {
            this.selectedDifficult = difficult;
        } else {
            DebugLog.instance.warn("this question difficult is not exist in config! difficult: " + difficult);
        }
    }

    getCurrentQuestion(): SentenceMakingQuestion {
        let index = this.currentQuestionLevel;
        return this.config.getQuestionByDifficultAndLevel(this.selectedDifficult, index - 1);
    }

    getQuestionMaxNum(): number {
        return this.config.getQuestionMaxNum(this.selectedDifficult);
    }

    get isRunOver(): boolean {
        let count = this.skewerGameQuestionDatas.length;
        for (let i = 0; i < count; i++) {
            const data = this.skewerGameQuestionDatas[i];
            if (data.level == this.currentQuestionLevel && data.difficulty == this.selectedDifficult) {
                return data.status == 1;
            }
        }
        return false;
    }

    goNextQuestion() {
        if (this._view.sceneModel.gameType == GameType.SKEWERS) {
            let sceneModel = this._view.sceneModel as any;
            if (sceneModel.hasCompleteCurGame) {
                this._view.gotoNextGame();
            } else {
                let trainData = (this._view.sceneModel as any).game.getCurTrainData();
                this.setQuestionDifficult(trainData.difficulty);
                this.currentQuestionLevel = trainData.level;
            }

        } else {
            this.setQuestionDifficult((this._view.sceneModel as any).difficulty)//((this.selectedDifficult + 1) % 3 == 0 ? 3 : (this.selectedDifficult + 1) % 3);//最多3个难度1,2,3
            this.currentQuestionLevel = (this._view.sceneModel as any).game.getLevelByDifficult(this.selectedDifficult);
        }
    }

    requestGameCompleteCallBack() {
        this.goNextQuestion();
    }

    getCurrentDifficult(): number {
        return this.selectedDifficult;
    }

    getcurrentQuestionLevel(): number {
        return this.currentQuestionLevel;
    }

    hasNextLevel(): boolean {
        if (this._view.sceneModel.gameType == GameType.SKEWERS) {
            return false;
        }

        return true;
    }

    get gameTime(): number {
        if (this._view.sceneModel.gameType == GameType.SKEWERS && !(this._view.sceneModel as any).hasCompleteCurGame) {
            return (this._view.sceneModel as any).game.timeLimit;
        }

        return this._gameTime;
    }

    postGameData(complete: number, duration: number, user_answer: string[] = null) {
        if (user_answer != null) {
            this.postSentenceMakingEvaluate(user_answer);
        }
        if (this._view.sceneModel.gameType == GameType.SKEWERS) {
            this._view.requestSkewersGameComplete(complete, duration);
        } else {
            let curGame = (this._view.sceneModel as any).game;
            // levelmode=1得时候，如何传递level和难度给服务器
            let count=complete*(this.getCurrentQuestion().sentence.length-this.getCurrentQuestion().fixed.length);
            DebugLog.instance.log('正确数量为-',count);
            
            let difficulty = this.getCurrentDifficult() == 3 ? 3 : this.getCurrentDifficult();
            let level = curGame.getLevelByDifficult(difficulty);
            this._view.requestGameCenterComplete(count, level, complete, duration, this.gameTime, difficulty, curGame.levelMode);
        }
    }

    private postSentenceMakingEvaluate(user_answer: string[]) {
        let entry_id = "";
        if (this._view.sceneModel.gameType == GameType.SKEWERS) {
            entry_id = (this._view.sceneModel as any).game.getCurTrainData().brain_training_id;
        } else {
            entry_id = (this._view.sceneModel as any).game.sessionid;
        }

        let data = {
            entry_type: this._view.sceneModel.gameType == GameType.SKEWERS ? 1 : 2,
            entry_id: entry_id,
            sentence: this.getCurrentQuestion().sentence,
            user_answer: user_answer,
        };
        let socketdata = new SocketData({ action: this.sentence_making_evaluate, data });
        DebugLog.instance.log("postSentenceMakingEvaluate data = " + JSON.stringify(data));

        EventManager.getInstance().on(this.sentence_making_evaluate, this.evaluateCallback, this, true);
        SocketManager.getInstance().send(socketdata);
    }
    private evaluateCallback(data) {
        DebugLog.instance.log("evaluateCallback result = " + data.status);
    }

    quitGame() {
        this._view.quitGame();
    }
}

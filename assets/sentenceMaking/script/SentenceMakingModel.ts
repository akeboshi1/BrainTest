import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";
import { SentenceMakingConfig, SentenceMakingQuestion } from "./SentenceMakingConfig";
import { SentenceMakingScene } from "db://assets/sentenceMaking/script/SentenceMakingScene";
import {GameType} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";

export class SentenceMakingModel {
    constructor() {
    }

    private binit: boolean = false;

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
            // let count = (this._view.sceneModel as any).game.trains.length;
            this.skewerGameQuestionDatas = (this._view.sceneModel as any).game.trains;
            // for (let i = 0; i < count; i++) {
            //     const trainData = (this._view.sceneModel as any).game.trains[i];
            //     this.skewerGameQuestionDatas.push(trainData);
            // }

            this.currentQuestionLevel = (this._view.sceneModel as any).game.level;
            this.setQuestionDifficult((this._view.sceneModel as any).difficulty);
            // this.selectedDifficult = (this._view.sceneModel as any).difficulty;
            // let question = this.config.getQuestionByDifficultAndLevel(this.selectedDifficult,this.currentQuestionLevel);
            // this.setQuestionDifficult(question.difficult);
            // EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this.onSkewersProgressUpdate, this);
        } else {
            let d = (this._view.sceneModel as any).game;
            this.setQuestionDifficult(d.difficulty);
            this.currentQuestionLevel = d.level;
        }
    }

    dispose() {
        //     EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this);
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
        if (this._view.sceneModel.gameType == GameType.SKEWERS) {
            index = this.currentQuestionLevel % this.config.getQuestionsByDifficult(this.selectedDifficult).length;
            let question = this.config.getQuestionByDifficultAndLevel(this.selectedDifficult,index-1);
            if(!question) {
                return null;
            }
            return question;
        }
        return this.config.getQuestionByDifficultAndLevel(this.selectedDifficult,index - 1);
    }

    get isRunOver():boolean{
        let count = this.skewerGameQuestionDatas.length;
        for (let i = 0; i < count; i++) {
            const data = this.skewerGameQuestionDatas[i];
            if(data.level == this.currentQuestionLevel && data.difficulty == this.selectedDifficult){
                return data.status == 1;
            }
        }
        return false;
        // return this.skewerGameQuestionDatas[this.currentQuestionLevel] == null;
    }

    goNextQuestion() {
        if (this._view.sceneModel.gameType == GameType.SKEWERS) {
            let sceneModel = this._view.sceneModel as any;
            if(sceneModel.hasCompleteCurGame){
                this._view.gotoNextGame();
            }else{
                let trainData = (this._view.sceneModel as any).game.getCurTrainData();
                this.setQuestionDifficult(trainData.difficulty);
                this.currentQuestionLevel = trainData.level;
            }

            // this.currentQuestionLevel++;
            // if (this.skewerGameQuestionDatas[this.currentQuestionLevel] == null) {
            //     this._view.gotoNextGame();
            //     // SkewersManager.getInstance().runNextGame();
            // } else {
            //     this.setQuestionDifficult(this.skewerGameQuestionDatas[this.currentQuestionLevel].difficult);
            // }
        } else {
            //this.currentQuestionLevel = (this.currentQuestionLevel + 1) % this.config.getQuestionsByDifficult(this.selectedDifficult).length;
            this.setQuestionDifficult((this.selectedDifficult + 1) % 3 == 0?3:(this.selectedDifficult+1) % 3);//最多3个难度1,2,3
            this.currentQuestionLevel = (this._view.sceneModel as any).game.getLevelByDifficult(this.selectedDifficult);
            // if (this.selectedDifficult == 0) {
            //     this.currentQuestionLevel = (this.currentQuestionLevel + 1) % this.config.getQuestionsByDifficult(this.selectedDifficult).length;
            // }
        }
    }

    requestGameCompleteCallBack(){
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

    private _resultBoo: boolean = false;

    postGameData(complete: boolean, duration: number) {
        this._resultBoo = complete;
        let result = Number(complete);
        if (this._view.sceneModel.gameType == GameType.SKEWERS) {
            this._view.requestSkewersGameComplete(result, duration);
            // SkewersManager.getInstance().requestGameComplete(result, duration);
        } else {
            let curGame = (this._view.sceneModel as any).game;
            // levelmode=1得时候，如何传递level和难度给服务器
            let difficulty = this.getCurrentDifficult() == 3 ? 3 : this.getCurrentDifficult();
            let level = curGame.getLevelByDifficult(difficulty);
            this._view.requestGameCenterComplete(result, level, result, duration, this.gameTime, difficulty,curGame.levelMode);
            // const curGame = GameCenterManager.getInstance().currentGame;
            // GameCenterManager.getInstance().gamePassLevel(curGame.sessionid, result, this.getcurrentQuestionLevel() + 1, result, duration, this.gameTime, this.getCurrentLevel() + 1);
        }
    }

    quitGame() {
        this._view.quitGame();
    }
}

import {Global} from "../../scripts/Core/Manager/Config/Global";
import {EventManager} from "../../scripts/Core/Manager/Event/EventManager";
import {DebugLog} from "../../scripts/Core/Util/DebugLog";
import {LayerUtil} from "../../scripts/Core/Util/LayerUtil";
import {GameCenterManager} from "../../scripts/Game/GameCenter/GameCenterManager";
import {SkewersManager} from "../../scripts/Game/Task/Skewers/SkewersManager";
import {AlertType} from "../../scripts/Game/UI/Alert/GameAlert";
import {SentenceMakingConfig, SentenceMakingQuestion} from "./SentenceMakingConfig";
import {UIManager} from "db://assets/scripts/Core/Manager/UI/UIManager";
import {GenerateReport} from "db://assets/scripts/Game/UI/PersonalCenter/GenerateReport";
import {SentenceMakingScene} from "db://assets/sentenceMaking/script/SentenceMakingScene";
import {GameType} from "db://assets/scripts/Game/Task/Skewers/SkewersGameData";

export class SentenceMakingModel {
    constructor() {
    }

    private binit: boolean = false;

    private config: SentenceMakingConfig = new SentenceMakingConfig();

    private selectedLevel: number = 0;
    private currentQuestionIndex: number = 0;

    private skewerGameQuestionDatas: {level:number,index:number}[] = null;

    private _gameTime: number = 180;

    private _view:SentenceMakingScene;

    async init(view:SentenceMakingScene) {
        if (this.binit) return;
        this.binit = true;

        await this.config.loadConfig();

        this._view = view;
        if (Global.isSkewersGame) {
            let count = Global.userData.curSkewerGameData.trains.length;
            this.skewerGameQuestionDatas = [];
            for(let i=0;i<count;i++){
                const trainData = Global.userData.curSkewerGameData.trains[i];
                this.skewerGameQuestionDatas.push({level:trainData.difficulty - 1,index:trainData.level - 1});
            }
            
            this.currentQuestionIndex = Global.userData.curSkewerGameData.seq-1;
            let question = this.skewerGameQuestionDatas[this.currentQuestionIndex];
            this.setQuestionLevel(question.level);

            EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this.onSkewersProgressUpdate, this);
        } else {
            let d = GameCenterManager.getInstance().currentGame;
            this.setQuestionLevel(d.difficulty - 1);
            this.currentQuestionIndex = d.level - 1;
        }
    }

    dispose() {
        EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this);
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
        if(Global.isSkewersGame){
            index = this.skewerGameQuestionDatas[this.currentQuestionIndex].index % this.config.getQuestionsByLevel(this.selectedLevel).length;
        }
        return this.config.getQuestionByLevelAndIndex(this.selectedLevel, index);
    }

    goNextQuestion() {
        if(Global.isSkewersGame){
            if(Global.userData.curSkewerGameData.type != GameType.Language){
                SkewersManager.getInstance().runNextGame();
            }else{
                this.currentQuestionIndex++;
                this.setQuestionLevel(this.skewerGameQuestionDatas[this.currentQuestionIndex].level);
            }
        }else{
            this.selectedLevel = (this.selectedLevel+1) % 3;//最多3个难度1,2,3
            if(this.selectedLevel == 0){
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
        if (Global.isSkewersGame && this.currentQuestionIndex == this.skewerGameQuestionDatas.length - 1) {
            return false;
        }

        return true;
    }

    get gameTime(): number {
        if (Global.isSkewersGame && this.currentQuestionIndex <= this.skewerGameQuestionDatas.length - 1) {
            return Global.userData.curSkewerGameData.timeLimit;
        }

        return this._gameTime;
    }

    private _resultBoo:boolean = false;

    postGameData(complete: boolean, duration: number) {
        this._resultBoo = complete;
        let result = Number(complete);
        if (Global.isSkewersGame) {
            SkewersManager.getInstance().requestGameComplete(result, duration);
        } else {
            const curGame = GameCenterManager.getInstance().currentGame;
            GameCenterManager.getInstance().gamePassLevel(curGame.sessionid, result, this.getCurrentQuestionIndex() + 1, result, duration, this.gameTime, this.getCurrentLevel() + 1);
        }
    }

    quitGame(){
        this._view.pause();
        if(Global.isSkewersGame) {
            let trainData = SkewersManager.getInstance().getUnCompleteGameData();
            let maxCount = trainData.length;
            let curCount = trainData.seq - 1<0?0:trainData.seq -1;
            SkewersManager.getInstance().quitGame(LayerUtil.getPanelLayer(),curCount,maxCount,this.goonHandler,this.exit,this);
        }else{
            // 游戏大厅
            console.log("返回大厅")
            GameCenterManager.getInstance().quitGame(LayerUtil.getPanelLayer(),this.goonHandler,this.exit,this);
        }
    }

    private onSkewersProgressUpdate(data) {
        let trainid = data;
        let trainData = SkewersManager.getInstance().getTrainData(trainid);
        let maxCount = trainData.parentSkewersGameData.trains.length;
        let curCount = trainData.seq;

        // 游戏内界面提示
        if(this._resultBoo){
            if (maxCount != curCount) {
                SkewersManager.getInstance().showGameTip(SkewersManager.getInstance().singleCompleteStr, curCount, maxCount);
            } else {
                if (!SkewersManager.getInstance().isRunOver()) {
                    SkewersManager.getInstance().showGameAlert(LayerUtil.getPanelLayer(), AlertType.Sucess_Small, SkewersManager.getInstance().currentSkewersCompleteGameStr,SkewersManager.getInstance().singleBrainScore, 0, 0, this.alertGoonHandler1, this.exit, this);
                } else {
                    SkewersManager.getInstance().showGameAlert(LayerUtil.getPanelLayer(), AlertType.Sucess_Big, SkewersManager.getInstance().totalCompleteStr,SkewersManager.getInstance().totalBrainScore, 0, 0, this.exit, this.remoteClick, this);
                }
            }
        }else{
            if(curCount == maxCount){
                SkewersManager.getInstance().showGameAlert(LayerUtil.getPanelLayer(),AlertType.Normal,SkewersManager.getInstance().failCompleteStr,"",curCount,maxCount,this.failCompleteHandler,this.exit,this);
            }else{
                SkewersManager.getInstance().showGameAlert(LayerUtil.getPanelLayer(),AlertType.Normal,SkewersManager.getInstance().failCompleteStr,"",curCount,maxCount,this.alertGoonHandler,this.exit,this);
            }
        }
    }

    private failCompleteHandler(context){
        if (!SkewersManager.getInstance().isRunOver()) {
            SkewersManager.getInstance().showGameAlert(LayerUtil.getPanelLayer(),AlertType.Sucess_Small, SkewersManager.getInstance().currentSkewersCompleteGameStr, SkewersManager.getInstance().singleCompleteStr,0,0,context.skewersGoNext,context.exit,context);
        }else{
            SkewersManager.getInstance().showGameAlert(LayerUtil.getPanelLayer(),AlertType.Sucess_Big,SkewersManager.getInstance().totalCompleteStr,SkewersManager.getInstance().totalBrainScore,0,0,context.exit,context.remoteClick,context);
        }
    }

    private skewersGoNext() {
        SkewersManager.getInstance().showGameAlert(LayerUtil.getPanelLayer(), AlertType.Next, SkewersManager.getInstance().nextSkewersGameStr, '', 0, 0, this.goNextGame, this.exit, this);
    }

    private alertGoonHandler1(context){
        if (!SkewersManager.getInstance().isRunOver()) {
            SkewersManager.getInstance().runNextGame();
        }else{
            SkewersManager.getInstance().exitCallBack();
        }
    }


    private alertGoonHandler(context){
        if (!SkewersManager.getInstance().isRunOver()) {
            SkewersManager.getInstance().runNextGame(false);
            context._view.clickNextLeve();
        }else{
            SkewersManager.getInstance().exitCallBack();
        }
    }

    private remoteClick(){
        this.exit();
        UIManager.getInstance().showPanel(GenerateReport.NAME);
    }

    private goNextGame(context){
        if(Global.isSkewersGame) {
            SkewersManager.getInstance().runNextGame(false);
            context._view.clickNextLeve();
        }
    }

    private goonHandler(context){
        let self = context;
        if(Global.isSkewersGame) {
            if(!SkewersManager.getInstance().isRunOver()){
                self._view.resume();
            }
        }else{
            self._view.resume();
        }
    }

    private exit() {
        if (Global.isSkewersGame) {
            SkewersManager.getInstance().exitCallBack();
        } else {
            GameCenterManager.getInstance().exitCallBack();
        }
    }
}

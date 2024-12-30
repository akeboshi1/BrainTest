import { _decorator, Component, EventTouch, Label, Node } from 'cc';
import { GuessingGameEvent, GuessingGameModel } from './GuessingGameModel';
import { GuessingGameTimerComponent } from './GuessingGameTimerComponent';
import { FrameComponent } from '../../scripts/Core/Component/FrameComponent';
import { EventManager } from '../../scripts/Core/Manager/Event/EventManager';
import { GuessingQuestion } from './GuessingGameConfig';
import { RollingSubtitleComponent } from './RollingSubtitleComponent';
import AlertManager, { AlertData } from '../../scripts/Core/Manager/Alert/AlertManager';
import { SceneManager } from '../../scripts/Core/Manager/Scene/SceneManager';
import { Global } from "db://assets/scripts/Core/Manager/Config/Global";
import { SkewersManager } from "db://assets/scripts/Game/Task/Skewers/SkewersManager";
import { AlertType } from "db://assets/scripts/Game/UI/Alert/GameAlert";
import { TimeUtil } from "db://assets/scripts/Core/Util/TimeUtil";
import { GameCenterManager } from "db://assets/scripts/Game/GameCenter/GameCenterManager";
const { ccclass, property } = _decorator;

@ccclass('GuessingGameScene')
export class GuessingGameScene extends Component {

    @property(GuessingGameTimerComponent)
    private timerRT: GuessingGameTimerComponent = null;

    @property(GuessingGameTimerComponent)
    private timerStartGame: GuessingGameTimerComponent = null;

    @property(Node)
    private questionNode: Node = null;

    @property(Label)
    private questionLabel: Label = null;

    @property(RollingSubtitleComponent)
    private rollingSubtitleCom: RollingSubtitleComponent = null;

    @property(Node)
    private optionsNode: Node = null;

    @property(Node)
    private replayNode: Node = null;

    @property(FrameComponent)
    private frameComponent: FrameComponent = null;

    @property(Node)
    private resultPanel: Node = null;

    @property(Node)
    private successTextNode: Node = null;

    @property(Node)
    private failedTextNode: Node = null;

    @property(Node)
    viewNode: Node = null;

    private options: string[] = ['a', 'b', 'c', 'd'];

    private guessingGameModel: GuessingGameModel = new GuessingGameModel();
    private bInit: boolean = false;

    private currentQuestion: GuessingQuestion = null;

    private _startTime: number = 0;

    private _curHard: number = 0;

    start() {
        if (!this.bInit) {
            this.guessingGameModel.init();
            this.bInit = true;
        }
        this.resetPanel();
    }

    protected onEnable(): void {
        EventManager.getInstance().on(GuessingGameEvent.INIT_COMPLETE, this.onModelInitComplete, this);
        EventManager.getInstance().on(GuessingGameEvent.SHOW_QUESTION, this.onShowQuestion, this);
        EventManager.getInstance().on(GuessingGameEvent.AUDIO_STARTED, this.onAudioStart, this);
        EventManager.getInstance().on(GuessingGameEvent.AUDIO_FINISHED, this.onAudioFinish, this);

        this.timerStartGame.on('timer-end', this.startAnswer, this);
        this.timerRT.on('timer-end', this.answerOutOfTime, this);
    }

    protected onDisable(): void {
        EventManager.getInstance().off(GuessingGameEvent.INIT_COMPLETE, this);
        EventManager.getInstance().off(GuessingGameEvent.SHOW_QUESTION, this);
        EventManager.getInstance().off(GuessingGameEvent.AUDIO_STARTED, this);
        EventManager.getInstance().off(GuessingGameEvent.AUDIO_FINISHED, this);

        EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this);

        this.timerStartGame.off('timer-end', this.startAnswer, this);
        this.timerRT.off('timer-end', this.answerOutOfTime, this);
    }

    update(deltaTime: number) {

    }

    protected onDestroy(): void {
        if (this.guessingGameModel) {
            this.guessingGameModel.dispose();
            this.guessingGameModel = null;
        }
    }

    private onModelInitComplete() {
        //打开介绍界面；
        let alertData: AlertData = new AlertData();
        alertData.title = "提示";
        alertData.message = "请认真聆听“可乐派”给出的题目，然后在选项中选出正确答案！";
        alertData.confirmButtonText = "开始游戏";
        alertData.cancelButtonVisible = false;
        alertData.confirmCb = this.startGameFlow.bind(this);

        AlertManager.getInstance().showAlert(alertData);
    }

    private startGameFlow() {
        this.guessingGameModel.startQuestionFlow();
    }

    private onShowQuestion(data: any) {
        this.questionNode.active = true;
        const question: GuessingQuestion = data.question;
        this.currentQuestion = question;
        this.questionLabel.string = question.questionText;

        for (var i = 0; i < this.options.length; i++) {
            let op: string = this.options[i];
            let opnode: Node = this.optionsNode.getChildByName("choosen_" + op);
            if (opnode) {
                opnode.getChildByName("label").getComponent(Label).string = question.options[op];
            }
        }

        this.timerStartGame.node.active = false;
    }

    private onAudioStart() {
        this.frameComponent.playAnimation("speak", 24, true, true);
    }

    private onAudioFinish() {
        this.frameComponent.playAnimation("idle", 16, true, true);
        // this._startTime = TimeUtil.getNow();
        // this.timerStartGame.node.active = true;
        // this.timerStartGame.startTimer(5);
        this.startAnswer();
    }

    private startAnswer() {
        this.questionNode.active = false;
        this.optionsNode.active = true;
        this._startTime = TimeUtil.getNow();
        this.timerRT.node.active = true;
        this.timerRT.startTimer(30);

        this.replayNode.active = true;

        this.rollingSubtitleCom.resetString(this.currentQuestion.questionText);
    }

    private answerOutOfTime() {
        this.processAnswer();
    }

    private processAnswer(ans: string = null) {
        this.pauseTime();

        const result: boolean = ans && this.currentQuestion.answer == ans;
        this.resultPanel.active = true;
        if (Global.isSkewersGame) {
            this.successTextNode.active = false;
            this.failedTextNode.active = false;
            this.requestGameResult(result);
            if (SkewersManager.getInstance().isRunOver()) {
                SkewersManager.getInstance().showGameAlert(this.viewNode, AlertType.Sucess_Big, "太棒了，恭喜你全部通关", "收获xxx点脑力值！", 0, 0, null, this.exitCallBack, this);
                return;
            }
            // if(!result){
            //     let trainData = SkewersManager.getInstance().getUnCompleteGameData();
            //     let maxCount = SkewersManager.getInstance().getGameCount();
            //     let curCount = trainData.seq<0?0:trainData.seq-1;
            //     SkewersManager.getInstance().showGameAlert(this.viewNode,AlertType.Normal, "真遗憾，请加油！",'',curCount,maxCount,this.onClickGotoNextlevel1,this.exitCallBack,this);
            //     return;
            // }
            EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this.requestSkewersGameComplete, this, true);
        } else {
            this.successTextNode.active = result;
            this.failedTextNode.active = !result;
        }
    }

    private requestSkewersGameComplete(data) {
        let trainid = data;
        let trainData = SkewersManager.getInstance().getTrainData(trainid);
        let maxCount = trainData.parentSkewersGameData.trains.length;
        let curCount = trainData.seq;
        // 游戏内界面提示
        if (maxCount != curCount) {
            SkewersManager.getInstance().showGameAlert(this.viewNode, AlertType.Normal, "太棒了，请继续！", "", curCount, maxCount, this.onClickGotoNextlevel1, this.exitCallBack, this);
        } else {
            if (!SkewersManager.getInstance().isRunOver()) {
                SkewersManager.getInstance().showGameAlert(this.viewNode, AlertType.Sucess_Small, "太棒了，恭喜你通关猜谜游戏", "收获xxx点脑力值！", 0, 0, this.nextAlertHandler, this.exitCallBack, this);
            } else {
                SkewersManager.getInstance().showGameAlert(this.viewNode, AlertType.Sucess_Big, "太棒了，恭喜你全部通关", "收获xxx点脑力值！", 0, 0, this.exitCallBack, this.exitCallBack, this);
            }
        }
    }

    private requestGameResult(win: boolean = true) {
        // 上报数据
        let endTime = TimeUtil.getNow();
        let complete = Number(win);
        if (this._startTime == 0) {
            this._startTime = endTime;
        }
        let duration = (endTime - this._startTime) / 1000;
        SkewersManager.getInstance().requestGameComplete(complete, duration);
    }

    private exitCallBack(context) {
        context.guessingGameModel.stopAudio();
        context.pauseTime();
        if (Global.isSkewersGame) {
            SkewersManager.getInstance().exitCallBack();
        } else {
            GameCenterManager.getInstance().exitCallBack();
        }
    }

    nextAlertHandler(context) {
        let gameData = SkewersManager.getInstance().getUnCompleteGameData();
        SkewersManager.getInstance().showGameAlert(context.viewNode, AlertType.Next, `接下来将进入${gameData.gameName}游戏`, '', 0, 0, context.onClickGotoNextlevel, context.exitCallBack, context);
    }

    onClickGotoNextlevel() {
        // if(Global.isSkewersGame){
        //     SkewersManager.getInstance().runNextGame();
        //     return;
        // }
        // 下一关
        this.onClickContinueGame();
    }

    onClickGotoNextlevel1(context) {
        if (Global.isSkewersGame) {
            if (SkewersManager.getInstance().isRunOver()) {
                SkewersManager.getInstance().exitCallBack();
            } else {
                context.onClickGotoNextlevel();
            }
        } else {
            // GameCenterManager.getInstance().exitCallBack();
        }
    }

    onClickReplay() {
        this.guessingGameModel.replayQuestionAudio();
    }

    onChooseOption(event: EventTouch, p: string) {
        this.processAnswer(p);
    }

    /**
     * 进入下一局游戏
     */
    onClickContinueGame() {
        this.resetPanel();
        this.guessingGameModel.goNextQuestion();
        this.resultPanel.active = false;
    }

    onClickBack() {
        this.guessingGameModel.stopAudio();
        if (Global.isSkewersGame) {
            let trainData = SkewersManager.getInstance().getUnCompleteGameData();
            let maxCount = SkewersManager.getInstance().getGameCount();
            let curCount = trainData.seq - 1 < 0 ? 0 : trainData.seq - 1;
            SkewersManager.getInstance().quitGame(this.viewNode, curCount, maxCount, this.goonCallBack, this.exitCallBack, this);
        } else {
            GameCenterManager.getInstance().exitCallBack();
        }
    }

    private goonCallBack(context) {
        context.guessingGameModel.replayQuestionAudio();
        if (Global.isSkewersGame) {
            if (!SkewersManager.getInstance().isRunOver()) {
                context.resumeTime();
            }
        } else {
            context.resumeTime();
        }
    }

    resumeTime() {
        this.timerRT.resumeTimer();
        this.timerStartGame.resumeTimer();
    }

    pauseTime() {
        this.timerRT.pauseTimer();
        this.timerStartGame.pauseTimer();
    }


    resetPanel() {

        if (Global.isSkewersGame) {
            // 临时处理
            // Global.userData.curSkewerGameData.difficulty
            Global.userData.curSkewerGameData.difficulty = this.guessingGameModel.currentQuestionIndex;
        } else {
            this.guessingGameModel.currentQuestionIndex;
        }

        this.guessingGameModel.stopAudio();

        this.resumeTime();
        this.timerRT.node.active = false;
        this.timerStartGame.node.active = false;

        this.resultPanel.active = false;

        this.replayNode.active = false;
        this.optionsNode.active = this.questionNode.active = false;

        this.frameComponent.playAnimation("idle", 16, true, true);
    }
}

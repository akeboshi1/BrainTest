import { _decorator, Button, Color, color, Component, Enum, EventTouch, Label, Node, Sprite } from 'cc';
import { GuessingGameEvent, GuessingGameModel } from './GuessingGameModel';
import { FrameComponent } from '../../resources/scripts/Core/Component/FrameComponent';
import { EventManager } from '../../resources/scripts/Core/Manager/Event/EventManager';
import { GuessingQuestion } from './GuessingGameConfig';
import { RollingSubtitleComponent } from './RollingSubtitleComponent';
import AlertManager, { AlertData } from '../../resources/scripts/Core/Manager/Alert/AlertManager';
import { TimeUtil } from "db://assets/resources/scripts/Core/Util/TimeUtil";
import { TimerCommonComponent } from '../../resources/scripts/Game/UI/Common/TimerCommonComponent';
import {BaseScene} from "db://assets/resources/scripts/Core/Scene/BaseScene";
import {GameType, IBaseGameChild} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import {SkewersManager} from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
import {Global} from "db://assets/resources/scripts/Core/Manager/Config/Global";
const { ccclass, property } = _decorator;

enum OptionButtonColor {
    WRONG = 0,
    CORRECT = 1,
    NORMAL = 2
}

// 将枚举转换为Color类型
const OptionButtonColorMap = {
    [OptionButtonColor.WRONG]: new Color(172, 0, 0, 255),    // #AC0000
    [OptionButtonColor.CORRECT]: new Color(27, 136, 0, 255), // #1B8800
    [OptionButtonColor.NORMAL]: new Color(0, 31, 255, 255)   // #001FFF
}

@ccclass('GuessingGameScene')
export class GuessingGameScene extends BaseScene<IBaseGameChild> {

    @property(TimerCommonComponent)
    private timerRT: TimerCommonComponent = null;

    @property(TimerCommonComponent)
    private timerStartGame: TimerCommonComponent = null;

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

    @property(Node)
    analysisNode: Node = null;

    @property(Label)
    analysisLabel: Label = null;

    private timeLimit = 30;

    private options: string[] = ['a', 'b', 'c', 'd'];

    private guessingGameModel: GuessingGameModel = new GuessingGameModel();
    private bInit: boolean = false;

    private currentQuestion: GuessingQuestion = null;

    private _startTime: number = 0;

    protected bundleName: string = 'guessingGame';


    onLoad() {
        this.audioUrls = ["audio/music/click", "audio/music/win"];
        this.loadAudio().then();
    }

    start() {
        super.start();
        if (!this.bInit) {
            this.guessingGameModel.init(this);
            this.bInit = true;
        }
        this.resetPanel();
    }

    onEnable(): void {
        EventManager.getInstance().on(GuessingGameEvent.INIT_COMPLETE, this.onModelInitComplete, this);
        EventManager.getInstance().on(GuessingGameEvent.SHOW_QUESTION, this.onShowQuestion, this);
        EventManager.getInstance().on(GuessingGameEvent.AUDIO_STARTED, this.onAudioStart, this);
        EventManager.getInstance().on(GuessingGameEvent.AUDIO_FINISHED, this.onAudioFinish, this);

        this.timerStartGame.on('timer-end', this.startAnswer, this);
        this.timerRT.on('timer-end', this.answerOutOfTime, this);
    }

    onDisable(): void {
        EventManager.getInstance().off(GuessingGameEvent.INIT_COMPLETE, this);
        EventManager.getInstance().off(GuessingGameEvent.SHOW_QUESTION, this);
        EventManager.getInstance().off(GuessingGameEvent.AUDIO_STARTED, this);
        EventManager.getInstance().off(GuessingGameEvent.AUDIO_FINISHED, this);

        this.timerStartGame.off('timer-end', this.startAnswer, this);
        this.timerRT.off('timer-end', this.answerOutOfTime, this);
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
        alertData.message = "请认真聆听\"可乐派\"给出的题目，然后在选项中选出正确答案！";
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
        this.startAnswer();
    }

    private _replay: boolean = false;
    private startAnswer() {
        this.questionNode.active = false;
        this.optionsNode.active = true;
        if (!this._replay) {
            this._startTime = TimeUtil.getNow();
            this.timerRT.node.active = true;
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                this.timeLimit = (this.sceneModel as any).game.timeLimit;
            } else {
                this.timeLimit = 30;
            }
            this.timerRT.startTimer(this.timeLimit);
        }


        this.replayNode.active = true;

        this.rollingSubtitleCom.resetString(this.currentQuestion.questionText);
    }

    private answerOutOfTime() {
        this.processAnswer();
    }

    private processAnswer(ans: string = null) {
        this.pauseTime();
        this._replay = false;
        const result: boolean = ans && this.currentQuestion.answer == ans;
        this.setAnswerOptionsColor(ans);

        if (result) {
            this.playAudio("audio/music/win", true);
        }
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.resultPanel.active = false;
            this.successTextNode.active = false;
            this.failedTextNode.active = false;
            this._requestGameResult(result);
        } else {
            this.resultPanel.active = true;
            this.requestGameCenterGameResult(result);
            this.successTextNode.active = result;
            this.failedTextNode.active = !result;
        }
    }

    private _resuleBoo: boolean = false;

    private _requestGameResult(win: boolean = true) {
        this._resuleBoo = win;
        // 上报数据
        let endTime = TimeUtil.getNow();
        let complete = Number(win);
        if (this._startTime == 0) {
            this._startTime = endTime;
        }
        let duration = (endTime - this._startTime) / 1000;
        this.requestGameComplete({ context: this, parentNode: this.viewNode, complete, duration });
    }

    private requestGameCenterGameResult(win: boolean = true) {
        // 上报数据
        let endTime = TimeUtil.getNow();
        let complete = Number(win);
        if (this._startTime == 0) {
            this._startTime = endTime;
        }
        const curGame = (this.sceneModel as any).game;
        let duration = (endTime - this._startTime) / 1000;
        this.requestGameComplete({
            sessionId: curGame.sessionid,
            count: 0,
            level: this.guessingGameModel.currentQuestionIndex,
            complete,
            duration,
            timelimit: this.timeLimit,
            difficulty: 1,
            levelMode: curGame.levelMode
        });
    }

    exitCallBack(context) {
        context.guessingGameModel.stopAudio();
        super.exitCallBack(context);
    }

    onClickGotoNextlevel() {
        // 下一关
        this.onClickContinueGame();
    }

    goonHandler() {
        this.clearGameView();
        if (this.sceneModel) {
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                if(SkewersManager.getInstance().isRunOver()) {
                    this.analysisNode.active = false;
                    this.showNextSuccessHandler();
                }else{
                    if(SkewersManager.getInstance().curGame && SkewersManager.getInstance().curGame.getCurTrainData() == null){
                        (this.sceneModel as any).goonHandler(this, true);
                    } else {
                        (this.sceneModel as any).goonHandler(this, false);
                        if (!this.guessingGameModel.isRunOver) this.onClickContinueGame();
                    }
                }
            } else {
                this.sceneModel.goonHandler();
            }
        }
    }

    onClickReplay() {
        this._replay = true;
        this.guessingGameModel.replayQuestionAudio();
    }

    onChooseOption(event: EventTouch, p: string) {
        this.playAudio("audio/music/click", true);
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

    onClickRetryGame() {
        Global.isAgain = true;
        this.resetPanel();
        this.guessingGameModel.startQuestionFlow();
        this.resultPanel.active = false;
    }

    quitGame() {
        this.guessingGameModel.stopAudio();
        super.quitGame({ parentNode: this.viewNode, context: this });
    }

    resumeCallBack(context) {
        context.guessingGameModel.replayQuestionAudio();
        super.resumeCallBack(context);
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
        this.guessingGameModel.stopAudio();

        this.resumeTime();
        this.timerRT.node.active = false;
        this.timerStartGame.node.active = false;

        this.resultPanel.active = false;

        this.replayNode.active = false;
        this.optionsNode.active = this.questionNode.active = false;

        this.frameComponent.playAnimation("idle", 16, true, true);

        this.analysisNode.active = false;

        for(let i = 0; i < this.options.length; i++){
            let op: string = this.options[i];
            let opnode: Node = this.optionsNode.getChildByName("choosen_" + op);
            if (opnode) {
                opnode.getComponent(Sprite).color = OptionButtonColorMap[OptionButtonColor.NORMAL];
                opnode.getComponent(Button).interactable = true;
            }
        }
    }

    public onClickStartAnswer() {
        this.guessingGameModel.stopAudio();
        this.onAudioFinish();
    }

    public onClickShowAnswer() {
        Global.isAgain = false;
        this.analysisNode.active = true;
        this.analysisLabel.string = this.currentQuestion.analysis;
        this.setCorrectOptionColor();
        this.resultPanel.active = false;

        for(let i = 0; i < this.options.length; i++){
            let op: string = this.options[i];
            let opnode: Node = this.optionsNode.getChildByName("choosen_" + op);
            if (opnode) {
                opnode.getComponent(Button).interactable = false;
            }
        }
    }

    private setAnswerOptionsColor(ans: string) {
        const result: boolean = ans && this.currentQuestion.answer == ans;

        let opnode: Node = this.optionsNode.getChildByName("choosen_" + ans);
        if (opnode) {
            if (result) {
                opnode.getComponent(Sprite).color = OptionButtonColorMap[OptionButtonColor.CORRECT];
            } else {
                opnode.getComponent(Sprite).color = OptionButtonColorMap[OptionButtonColor.WRONG];
            }
        }
    }

    private setCorrectOptionColor() {
        let correctNode: Node = this.optionsNode.getChildByName("choosen_" + this.currentQuestion.answer);
        if (correctNode) {
            correctNode.getComponent(Sprite).color = OptionButtonColorMap[OptionButtonColor.CORRECT];
        }
    }
}

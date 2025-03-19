import { _decorator, AnimationComponent, Button, Component, EventTouch, Label, Node } from 'cc';
import { GuessingGameEvent, GuessingGameModel } from './GuessingGameModel';
import { FrameComponent } from '../../resources/scripts/Core/Component/FrameComponent';
import { EventManager } from '../../resources/scripts/Core/Manager/Event/EventManager';
import { GuessingQuestion } from './GuessingGameConfig';
import { RollingSubtitleComponent } from './RollingSubtitleComponent';
import AlertManager, { AlertData } from '../../resources/scripts/Core/Manager/Alert/AlertManager';
import { TimeUtil } from "db://assets/resources/scripts/Core/Util/TimeUtil";
import { TimerCommonComponent } from '../../resources/scripts/Game/UI/Common/TimerCommonComponent';
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { GameType, IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { ChatFlowModel } from '../../resources/scripts/Game/UI/ChatPanel/Model/ChatFlowModel';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
const { ccclass, property } = _decorator;

enum OptionState {
    INIT = "init",
    RECORDING = "recording",
    UNDERANALYSIS = "underanalysis",
    FINISHED = "finished",
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
    private replayNode: Node = null;

    @property(FrameComponent)
    private frameComponent: FrameComponent = null;

    @property(Node)
    private resultPanel: Node = null;

    @property(Label)
    private resultLabel: Label = null;

    @property(Label)
    private scoreLabel: Label = null;

    @property(Node)
    viewNode: Node = null;

    @property(Node)
    private optionsNode: Node = null;

    @property(Node)
    private btnStartRecord: Node = null;

    @property(Node)
    private btnStopRecord: Node = null;

    @property(Label)
    private labelTips1: Label = null;

    @property(Label)
    private labelTips2: Label = null;

    @property(Label)
    private labelResult: Label = null;

    @property(Button)
    private btnClearResult: Button = null;

    @property(Button)
    private btnCommitResult: Button = null;

    @property(AnimationComponent)
    private loadingAnim: AnimationComponent = null;

    @property(Label)
    private labelMessage: Label = null;

    private timeLimit = 30;

    private guessingGameModel: GuessingGameModel = new GuessingGameModel();
    private bInit: boolean = false;

    private currentQuestion: GuessingQuestion = null;

    private _startTime: number = 0;

    protected bundleName: string = BundleName.GUESSINGGAME;

    private recordingInterval: any = null;

    private optionStatus: OptionState = OptionState.INIT;
    private outOfTimeFlag: boolean = false;

    onLoad() {
        this.audioUrls = ["audio/music/click", "audio/music/win"];
        this.loadAudio().then();
    }

    start() {
        super.start();
        if (!this.bInit) {
            this.guessingGameModel.init(this.sceneModel);
            this.bInit = true;
        }
        this.resetPanel();
    }

    onEnable(): void {
        EventManager.getInstance().on(GuessingGameEvent.INIT_COMPLETE, this.onModelInitComplete, this);
        EventManager.getInstance().on(GuessingGameEvent.SHOW_QUESTION, this.onShowQuestion, this);
        EventManager.getInstance().on(GuessingGameEvent.AUDIO_STARTED, this.onAudioStart, this);
        EventManager.getInstance().on(GuessingGameEvent.AUDIO_FINISHED, this.onAudioFinish, this);
        EventManager.getInstance().on(GuessingGameEvent.ANSWER_EVALUATE_FINISHED, this.onAnalysisResultFinished, this);

        this.timerStartGame.on('timer-end', this.startAnswer, this);
        this.timerRT.on('timer-end', this.answerOutOfTime, this);
    }

    onDisable(): void {
        EventManager.getInstance().off(GuessingGameEvent.INIT_COMPLETE, this);
        EventManager.getInstance().off(GuessingGameEvent.SHOW_QUESTION, this);
        EventManager.getInstance().off(GuessingGameEvent.AUDIO_STARTED, this);
        EventManager.getInstance().off(GuessingGameEvent.AUDIO_FINISHED, this);
        EventManager.getInstance().off(GuessingGameEvent.ANSWER_EVALUATE_FINISHED, this);

        EventManager.getInstance().off(ChatFlowModel.FSRResultEvent, this);

        this.timerStartGame.off('timer-end', this.startAnswer, this);
        this.timerRT.off('timer-end', this.answerOutOfTime, this);
    }

    protected onDestroy(): void {
        if (this.guessingGameModel) {
            this.guessingGameModel.dispose();
            this.guessingGameModel = null;
        }
        this.stopRecordingAnimation();
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
        this.labelTips1.string = question.tips;
        this.labelTips2.string = question.tips;

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
        this.guessingGameModel.cleanCurrentAnswer();
        this.questionNode.active = false;
        this.optionsNode.active = true;

        if (!this._replay) {
            this.enterOptionState(OptionState.INIT);
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
        if(this.optionStatus == OptionState.RECORDING || this.optionStatus == OptionState.UNDERANALYSIS) {
            this.pauseTime();
            this.outOfTimeFlag = true;
            return;
        }
        this.processAnswer(this.guessingGameModel.currentAnswer);
    }

    private processAnswer(ans: string = null) {
        this.pauseTime();
        this._replay = false;
        let complete = this.guessingGameModel.currentAnswerScore;
        const result: boolean = complete > 0.5;
        if (result) {
            this.playAudio("audio/music/win", true);
        }
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.resultPanel.active = false;
            this._requestGameResult();
        } else {
            this.resultPanel.active = true;
            this.resultLabel.string = complete == 1 ? "回答正确" : (complete == 0 ? "回答错误" : "回答不太准确");
            this.scoreLabel.string = `得分：${Math.floor(complete * 100)}分`;
            this.requestGameCenterGameResult();
        }
    }

    private _requestGameResult() {
        // 上报数据
        let endTime = TimeUtil.getNow();
        let complete = this.guessingGameModel.currentAnswerScore;
        if (this._startTime == 0) {
            this._startTime = endTime;
        }
        let duration = (endTime - this._startTime) / 1000;
        this.requestGameComplete({ context: this, parentNode: this.viewNode, complete, duration });
    }

    private requestGameCenterGameResult() {
        // 上报数据
        let endTime = TimeUtil.getNow();
        let complete = this.guessingGameModel.currentAnswerScore;
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
                (this.sceneModel as any).goonHandler(this, false);
                if (!this.guessingGameModel.isRunOver) this.onClickContinueGame();
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
        this.optionsNode.active = false;
        this.questionNode.active = false;

        this.frameComponent.playAnimation("idle", 16, true, true);
        this.labelResult.string = "";
    }

    enterOptionState(state: OptionState) {
        this.btnStartRecord.active = state == OptionState.INIT || state == OptionState.FINISHED;
        this.btnStopRecord.active = state == OptionState.RECORDING;
        this.btnClearResult.interactable = state == OptionState.FINISHED;
        this.btnCommitResult.interactable = state == OptionState.FINISHED;
        this.loadingAnim.node.active = state == OptionState.UNDERANALYSIS;
        if (state == OptionState.UNDERANALYSIS) {
            this.loadingAnim.play();
        }
        if (state == OptionState.RECORDING) {
            this.startRecordingAnimation();
        } else {
            this.stopRecordingAnimation();
        }
        switch (state) {
            case OptionState.INIT:
                this.labelMessage.string = "请点击开始录音";
                break;
            case OptionState.RECORDING:
                break;
            case OptionState.UNDERANALYSIS:
                this.labelMessage.string = "正在分析中，请稍等";
                break;
            case OptionState.FINISHED:
                this.labelMessage.string = "请点击提交答案";
                break;
        }
        this.optionStatus = state;

        if(this.outOfTimeFlag && (state == OptionState.INIT || state == OptionState.FINISHED)) {
            this.outOfTimeFlag = false;
            this.processAnswer(this.guessingGameModel.currentAnswer);
        }
    }

    private startRecordingAnimation() {
        let dotCount = 0;
        let timeCountSeconds = 15;
        let space = 500;
        this.recordingInterval = setInterval(() => {
            dotCount = (dotCount % 3) + 1;
            this.labelMessage.string = `录音中(${Math.ceil(timeCountSeconds)}s)${'.'.repeat(dotCount)}`;
            timeCountSeconds = timeCountSeconds - space / 1000;
            if (timeCountSeconds <= 0) {
                this.onClickStopRecord();
            }
        }, space);
    }

    private stopRecordingAnimation() {
        if (this.recordingInterval) {
            clearInterval(this.recordingInterval);
            this.recordingInterval = null;
        }
    }

    private onAnalysisResultFinished(result: any) {
        this.labelResult.string = result.answer;
        DebugLog.instance.log("Fixed Answer 识别结果：" + result.answer);
        this.enterOptionState(OptionState.FINISHED);
    }

    onClickStartRecord() {
        this.guessingGameModel.stopAudio();
        this.enterOptionState(OptionState.RECORDING);
        ChatFlowModel.getInstance().StartFSR();
    }

    onClickStopRecord() {
        this.enterOptionState(OptionState.UNDERANALYSIS);
        ChatFlowModel.getInstance().StopFSR();
        EventManager.getInstance().on(ChatFlowModel.FSRResultEvent, this.onFSRResult, this, true);
    }

    onFSRResult(result: any) {
        if (result.code == 0 && result.content != "") {
            this.guessingGameModel.analysisAnswer(result.content, this.guessingGameModel.currentQuestionIndex);
        } else if (result.code == 0 && result.content == "") {
            this.enterOptionState(OptionState.INIT);
            this.labelMessage.string = "未能识别到语音，请重新录音";
        } else {
            this.enterOptionState(OptionState.INIT);
            this.labelMessage.string = result.message;
        }
    }

    onClickClearResult() {
        this.enterOptionState(OptionState.INIT);
        this.labelResult.string = "";
        this.guessingGameModel.cleanCurrentAnswer();
    }

    onClickCommitResult() {
        this.processAnswer(this.guessingGameModel.currentAnswer);
        this.timerRT.pauseTimer();
    }

    onClickAnswerImmediately() {
        this.guessingGameModel.stopAudio();
        this.frameComponent.playAnimation("idle", 16, true, true);
        this.startAnswer();
    }
}

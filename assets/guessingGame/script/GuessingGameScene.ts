import {_decorator, Button, Color, EventTouch, Label, Node, Sprite,AudioClip,AudioSource} from 'cc';
import {GuessingGameEvent, GuessingGameModel} from './GuessingGameModel';
import {FrameComponent} from '../../resources/scripts/Core/Component/FrameComponent';
import {EventManager} from '../../resources/scripts/Core/Manager/Event/EventManager';
import {GuessingQuestion} from './GuessingGameConfig';
import {RollingSubtitleComponent} from './RollingSubtitleComponent';
import {AlertManager,AlertData} from '../../resources/scripts/Core/Manager/Alert/AlertManager';
import {TimeUtil} from "db://assets/resources/scripts/Core/Util/TimeUtil";
import {TimerCommonComponent} from '../../resources/scripts/Game/UI/Common/TimerCommonComponent';
import {BaseScene} from "db://assets/resources/scripts/Core/Scene/BaseScene";
import {GameType, IBaseGameChild} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import {SkewersManager} from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
import {Global} from "db://assets/resources/scripts/Core/Manager/Config/Global";
import {SkewersGameType} from "db://assets/resources/scripts/Game/Task/Skewers/SkewersGameData";
import {AudioManager} from "db://assets/resources/scripts/Core/Manager/Audio/AudioManager";

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

    @property(Node)
    quitBtn: Node;

    // @property(RollingSubtitleComponent)
    // private rollingSubtitleCom: RollingSubtitleComponent = null;

    @property(Node)
    private optionsNode: Node = null;

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

    @property(Node)
    replayButtonNode:Node = null;
    
    private replayCount:number = 2;

    private timeLimit = 30;

    private options: string[] = ['a', 'b', 'c', 'd'];

    private guessingGameModel: GuessingGameModel = new GuessingGameModel();
    private bInit: boolean = false;

    private currentQuestion: GuessingQuestion = null;

    private _startTime: number = 0;

    protected bundleName: string = 'guessingGame';

    private bgmClip:AudioClip;
    onLoad() {
        this.audioUrls = ['audio/music/caimiBG',"audio/music/click", "audio/music/win"];
        let self = this;
        this.loadAudio().then(()=>{
            // 使用AudioManager播放背景音乐
           self.playBgmAudio('audio/music/caimiBG', true);
        });
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
        super.onDestroy();
    }

    private onModelInitComplete() {
        // 如果是串烧任务，直接开始游戏流程，不显示提示
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.startGameFlow();
        } else {
            // 非串烧任务时，显示介绍界面
            let alertData: AlertData = new AlertData();
            alertData.title = "提示";
            alertData.message = "请认真聆听\"派派智护\"给出的题目，然后在选项中选出正确答案！";
            alertData.confirmButtonText = "开始游戏";
            alertData.cancelButtonVisible = false;
            alertData.confirmCb = this.startGameFlow.bind(this);

            AlertManager.getInstance().showAlert(alertData);
        }
    }

    private startGameFlow() {
        this.guessingGameModel.startQuestionFlow();
        // 确保背景音乐在开始游戏时播放
        if(!AudioManager.getInstance().isBgmPlaying()) {
            this.playBgmAudio('audio/music/caimiBG', true);
        }
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
        if(this.currentQuestion!=null){
            this.questionLabel.string = this.currentQuestion.questionText;
        }
    }

    private onAudioFinish() {
        this.questionLabel.string=''
        this.frameComponent.playAnimation("idle", 16, true, true);
    }

    private _replay: boolean = false;
    private startAnswer() {
        this.questionNode.active = false;
        this.optionsNode.active = true;
        // if (!this._replay) {
            this._startTime = TimeUtil.getNow();
            this.timerRT.node.active = true;
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                this.timeLimit = (this.sceneModel as any).game.timeLimit;
            } else {
                this.timeLimit = 30;
            }
            this.timerRT.startTimer(this.timeLimit);
        // }

        // this.rollingSubtitleCom.resetString(this.currentQuestion.questionText);
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
            // 播放成功音效，使用playOneShot
           this.playAudio("audio/music/win",true);
        }else{
            this.playFail();
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
        let complete = win?1:0;
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
        // 停止背景音乐
        AudioManager.getInstance().stopBgm();
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
                        this.clearGameView();
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

    dzgoonHandler(resuleBoo:boolean = true) {
        this.clearGameView();
        if (this.sceneModel) {
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                // 直接发送游戏完成请求，不处理弹窗逻辑
                // 直接向服务器发送请求，但不处理回调
                let self = this;
                let trainData = SkewersManager.getInstance().getUnCompleteGameData();
                let _boo = trainData.type != SkewersGameType.Comprehension;
                if(!_boo){
                    EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, (data) => {
                        (self.sceneModel as any).goonHandler(self, true);
                    }, this, true);
                    this.clearGameView();
                    SkewersManager.getInstance().requestGameComplete(this.complete, this.duration);
                }else{
                    (this.sceneModel as any).goonHandler(self, true);
                }
            }
        }
    }

    onClickReplay() {
        if(this.replayCount<=0){ return; }
        this.replayCount--;
        if(this.replayCount==0){
            this.replayButtonNode.getComponent(Sprite).color = new Color(187, 189, 193, 255);
        }
        this.replayButtonNode.getChildByName("text").getComponent(Label).string = `重听题目${this.replayCount}`;
        this._replay = true;
        this.guessingGameModel.replayQuestionAudio();
    }
    reSetButton(){
        this.replayCount = 2;
        this.replayButtonNode.getComponent(Sprite).color = new Color(8, 105, 0);
        this.replayButtonNode.getChildByName("text").getComponent(Label).string = `重听题目${this.replayCount}`;
    }

    onChooseOption(event: EventTouch, p: string) {
        // 播放点击音效
        this.playAudio("audio/music/click",true);
        this.processAnswer(p);
    }

    onclickContinue() {
        (this.sceneModel as any).dzanswerHandler(this);
    }


    /**
     * 进入下一局游戏
     */
    onClickContinueGame() {
        // this.bgmClip = null;
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
        // 停止背景音乐
        AudioManager.getInstance().pauseBgm();
        this.guessingGameModel.stopAudio();
        super.quitGame({ parentNode: this.viewNode, context: this });
    }

    resumeCallBack(context) {
        context.guessingGameModel.replayQuestionAudio();
        super.resumeCallBack(context);
    }

    resumeTime() {
        AudioManager.getInstance().resumeBgm();
        this.timerRT.resumeTimer();
        this.timerStartGame.resumeTimer();
    }

    pauseTime() {
        AudioManager.getInstance().pauseBgm();
        this.timerRT.pauseTimer();
        this.timerStartGame.pauseTimer();
    }


    resetPanel() {
        this.guessingGameModel.stopAudio();
        // 确保背景音乐在重置面板时正常播放
        if(!AudioManager.getInstance().isBgmPlaying()) {
            this.playBgmAudio('audio/music/caimiBG', true);
        }
        this.resumeTime();
        this.timerRT.node.active = false;
        this.timerStartGame.node.active = false;

        this.resultPanel.active = false;
        this.optionsNode.active = this.questionNode.active = false;

        this.frameComponent.playAnimation("idle", 16, true, true);

        this.analysisNode.active = false;
        this.reSetButton();

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
        this.frameComponent.playAnimation("idle", 16, true, true);
        this.startAnswer();
    }

    public onClickShowAnswer() {
        super.onClickShowAnswer();
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

import {_decorator, Button, Color, EventTouch, Label, Node, Sprite,AudioClip,ProgressBar} from 'cc';
import {GuessingGameEvent, GuessingGameModel} from './GuessingGameModel';
import {FrameComponent} from '../../resources/scripts/Core/Component/FrameComponent';
import {EventManager} from '../../resources/scripts/Core/Manager/Event/EventManager';
import {GuessingQuestion} from './GuessingGameConfig';
import {TimeUtil} from "db://assets/resources/scripts/Core/Util/TimeUtil";
import {TimerCommonComponent} from '../../resources/scripts/Game/UI/Common/TimerCommonComponent';
import {BaseScene} from "db://assets/resources/scripts/Core/Scene/BaseScene";
import {GameType, IBaseGameChild} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import {SkewersManager} from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
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
    [OptionButtonColor.WRONG]: new Color(209, 95, 128, 255),    //rgb(209, 95, 128)
    [OptionButtonColor.CORRECT]: new Color(55, 194, 109, 255), //rgb(55, 194, 96)
    [OptionButtonColor.NORMAL]: new Color(61, 21, 127, 255)   //rgb(61, 21, 127)
}

@ccclass('GuessingGameScene')
export class GuessingGameScene extends BaseScene<IBaseGameChild> {

    @property(TimerCommonComponent)
    private timerRT: TimerCommonComponent = null;

    // @property(TimerCommonComponent)
    // private timerStartGame: TimerCommonComponent = null;

    @property(Node)
    private questionNode: Node = null;

    @property(Label)
    private questionLabel: Label = null;

    @property(Label)
    private progresslabel:Label = null;

    @property(ProgressBar)
    private progress:ProgressBar = null;

    @property(Node)
    quitBtn: Node;

    @property(Node)
    startBtn:Node;

    @property(Node)
    private optionsNode: Node = null;

    @property(FrameComponent)
    private frameComponent: FrameComponent = null;


    @property(Node)
    viewNode: Node = null;

    @property(Node)
    analysisNode: Node = null;

    @property(Label)
    analysisLabel: Label = null;

    @property(Node)
    replayButtonNode:Node = null;
    
    @property(Node)
    questionReplayNode: Node = null;
    
    private replayCount:number = 2;

    private timeLimit = 30;

    private options: string[] = ['a', 'b', 'c', 'd'];

    private guessingGameModel: GuessingGameModel = new GuessingGameModel();
    private bInit: boolean = false;

    private currentQuestion: GuessingQuestion = null;

    private _startTime: number = 0;
    
    // 添加状态标记，用于跟踪是否已经进入答题阶段
    private _isInAnswerPhase: boolean = false;
    private _isAudioFinished: boolean = false; // 添加语音播放完成状态

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
        super.onEnable();
        EventManager.getInstance().on(GuessingGameEvent.INIT_COMPLETE, this.onModelInitComplete, this);
        EventManager.getInstance().on(GuessingGameEvent.SHOW_QUESTION, this.onShowQuestion, this);
        EventManager.getInstance().on(GuessingGameEvent.AUDIO_STARTED, this.onAudioStart, this);
        EventManager.getInstance().on(GuessingGameEvent.AUDIO_FINISHED, this.onAudioFinish, this);

        this.timerRT.on('timer-end', this.answerOutOfTime, this);
    }

    onDisable(): void {
        super.onDisable();
        EventManager.getInstance().off(GuessingGameEvent.INIT_COMPLETE, this);
        EventManager.getInstance().off(GuessingGameEvent.SHOW_QUESTION, this);
        EventManager.getInstance().off(GuessingGameEvent.AUDIO_STARTED, this);
        EventManager.getInstance().off(GuessingGameEvent.AUDIO_FINISHED, this);

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
            let skewersGameData = (this.sceneModel as any).game;
            this.progresslabel.string = "第" + skewersGameData.progressStr + "关";
            this.progress.progress = skewersGameData.progress;
            this.startGameFlow();
        } else {
            let level = (this.sceneModel as any).level;
            this.progress.progress = level / this.guessingGameModel.getMaxQuestionCount();
            this.progresslabel.string = "第" + level + "关";
            this.startGameFlow();
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
        // 只有在非重玩模式下才更新关卡标签
        if (!this._replay) {
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                let skewersGameData = (this.sceneModel as any).game;
                this.progresslabel.string = "第" + skewersGameData.progressStr + "关";
                this.progress.progress = skewersGameData.progress;
            } else {
                let level = (this.sceneModel as any).level;
                this.progress.progress = level/this.guessingGameModel.getMaxQuestionCount();
                this.progresslabel.string = "第" + level + "关";
            }
        }

        // this.questionNode.active = true;
        const question: GuessingQuestion = data.question;
        this.currentQuestion = question;
        this.questionLabel.string = question.questionText;

        for (var i = 0; i < this.options.length; i++) {
            let op: string = this.options[i];
            let opnode: Node = this.optionsNode.getChildByName("choosen_" + op);
            if (opnode) {
                opnode.getChildByName("Label").getComponent(Label).string = "？";
            }
        }

        // this.timerStartGame.node.active = false;
    }

    private onAudioStart() {
        //答题阶段，暂停回来不播放语音
        if(this._isInAnswerPhase && !this._replay)return;
        this.frameComponent.playAnimation("speak", 24, true, true);
        if(this.currentQuestion!=null){
            this.questionLabel.string = this.currentQuestion.questionText;
        }
        
        // 语音开始播放时设置状态
        this._isAudioFinished = false;
        
        // 播放语音时显示重听按钮（语音未播放完毕时）
        if (this.questionReplayNode) {
            this.questionReplayNode.active = true;
        }
        
        // 语音开始播放时显示开始按钮
        if (this.startBtn) {
            this.startBtn.getComponent(Button).interactable = true;
        }
        
        // 语音播放时禁用选项按钮
        this.setOptionsInteractable(false);
    }

    private onAudioFinish() {
        
        this.frameComponent.playAnimation("idle", 16, true, true);

        // 语音播放结束后，显示真实选项内容
        if (this.currentQuestion) {
            for (var i = 0; i < this.options.length; i++) {
                let op: string = this.options[i];
                let opnode: Node = this.optionsNode.getChildByName("choosen_" + op);
                if (opnode) {
                    opnode.getChildByName("Label").getComponent(Label).string = this.currentQuestion.options[op];
                }
            }
        }

        // 语音播放完毕时设置状态
        this._isAudioFinished = true;

        // 语音播放完毕后，隐藏重听按钮
        if (this.questionReplayNode) {
            this.questionReplayNode.active = false;
        }
        if (this.replayButtonNode) {
            this.replayButtonNode.active = false;
        }
        
        // 语音播放完毕后，隐藏开始按钮
        if (this.startBtn) {
            this.startBtn.getComponent(Button).interactable = false;
        }
        
        // 语音播放完毕后启用选项按钮
        this.setOptionsInteractable(true);

        // 语音播放完毕后，启动答题倒计时
        this.startAnswer();
        this._replay = false;
    }

    private _replay: boolean = false;
    
    private startAnswer() {
        // this.questionNode.active = false;
        // this.optionsNode.active = true;
        if (!this._replay) {
            this._startTime = TimeUtil.getNow();
            // this.timerRT.node.active = true;
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                this.timeLimit = (this.sceneModel as any).game.timeLimit;
            } else {
                this.timeLimit = 30;
            }
            this.timerRT.startTimer(this.timeLimit);
        }

        // 标记进入答题阶段
        this._isInAnswerPhase = true;

        // 开始答题时隐藏重听按钮（语音已播放完毕）
        if (this.questionReplayNode) {
            this.questionReplayNode.active = false;
        }

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
            this._requestGameResult(result);
        } else {
            this.requestGameCenterGameResult(result);
            if(result){
                (this.sceneModel as any).showSuccessView();
            }else{
                (this.sceneModel as any).showFailView();
            }
           
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
            this.replayButtonNode.active = false;
        }
        this.replayButtonNode.active = true;
        this.replayButtonNode.getChildByName("text").getComponent(Label).string = `重听题目${this.replayCount}`;
        this._replay = true;
        this.guessingGameModel.replayQuestionAudio();
    }
    reSetButton(){
        this.replayCount = 2;
        // 只有在语音未播放完毕时才显示重听按钮
        this.replayButtonNode.active = !this._isAudioFinished;
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
    }

    onClickRetryGame() {
        this.resetPanel();
        // 设置重玩标志，避免更新关卡标签
        this._replay = true;
        this.guessingGameModel.startQuestionFlow(); 
    }

    quitGame() {
        // 停止背景音乐
        AudioManager.getInstance().pauseBgm();
        this.guessingGameModel.stopAudio();
        super.quitGame({ parentNode: this.viewNode, context: this });
    }

    resumeCallBack(context) {
        // 只有在语音播放阶段才重新播放语音，答题阶段不重新播放
        if (!this._isInAnswerPhase || this._replay) {
            context.guessingGameModel.replayQuestionAudio();
        } else {
            // 答题阶段恢复时，确保选项按钮可交互
            this.setOptionsInteractable(true);
            // 确保frameComponent处于待机状态
            this.frameComponent.playAnimation("idle", 16, true, true);
        }
        super.resumeCallBack(context);
    }

    resumeTime() {
        AudioManager.getInstance().resumeBgm();
        this.timerRT.resumeTimer();
        // this.timerStartGame.resumeTimer();
    }

    pauseTime() {
        AudioManager.getInstance().pauseBgm();
        this.timerRT.pauseTimer();
        // this.timerStartGame.pauseTimer();
    }


    resetPanel() {
        this.guessingGameModel.stopAudio();
        // 确保背景音乐在重置面板时正常播放
        if(!AudioManager.getInstance().isBgmPlaying()) {
            this.playBgmAudio('audio/music/caimiBG', true);
        }
        this.resumeTime();
        
        // 重置答题计时器
        this.timerRT.resetTimer();
        
        // 重置答题阶段标记
        this._isInAnswerPhase = false;
        this._replay = false;
        this._isAudioFinished = false; // 重置语音播放状态
        
        // this.timerRT.node.active = false;
        // this.timerStartGame.node.active = false;

        // this.optionsNode.active = this.questionNode.active = false;

        this.frameComponent.playAnimation("idle", 16, true, true);

        this.analysisNode.active = false;
        
        // 重置时隐藏重听按钮（因为语音还未开始播放）
        if (this.questionReplayNode) {
            this.questionReplayNode.active = false;
        }
        if (this.replayButtonNode) {
            this.replayButtonNode.active = false;
        }
        
        // 重置重听按钮状态
        this.reSetButton();
        
        // 重置时隐藏开始按钮
        if (this.startBtn) {
            this.startBtn.getComponent(Button).interactable = true;
        }

        for(let i = 0; i < this.options.length; i++){
            let op: string = this.options[i];
            let opnode: Node = this.optionsNode.getChildByName("choosen_" + op);
            if (opnode) {
                opnode.getComponent(Sprite).color = OptionButtonColorMap[OptionButtonColor.NORMAL];
                opnode.getComponent(Sprite).color = OptionButtonColorMap[OptionButtonColor.NORMAL];
                opnode.getComponent(Button).interactable = true;
            }
        }

    }

    onAgain(): void {
        this.onClickRetryGame();
    }

    onFailNextLevel(): void {
        this.onClickContinueGame();
    }

    onSuccessNextLevel(): void {
        this.onClickContinueGame();
    }

    public onClickStartAnswer() {
        this.guessingGameModel.stopAudio();
        this.frameComponent.playAnimation("idle", 16, true, true);
        
        // 直接答题时设置语音播放完毕状态
        this._isAudioFinished = true;
        
        // 点击开始按钮后隐藏开始按钮
        if (this.startBtn) {
            this.startBtn.getComponent(Button).interactable = true;
        }
        
        // 直接显示答案选项
        if (this.currentQuestion) {
            for (var i = 0; i < this.options.length; i++) {
                let op: string = this.options[i];
                let opnode: Node = this.optionsNode.getChildByName("choosen_" + op);
                if (opnode) {
                    opnode.getChildByName("Label").getComponent(Label).string = this.currentQuestion.options[op];
                }
            }
        }
        
        // 直接答题时隐藏重听按钮
        if (this.questionReplayNode) {
            this.questionReplayNode.active = false;
        }
        if (this.replayButtonNode) {
            this.replayButtonNode.active = false;
        }
        
        // 点击开始按钮后启用选项按钮
        this.setOptionsInteractable(true);
        
        this.startAnswer();
        this._replay = false;
    }

    public onClickShowAnswer() {
        super.onClickShowAnswer();
        this.analysisNode.active = true;
        this.analysisLabel.string = this.currentQuestion.analysis;
        this.setCorrectOptionColor();
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
    
    // 设置选项按钮的可交互状态
    private setOptionsInteractable(interactable: boolean) {
        for (let i = 0; i < this.options.length; i++) {
            let op: string = this.options[i];
            let opnode: Node = this.optionsNode.getChildByName("choosen_" + op);
            if (opnode) {
                opnode.getComponent(Button).interactable = interactable;
            }
        }
    }
}

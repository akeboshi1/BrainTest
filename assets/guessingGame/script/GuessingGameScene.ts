import { _decorator, Button, Color, EventTouch, Label,RichText, Node, Sprite, AudioClip, ProgressBar, game, Game } from 'cc';
import { GuessingGameEvent, GuessingGameModel } from './GuessingGameModel';
import { FrameComponent } from '../../resources/scripts/Core/Component/FrameComponent';
import { EventManager } from '../../resources/scripts/Core/Manager/Event/EventManager';
import { GuessingQuestion } from './GuessingGameConfig';
import { TimeUtil } from "db://assets/resources/scripts/Core/Util/TimeUtil";
import { TimerCommonComponent } from '../../resources/scripts/Game/UI/Common/TimerCommonComponent';
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { GameType, IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { SkewersManager } from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
import { SkewersGameType } from "db://assets/resources/scripts/Game/Task/Skewers/SkewersGameData";
import { AudioManager } from "db://assets/resources/scripts/Core/Manager/Audio/AudioManager";
import { DebugLog } from "db://assets/resources/scripts/Core/Util/DebugLog";
import { PersonalCenterManager } from "db://assets/resources/scripts/Game/PersonalCenterManager/PersonalCenterManager";
// import { AlertManager, AlertData } from '../../resources/scripts/Core/Manager/Alert/AlertManager';

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

    @property(Node)
    private questionNode: Node = null;

    @property(RichText)
    private questionLabel: RichText = null;

    @property(Label)
    private progresslabel: Label = null;

    @property(ProgressBar)
    private progress: ProgressBar = null;

    @property(Node)
    quitBtn: Node;

    @property(Node)
    startBtn: Node;

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
    replayButtonNode: Node = null;

    @property(Node)
    questionReplayNode: Node = null;

    private replayCount: number = 2;

    private timeLimit = 30;

    private options: string[] = ['a', 'b', 'c', 'd'];

    private guessingGameModel: GuessingGameModel = new GuessingGameModel();
    private bInit: boolean = false;

    private currentQuestion: GuessingQuestion = null;

    private _startTime: number = 0;

    // 添加状态标记，用于跟踪是否已经进入答题阶段
    private _isInAnswerPhase: boolean = false;
    private _hasClickedStartBtn: boolean = false; // 添加是否已点击开始按钮的状态
    
    // 添加阶段标记，用于机构用户的显示控制
    private _currentPhase: 'listening' | 'answering' | 'result' = 'listening'; // 当前阶段：听题、答题、结算

    protected bundleName: string = 'guessingGame';

    private bgmClip: AudioClip;

    /**
     * 判断是否是机构用户
     * @returns 是否是机构用户
     */
    private isOrgUser(): boolean {
        const userInfoData = PersonalCenterManager.getInstance().userInfoData;
        return userInfoData ? userInfoData.is_org_user : false;
    }

    /**
     * 根据当前阶段控制questionLabel的显示
     * 听题阶段和答题阶段显示，结算阶段隐藏
     */
    private updateQuestionLabelVisibility(): void {
        if (!this.questionLabel) return;
        
        // 听题阶段和答题阶段显示，结算阶段隐藏
        const shouldShow = this._currentPhase === 'listening';// || this._currentPhase === 'answering';
        this.questionLabel.node.active = shouldShow;
    }

    /**
     * 根据机构用户状态和当前阶段控制optionsNode的显示
     */
    private updateOptionsNodeVisibility(): void {
        if (!this.optionsNode) return;
        
        // if (this.isOrgUser()) {
            // 机构用户：听题阶段隐藏，答题阶段显示，结算阶段隐藏
            const shouldShow = this._currentPhase === 'answering';
            this.optionsNode.active = shouldShow;
        // } else {
        //     // 普通用户：保持原有逻辑
        //     this.optionsNode.active = true;
        // }
    }

    /**
     * 设置当前阶段并更新显示状态
     * @param phase 当前阶段
     */
    private setCurrentPhase(phase: 'listening' | 'answering' | 'result'): void {
        this._currentPhase = phase;
        // 更新 questionLabel 和 optionsNode 的显示状态
        this.updateQuestionLabelVisibility();
        this.updateOptionsNodeVisibility();
        DebugLog.instance.log(`[GuessingGameScene] 阶段切换为: ${phase}, 机构用户: ${this.isOrgUser()}`);
    }

    /**
     * 处理文本中的标点符号，智能处理逗号换行
     * 如果逗号前后文字总长度小于10，则在同一行显示
     * 如果逗号前后文字总长度大于等于10，则逗号前后文字分别显示在不同行
     * @param text 原始文本
     * @returns 处理后的文本
     */
    private processQuestionText(text: string): string {
        if (!text) return text;
        
        // 按标点符号分割文本，保留标点符号
        const segments: string[] = [];
        let currentSegment = '';
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            currentSegment += char;
            
            // 遇到标点符号时，将当前片段添加到数组
            if (/[，。？！,;\n]/.test(char)) {
                segments.push(currentSegment);
                currentSegment = '';
            }
        }
        
        // 如果还有剩余文字，添加到数组
        if (currentSegment) {
            segments.push(currentSegment);
        }
        
        // 如果数组长度小于等于4，直接使用标点符号切割
        if (segments.length <= 4) {
            return text.replace(/([，。？！,;])/g, '$1\n');
        }
        
        // 处理数组中的每个元素，决定换行
        const result: string[] = [];
        let i = 0;
        let loopCount = 0; // 添加循环计数器防止死循环
        const maxLoops = segments.length * 2; // 最大循环次数
        
        while (i < segments.length && loopCount < maxLoops) {
            loopCount++;
            
            if (i === segments.length - 1) {
                // 最后一个元素，直接添加
                result.push(segments[i]);
                break;
            }
            
            const currentLength = segments[i].length;
            const nextLength = segments[i + 1].length;
            
            if (currentLength + nextLength <= 12) {
                // 当前元素和下一个元素长度总和小于等于12，显示在同一行
                result.push(segments[i] + segments[i + 1]);
                i += 2; // 跳过下一个元素，因为它已经被合并
            } else {
                // 长度总和大于12，当前元素单独一行
                result.push(segments[i]);
                i += 1;
            }
        }
        
        // 容错处理：如果出现死循环或异常，回退到直接用标点符号切割
        if (loopCount >= maxLoops) {
            console.warn('文本处理出现异常，回退到标点符号切割模式');
            return text.replace(/([，。？！,;])/g, '$1\n');
        }
        
        // 将结果数组用换行符连接
        return result.join('\n');
    }

    onLoad() {
        this.audioUrls = ['audio/music/caimiBG', "audio/music/click", "audio/music/win"];
        let self = this;
        this.loadAudio().then(() => {
            // 使用AudioManager播放背景音乐
            self.playBgmAudio('audio/music/caimiBG', true);
        });
    }

    start() {
        super.start();
        if (!this.bInit) {
            // 优化：异步初始化模型，避免阻塞主线程
            this.guessingGameModel.init(this).then(() => {
                this.bInit = true;
                this.resetPanel();
            }).catch((error) => {
                DebugLog.instance.error("GuessingGameModel初始化失败:", error);
                // 即使初始化失败也要重置面板，避免界面卡死
                this.resetPanel();
            });
        } else {
            this.resetPanel();
        }
    }

    onEnable(): void {
        super.onEnable();
        EventManager.getInstance().on(GuessingGameEvent.INIT_COMPLETE, this.onModelInitComplete, this);
        EventManager.getInstance().on(GuessingGameEvent.SHOW_QUESTION, this.onShowQuestion, this);
        EventManager.getInstance().on(GuessingGameEvent.AUDIO_STARTED, this.onAudioStart, this);
        EventManager.getInstance().on(GuessingGameEvent.AUDIO_FINISHED, this.onAudioFinish, this);
        EventManager.getInstance().on(GuessingGameEvent.AUDIO_LOAD_START, this.onAudioLoadStart, this);
        EventManager.getInstance().on(GuessingGameEvent.AUDIO_LOAD_COMPLETE, this.onAudioLoadComplete, this);
        EventManager.getInstance().on(GuessingGameEvent.AUDIO_LOAD_FAILED, this.onAudioLoadFailed, this);

        this.timerRT.on('timer-end', this.answerOutOfTime, this);
    }

    onDisable(): void {
        super.onDisable();
        EventManager.getInstance().off(GuessingGameEvent.INIT_COMPLETE, this);
        EventManager.getInstance().off(GuessingGameEvent.SHOW_QUESTION, this);
        EventManager.getInstance().off(GuessingGameEvent.AUDIO_STARTED, this);
        EventManager.getInstance().off(GuessingGameEvent.AUDIO_FINISHED, this);
        EventManager.getInstance().off(GuessingGameEvent.AUDIO_LOAD_START, this);
        EventManager.getInstance().off(GuessingGameEvent.AUDIO_LOAD_COMPLETE, this);
        EventManager.getInstance().off(GuessingGameEvent.AUDIO_LOAD_FAILED, this);

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
        // 如果是串烧任务，直接开始训练流程，不显示提示
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            let skewersGameData = (this.sceneModel as any).game;
            this.progresslabel.string = "第" + skewersGameData.progressStr + "关";
            this.progress.progress = skewersGameData.progress;
            this.startGameFlow();
        } else {
            let level = (this.sceneModel as any).game.level;
            this.progress.progress = level / (this.sceneModel as any).levelLen;
            this.progresslabel.string = "第" + level + '/' + (this.sceneModel as any).levelLen + "关";
            this.startGameFlow();
        }
    }

    private startGameFlow() {
        this.guessingGameModel.startQuestionFlow();
        // 确保背景音乐在开始训练时播放
        if (!AudioManager.getInstance().isBgmPlaying()) {
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
                let level = (this.sceneModel as any).game.level
                this.progress.progress = level / (this.sceneModel as any).levelLen;
                this.progresslabel.string = "第" + level + '/' + (this.sceneModel as any).levelLen + "关";
            }
        }

        // 设置听题阶段
        this.setCurrentPhase('listening');

        // this.questionNode.active = true;
        const question: GuessingQuestion = data.question;
        this.currentQuestion = question;
        this.questionLabel.string = this.processQuestionText(question.questionText);

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
        if (this._isInAnswerPhase && !this._replay) return;
        this.frameComponent.node.active = true;
        this.frameComponent.playAnimation("speak", 24, true, true);
        if (this.currentQuestion != null) {
            this.questionLabel.string = this.processQuestionText(this.currentQuestion.questionText);
        }

        // 播放语音时隐藏重听按钮
        if (this.questionReplayNode) {
            this.questionReplayNode.active = false;
        }
        if (this.replayButtonNode) {
            this.replayButtonNode.active = false;
        }

        // 语音开始播放时启用开始按钮
        if (this.startBtn) {
            this.startBtn.active = true;
        }

        // 语音播放时禁用选项按钮
        this.setOptionsInteractable(false);
    }

    private onAudioFinish() {

        this.frameComponent.playAnimation("idle", 16, true, true);

        // 语音播放结束后，隐藏问题标签
        // if (this.questionLabel) {
        //     this.questionLabel.node.active = false;
        // }

        // 语音播放完毕后，不启动答题倒计时，只显示重听按钮
        // 标记进入答题阶段（但不开启倒计时）
        this._isInAnswerPhase = true;

        // 显示重听按钮（如果有重听次数且未点击开始按钮）
        if (this.questionReplayNode && this.replayCount > 0 && !this._hasClickedStartBtn) {
            this.questionReplayNode.active = true;
        }
        if (this.replayButtonNode && this.replayCount > 0 && !this._hasClickedStartBtn) {
            this.replayButtonNode.active = true;
        }

        // 不调用startAnswer()，避免开启倒计时
        // this.startAnswer();
        this._replay = false;
    }

    // 音频开始加载时的处理
    private onAudioLoadStart(data: any) {
        DebugLog.instance.log("音频开始加载:", data.url);
        
        // // 显示音频加载提示弹窗
        // let ad: AlertData = new AlertData();
        // ad.title = "加载中";
        // ad.message = "正在加载音频资源，请稍候...";
        // ad.cancelButtonVisible = false;
        // ad.confirmButtonText = "等待";
        // ad.confirmCb = () => {
        //     // 用户点击等待按钮，不做任何操作，继续等待
        // };
        // // 设置弹窗位置为屏幕中央，确保适配后位置正确
        // ad.x = 0;
        // ad.y = 0;
        // AlertManager.getInstance().showAlert(ad);
    }

    // 音频加载完成时的处理
    private onAudioLoadComplete(data: any) {
        DebugLog.instance.log("音频加载完成:", data.url);
        
        // 关闭音频加载提示弹窗
        // AlertManager.getInstance().closeCurrentAlert();
        
        // 音频加载完成后，可以开始训练流程
        DebugLog.instance.log("音频资源加载完成，训练可以开始");
        
        // 如果还没有开始答题，可以在这里触发一些初始化逻辑
        if (!this._isInAnswerPhase) {
            // 音频加载完成，训练准备就绪
            DebugLog.instance.log("训练准备就绪，等待用户操作");
        }
    }

    // 音频加载失败时的处理
    private onAudioLoadFailed(data: any) {
        DebugLog.instance.error("音频加载失败:", data.url, data.error);
        
        // // 关闭音频加载提示弹窗
        // AlertManager.getInstance().closeCurrentAlert();
        //
        // // 显示音频加载失败提示
        // let ad: AlertData = new AlertData();
        // ad.title = "加载失败";
        // ad.message = "音频资源加载失败，训练将继续进行，但可能无法听到题目音频";
        // ad.cancelButtonVisible = false;
        // ad.confirmButtonText = "继续训练";
        // ad.confirmCb = () => {
        //     // 用户确认后继续训练
        //     DebugLog.instance.log("用户确认继续训练");
        // };
        // // 设置弹窗位置为屏幕中央，确保适配后位置正确
        // ad.x = 0;
        // ad.y = 0;
        // AlertManager.getInstance().showAlert(ad);
    }

    private _replay: boolean = false;
    private _clickStart:boolean = false;

    private startAnswer() {
        // this.questionNode.active = false;
        // this.optionsNode.active = true;
        
        // 只有在重玩或点击开始答题时才开启倒计时
        if (this._replay || this._clickStart) {
            this._startTime = TimeUtil.getNow();
            // this.timerRT.node.active = true;
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                this.timeLimit = (this.sceneModel as any).game.timeLimit;
            } else {
                this.timeLimit = 30;
            }
            this.timerRT.startTimer(this.timeLimit);
            DebugLog.instance.log(`[GuessingGameScene] 开启倒计时: 重玩=${this._replay}, 点击开始=${this._clickStart}`);
        } else {
            DebugLog.instance.log(`[GuessingGameScene] 不开启倒计时: 重玩=${this._replay}, 点击开始=${this._clickStart}`);
        }

        // 标记进入答题阶段
        this._isInAnswerPhase = true;

        // 开始答题时显示重听按钮（如果有重听次数且未点击开始按钮）
        if (this.questionReplayNode && this.replayCount > 0 && !this._hasClickedStartBtn) {
            this.questionReplayNode.active = true;
        }
        if (this.replayButtonNode && this.replayCount > 0 && !this._hasClickedStartBtn) {
            this.replayButtonNode.active = true;
        }

        // this.rollingSubtitleCom.resetString(this.currentQuestion.questionText);
    }

    private answerOutOfTime() {
        this.processAnswer();
    }

    private processAnswer(ans: string = null) {
        this.pauseTime();
        this._replay = false;
        this._clickStart = false;
        const result: boolean = ans && this.currentQuestion.answer == ans;
        this.setAnswerOptionsColor(ans);

        // 设置结算阶段
        this.setCurrentPhase('result');

        if (result) {
            // 播放成功音效，使用playOneShot
            this.playAudio("audio/music/win", true);
        } else {
            this.playFail();
        }
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this._requestGameResult(result);
        } else {
            this.requestGameCenterGameResult(result);
            if (result) {
                (this.sceneModel as any).showSuccessView();
            } else {
                (this.sceneModel as any).showFailView();
            }

        }
    }

    private _resuleBoo: boolean = false;

    private _requestGameResult(win: boolean = true) {
        this._resuleBoo = win;
        // 上报数据
        let endTime = TimeUtil.getNow();
        let complete = win ? 1 : 0;
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
                if (SkewersManager.getInstance().isRunOver()) {
                    this.analysisNode.active = false;
                    this.showNextSuccessHandler();
                } else {
                    if (SkewersManager.getInstance().curGame && SkewersManager.getInstance().curGame.getCurTrainData() == null) {
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

    dzgoonHandler(resuleBoo: boolean = true) {
        this.clearGameView();
        if (this.sceneModel) {
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                // 直接发送训练完成请求，不处理弹窗逻辑
                // 直接向服务器发送请求，但不处理回调
                let self = this;
                let trainData = SkewersManager.getInstance().getUnCompleteGameData();
                let _boo = trainData.type != SkewersGameType.Comprehension;
                if (!_boo) {
                    EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, (data) => {
                        (self.sceneModel as any).goonHandler(self, true);
                    }, this, true);
                    this.clearGameView();
                    SkewersManager.getInstance().requestGameComplete(this.complete, this.duration);
                } else {
                    (this.sceneModel as any).goonHandler(self, true);
                }
            }
        }
    }

    onClickReplay() {
        if (this.replayCount <= 0) { return; }
        if (this.questionLabel) {
            this.questionLabel.node.active = true;
        }
        this.replayCount--;
        // 根据重听次数和是否已点击开始按钮决定是否显示重听按钮
        this.replayButtonNode.active = this.replayCount > 0 && !this._hasClickedStartBtn;
        this.questionReplayNode.active = this.replayCount > 0 && !this._hasClickedStartBtn;
        this.replayButtonNode.getChildByName("text").getComponent(Label).string = `可重听:${this.replayCount}次`;
        this._replay = true;
        this.guessingGameModel.replayQuestionAudio();
        // 重听时不调用startAnswer，不开启倒计时
        // this.startAnswer();
    }
    reSetButton() {
        this.replayCount = 2;
        // 重置时重听按钮隐藏（等待语音播放完毕）
        this.replayButtonNode.active = false;
        this.replayButtonNode.getChildByName("text").getComponent(Label).string = `可重听:${this.replayCount}次`;
    }

    onChooseOption(event: EventTouch, p: string) {
        // 播放点击音效
        this.playAudio("audio/music/click", true);
        this.processAnswer(p);
    }

    onclickContinue() {
        (this.sceneModel as any).dzanswerHandler(this);
    }


    /**
     * 进入下一局训练
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
        if (!context._isInAnswerPhase || context._replay) {
            context.guessingGameModel.replayQuestionAudio();
        } else {
            // 答题阶段恢复时，确保选项按钮可交互
            context.setOptionsInteractable(true);
            // 确保frameComponent处于待机状态
            context.frameComponent.playAnimation("idle", 16, true, true);
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
        if (!AudioManager.getInstance().isBgmPlaying()) {
            this.playBgmAudio('audio/music/caimiBG', true);
        }
        this.resumeTime();

        // 重置答题计时器
        this.timerRT.resetTimer();

        // 重置答题阶段标记
        this._isInAnswerPhase = false;
        this._replay = false;
        this._clickStart = false;
        this._hasClickedStartBtn = false; // 重置点击开始按钮的状态

        // 设置听题阶段
        this.setCurrentPhase('listening');

        // this.timerRT.node.active = false;
        // this.timerStartGame.node.active = false;

        // this.optionsNode.active = this.questionNode.active = false;

        this.frameComponent.playAnimation("idle", 16, true, true);

        this.analysisNode.active = false;

        // 重置重听按钮状态
        this.reSetButton();

        // 重置时隐藏重听按钮（因为语音还未开始播放）
        if (this.questionReplayNode) {
            this.questionReplayNode.active = false;
        }

        // 重置时启用开始按钮
        if (this.startBtn) {
            this.startBtn.active = true;
        }

        for (let i = 0; i < this.options.length; i++) {
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
        this._clickStart = true;
        this.guessingGameModel.stopAudio();
        this.frameComponent.playAnimation("idle", 16, true, true);

        // 设置已点击开始按钮的状态
        this._hasClickedStartBtn = true;

        // 设置答题阶段
        this.setCurrentPhase('answering');

        // 点击开始按钮后隐藏重听按钮
        if (this.replayButtonNode) {
            this.replayButtonNode.active = false;
        }
        if (this.questionReplayNode) {
            this.questionReplayNode.active = false;
        }

        // 点击开始按钮后禁用开始按钮
        if (this.startBtn) {
            this.startBtn.active = false;
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

        // 点击开始按钮后启用选项按钮
        this.setOptionsInteractable(true);
        this.startAnswer();
        this._replay = false;
    }

    public onClickShowAnswer() {
        super.onClickShowAnswer();
        
        // 设置结算阶段
        this.setCurrentPhase('result');
        
        this.analysisNode.active = true;
        this.analysisLabel.string = this.currentQuestion.analysis;
        this.setCorrectOptionColor();
        if (this.currentQuestion) {
            for (var i = 0; i < this.options.length; i++) {
                let op: string = this.options[i];
                let opnode: Node = this.optionsNode.getChildByName("choosen_" + op);
                if (opnode) {
                    opnode.getChildByName("Label").getComponent(Label).string = this.currentQuestion.options[op];
                }
            }
        }
        for (let i = 0; i < this.options.length; i++) {
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

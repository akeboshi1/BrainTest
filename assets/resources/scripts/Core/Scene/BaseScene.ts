import { assetManager, AudioClip, Component, director, Texture2D } from "cc";
import { Node } from "cc";
import {
    BaseGameModel,
    GameType,
    IBaseGameChild, IQuitGameConfig,
    IStartConfig
} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import {TimerCommonComponent} from "db://assets/resources/scripts/Game/UI/Common/TimerCommonComponent";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";
import {AudioManager} from "db://assets/resources/scripts/Core/Manager/Audio/AudioManager";
import {EventManager} from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
import {Global} from "db://assets/resources/scripts/Core/Manager/Config/Global";

/**
 * 基础场景
 */
export class BaseScene<T extends IBaseGameChild> extends Component {
    sceneModel: BaseGameModel<T>;
    viewNode: Node;
    timerComponent: TimerCommonComponent;
    guideView: Node = null;
    quitBtn: Node = null;

    public complete:number = 0;
    public duration:number = 0;

    protected bundleName: string = '';
    protected curView: BaseScene<IBaseGameChild> = null;

    // 音效
    protected audioMap: Map<string, AudioClip> = new Map();
    protected audioUrls = [];

    // 图片
    protected textureMap: Map<string, Texture2D> = new Map();
    protected textureUrls = [];

    // ========== component生命周期 ==========
    start() {
        this.sceneModel = (director.getScene() as unknown as { sceneModel }).sceneModel;
    }

    protected onDestroy(){
        this.complete = 0;
        this.duration = 0;
        this.clearGameView();
        EventManager.getInstance().disableContext(this);
        this.sceneModel.destory();
    }

    public showGuide(){
        if(this.guideView)this.guideView.active = true;
    }

    public hideGuide(){
        if(this.guideView)this.guideView.active = false;
    }

    //
    sceneInit(){
        this.resetTime();
    }

    onClickShowAnswer(){
        Global.isAgain = false;
        if(this.quitBtn)this.quitBtn.active = false;
    }

    dzanswerHandler(context){
        // if(this.quitBtn)this.quitBtn.active = true;
        if (this.sceneModel) this.sceneModel.dzanswerHandler(context);
    }



    onEnable() {
        if (this.timerComponent) this.timerComponent.on('timer-end', this.onTimerEnd, this);
        EventManager.getInstance().on("GAME_SUCCESS_NEXT_LEVEL", this.onSuccessNextLevel, this);
        EventManager.getInstance().on("GAME_FAIL_NEXT_LEVEL", this.onFailNextLevel, this);
        EventManager.getInstance().on("GAME_AGAIN", this.onAgain, this);
    }

    onDisable() {
        if (this.timerComponent) this.timerComponent.off('timer-end', this.onTimerEnd, this);
        EventManager.getInstance().off("GAME_FAIL_NEXT_LEVEL",  this);
        EventManager.getInstance().off("GAME_SUCCESS_NEXT_LEVEL",  this);
        EventManager.getInstance().off("GAME_AGAIN",  this);
    }

    onSuccessNextLevel(){

    }

    onFailNextLevel(){
        
    }

    onAgain(){
    }


    // ========== 资源加载 ==========
    protected async loadAudio() {
        const bundle = assetManager.getBundle(this.bundleName);
        if (!bundle) {
            DebugLog.instance.error("bundle is not exist! ---- bundle name:" + this.bundleName);
            return;
        }
        this.audioUrls.forEach(url => this.audioMap.set(url, null));
        for (const audioUrl of this.audioMap.keys()) {
            try {
                const audioRes = await new Promise<AudioClip>((resolve, reject) => {
                    bundle.load(audioUrl, AudioClip, (err, data: AudioClip) => {
                        err ? reject(err) : resolve(data);
                    });
                });
                if (audioRes) {
                    this.audioMap.set(audioUrl, audioRes);
                }
            } catch (err) {
                DebugLog.instance.error(`AudioClip加载失败: ${audioUrl}`, err);
            }
        }
    }

    // ========== 显示游戏开始提示 ==========
    public showStartAlert(config: IStartConfig) {
        if (this.sceneModel) this.sceneModel.showStartAlert(config);
    }

    // ========== 游戏退出 ==========
    public quitGame(config: IQuitGameConfig) {
        this.pauseTime();
        
        // 检查config和context是否有效
        if (!config) {
            DebugLog.instance.error("quitGame: config is null or undefined");
            return;
        }
        
        // 如果context不存在，使用this作为context
        if (!config.context) {
            DebugLog.instance.warn("quitGame: context is null, using this as context");
            config.context = this;
        }
        
        // 确保sceneModel存在后再调用
        if (config.context.sceneModel) {
            config.context.sceneModel.quitGame(config);
        } else if (this.sceneModel) {
            // 如果context没有sceneModel，但this有，使用this的sceneModel
            this.sceneModel.quitGame({...config, context: this});
        } else {
            DebugLog.instance.error("quitGame: no sceneModel available, cannot quit game properly");
        }
    }

    // ========== 开始倒计时 ==========
    public startTime(time: number) {
        if (this.timerComponent) this.timerComponent.startTimer(time);
    }

    // ========== 重置倒计时 ==========
    public resetTime() {
        if (this.timerComponent) this.timerComponent.resetTimer();
    }

    // ========== 暂停倒计时 ==========
    public pauseTime() {
        if (this.timerComponent) this.timerComponent.pauseTimer();
    }

    // ========== 恢复倒计时 ==========
    public resumeTime() {
        if (this.timerComponent) this.timerComponent.resumeTimer();
    }

    // ========== 倒计时结束 ==========
    onTimerEnd() {
        DebugLog.instance.log("计时器结束了，执行相应逻辑");
    }

    //  ========== 退出游戏回调 ==========
    public exitCallBack(context: any) {
        if (context.clearGameView == null) {
            if (context.curView) context.curView.clearGameView();
        } else {
            context.clearGameView();
        }
        if (this.sceneModel) this.sceneModel.exitCallBack();
    }

    //  ========== 退出游戏打开评测面板 ==========
    public remoteExitCallBack(context: any) {
        if (context.clearGameView == null) {
            if (context.curView) context.curView.clearGameView();
        } else {
            context.clearGameView();
        }
        if (this.sceneModel) this.sceneModel.remoteExitCallBack();
    }

    // ========== 继续游戏回调 ==========
    public resumeCallBack(context?: any) {
        if (context.sceneModel) {
            if (!context.sceneModel.resumeCallBack()) {
                return;
            }
        }
        context.resumeTime();
    }

    // =========== 上报数据 ============
    public requestGameComplete(config: any) {
        this.complete = config.complete;
        this.duration = config.duration;
        AudioManager.getInstance().pauseBgm();
        if (this.sceneModel) {
            this.sceneModel.requestGameComplete(config);
        }
    }

    /**
     * 下一大关
     * @param context
     */
    nextHandler(context?: any) {
        context.pauseTime();
        if (context.sceneModel) {
            context.sceneModel.nextHandler(context);
        }
    }

    /**
     * 游戏失败
     * @param context
     */
    failCompleteHanlder(context) {
        if (context.pauseTime == null) {
            if (context.curView) context.curView.pauseTime();
        } else {
            context.pauseTime();
        }
        if (context.sceneModel) {
            context.sceneModel.failCompleteHandler(context);
        }
    }

    /**
     * 继续
     * @param context
     */
    goonHandler(context) {
        if (context.clearGameView == null) {
            if (context.curView) context.curView.clearGameView();
        } else {
            context.clearGameView();
        }
        if (context.sceneModel) {
            context.sceneModel.goonHandler(context);
        }
    }

    dzgoonHandler(requestBoo:boolean = true){
        this.clearGameView();
    }

    showNextSuccessHandler() {
        if (this.sceneModel) {
            this.sceneModel.showNextSuccessHandler(this);
        }
    }

    showNextFailHandler() {
        if (this.sceneModel) {
            this.sceneModel.showNextFailHandler(this);
        }
    }

    totalCompleteHandler() {
        if (this.sceneModel) {
            this.sceneModel.totalCompleteHandler(this);
        }
    }

    /**
     * 开始订正任务
     */
    reviseHandler(){
        if(this.sceneModel){
            this.sceneModel.reviseHandler(this);
        }
    }

    /**
     * 重玩订正任务
     */
    retryHandler(){
        if(this.sceneModel){
            this.sceneModel.retryHandler(this);
        }
    }

    /**
     * 查看订正答案
     */
    answerHandler(){
        if(this.sceneModel){
            this.sceneModel.answerHandler(this);
        }
    }

    /**
     * 调用串烧游戏外部逻辑
     */
    remoteHandler() {
        this.remoteExitCallBack(this);
    }

    /**
     * 请求游戏完成数据返回
     */
    requestGameCompleteCallBack() {
        this.complete = 0;
        this.duration = 0;
    }

    // ========= 清理场景 ===========
    public clearGameView() {
        AudioManager.getInstance().stopLongSound();
        AudioManager.getInstance().stopBgm();
    }

    // ========== 播放音频 ==========
    public playAudio(url: string, isShot: boolean = false, isLoop: boolean = false):AudioClip {
        let audioRes = this.audioMap.get(url);
        if (audioRes != null) {
            if (isShot) {
                AudioManager.getInstance().playShortSound(audioRes);
            } else {
                AudioManager.getInstance().playLongSound(audioRes, isLoop);
            }
            return audioRes;
        }else{
            return null;
        }
    }

    // ========== 播放音频 ==========
    public playBgmAudio(url: string, isLoop: boolean = false):AudioClip {
        let audioRes = this.audioMap.get(url);
        if (audioRes != null) {
            AudioManager.getInstance().playBgm(audioRes, isLoop);
            return audioRes;
        }else{
            return null;
        }
    }

    public playWin() {
        AudioManager.getInstance().playWin();
    }

    public playFail() {
        AudioManager.getInstance().playFail();
    }







}
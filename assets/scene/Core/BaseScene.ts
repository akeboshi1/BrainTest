import { assetManager, AudioClip, Component, director } from "cc";
import { Node } from "cc";
import { AudioManager } from "../../scripts/Core/Manager/Audio/AudioManager";
import { TimerCommonComponent } from "../../scripts/Game/UI/Common/TimerCommonComponent";
import { BaseGameData, IBaseGameChild, IQuitGameConfig, IStartConfig } from "../../scripts/Game/GameDataFactory/BaseGameData";
import { DebugLog } from "../../scripts/Core/Util/DebugLog";
import { UIManager } from "../../scripts/Core/Manager/UI/UIManager";
import { GenerateReport } from "../../scripts/Game/UI/PersonalCenter/GenerateReport";
/**
 * 基础场景
 */
export class BaseScene<T extends IBaseGameChild> extends Component {
    sceneData: BaseGameData<T>;
    viewNode: Node;
    timerComponent: TimerCommonComponent;
    protected bundleName: string = '';
    protected curView: BaseScene<IBaseGameChild> = null;

    protected audioMap: Map<string, AudioClip> = new Map();
    protected audioUrls = ["music/fishCatch", "music/win"];

    // ========== component生命周期 ==========
    start() {
        this.sceneData = (director.getScene() as unknown as { sceneData }).sceneData;
    }

    onEnable() {
        if (this.timerComponent) this.timerComponent.on('timer-end', this.onTimerEnd, this);
    }

    onDisable() {
        if (this.timerComponent) this.timerComponent.off('timer-end', this.onTimerEnd, this);
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
    public showStartAlert(config:IStartConfig) {
        if (this.sceneData) this.sceneData.showStartAlert(config);
    }

    // ========== 游戏退出 ==========
    public quitGame(config: IQuitGameConfig) {
        this.pauseTime();
        if (config.context.sceneData) config.context.sceneData.quitGame(config);
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
        if (this.sceneData) this.sceneData.exitCallBack();
    }

    // ========== 继续游戏回调 ==========
    public resumeCallBack(context?: any) {
        if (context.sceneData) {
            if (!context.sceneData.resumeCallBack()) {
                return;
            }
        }
        context.resumeTime();
    }

    // =========== 上报数据 ============
    public requestGameComplete(config: any) {
        if (this.sceneData) {
            this.sceneData.requestGameComplete(config);
        }
    }

    /**
     * 下一大关
     * @param context 
     */
    nextHandler(context?: any) {
        context.pauseTime();
        if (context.sceneData) {
            context.sceneData.nextHandler(context);
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
        if (context.sceneData) {
            context.sceneData.failCompleteHandler(context);
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
        if (context.sceneData) {
            context.sceneData.goonHandler(context);
        }
    }

    /**
     * 调用串烧游戏外部逻辑
     */
    remoteHandler() {
        this.exitCallBack(this);
        UIManager.getInstance().showPanel(GenerateReport.NAME);
    }

    /**
     * 请求游戏完成数据返回
     */
    requestGameCompleteCallBack() {

    }

    // ========= 清理场景 ===========
    public clearGameView() {
        AudioManager.getInstance().stop();
    }

    // ========== 播放音频 ==========
    public playAudio(url: string, isShot: boolean = false, isLoop: boolean = false) {
        let audioRes = this.audioMap.get(url);
        if (audioRes != null) {
            if (isShot) {
                AudioManager.getInstance().playOneShot(audioRes);
            } else {
                AudioManager.getInstance().play(audioRes, isLoop);
            }
        }
    }






}
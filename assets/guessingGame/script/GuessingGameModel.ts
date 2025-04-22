import { AssetManager, assetManager, AudioClip,AudioSource } from "cc";
import { EventManager } from "../../resources/scripts/Core/Manager/Event/EventManager";
import { GuessingGameConfig, GuessingQuestion } from "./GuessingGameConfig";
import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";
import { AudioManager } from "../../resources/scripts/Core/Manager/Audio/AudioManager";
import { GuessingGameScene } from "./GuessingGameScene";
import {GameType} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";

export class GuessingGameModel {
    constructor() {
    }
    private bundleName: string = "guessingGame";

    private config: GuessingGameConfig = null;

    public currentQuestionIndex = 1;

    private binit: boolean = false;

    private cacheAudioClip: AudioClip = null;

    private _curQuestion: GuessingQuestion = null;

    private _view: GuessingGameScene;
    async init(view: GuessingGameScene) {
        this._view = view;
        if (this.binit) return;
        this.binit = true;

        this.config = new GuessingGameConfig();
        await this.config.loadConfig();
        if (this._view.sceneModel.gameType == GameType.SKEWERS) {
            this.currentQuestionIndex = (this._view.sceneModel as any).game.getCurTrainData().level;
        } else {
            let remoteLevel = Number((this._view.sceneModel as any).game.level);
            this.currentQuestionIndex = remoteLevel == 0 ? this.currentQuestionIndex : remoteLevel;
        }
        this.currentQuestionIndex = this.config.formartQuestionID(this.currentQuestionIndex);
        DebugLog.instance.log("current question index : " + this.currentQuestionIndex);

        AudioManager.getInstance().onAudioStart(this.onAudioStart, this);
        AudioManager.getInstance().onAudioEnd(this.onAudioFinished, this);

        EventManager.getInstance().emit(GuessingGameEvent.INIT_COMPLETE, {});
    }

    get isRunOver(): boolean {
        return (this._view.sceneModel as any).game.getCurTrainData() == null;
        // return this.config.getQuestionByNumber(this.currentQuestionIndex+1) == null;
    }

    private onAudioStart() {
        DebugLog.instance.log("Audio Started!!!");
        EventManager.getInstance().emit(GuessingGameEvent.AUDIO_STARTED, {});
    }

    private onAudioFinished() {
        DebugLog.instance.log("Audio Finished!!!");
        EventManager.getInstance().emit(GuessingGameEvent.AUDIO_FINISHED, {});
    }

    async startQuestionFlow() {
        this._curQuestion = this.config.getQuestionByNumber(this.currentQuestionIndex);
        EventManager.getInstance().emit(GuessingGameEvent.SHOW_QUESTION, { question: this._curQuestion });

        const audioUrl = this.config.getAudioSourceByNumber(this.currentQuestionIndex);

        if (!audioUrl) {
            DebugLog.instance.error("GuessingGameConfig error! ---- currentQuestionIndex:" + this.currentQuestionIndex);
            return;
        }

        const bundle = assetManager.getBundle(this.bundleName);
        if (!bundle) {
            DebugLog.instance.error("bundle is not exist! ---- bundle name:" + this.bundleName);
            return;
        }

        // 尝试加载音频资源，最多重试3次
        await this.loadAudioResource(bundle, audioUrl, 3);
    }

    // 加载音频资源的方法，支持重试
    private async loadAudioResource(bundle:AssetManager.Bundle, audioUrl: string, maxRetries: number = 3): Promise<void> {
        let retryCount = 0;
        let succeeded = false;

        while (retryCount < maxRetries && !succeeded) {
            // 确保先释放可能存在的资源
            bundle.release(audioUrl);
            if (retryCount > 0) {
                DebugLog.instance.log(`尝试第 ${retryCount} 次重新加载音频: ${audioUrl}`);
                // 加入一点延迟，避免释放和重新加载之间的潜在冲突
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            try {
                // 尝试加载资源
                const audioRes: AudioClip = await new Promise<AudioClip>((resolve, reject) => {
                    bundle.load(audioUrl, AudioClip, (err, data: AudioClip) => {
                        if (err) {
                            DebugLog.instance.error(`AudioClip Load Failed ! url : ${audioUrl}, error: ${err}`);
                            reject(err);
                        } else {
                            resolve(data);
                        }
                    });
                });

                // 验证资源有效性
                if (audioRes && audioRes.isValid && audioRes._nativeAsset) {
                    this.cacheAudioClip = audioRes;
                    DebugLog.instance.log(`音频资源有效，准备播放`);
                    AudioManager.getInstance().play(audioRes);
                    succeeded = true;
                } else {
                    DebugLog.instance.error(`加载的音频资源无效，重试次数: ${retryCount + 1}/${maxRetries}`);
                    // 资源无效，会进入下一次重试
                }
            } catch (error) {
                DebugLog.instance.error(`加载音频出错: ${error}, 重试次数: ${retryCount + 1}/${maxRetries}`);
                // 异常情况，会进入下一次重试
            }

            retryCount++;
        }

        if (!succeeded) {
            DebugLog.instance.error(`音频资源 ${audioUrl} 加载失败，已达到最大重试次数: ${maxRetries}`);
            // 可以在这里触发一个事件，通知界面显示加载失败的提示
            EventManager.getInstance().emit(GuessingGameEvent.AUDIO_LOAD_FAILED, { url: audioUrl });
        }
    }

    dispose() {
        if (this.config) {
            this.config = null;
        }

        AudioManager.getInstance().offAudioStart(this.onAudioStart, this);
        AudioManager.getInstance().offAudioEnd(this.onAudioFinished, this);

        this.cacheAudioClip = null;
    }

    replayQuestionAudio() {
        if (this.cacheAudioClip) {
            AudioManager.getInstance().play(this.cacheAudioClip);
        }
    }

    stopAudio() {
        AudioManager.getInstance().stop();
    }

    resumeAudio() {
        AudioManager.getInstance().resume();
    }

    goNextQuestion() {
        if (this._view.sceneModel.gameType == GameType.SKEWERS) {
            this.currentQuestionIndex = (this._view.sceneModel as any).game.getCurTrainData().level;
        } else {
            let remoteLevel = Number((this._view.sceneModel as any).game.level);
            this.currentQuestionIndex = remoteLevel == 0 ? this.currentQuestionIndex : remoteLevel;
        }
        this.currentQuestionIndex = this.config.formartQuestionID(this.currentQuestionIndex);
        DebugLog.instance.log("current question index : " + this.currentQuestionIndex);

        this.startQuestionFlow();
    }
}

export enum GuessingGameEvent {
    INIT_COMPLETE = "guessingGame.initComplete",
    SHOW_QUESTION = "guessingGame.showQuestion",
    AUDIO_STARTED = "guessingGame.audioStarted",
    AUDIO_FINISHED = "guessingGame.audioFinished",
    AUDIO_LOAD_FAILED = "guessingGame.audioLoadFailed",
}
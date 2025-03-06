import { assetManager, AudioClip } from "cc";
import { EventManager } from "../../scripts/Core/Manager/Event/EventManager";
import { GuessingGameConfig, GuessingQuestion } from "./GuessingGameConfig";
import { DebugLog } from "../../scripts/Core/Util/DebugLog";
import { AudioManager } from "../../scripts/Core/Manager/Audio/AudioManager";
import { GuessingGameScene } from "./GuessingGameScene";
import {GameType} from "db://assets/scripts/Core/Scene/SceneModel/BaseGameModel";

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

        const audioRes: AudioClip = await new Promise<AudioClip>((resolve, reject) => {
            bundle.load(audioUrl, AudioClip, (err, data: AudioClip) => {
                if (err) {
                    DebugLog.instance.error("AudioClip Load Failed ! url : " + audioUrl);
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        });

        if (audioRes) {
            this.cacheAudioClip = audioRes;
            AudioManager.getInstance().play(audioRes);
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
}
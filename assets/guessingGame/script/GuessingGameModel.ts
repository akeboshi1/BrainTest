import { assetManager, AudioClip, Socket } from "cc";
import { EventManager } from "../../resources/scripts/Core/Manager/Event/EventManager";
import { GuessingGameConfig, GuessingQuestion } from "./GuessingGameConfig";
import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";
import { AudioManager } from "../../resources/scripts/Core/Manager/Audio/AudioManager";
import { GuessingGameScene } from "./GuessingGameScene";
import { BaseGameModel, GameType, IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { BundleName } from "../../resources/scripts/Core/Manager/Load/BundleName";
import { SocketManager } from "../../resources/scripts/Core/Manager/Net/SocketManager";
import { SocketData } from "../../resources/scripts/Core/Manager/Net/SocketData";

export class GuessingGameModel {
    constructor() {
    }
    private static GUESSINGGAME_EVALUATE: string = "guessing.evaluate";

    private bundleName: string = BundleName.GUESSINGGAME;
    private config: GuessingGameConfig = null;

    public currentQuestionIndex = 1;

    private _currentAnswer: string = "";
    private _currentAnswerScore: number = 0;

    private binit: boolean = false;

    private cacheAudioClip: AudioClip = null;

    private _curQuestion: GuessingQuestion = null;

    private _sceneModel: BaseGameModel<IBaseGameChild>;

    async init(sceneModel: BaseGameModel<IBaseGameChild>) {
        this._sceneModel = sceneModel;
        if (this.binit) return;
        this.binit = true;

        this.config = new GuessingGameConfig();
        await this.config.loadConfig();
        if (this._sceneModel.gameType == GameType.SKEWERS) {
            this.currentQuestionIndex = (this._sceneModel as any).game.getCurTrainData().level;
        } else {
            let remoteLevel = Number((this._sceneModel as any).game.level);
            this.currentQuestionIndex = remoteLevel == 0 ? this.currentQuestionIndex : remoteLevel;
        }
        this.currentQuestionIndex = this.config.formartQuestionID(this.currentQuestionIndex);
        DebugLog.instance.log("current question index : " + this.currentQuestionIndex);

        AudioManager.getInstance().onAudioStart(this.onAudioStart, this);
        AudioManager.getInstance().onAudioEnd(this.onAudioFinished, this);

        EventManager.getInstance().emit(GuessingGameEvent.INIT_COMPLETE, {});
    }

    get isRunOver(): boolean {
        return (this._sceneModel as any).game.getCurTrainData() == null;
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
        this.cleanCurrentAnswer();
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

        EventManager.getInstance().off(GuessingGameModel.GUESSINGGAME_EVALUATE, this);

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
        if (this._sceneModel.gameType == GameType.SKEWERS) {
            this.currentQuestionIndex = (this._sceneModel as any).game.getCurTrainData().level;
        } else {
            let remoteLevel = Number((this._sceneModel as any).game.level);
            this.currentQuestionIndex = remoteLevel == 0 ? this.currentQuestionIndex : remoteLevel;
        }
        this.currentQuestionIndex = this.config.formartQuestionID(this.currentQuestionIndex);
        DebugLog.instance.log("current question index : " + this.currentQuestionIndex);

        this.startQuestionFlow();
    }

    analysisAnswer(answer: string, questionNumber: number) {
        let data = {
            seq: questionNumber,
            answers: this.config.getQuestionByNumber(questionNumber).answer,
            question: this.config.getQuestionByNumber(questionNumber).questionText,
            user_answer: answer,
        };
        let socketdata = new SocketData({ action: GuessingGameModel.GUESSINGGAME_EVALUATE, data });

        EventManager.getInstance().on(GuessingGameModel.GUESSINGGAME_EVALUATE, this.analysisAnswerCallback, this, true);

        SocketManager.getInstance().send(socketdata);
    }

    private analysisAnswerCallback(data) {
        if (data.status == 1) {
            this._currentAnswerScore = data.data.result.score / 100;
            this._currentAnswer = data.data.result.fixed_answer;
            EventManager.getInstance().emit(GuessingGameEvent.ANSWER_EVALUATE_FINISHED, { score: this._currentAnswerScore, answer: this._currentAnswer });
        }
    }

    public get currentAnswerScore(): number {
        return this._currentAnswerScore;
    }

    public get currentAnswer(): string {
        return this._currentAnswer;
    }

    public cleanCurrentAnswer() {
        this._currentAnswer = "";
        this._currentAnswerScore = 0;
    }
}

export enum GuessingGameEvent {
    INIT_COMPLETE = "guessingGame.initComplete",
    SHOW_QUESTION = "guessingGame.showQuestion",
    AUDIO_STARTED = "guessingGame.audioStarted",
    AUDIO_FINISHED = "guessingGame.audioFinished",
    ANSWER_EVALUATE_FINISHED = "guessingGame.answerEvaluate.finished",
}
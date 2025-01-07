import { assetManager, AudioClip, debug } from "cc";
import { EventManager } from "../../scripts/Core/Manager/Event/EventManager";
import {GuessingGameConfig, GuessingQuestion} from "./GuessingGameConfig";
import { DebugLog } from "../../scripts/Core/Util/DebugLog";
import { AudioManager } from "../../scripts/Core/Manager/Audio/AudioManager";

export class GuessingGameModel{
    constructor(){
    }
    private bundleName:string = "guessingGame";

    private config:GuessingGameConfig = null;

    public currentQuestionIndex = 1;

    private binit:boolean = false;

    private cacheAudioClip:AudioClip = null;

    private _curQuestion:GuessingQuestion = null;
    async init(){
        if(this.binit) return;
        this.binit = true;

        this.config = new GuessingGameConfig();
        await this.config.loadConfig();
        this.currentQuestionIndex = this.config.getUnAnswerQuestionIndex();
        AudioManager.getInstance().onAudioStart(this.onAudioStart,this);
        AudioManager.getInstance().onAudioEnd(this.onAudioFinished,this);

        EventManager.getInstance().emit(GuessingGameEvent.INIT_COMPLETE,{});
    }

    private onAudioStart(){
        DebugLog.instance.log("Audio Started!!!");
        EventManager.getInstance().emit(GuessingGameEvent.AUDIO_STARTED,{});
    }

    private onAudioFinished(){
        DebugLog.instance.log("Audio Finished!!!");
        EventManager.getInstance().emit(GuessingGameEvent.AUDIO_FINISHED,{});
    }

    async startQuestionFlow(isRandom:boolean = false){
        this._curQuestion = this.config.getQuestionByNumber(this.currentQuestionIndex,isRandom);
        EventManager.getInstance().emit(GuessingGameEvent.SHOW_QUESTION,{question:this._curQuestion});

        const audioUrl = this.config.getAudioSourceByNumber(this.currentQuestionIndex,isRandom);

        if(!audioUrl){
            DebugLog.instance.error("GuessingGameConfig error! ---- currentQuestionIndex:"+ this.currentQuestionIndex);
            return;
        }

        const bundle = assetManager.getBundle(this.bundleName);
        if(!bundle){
            DebugLog.instance.error("bundle is not exist! ---- bundle name:"+ this.bundleName);
            return;
        }

        const audioRes:AudioClip = await new Promise<AudioClip>((resolve,reject)=>{
            bundle.load(audioUrl,AudioClip,(err,data:AudioClip)=>{
                if(err){
                    DebugLog.instance.error("AudioClip Load Failed ! url : " + audioUrl);
                    reject(err);
                }else{
                    resolve(data);
                }
            })
        });
        
        if(audioRes){
            this.cacheAudioClip = audioRes;
            AudioManager.getInstance().play(audioRes);
        }
    }

    dispose(){
        if(this.config){
            this.config = null;
        }

        AudioManager.getInstance().offAudioStart(this.onAudioStart,this);
        AudioManager.getInstance().offAudioEnd(this.onAudioFinished,this);

        this.cacheAudioClip = null;
    }

    replayQuestionAudio(){
        if(this.cacheAudioClip){
            AudioManager.getInstance().play(this.cacheAudioClip);
        }
    }

    stopAudio(){
        AudioManager.getInstance().stop();
    }

    resumeAudio(){
        AudioManager.getInstance().resume();
    }

    goNextQuestion(){
        this.currentQuestionIndex = this.config.getNextQuestionNumber(Number(this.currentQuestionIndex));

        this.startQuestionFlow();
    }

    getUnAnswerQuestion(){
        if(this._curQuestion){
            this._curQuestion.hasAnswer = true;
        }
        this.currentQuestionIndex = this.config.getUnAnswerQuestionIndex();
        this.startQuestionFlow(true);
    }
}

export enum GuessingGameEvent{
    INIT_COMPLETE = "guessingGame.initComplete",
    SHOW_QUESTION = "guessingGame.showQuestion",
    AUDIO_STARTED = "guessingGame.audioStarted",
    AUDIO_FINISHED = "guessingGame.audioFinished",
}
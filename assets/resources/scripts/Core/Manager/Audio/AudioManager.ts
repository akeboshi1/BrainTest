import { Node, AudioSource, AudioClip, resources, director, EventTarget } from 'cc';
import { BaseManager } from '../BaseManager';
import {LoaderManager} from "db://assets/resources/scripts/Core/Manager/Load/LoaderManager";

/**
 * @en
 * this is a sington class for audio play, can be easily called from anywhere in you project.
 * @zh
 * 这是一个用于播放音频的单件类，可以很方便地在项目的任何地方调用。
 */
export class AudioManager extends BaseManager {
    private static _inst: AudioManager;
    public static getInstance(): AudioManager {
        if (this._inst == null) {
            this._inst = new AudioManager();
        }
        return this._inst;
    }

    private _audioSource: AudioSource;
    // 创建一个事件目标对象，用于触发和监听自定义事件
    private eventTarget: EventTarget = new EventTarget();

    private audioUrls=["music/win","music/fail"];
    private audioMap:Map<string,AudioClip> = new Map();

    constructor() {
        super();
        let audioMgr = new Node();
        audioMgr.name = '__audioMgr__';
        director.getScene().addChild(audioMgr);
        director.addPersistRootNode(audioMgr);
        this._audioSource = audioMgr.addComponent(AudioSource);
        // 监听音频源的 'ended' 事件，当音频播放结束时触发自定义事件
        this._audioSource.node.on(AudioSource.EventType.STARTED, this.onAudioStarted.bind(this));
        this._audioSource.node.on(AudioSource.EventType.ENDED, this.onAudioEnded.bind(this));
    }

    public init(){
        super.init();
        this.loadAudio().then();
    }

    private async loadAudio(){
        const loadPromises = this.audioUrls.map(audioUrl => {
            return new Promise((resolve, reject) => {
                LoaderManager.getInstance().resourcesLoadAudio(audioUrl).then((audioRes:AudioClip)=>{
                    this.audioMap.set(audioUrl,audioRes);
                    resolve(audioRes);
                }).catch((err)=>{
                    reject(err);
                });
            });
        });
        try {
            const assets = await Promise.all(loadPromises);
            console.log('All audio loaded:', assets);
        } catch (error) {
            console.error('Error loading audio:', error);
        }

    }

    public playWin(){
        this.playOneShot("music/win");
    }

    public playFail(){
        this.playOneShot("music/fail");
    }

    public get audioSource() {
        return this._audioSource;
    }

    /**
     * 当音频播放开始时触发的回调函数，用于发送自定义事件
     */
    private onAudioStarted() {
        this.eventTarget.emit('audio-started');
    }

    /**
     * 当音频播放结束时触发的回调函数，用于发送自定义事件
     */
    private onAudioEnded() {
        this.eventTarget.emit('audio-ended');
    }


    /**
     * @en
     * play short audio, such as strikes,explosions
     * @zh
     * 播放短音频,比如 打击音效，爆炸音效等
     * @param sound clip or url for the audio
     * @param volume
     */
    playOneShot(sound: AudioClip | string, volume: number = 1.0) {
        if (sound instanceof AudioClip) {
            this._audioSource.playOneShot(sound, volume);
        }
        else {
            resources.load(sound, (err, clip: AudioClip) => {
                if (err) {
                    console.log(err);
                }
                else {
                    this._audioSource.playOneShot(clip, volume);
                }
            });
        }
    }

    /**
     * @en
     * play long audio, such as the bg music
     * @zh
     * 播放长音频，比如 背景音乐
     * @param sound clip or url for the sound
     * @param volume
     */
    play(sound: AudioClip | string,loop:boolean = false, volume: number = 1.0) {
        if (sound instanceof AudioClip) {
            this._audioSource.stop();
            this._audioSource.clip = sound;
            this._audioSource.loop = loop;
            this._audioSource.play();
            this.audioSource.volume = volume;
        }
        else {
            resources.load(sound, (err, clip: AudioClip) => {
                if (err) {
                    console.log(err);
                }
                else {
                    this._audioSource.stop();
                    this._audioSource.clip = clip;
                    this._audioSource.loop = loop;
                    this._audioSource.play();
                    this.audioSource.volume = volume;
                }
            });
        }
    }

    /**
     * stop the audio play
     */
    stop() {
        this._audioSource.stop();
        this._audioSource.clip = null;
    }

    /**
     * pause the audio play
     */
    pause() {
        this._audioSource.pause();
    }

    /**
     * resume the audio play
     */
    resume() {
        this._audioSource.play();
    }

    onAudioEnd(callback: () => void , context) {
        this.eventTarget.on('audio-ended', callback, context);
    }

    offAudioEnd(callback: () => void, context) {
        this.eventTarget.off('audio-ended', callback, context);
    }

    onAudioStart(callback: () => void, context) {
        this.eventTarget.on('audio-started', callback, context);
    }

    offAudioStart(callback: () => void, context) {
        this.eventTarget.off('audio-started', callback, context);
    }
}
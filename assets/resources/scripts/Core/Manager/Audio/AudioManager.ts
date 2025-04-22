import { Node, AudioSource, AudioClip, resources, director, EventTarget } from 'cc';
import { BaseManager } from '../BaseManager';
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";

/**
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

    // 主音频源，用于音效和普通音频
    private _audioSource: AudioSource;

    // 第二音频源，主要用于背景音乐
    private _bgmAudioSource: AudioSource;

    // 创建一个事件目标对象，用于触发和监听自定义事件
    private eventTarget: EventTarget = new EventTarget();

    private audioUrls=["music/win","music/fail"];
    private audioMap:Map<string,AudioClip> = new Map();
    
    // 保存绑定后的函数引用
    private boundOnAudioStarted: Function;
    private boundOnAudioEnded: Function;
    private boundOnBgmAudioStarted: Function;
    private boundOnBgmAudioEnded: Function;

    constructor() {
        super();
       
        let audioMgr = new Node();
        audioMgr.name = '__audioMgr__';
        director.getScene().addChild(audioMgr);
        director.addPersistRootNode(audioMgr);
        this._audioSource = audioMgr.addComponent(AudioSource);
        
        // 初始化背景音乐音频源
        this._bgmAudioSource = audioMgr.addComponent(AudioSource);
    }

    public init(){
        super.init();
        this.loadAudio().then();
        
        // 创建绑定函数并保存引用
        this.boundOnAudioStarted = this.onAudioStarted.bind(this);
        this.boundOnAudioEnded = this.onAudioEnded.bind(this);
        this.boundOnBgmAudioStarted = this.onBgmAudioStarted.bind(this);
        this.boundOnBgmAudioEnded = this.onBgmAudioEnded.bind(this);
        
        // 监听音频源的事件，使用保存的绑定函数
        this._audioSource.node.on(AudioSource.EventType.STARTED, this.boundOnAudioStarted);
        this._audioSource.node.on(AudioSource.EventType.ENDED, this.boundOnAudioEnded);
        
        // 监听背景音乐音频源的事件
        this._bgmAudioSource.node.on(AudioSource.EventType.STARTED, this.boundOnBgmAudioStarted);
        this._bgmAudioSource.node.on(AudioSource.EventType.ENDED, this.boundOnBgmAudioEnded);
    }

    private async loadAudio(){
        const loadPromises = this.audioUrls.map(audioUrl => {
            return new Promise((resolve, reject) => {
                resources.load(audioUrl, AudioClip,(err,audioRes:AudioClip)=>{
                    if(err){
                        DebugLog.instance.error('加载音频失败:', audioUrl, err);
                        reject(err);
                        return;
                    }
                    this.audioMap.set(audioUrl,audioRes);
                    resolve(audioRes);
                });
            });
        });
        try {
            const assets = await Promise.all(loadPromises);
            DebugLog.instance.log('All audio loaded:', assets);
        } catch (error) {
            DebugLog.instance.error('Error loading audio:', error);
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

    public get bgmAudioSource() {
        return this._bgmAudioSource;
    }

    /**
     * 当主音频源播放开始时触发的回调函数
     */
    private onAudioStarted() {
        this.eventTarget.emit('audio-started');
    }

    /**
     * 当主音频源播放结束时触发的回调函数
     */
    private onAudioEnded() {
        this.eventTarget.emit('audio-ended');
    }

    /**
     * 当背景音乐播放开始时触发的回调函数
     */
    private onBgmAudioStarted() {
        this.eventTarget.emit('bgm-started');
    }

    /**
     * 当背景音乐播放结束时触发的回调函数
     */
    private onBgmAudioEnded() {
        this.eventTarget.emit('bgm-ended');
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
                    DebugLog.instance.log(err);
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
    play(sound: AudioClip | string, loop:boolean = false, volume: number = 1.0) {
        if (sound instanceof AudioClip) {
            this._audioSource.stop();
            this._audioSource.clip = sound;
            this._audioSource.loop = loop;
            this._audioSource.play();
            this._audioSource.volume = volume;
        }
        else {
            resources.load(sound, (err, clip: AudioClip) => {
                if (err) {
                    DebugLog.instance.log(err);
                }
                else {
                    this._audioSource.stop();
                    this._audioSource.clip = clip;
                    this._audioSource.loop = loop;
                    this._audioSource.play();
                    this._audioSource.volume = volume;
                }
            });
        }
    }

    /**
     * 播放背景音乐，使用专用的背景音乐音频源
     * @param sound 音频剪辑或URL
     * @param loop 是否循环播放
     * @param volume 音量
     */
    playBgm(sound: AudioClip | string, loop:boolean = true, volume: number = 0.8) {
        if (sound instanceof AudioClip) {
            this._bgmAudioSource.stop();
            this._bgmAudioSource.clip = sound;
            this._bgmAudioSource.loop = loop;
            this._bgmAudioSource.volume = volume;
            this._bgmAudioSource.play();
        }
        else {
            resources.load(sound, (err, clip: AudioClip) => {
                if (err) {
                    DebugLog.instance.log(err);
                }
                else {
                    this._bgmAudioSource.stop();
                    this._bgmAudioSource.clip = clip;
                    this._bgmAudioSource.loop = loop;
                    this._bgmAudioSource.volume = volume;
                    this._bgmAudioSource.play();
                }
            });
        }
    }

    /**
     * 检查背景音乐是否在播放
     */
    isBgmPlaying(): boolean {
        return this._bgmAudioSource && this._bgmAudioSource.playing;
    }

    /**
     * 停止背景音乐
     */
    stopBgm() {
        if (this._bgmAudioSource) {
            this._bgmAudioSource.stop();
            this._bgmAudioSource.clip = null;
        }
    }

    /**
     * 暂停背景音乐
     */
    pauseBgm() {
        if (this._bgmAudioSource) {
            this._bgmAudioSource.pause();
        }
    }

    /**
     * 恢复背景音乐播放
     */
    resumeBgm() {
        if (this._bgmAudioSource && this._bgmAudioSource.clip) {
            this._bgmAudioSource.play();
        }
    }

    /**
     * 设置背景音乐音量
     */
    setBgmVolume(volume: number) {
        if (this._bgmAudioSource) {
            this._bgmAudioSource.volume = Math.max(0, Math.min(1, volume));
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

    /**
     * 停止所有音频（包括背景音乐和音效）
     */
    stopAll() {
        this.stop();
        this.stopBgm();
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

    onBgmEnd(callback: () => void, context) {
        this.eventTarget.on('bgm-ended', callback, context);
    }

    offBgmEnd(callback: () => void, context) {
        this.eventTarget.off('bgm-ended', callback, context);
    }

    onBgmStart(callback: () => void, context) {
        this.eventTarget.on('bgm-started', callback, context);
    }

    offBgmStart(callback: () => void, context) {
        this.eventTarget.off('bgm-started', callback, context);
    }

    destory() {
        if (this._audioSource) {
            this._audioSource.stop();
            this._audioSource.clip = null;
            // 使用保存的绑定函数移除监听器
            this._audioSource.node.off(AudioSource.EventType.STARTED, this.boundOnAudioStarted);
            this._audioSource.node.off(AudioSource.EventType.ENDED, this.boundOnAudioEnded);
        }
        
        if (this._bgmAudioSource) {
            this._bgmAudioSource.stop();
            this._bgmAudioSource.clip = null;
            // 使用保存的绑定函数移除监听器
            this._bgmAudioSource.node.off(AudioSource.EventType.STARTED, this.boundOnBgmAudioStarted);
            this._bgmAudioSource.node.off(AudioSource.EventType.ENDED, this.boundOnBgmAudioEnded);
        }
        
        this.eventTarget = new EventTarget();
        this.audioMap = new Map();
    }
}
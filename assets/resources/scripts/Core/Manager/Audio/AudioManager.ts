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

    // 短音效音频源，用于播放短音频如打击音效、爆炸音效等
    private _shortAudioSource: AudioSource;

    // 长音效音频源，用于播放长音频如语音、长音效等
    private _longAudioSource: AudioSource;

    // 背景音乐音频源，主要用于背景音乐
    private _bgmAudioSource: AudioSource;

    // 创建一个事件目标对象，用于触发和监听自定义事件
    private eventTarget: EventTarget = new EventTarget();

    private audioUrls=["music/win","music/fail","music/cheer",'music/tick'];
    private audioMap:Map<string,AudioClip> = new Map();
    
    // 保存绑定后的函数引用
    private boundOnShortAudioStarted: Function;
    private boundOnShortAudioEnded: Function;
    private boundOnLongAudioStarted: Function;
    private boundOnLongAudioEnded: Function;
    private boundOnBgmAudioStarted: Function;
    private boundOnBgmAudioEnded: Function;

    constructor() {
        super();

        let audioMgr = new Node();
        audioMgr.name = '__audioMgr__';
        director.getScene().addChild(audioMgr);
        director.addPersistRootNode(audioMgr);
        
        // 初始化短音效音频源
        this._shortAudioSource = audioMgr.addComponent(AudioSource);
        
        // 初始化长音效音频源
        this._longAudioSource = audioMgr.addComponent(AudioSource);
        
        // 初始化背景音乐音频源
        this._bgmAudioSource = audioMgr.addComponent(AudioSource);
    }

    public init(){
        super.init();
        this.loadAudio().then();
        
        // 创建绑定函数并保存引用
        this.boundOnShortAudioStarted = this.onShortAudioStarted.bind(this);
        this.boundOnShortAudioEnded = this.onShortAudioEnded.bind(this);
        this.boundOnLongAudioStarted = this.onLongAudioStarted.bind(this);
        this.boundOnLongAudioEnded = this.onLongAudioEnded.bind(this);
        this.boundOnBgmAudioStarted = this.onBgmAudioStarted.bind(this);
        this.boundOnBgmAudioEnded = this.onBgmAudioEnded.bind(this);
        
        // 监听短音效音频源的事件
        this._shortAudioSource.node.on(AudioSource.EventType.STARTED, this.boundOnShortAudioStarted);
        this._shortAudioSource.node.on(AudioSource.EventType.ENDED, this.boundOnShortAudioEnded);
        
        // 监听长音效音频源的事件
        this._longAudioSource.node.on(AudioSource.EventType.STARTED, this.boundOnLongAudioStarted);
        this._longAudioSource.node.on(AudioSource.EventType.ENDED, this.boundOnLongAudioEnded);
        
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
        this.playShortSound("music/win");
    }

    public playFail(){
        this.playShortSound("music/fail");
    }

    public playCheer(){
        this.playShortSound("music/cheer");
    }

    public get shortAudioSource() {
        return this._shortAudioSource;
    }

    public get longAudioSource() {
        return this._longAudioSource;
    }

    public get bgmAudioSource() {
        return this._bgmAudioSource;
    }

    /**
     * 当短音效播放开始时触发的回调函数
     */
    private onShortAudioStarted() {
        this.eventTarget.emit('short-audio-started');
    }

    /**
     * 当短音效播放结束时触发的回调函数
     */
    private onShortAudioEnded() {
        this.eventTarget.emit('short-audio-ended');
    }

    /**
     * 当长音效播放开始时触发的回调函数
     */
    private onLongAudioStarted() {
        this.eventTarget.emit('long-audio-started');
    }

    /**
     * 当长音效播放结束时触发的回调函数
     */
    private onLongAudioEnded() {
        this.eventTarget.emit('long-audio-ended');
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
    playShortSound(sound: AudioClip | string, volume: number = 1.0) {
        if (sound instanceof AudioClip) {
            this._shortAudioSource.playOneShot(sound, volume);
        }
        else {
            resources.load(sound, (err, clip: AudioClip) => {
                if (err) {
                    DebugLog.instance.log(err);
                }
                else {
                    this._shortAudioSource.playOneShot(clip, volume);
                }
            });
        }
    }

    /**
     * @en
     * play long audio, such as voice, long sound effects
     * @zh
     * 播放长音频，比如 语音、长音效等
     * @param sound clip or url for the sound
     * @param loop 是否循环播放
     * @param volume 音量
     */
    playLongSound(sound: AudioClip | string, loop:boolean = false, volume: number = 1.0) {
        if (sound instanceof AudioClip) {
            this._longAudioSource.stop();
            this._longAudioSource.clip = sound;
            this._longAudioSource.loop = loop;
            this._longAudioSource.volume = volume;
            this._longAudioSource.play();
        }
        else {
            resources.load(sound, (err, clip: AudioClip) => {
                if (err) {
                    DebugLog.instance.log(err);
                }
                else {
                    this._longAudioSource.stop();
                    this._longAudioSource.clip = clip;
                    this._longAudioSource.loop = loop;
                    this._longAudioSource.volume = volume;
                    this._longAudioSource.play();
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
            if(this._bgmAudioSource.playing)return;
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
                    if(this._bgmAudioSource.playing)return;
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
     * 检查长音效是否在播放
     */
    isLongSoundPlaying(): boolean {
        return this._longAudioSource && this._longAudioSource.playing;
    }

    /**
     * 检查背景音乐是否在播放
     */
    isBgmPlaying(): boolean {
        return this._bgmAudioSource && this._bgmAudioSource.playing;
    }

    /**
     * 停止长音效
     */
    stopLongSound() {
        if (this._longAudioSource) {
            this._longAudioSource.stop();
            this._longAudioSource.clip = null;
        }
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
     * 暂停长音效
     */
    pauseLongSound() {
        if (this._longAudioSource) {
            this._longAudioSource.pause();
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
     * 恢复长音效播放
     */
    resumeLongSound() {
        if (this._longAudioSource && this._longAudioSource.clip) {
            this._longAudioSource.play();
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
     * 设置长音效音量
     */
    setLongSoundVolume(volume: number) {
        if (this._longAudioSource) {
            this._longAudioSource.volume = Math.max(0, Math.min(1, volume));
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
     * 停止所有音频（包括长音效和背景音乐）
     */
    stopAll() {
        this.stopLongSound();
        this.stopBgm();
    }

    // 短音效事件监听
    onShortAudioEnd(callback: () => void , context) {
        this.eventTarget.on('short-audio-ended', callback, context);
    }

    offShortAudioEnd(callback: () => void, context) {
        this.eventTarget.off('short-audio-ended', callback, context);
    }

    onShortAudioStart(callback: () => void, context) {
        this.eventTarget.on('short-audio-started', callback, context);
    }

    offShortAudioStart(callback: () => void, context) {
        this.eventTarget.off('short-audio-started', callback, context);
    }

    // 长音效事件监听
    onLongAudioEnd(callback: () => void , context) {
        this.eventTarget.on('long-audio-ended', callback, context);
    }

    offLongAudioEnd(callback: () => void, context) {
        this.eventTarget.off('long-audio-ended', callback, context);
    }

    onLongAudioStart(callback: () => void, context) {
        this.eventTarget.on('long-audio-started', callback, context);
    }

    offLongAudioStart(callback: () => void, context) {
        this.eventTarget.off('long-audio-started', callback, context);
    }

    // 背景音乐事件监听
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
        if (this._shortAudioSource) {
            this._shortAudioSource.stop();
            this._shortAudioSource.clip = null;
            // 使用保存的绑定函数移除监听器
            this._shortAudioSource.node.off(AudioSource.EventType.STARTED, this.boundOnShortAudioStarted);
            this._shortAudioSource.node.off(AudioSource.EventType.ENDED, this.boundOnShortAudioEnded);
        }
        
        if (this._longAudioSource) {
            this._longAudioSource.stop();
            this._longAudioSource.clip = null;
            // 使用保存的绑定函数移除监听器
            this._longAudioSource.node.off(AudioSource.EventType.STARTED, this.boundOnLongAudioStarted);
            this._longAudioSource.node.off(AudioSource.EventType.ENDED, this.boundOnLongAudioEnded);
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
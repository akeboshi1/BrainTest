/**
 * 音乐管理器
 */
import GameLog from "./GameLogMgr";
import CacheMgr from "./CacheMgr";
import {_decorator,AudioSource,AudioClip, assetManager} from 'cc';
import { BundleName } from "db://assets/resources/scripts/Core/Manager/Load/BundleName";

const {ccclass,} = _decorator;

@ccclass
export default class AudioMgr {

    public static audioSource:AudioSource = new AudioSource();
    /*
     * @param isStop
     */
    public static backMusic(isStop = true) {
        if (CacheMgr.setting.setting.music === 0) {
            AudioMgr.audioSource.stop();
        } else if (!isStop) {
            AudioMgr.audioSource.stop();
        } else if (!AudioMgr.audioSource.playing) {
            const bundle = assetManager.getBundle(BundleName.FINGING);
            bundle.load("sub/audio/bg", AudioClip, (err: Error, audio: AudioClip) => {
                if (err) {
                    return;
                }
                AudioMgr.audioSource.clip = audio;
                AudioMgr.audioSource.loop = true;
                AudioMgr.audioSource.volume = CacheMgr.setting.setting.music
                AudioMgr.audioSource.play();
            })
        }
    }

    public static play(url: string, max: number = 1, loop: boolean = false):Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (CacheMgr.setting.setting.audio === 0) {
                GameLog.warn(" 当前音量静音 ");
                resolve(false);
            }

            const bundle = assetManager.getBundle(BundleName.FINGING);
            bundle.load(url, AudioClip, (err: Error, audio: AudioClip) => {
                if (err) {return};
                AudioMgr.audioSource.playOneShot(audio,max);
                resolve(true);
            });
        });
    }

    public static stop(){
        if(AudioMgr.audioSource)AudioMgr.audioSource.stop();
    }
}

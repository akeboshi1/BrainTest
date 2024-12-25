/**
 * 音乐管理器
 */
import Global from "../Global";
import GameLog from "./GameLogMgr";
import CacheMgr from "./CacheMgr";
import LoadMgr from "./LoadMgr";
import {_decorator,AudioSource,AudioClip} from 'cc';

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
            // AudioSource.stopMusic();
        } else if (!isStop) {
            AudioMgr.audioSource.stop();
            // audioEngine.stopMusic();
        } else if (!AudioMgr.audioSource.playing) {
            LoadMgr.load_AudioClip("sub/audio/bg").then((audio: AudioClip) => {
                AudioMgr.audioSource.clip = audio;
                AudioMgr.audioSource.loop = true;
                AudioMgr.audioSource.volume = CacheMgr.setting.setting.music
                AudioMgr.audioSource.play();
                // audioEngine.playMusic(audio, true);
                // audioEngine.setMusicVolume(CacheMgr.setting.setting.music);
            });
        }
    }

    public static play(url: string, max: number = 1, loop: boolean = false):Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (CacheMgr.setting.setting.audio === 0) {
                GameLog.warn(" 当前音量静音 ");
                resolve(false);
            }

            LoadMgr.load_AudioClip(url).then((audio: AudioClip) => {
                //let id: number = 0;
                AudioMgr.audioSource.playOneShot(audio,max);
                // audioEngine.setEffectsVolume(max * CacheMgr.setting.setting.audio);
                //id = audioEngine.playEffect(audio, loop)
                resolve(true);
            })

            // Global.bundleList.audio.load(url, AudioClip, (err: Error, audio: AudioClip) => {
            //     if (err) {
            //         GameLog.error(' 音效播放错误 ', url);
            //         reject(false);
            //     }
            //     let id: number = 0;
            //     audioEngine.setEffectsVolume(max * CacheMgr.setting.setting.audio);
            //     id = audioEngine.playEffect(audio, loop)
            //     resolve(id);
            // });
        });
    }
}

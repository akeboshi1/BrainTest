import { AudioClip, Component, Texture2D } from "cc";
import { Node } from "cc";
import { EventManager } from "../../scripts/Core/Manager/Event/EventManager";
import { SkewersManager } from "../../scripts/Game/Task/Skewers/SkewersManager";
import { AudioManager } from "../../scripts/Core/Manager/Audio/AudioManager";
import { TimerCommonComponent } from "../../scripts/Game/UI/Common/TimerCommonComponent";
/**
 * 基础场景
 */
export class BaseScene extends Component {
    viewNode: Node;
    timeComponent:TimerCommonComponent;

    protected audioMap: Map<string, AudioClip> = new Map();

    // ========== component生命周期 ==========
    // 1
    onLoad(){
        this.loadAudio().then();
        this.loadTexture().then();
    }

    
    // 2
    onEnable(){
        EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this.requestSkewersGameComplete, this, true);
    }

    // 3
    start(){

    }

    onDisable(){
        EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this);
    }

    onDestroy(){

    }

    // ========== 资源加载 ==========
    protected async loadAudio(){
        await new Promise<AudioClip>((resolve,reject)=>{
           resolve(null);
        });
     }

    protected async loadTexture(){
        await new Promise<Texture2D>((resolve,reject)=>{
            resolve(null);
        });
    }
    
    // ========== 游戏结果请求回调 ==========
    protected requestSkewersGameComplete(){
        
    }

    // ========== 游戏退出 ==========
    protected quitGame(){

    }

    // ========== 开始倒计时 ==========
    protected startTime(){
        this.timeComponent.startTimer();
    }

    // ========== 重置倒计时 ==========
    protected resumeTime(){
       this.timeComponent.resetTimer();
    }

    // ========== 暂停倒计时 ==========
    protected pauseTime(){
      this.timeComponent.pauseTimer();
    }
    

    // ========== 播放音频 ==========
    protected playAudio(url: string, isShot: boolean = false, isLoop: boolean = false) {
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
import { Component, _decorator, Node, Label, Button, ProgressBar, UITransform, tween, Sprite, Vec3, AudioClip } from "cc";
import { EventManager } from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
import { LoaderManager } from "db://assets/resources/scripts/Core/Manager/Load/LoaderManager";
import { DebugLog } from "db://assets/resources/scripts/Core/Util/DebugLog";
import { Global } from "db://assets/resources/scripts/Core/Manager/Config/Global";
import { TaskType } from "db://assets/resources/scripts/Game/Task/TaskData";
import { GuideHand } from "db://assets/resources/scripts/Core/Manager/Guide/GuideHand";
import { AudioManager } from "db://assets/resources/scripts/Core/Manager/Audio/AudioManager";
import { SkewersGameType } from "../../Task/Skewers/SkewersGameData";
import {TaskManager} from "db://assets/resources/scripts/Game/Task/TaskManager";
const { ccclass, property } = _decorator;
interface CallBackFunction {
    boundCallback?: Function;
}

export enum AlertType {
    Normal,
    Normal1,
    Sucess_Normal,
    Sucess_Small,
    Sucess_Big,
    Failed,
    Game_Center,
    Init,
    Next,
    Revise,
    Revise_Success,
    Revise_Fail,
    Revise_Complete,
    Answer


}

/**
 * 通用型alert
 */
@ccclass('GameAlert')
export class GameAlert extends Component {

    @property(Node)
    alert: Node = null;

    @property(Label)
    titleLabel: Label = null;

    @property(Label)
    decLabel: Label = null;

    @property(Button)
    exitBtn: Button = null;

    @property(Button)
    startBtn: Button = null;

    @property(Node)
    icon: Node = null;

    @property(ProgressBar)
    progressBar: ProgressBar = null;

    @property(Label)
    progressLabel: Label = null;

    @property(Node)
    completeIcon: Node = null;

    @property(Node)
    iconConNode: Node = null;

    public static ALERT_GOON: string = "ALERT_GOON";

    public static ALERT_EXIT: string = "ALERT_EXIT";

    public goonCallBack: Function = null;

    public exitCallBack: Function = null;

    private audioUrls = ["music/cheer"];
    private audioMap: Map<string, AudioClip> = new Map();

    /**
     * 回调函数上下文
     */
    public context: any = null;

    private _type = null;


    private async loadAudio() {
        // 创建一个数组，存放每个异步加载的 Promise
        const loadPromises = this.audioUrls.map(audioUrl => {
            return new Promise((resolve, reject) => {
                LoaderManager.getInstance().resourcesLoadAudio(audioUrl).then((audioRes: AudioClip) => {
                    this.audioMap.set(audioUrl, audioRes);
                    resolve(audioRes);
                }).catch((err) => {
                    reject(err);
                });
            });
        });
        try {
            const assets = await Promise.all(loadPromises);
            DebugLog.instance.log('All gamealert audio loaded:', assets);
        } catch (error) {
            DebugLog.instance.error('Error loading gamealert audio:', error);
        }
    }

    showView(type: AlertType) {
        AudioManager.getInstance().pause();
        this._type = type;
        let startBtnUITransform = this.startBtn.node.getComponent(UITransform);
        this.exitBtn.node.getChildByName("Label").getComponent(Label).string = "退出";
        this.startBtn.node.getChildByName("Label").getComponent(Label).string = "继续";
        // 调整alert位置
        this.adjustAlertPosition();
        
        switch (type) {
            case AlertType.Normal1:
                this.exitBtn.node.active = true;
                this.startBtn.node.active = true;
                this.progressBar.node.active = true;
                this.titleLabel.node.active = true;
                this.iconConNode.active = false;
                this.decLabel.node.active = false;
                startBtnUITransform.width = 250;
                break;
            case AlertType.Sucess_Normal:
                this.exitBtn.node.active = false;
                this.startBtn.node.active = true;
                this.progressBar.node.active = true;
                this.titleLabel.node.active = true;
                this.iconConNode.active = false;
                this.decLabel.node.active = false;
                startBtnUITransform.width = 500;
                break;
            case AlertType.Normal:
                this.exitBtn.node.active = false;
                this.startBtn.node.active = true;
                this.progressBar.node.active = true;
                this.titleLabel.node.active = true;
                this.iconConNode.active = false;
                this.decLabel.node.active = false;
                startBtnUITransform.width = 500;
                break;
            case AlertType.Next:
                this.titleLabel.node.active = true;
                this.exitBtn.node.active = true;
                this.startBtn.node.active = true;
                this.iconConNode.active = true;
                this.decLabel.node.active = false;
                this.completeIcon.active = false;
                this.progressBar.node.active = false;
                startBtnUITransform.width = 250;
                break;
            case AlertType.Sucess_Small:
                this.titleLabel.node.active = true;
                this.completeIcon.active = true;
                this.exitBtn.node.active = false;
                this.startBtn.node.active = false;
                this.completeIcon.setScale(new Vec3(3, 3, 3));
                tween(this.completeIcon)
                    .to(0.9, { scale: new Vec3(1, 1, 1) }, { easing: 'cubicOut' })
                    .call(() => {
                        //this.exitBtn.node.active = false;
                        this.startBtn.node.active = true;
                    })
                    .start();
                this.iconConNode.active = true;
                this.decLabel.node.active = false;
                this.progressBar.node.active = false;
                this.playAudio("music/cheer", true);
                startBtnUITransform.width = 250;
                break;
            case AlertType.Sucess_Big:
                this.startBtn.node.active = true;
                this.decLabel.node.active = false;
                this.titleLabel.node.active = true;
                this.progressBar.node.active = false;
                this.iconConNode.active = false;
                this.exitBtn.node.active = Global.userData.curTaskData.type == TaskType.Review;
                this.exitBtn.node.getChildByName("Label").getComponent(Label).string = Global.userData.curTaskData.type == TaskType.Review ? "查看评测" : "退出";
                startBtnUITransform.width = Global.userData.curTaskData.type == TaskType.Review ? 250 : 500;
                break;
            case AlertType.Failed:
                // todo
                break;
            case AlertType.Init:
                this.startBtn.node.active = true;
                this.decLabel.node.active = false;
                this.titleLabel.node.active = true;
                this.progressBar.node.active = false;
                this.iconConNode.active = false;
                this.exitBtn.node.active = false;

                startBtnUITransform.width = 500;
                break;
            case AlertType.Game_Center:
                this.startBtn.node.active = true;
                this.decLabel.node.active = false;
                this.titleLabel.node.active = true;
                this.progressBar.node.active = false;
                this.iconConNode.active = false;
                this.exitBtn.node.active = true;
                startBtnUITransform.width = 250;
                break;
            case AlertType.Revise:
                // 订正弹窗
                this.startBtn.node.active = true;
                this.startBtn.node.getChildByName("Label").getComponent(Label).string = TaskManager.getInstance().curTask.isCorrection ? "订正" : "继续";
                this.decLabel.node.active = false;
                this.titleLabel.node.active = true;
                this.progressBar.node.active = false;
                this.iconConNode.active = false;
                this.exitBtn.node.active = true;
                this.exitBtn.node.getChildByName("Label").getComponent(Label).string = Global.userData.curTaskData.type == TaskType.Review ? "查看评测" : "退出";
                startBtnUITransform.width = 250;
                break;
            case AlertType.Revise_Success:
                // 订正结算弹窗
                this.exitBtn.node.active = false;
                this.startBtn.node.getChildByName("Label").getComponent(Label).string = "继续";
                startBtnUITransform.width = 500;
                this.startBtn.node.active = true;
                this.progressBar.node.active = true;
                this.titleLabel.node.active = true;
                this.iconConNode.active = false;
                this.decLabel.node.active = false;
                break;
            case AlertType.Revise_Fail:
                // 订正结算弹窗
                this.exitBtn.node.active = true;
                this.exitBtn.node.getChildByName("Label").getComponent(Label).string = "重试";
                this.startBtn.node.getChildByName("Label").getComponent(Label).string = "看答案";
                startBtnUITransform.width = 250;
                this.startBtn.node.active = true;
                this.progressBar.node.active = true;
                this.titleLabel.node.active = true;
                this.iconConNode.active = false;
                this.decLabel.node.active = false;
                break;
            case AlertType.Revise_Complete:
                this.startBtn.node.active = false;
                this.decLabel.node.active = false;
                this.titleLabel.node.active = true;
                this.progressBar.node.active = false;
                this.iconConNode.active = false;
                this.exitBtn.node.active = true;
                this.exitBtn.node.getChildByName("Label").getComponent(Label).string = "退出";
                break;
            case AlertType.Answer:
                // 查看答案弹窗
                this.startBtn.node.active = true;
                this.startBtn.node.getChildByName("Label").getComponent(Label).string = "继续";
                this.decLabel.node.active = true;
                this.titleLabel.node.active = false;
                this.progressBar.node.active = false;
                this.iconConNode.active = false;
                this.exitBtn.node.active = false;
                startBtnUITransform.width = 500;
                break;
        }
    }

    private playAudio(url: string, isShot: boolean = false, isLoop: boolean = false) {
        let audioRes = this.audioMap.get(url);
        if (audioRes != null) {
            if (isShot) {
                AudioManager.getInstance().playOneShot(audioRes);
            } else {
                AudioManager.getInstance().play(audioRes, isLoop);
            }
        }
    }

    setProgress(curcount: number, maxcount: number) {
        let curProgress = "";
        if (maxcount == 0) {
            this.progressBar.progress = 1;
            curProgress = "1/1"
        } else {
            curcount = curcount < 0 ? 0 : curcount;
            this.progressBar.progress = curcount / maxcount;
            curProgress = `${curcount} / ${maxcount}`;
        }
        this.progressLabel.string = `当前游戏进度:${curProgress}`;
    }

    setTitle(str: string) {
        this.titleLabel.string = str;
    }

    setDec(str: string) {
        this.decLabel.string = str;
    }

    setIcon(iconUrl: string) {
        LoaderManager.getInstance().resourcesLoadFrame(iconUrl).then((spriteframe) => {
            if (this.icon) {
                let sprite = this.icon.getComponent(Sprite);
                sprite.spriteFrame = spriteframe;
            }
        }).catch((error) => {
            DebugLog.instance.error(error);
        })
    }

    start() {
        this.loadAudio();
    }

    exitHandler() {
        // SceneManager.getInstance().backToHall();
        AudioManager.getInstance().stop();
        EventManager.getInstance().emit(GameAlert.ALERT_EXIT);
        this.node.removeFromParent();
        if (this.exitCallBack) {
            this.exitCallBack(this.context);
        }
    }

    /**
     * 继续
     */
    goHandler() {
        AudioManager.getInstance().resume();
        EventManager.getInstance().emit(GameAlert.ALERT_GOON);
        this.node.removeFromParent();
        if (this.goonCallBack) {
            this.goonCallBack(this.context);
        }
    }

    /**
     * 外部绑定alert交互事件
     * @param goonCallBack
     * @param exitCallBack
     * @param context
     */
    bindCallBack(goonCallBack: Function, exitCallBack: Function, context: any) {
        this.context = context;
        this.reset();
        if (goonCallBack) {
            this.goonCallBack = goonCallBack.bind(context);
        }
        if (exitCallBack) {
            this.exitCallBack = exitCallBack.bind(context);
        }
    }

    reset(){
        this.goonCallBack = null;
        this.exitCallBack = null;
    }

    /**
     * 根据游戏类型调整alert位置
     */
    private adjustAlertPosition() {
        // 如果alert节点不存在，不进行处理
        if (!this.alert) return;

        // 获取当前位置
        const position = this.alert.position.clone();
        
        // 判断是否是否需要调整位置
        const changePos = this.changePos() && this.isInGameScene();
        
        // 设置Y坐标
        position.y = changePos ? 350 : 0;
        
        // 应用新位置
        this.alert.setPosition(position);

        DebugLog.instance.log(`Alert position adjusted: ${position.x}, ${position.y}, ${position.z}, changePos: ${changePos}`);
    }
    
    /**
     * 判断当前是否在游戏场景中
     */
    private isInGameScene(): boolean {
        try {
            // 检查Global对象中的游戏状态
            if (!Global || !Global.isSkewersGame) {
                return false;
            }
            
            // 检查是否有当前游戏数据
            if (!Global.userData || !Global.userData.curSkewerGameData) {
                return false;
            }
            
            return true;
        } catch (error) {
            DebugLog.instance.error('判断是否在游戏场景时出错:', error);
            return false;
        }
    }

    /**
     * 判断当前游戏是否是语言类型/订正查看答案
     */
    private changePos(): boolean {
        try {
            
            // 安全检查Global对象
            if (!Global || !Global.userData||!Global.userData.curSkewerGameData) {
                return false;
            }
            
            // 使用索引访问方式检查属性，避免TypeScript类型错误
            if (Global.userData.curSkewerGameData['type'] === SkewersGameType.Language || this._type == AlertType.Answer) {
                return true;
            }

            return false;
        } catch (error) {
            DebugLog.instance.error('判断语言游戏类型时出错:', error);
            return false;
        }
    }

}
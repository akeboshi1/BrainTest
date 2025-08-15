import { Component, _decorator, Node, Label, Button, ProgressBar, UITransform, tween, Sprite, Vec3, AudioClip, resources, SpriteFrame, error } from "cc";
import { EventManager } from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
import { DebugLog } from "db://assets/resources/scripts/Core/Util/DebugLog";
import { Global } from "db://assets/resources/scripts/Core/Manager/Config/Global";
import { TaskType } from "db://assets/resources/scripts/Game/Task/TaskData";
import { AudioManager } from "db://assets/resources/scripts/Core/Manager/Audio/AudioManager";
import { SkewersGameType } from "../../Task/Skewers/SkewersGameData";
import {TaskManager} from "db://assets/resources/scripts/Game/Task/TaskManager";
import { AdaptComponent } from "../../../mainV2/AdaptComponent";
import { PersonalCenterManager } from "../../PersonalCenterManager/PersonalCenterManager";
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
export class GameAlert extends AdaptComponent {

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

    @property(Button)
    guideBtn: Button = null;

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

    // 添加图标加载状态标记
    private iconLoading: boolean = false;
    private iconLoaded: boolean = false;

    private async loadAudio() {
        // 创建一个数组，存放每个异步加载的 Promise
        const loadPromises = this.audioUrls.map(audioUrl => {
            return new Promise((resolve, reject) => {
                let self = this;
                // 检查audioMap中是否已经加载过此音效
                if (self.audioMap.has(audioUrl)) {
                    // 如果已加载，直接返回缓存的音效资源
                    resolve(self.audioMap.get(audioUrl));
                    return;
                }
                resources.load(audioUrl, AudioClip,(err, audioRes) => {
                    if(err){
                        DebugLog.instance.error(err);
                        reject(err);
                        return;
                    }
                    self.audioMap.set(audioUrl, audioRes);
                    resolve(audioRes);
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
        AudioManager.getInstance().pauseLongSound();
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
                this.guideBtn.node.active = false;
                this.progressBar.node.active = true;
                this.titleLabel.node.active = true;
                this.iconConNode.active = false;
                this.decLabel.node.active = false;
                startBtnUITransform.width = 300;
                break;
            case AlertType.Sucess_Normal:
                this.exitBtn.node.active = false;
                this.startBtn.node.active = true;
                this.guideBtn.node.active = false;
                this.progressBar.node.active = true;
                this.titleLabel.node.active = true;
                this.iconConNode.active = false;
                this.decLabel.node.active = false;
                startBtnUITransform.width = 900;
                break;
            case AlertType.Normal:
                this.exitBtn.node.active = false;
                this.startBtn.node.active = true;
                this.guideBtn.node.active = false;
                this.progressBar.node.active = true;
                this.titleLabel.node.active = true;
                this.iconConNode.active = false;
                this.decLabel.node.active = false;
                startBtnUITransform.width = 900;
                break;
            case AlertType.Next:
                this.titleLabel.node.active = true;
                this.exitBtn.node.active = true;
                this.guideBtn.node.active = false;
                this.startBtn.node.active = true;
                this.iconConNode.active = true;
                this.decLabel.node.active = false;
                this.completeIcon.active = false;
                this.progressBar.node.active = false;
                startBtnUITransform.width = 300;
                break;
            case AlertType.Sucess_Small:
                this.titleLabel.node.active = true;
                this.completeIcon.active = true;
                this.guideBtn.node.active = false;
                this.exitBtn.node.active = false;
                this.startBtn.node.active = false;
                this.iconConNode.active = true;
                this.decLabel.node.active = false;
                this.progressBar.node.active = false;
                
                // 确保图标显示正常并有动画效果
                this.handleSuccessSmallIcon();
                
                AudioManager.getInstance().playCheer();
                startBtnUITransform.width = 300;
                break;
            case AlertType.Sucess_Big:
                this.decLabel.node.active = false;
                this.guideBtn.node.active = false;
                this.titleLabel.node.active = true;
                this.progressBar.node.active = false;
                this.iconConNode.active = false;
                this.exitBtn.node.active = Global.userData.curTaskData.type == TaskType.Review;
                if(!PersonalCenterManager.getInstance().userInfoData.has_initial_tier){
                    this.startBtn.node.active = false;
                    this.exitBtn.node.getChildByName("Label").getComponent(Label).string = "查看初测";
                }else{
                    this.startBtn.node.active = true;
                    this.startBtn.node.getChildByName("Label").getComponent(Label).string = "退出";
                    this.exitBtn.node.getChildByName("Label").getComponent(Label).string = Global.userData.curTaskData.type == TaskType.Review ? "查看评测" : "退出";
                    startBtnUITransform.width = Global.userData.curTaskData.type == TaskType.Review ? 300 : 900;
                }
                break;
            case AlertType.Failed:
                // todo
                break;
            case AlertType.Init:
                this.startBtn.node.active = true;
                this.decLabel.node.active = false;
                this.guideBtn.node.active = false;
                this.titleLabel.node.active = true;
                this.progressBar.node.active = false;
                this.iconConNode.active = false;
                this.exitBtn.node.active = false;

                startBtnUITransform.width = 900;
                break;
            case AlertType.Game_Center:
                this.startBtn.node.active = true;
                this.guideBtn.node.active = false;
                this.decLabel.node.active = false;
                this.titleLabel.node.active = true;
                this.progressBar.node.active = false;
                this.iconConNode.active = false;
                this.exitBtn.node.active = true;
                startBtnUITransform.width = 300;
                break;
            case AlertType.Revise:
                // 订正弹窗
                this.startBtn.node.active = true;
                this.guideBtn.node.active = false;
                this.startBtn.node.getChildByName("Label").getComponent(Label).string = TaskManager.getInstance().curTask.isCorrection ? "订正" : "继续";
                this.decLabel.node.active = false;
                this.titleLabel.node.active = true;
                this.progressBar.node.active = false;
                this.iconConNode.active = false;
                this.exitBtn.node.active = true;
                this.exitBtn.node.getChildByName("Label").getComponent(Label).string = Global.userData.curTaskData.type == TaskType.Review ? "查看评测" : "退出";
                startBtnUITransform.width = 300;
                break;
            case AlertType.Revise_Success:
                // 订正结算弹窗
                this.exitBtn.node.active = false;
                this.guideBtn.node.active = false;
                this.startBtn.node.getChildByName("Label").getComponent(Label).string = "继续";
                startBtnUITransform.width = 900;
                this.startBtn.node.active = true;
                this.progressBar.node.active = true;
                this.titleLabel.node.active = true;
                this.iconConNode.active = false;
                this.decLabel.node.active = false;
                break;
            case AlertType.Revise_Fail:
                // 订正结算弹窗
                this.exitBtn.node.active = true;
                this.guideBtn.node.active = false;
                this.exitBtn.node.getChildByName("Label").getComponent(Label).string = "重试";
                this.startBtn.node.getChildByName("Label").getComponent(Label).string = "看答案";
                startBtnUITransform.width = 300;
                this.startBtn.node.active = true;
                this.progressBar.node.active = true;
                this.titleLabel.node.active = true;
                this.iconConNode.active = false;
                this.decLabel.node.active = false;
                break;
            case AlertType.Revise_Complete:
                this.startBtn.node.active = false;
                this.guideBtn.node.active = false;
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
                this.guideBtn.node.active = false;
                this.decLabel.node.active = true;
                this.titleLabel.node.active = false;
                this.progressBar.node.active = false;
                this.iconConNode.active = false;
                this.exitBtn.node.active = false;
                startBtnUITransform.width = 900;
                break;
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
        this.progressLabel.string = `当前训练进度:${curProgress}`;
    }

    setTitle(str: string) {
        this.titleLabel.string = str;
    }

    setDec(str: string) {
        this.decLabel.string = str;
    }

    /**
     * 设置图标，返回Promise以便等待加载完成
     * @param iconUrl 图标资源路径
     * @returns Promise 加载完成后resolve
     */
    setIcon(iconUrl: string): Promise<void> {
        // 设置加载状态
        this.iconLoading = true;
        this.iconLoaded = false;
        
        return new Promise<void>((resolve, reject) => {
            resources.load(iconUrl+"/spriteFrame", SpriteFrame,(err, spriteframe) => {
                if(err){
                    DebugLog.instance.error("Error loading icon:", error);
                    this.iconLoading = false;
                    resolve();
                    return;
                }
                if (this.icon) {
                    let sprite = this.icon.getComponent(Sprite);
                    sprite.spriteFrame = spriteframe;
                    
                    // 更新加载状态
                    this.iconLoading = false;
                    this.iconLoaded = true;
                    
                    // 如果图标节点处于隐藏状态，确保其现在显示
                    if (!this.icon.active) {
                        this.icon.active = true;
                    }
                    
                    // 加载成功，解析Promise
                    resolve();
                } else {
                    // 图标节点不存在，解析Promise但记录错误
                    DebugLog.instance.warn("Icon node does not exist when setting icon");
                    this.iconLoading = false;
                    resolve();
                }
            });
        });
    }

    /**
     * 检查图标是否已加载完成
     * @returns boolean 是否已加载完成
     */
    isIconLoaded(): boolean {
        return this.iconLoaded;
    }

    /**
     * 检查图标是否正在加载中
     * @returns boolean 是否正在加载
     */
    isIconLoading(): boolean {
        return this.iconLoading;
    }

    /**
     * 等待图标加载完成
     * @param timeout 超时时间（毫秒），默认3000ms
     * @returns Promise 加载完成或超时后resolve
     */
    waitForIconLoaded(timeout: number = 3000): Promise<boolean> {
        // 如果已加载完成，立即返回
        if (this.iconLoaded) {
            return Promise.resolve(true);
        }
        
        // 如果没有在加载中，也立即返回
        if (!this.iconLoading) {
            return Promise.resolve(false);
        }
        
        // 否则等待加载完成或超时
        return new Promise<boolean>((resolve) => {
            // 设置轮询检查
            const checkInterval = 100; // ms
            let elapsed = 0;
            
            const checkLoaded = () => {
                if (this.iconLoaded) {
                    resolve(true);
                    return;
                }
                
                if (!this.iconLoading || elapsed >= timeout) {
                    resolve(false);
                    return;
                }
                
                elapsed += checkInterval;
                setTimeout(checkLoaded, checkInterval);
            };
            
            // 开始检查
            checkLoaded();
        });
    }

    // showGuide(){
    //     let trainData = SkewersManager.getInstance().getUnCompleteGameData();
    //     if(!trainData)return;
    //    UIManager.getInstance().showPanel(GuidePanel.NAME,trainData.type);
    // }

    start() {
        super.start();
    }

    onEnable(){
        this.loadAudio();
    }

    exitHandler() {
        // DebugLog.instance.error("exitCallBack",this.context)
        AudioManager.getInstance().stopLongSound();
        EventManager.getInstance().emit(GameAlert.ALERT_EXIT);
        this.node.removeFromParent();
        if (this.exitCallBack) {
            this.exitCallBack(this.context);
        }
        else{
            DebugLog.instance.error("exitCallBack is null",this.context)
        }
    }

    /**
     * 继续
     */
    goHandler() {
        //DebugLog.instance.error("goonCallBack",this.context)
        AudioManager.getInstance().resumeLongSound();
        EventManager.getInstance().emit(GameAlert.ALERT_GOON);
        this.node.removeFromParent();
        if (this.goonCallBack) {
            this.goonCallBack(this.context);
        }else{
            DebugLog.instance.error("goonCallBack is null",this.context)
        }
    }

    /**
     * 外部绑定alert交互事件
     * @param goonCallBack
     * @param exitCallBack
     * @param context
     */
    bindCallBack(goonCallBack: Function, exitCallBack: Function, context: any) {
        this.reset();
        this.context = context;
        if (goonCallBack) {
            this.goonCallBack = goonCallBack.bind(context);
        }
        if (exitCallBack) {
            this.exitCallBack = exitCallBack.bind(context);
        }
    }

    reset(){
        this.context = null;
        this.goonCallBack = null;
        this.exitCallBack = null;
    }

    /**
     * 根据训练类型调整alert位置
     */
    private adjustAlertPosition() {
        // 如果alert节点不存在，不进行处理
        if (!this.alert) return;

        // 获取当前位置
        const position = this.alert.position.clone();
        
        // // 判断是否是否需要调整位置
        // const changePos = this.changePos() && this.isInGameScene();
        
        // // 设置Y坐标
        // position.y = changePos ? 350 : 0;
        
        // 应用新位置
        this.alert.setPosition(position);

       // DebugLog.instance.log(`Alert position adjusted: ${position.x}, ${position.y}, ${position.z}, changePos: ${changePos}`);
    }
    
    /**
     * 判断当前是否在训练场景中
     */
    private isInGameScene(): boolean {
        try {
            // 检查Global对象中的训练状态
            if (!Global || !Global.isSkewersGame) {
                return false;
            }
            
            // 检查是否有当前训练数据
            if (!Global.userData || !Global.userData.curSkewerGameData) {
                return false;
            }
            
            return true;
        } catch (error) {
            DebugLog.instance.error('判断是否在训练场景时出错:', error);
            return false;
        }
    }

    /**
     * 判断当前训练是否是语言类型/订正查看答案
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
            DebugLog.instance.error('判断语言训练类型时出错:', error);
            return false;
        }
    }

    /**
     * 处理Sucess_Small类型的图标显示和动画
     */
    private handleSuccessSmallIcon(): void {
        // 确保图标节点可见
        if (this.completeIcon) {
            this.completeIcon.setScale(new Vec3(3, 3, 3));
            
            // 检查图标是否已加载
            if (this.iconLoaded) {
                // 如果已加载，立即执行动画
                this.playCompleteIconAnimation();
            } else if (this.iconLoading) {
                // 如果正在加载，等待加载完成后执行动画
                this.waitForIconLoaded().then(loaded => {
                    if (loaded) {
                        this.playCompleteIconAnimation();
                    } else {
                        // 加载失败或超时，仍然显示按钮
                        this.startBtn.node.active = true;
                    }
                });
            } else {
                // 没有加载图标，直接显示按钮
                this.playCompleteIconAnimation();
            }
        } else {
            // 图标节点不存在，直接显示按钮
            this.startBtn.node.active = true;
        }
    }
    
    /**
     * 播放完成图标的动画
     */
    private playCompleteIconAnimation(): void {
        if (this.completeIcon) {
            tween(this.completeIcon)
                .to(0.9, { scale: new Vec3(1, 1, 1) }, { easing: 'cubicOut' })
                .call(() => {
                    this.startBtn.node.active = true;
                })
                .start();
        } else {
            // 图标不存在，直接显示按钮
            this.startBtn.node.active = true;
        }
    }

}
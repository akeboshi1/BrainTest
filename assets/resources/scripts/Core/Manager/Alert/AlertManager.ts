import { Button, instantiate, Label, Node, Prefab, resources, Color, UITransform, Vec3, _decorator, RichText, director, tween, Widget } from "cc";
import { BaseManager } from "../BaseManager";
import { DebugLog } from "../../Util/DebugLog";
import { LayerUtil } from "../../Util/LayerUtil";
import { SceneManager } from "../Scene/SceneManager";
import { ScreenAdapter } from "../../../Adapter/ScreenAdapter";
import { TimeUtil } from "../../Util/TimeUtil";
const { ccclass, property } = _decorator;

@ccclass('AlertManager')
export class AlertManager extends BaseManager {
    private static _instance: AlertManager;
    private _alertNode: Node = null;
    private _socketAlertPrefab: Prefab = null;

    public static getInstance(): AlertManager {
        if (!AlertManager._instance) {
            AlertManager._instance = new AlertManager();
            AlertManager._instance.init();
        }
        return AlertManager._instance;
    }

    private commonAlertPrefab: Prefab = null;
    private userAgreeAlertPrefab: Prefab = null;
    private alertQueue: AlertData[] = []; // 用于存储等待显示的alert数据队列
    private currentAlert: Node = null; // 当前正在显示的alert节点
    private userAgreeAlert: Node = null; // 用户同意弹窗节点
    private countdownTimer: any = null; // 倒计时定时器
    private currentCountdown: number = 0; // 当前倒计时剩余时间
    private _countdownButtonRef: Button = null; // 当前倒计时关联的按钮
    private _currentToast: Node = null; // 当前正在显示的Toast节点
    private _isShowingToast: boolean = false; // 是否正在显示Toast

    public async init() {
        SceneManager.getInstance().eventTarget.on(SceneManager.SCENE_CHANGED, this.onSceneChanged, this);

        return new Promise<void>((resolve, reject) => {
            resources.load("prefab/Common/CommonAlert", Prefab,(err,resource)=>{
                if(err){
                    DebugLog.instance.warn("Common Alert Prefab Load failed!!!");
                    reject();
                    return;
                }
                DebugLog.instance.log("Common Alert Prefab Load success!!!");
                this.commonAlertPrefab = resource;
                resolve();
            });
        });

    }

    public async initUserAgreeAlert() {
        SceneManager.getInstance().eventTarget.on(SceneManager.SCENE_CHANGED, this.onSceneChanged, this);
        return new Promise<void>((resolve, reject) => {
            resources.load("/prefab/userAgreeAlert", Prefab,(err,resource)=>{
                if(err){
                    DebugLog.instance.warn("userAgreeAlert Prefab Load failed!!!");
                    reject();
                    return;
                }
                DebugLog.instance.log("userAgreeAlert Prefab Load success!!!");
                this.userAgreeAlertPrefab = resource;
                resolve();
            });
        });
    }


    public initSocketAlertPrefab() {
        resources.load("prefab/alert_socket", Prefab, (err, prefab) => {
            if (err) {
                DebugLog.instance.error(err);
                return;
            }
            this._socketAlertPrefab = prefab;
        });
    }

    public showAlert(alertData: AlertData) {
        if (this.currentAlert) {
            // 如果当前有正在显示的alert，将新的alert数据加入队列等待显示
            this.alertQueue.push(alertData);
            return;
        }

        if (!this.commonAlertPrefab) {
            DebugLog.instance.warn("Common Alert Prefab is not loaded yet!");
            return;
        }

        // 实例化预制体
        let alertNode = instantiate(this.commonAlertPrefab);
        let rootNode: Node = LayerUtil.getAlertLayer();
        if (!rootNode) {
            DebugLog.instance.error("Can not find alert layer!");
            return;
        }

        rootNode.addChild(alertNode);
        this.currentAlert = alertNode;

        // 使用项目中的ScreenAdapter进行UI适配
        this.adaptAlertUI(alertNode);

        // 设置弹窗位置，如果提供了x和y坐标则使用，否则使用默认位置(中央)
        if (alertData.x !== 0 || alertData.y !== 0) {
            alertNode.setPosition(alertData.x, alertData.y);
        }

        // 这里可以添加更多逻辑根据alertData设置弹窗内的文本内容、按钮显示及点击回调等

        // 假设弹窗内有对应的组件来设置标题、消息等内容，以下为示例代码（需根据实际预制体结构调整）
        let bg = alertNode.getChildByName("viewNode").getChildByName("Bg");
        let group:Node = alertNode.getChildByName("viewNode").getChildByName("group");
        
        let titleLabel = alertNode.getChildByName("viewNode").getChildByName("group").getChildByName('titleLabel').getComponent(Label);
        if (titleLabel) {
            titleLabel.string = alertData.title;
        }

        let messageLabel = alertNode.getChildByName("viewNode").getChildByName("group").getChildByName('messageLabel').getComponent(Label);
        if (messageLabel) {
            messageLabel.string = alertData.message;
        }
        
        // 动态调整group高度以适应文本内容
        this.adjustGroupHeight(bg,group, titleLabel, messageLabel);

        let self = this;
        let guideButton = alertNode.getChildByName("viewNode").getChildByName('guideButton').getComponent(Button);
        if(guideButton){
            guideButton.node.active = alertData.guideButtonVisible;
            guideButton.node.on('click', () => {
                if (alertData.guideCallBack) {
                    alertData.guideCallBack();
                }
                self.closeCurrentAlert();
            });

            guideButton.node.getChildByName("Label").getComponent(Label).string = alertData.guideButtonText;
        }
        // 处理取消按钮相关逻辑，设置显示隐藏及点击回调等（示例，需根据实际调整）
        let cancelButton = alertNode.getChildByName("viewNode").getChildByName("group").getChildByName("btnGroup").getChildByName('cancelButton').getComponent(Button);
        if (cancelButton) {
            cancelButton.node.active = alertData.cancelButtonVisible;
            cancelButton.node.on('click', () => {
                if (alertData.cancelCb) {
                    alertData.cancelCb();
                }
                self.closeCurrentAlert();
            });

            cancelButton.node.getChildByName("Label").getComponent(Label).string = alertData.cancelButtonText;
        }

        // 处理确认按钮相关逻辑，设置点击回调等（示例，需根据实际调整）
        let confirmButton = alertNode.getChildByName("viewNode").getChildByName("group").getChildByName("btnGroup").getChildByName('confirmButton').getComponent(Button);
        if (confirmButton) {
            confirmButton.node.on('click', () => {
                if (alertData.confirmCb) {
                    alertData.confirmCb();
                }
                self.closeCurrentAlert();
            });

            confirmButton.node.getChildByName("Label").getComponent(Label).string = alertData.confirmButtonText;
            if (!alertData.cancelButtonVisible) {
                confirmButton.node.setPosition(0, confirmButton.node.position.y);
            }
        }

        // 处理倒计时功能
        if (alertData.enableCountdown && alertData.countdown > 0) {
            this.startCountdown(alertData.countdown, confirmButton, alertData.countdownCb);
        }
    }
    public showUserAgreeAlert(alertData: AlertData) {
        let self = this;
        if (this.userAgreeAlert) {
            return;
        }
        // 如果公共弹窗预制体未加载，则输出警告信息

        if (!this.userAgreeAlertPrefab) {
            DebugLog.instance.warn("userAgreeAlertPrefab is not loaded yet!");
            return;
        }

        // 实例化预制体
        let alertNode = instantiate(this.userAgreeAlertPrefab);
        // 如果找不到弹窗层，则输出错误信息
        let rootNode: Node = LayerUtil.getPanelLayer();
        if (!rootNode) {
            DebugLog.instance.error("Can not find alert layer!");
            return;
        }

        rootNode.addChild(alertNode);
        this.userAgreeAlert = alertNode;

        // 使用项目中的ScreenAdapter进行UI适配
        this.adaptAlertUI(alertNode);

        // 设置弹窗位置，如果提供了x和y坐标则使用，否则使用默认位置(中央)
        if (alertData.x !== 0 || alertData.y !== 0) {
            alertNode.setPosition(alertData.x, alertData.y);
        }

        // 假设弹窗内有对应的组件来设置标题、消息等内容，以下为示例代码（需根据实际预制体结构调整）
        let titleLabel = alertNode.getChildByName("viewNode").getChildByName('titleLabel').getComponent(Label);
        if (titleLabel) {
            titleLabel.string = alertData.title;
        }

        let messageLabel =  alertNode.getChildByName("viewNode").getChildByName('messageLabel').getComponent(RichText);
        if (messageLabel && alertData.message !="") {
            messageLabel.string = alertData.message;
            messageLabel.node.on('click', () => {
                console.log('contentClick');
                if (alertData.contentClickCb) {
                    alertData.contentClickCb();
                }
                self.closeCurrentAlert();
            });

        }

        let closeBtn = alertNode.getChildByName("viewNode").getChildByName('close').getComponent(Button);
        if(alertData.closeBtnVisible){
            closeBtn.node.active = true;
        }
        if (closeBtn) {
            closeBtn.node.on('click', () => {
                self.closeUserAgreeAlert();
            });
        }

       
        // 处理取消按钮相关逻辑，设置显示隐藏及点击回调等（示例，需根据实际调整）
        let cancelButton = alertNode.getChildByName("viewNode").getChildByName('cancelButton').getComponent(Button);
        if (cancelButton) {
            cancelButton.node.active = alertData.cancelButtonVisible;
            cancelButton.node.on('click', () => {
                if (alertData.cancelCb) {
                    alertData.cancelCb();
                }
                self.closeUserAgreeAlert();
            });

            cancelButton.node.getChildByName("Label").getComponent(Label).string = alertData.cancelButtonText;
        }

        // 处理确认按钮相关逻辑，设置点击回调等（示例，需根据实际调整）
        let confirmButton = alertNode.getChildByName("viewNode").getChildByName('confirmButton').getComponent(Button);
        if (confirmButton) {
            confirmButton.node.on('click', () => {
                if (alertData.confirmCb) {
                    alertData.confirmCb();
                }
                self.closeUserAgreeAlert();
            });

            confirmButton.node.getChildByName("Label").getComponent(Label).string = alertData.confirmButtonText;
            if (!alertData.cancelButtonVisible) {
                confirmButton.node.setPosition(0, confirmButton.node.position.y);
            }
        }
    }

    public closeCurrentAlert() {
        if (this.currentAlert) {
            // 清除倒计时定时器
            this.clearCountdownTimer();
            this.currentAlert.destroy();
            this.currentAlert = null;
            // 检查队列中是否还有等待显示的alert，如果有则弹出下一个显示
            if (this.alertQueue.length > 0) {
                let nextAlertData = this.alertQueue.shift();
                this.showAlert(nextAlertData);
            }
        }
    }

    private closeUserAgreeAlert() {
        if (this.userAgreeAlert) {
            this.userAgreeAlert.destroy();
            this.userAgreeAlert = null;
        }
    }

    /**
     * 动态调整group高度以适应文本内容
     * @param bg 背景节点
     * @param group group节点
     * @param titleLabel 标题标签
     * @param messageLabel 消息标签
     */
    private adjustGroupHeight(bg: Node, group: Node, titleLabel: Label, messageLabel: Label) {
        try {
            const groupTransform = group.getComponent(UITransform);
            if (!groupTransform) return;
            
            let messageHeight = messageLabel.string.length / 16 * 35
            bg.getComponent(UITransform).height += messageHeight;
            
        } catch (error) {
            DebugLog.instance.error(`[AlertManager] Failed to adjust group height: ${error}`);
        }
    }
    

    /**
     * 使用项目中的ScreenAdapter对弹窗进行UI适配
     * @param alertNode 弹窗节点
     */
    private adaptAlertUI(alertNode: Node) {
        try {
            // 使用项目中的ScreenAdapter进行UI适配
            ScreenAdapter.getInstance().adaptPanelUI(alertNode);
            
            // 确保弹窗有合适的Widget组件设置
            this.setupAlertWidget(alertNode);
            
            DebugLog.instance.log(`[AlertManager] Alert UI adaptation completed for: ${alertNode.name}`);
        } catch (error) {
            DebugLog.instance.error(`[AlertManager] Alert UI adaptation failed: ${error}`);
        }
    }

    /**
     * 设置弹窗的Widget组件，确保在不同屏幕尺寸下正确显示
     * @param alertNode 弹窗节点
     */
    private setupAlertWidget(alertNode: Node) {
        // 为弹窗根节点添加Widget组件，确保居中显示
        let widget = alertNode.getComponent(Widget);
        if (!widget) {
            widget = alertNode.addComponent(Widget);
        }
        
        // 设置Widget为居中显示
        widget.isAlignHorizontalCenter = true;
        widget.isAlignVerticalCenter = true;
        widget.isAlignTop = false;
        widget.isAlignBottom = false;
        widget.isAlignLeft = false;
        widget.isAlignRight = false;
        widget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
        
        // 更新Widget对齐
        widget.updateAlignment();
        
        // 查找viewNode并设置其Widget
        const viewNode = alertNode.getChildByName('viewNode');
        if (viewNode) {
            let viewWidget = viewNode.getComponent(Widget);
            if (!viewWidget) {
                viewWidget = viewNode.addComponent(Widget);
            }
            
            // viewNode也设置为居中
            viewWidget.isAlignHorizontalCenter = true;
            viewWidget.isAlignVerticalCenter = true;
            viewWidget.isAlignTop = false;
            viewWidget.isAlignBottom = false;
            viewWidget.isAlignLeft = false;
            viewWidget.isAlignRight = false;
            viewWidget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
            
            viewWidget.updateAlignment();
        }
        
        DebugLog.instance.log(`[AlertManager] Alert Widget setup completed for: ${alertNode.name}`);
    }

    public onSceneChanged(sceneName: string, lastSceneName: string) {
        this.alertQueue = [];
        this._isShowingToast = false;
        this.closeCurrentAlert();
        // 销毁当前Toast（如果存在）
        if (this._currentToast) {
            this._currentToast.destroy();
            this._currentToast = null;
        }
    }

    public showToastAlert(message: string) {
        if (!this._socketAlertPrefab) {
            DebugLog.instance.error("Socket Alert prefab not loaded!");
            return;
        }

        // 如果当前正在显示Toast，直接返回
        if (this._isShowingToast) {
            return;
        }

        // 显示Toast
        this._displayToast(message);
    }

    /**
     * 内部方法：显示Toast
     * @param message 要显示的消息
     */
    private _displayToast(message: string) {
        if (!this._socketAlertPrefab) {
            DebugLog.instance.error("Socket Alert prefab not loaded!");
            return;
        }

        // 标记正在显示Toast
        this._isShowingToast = true;

        // 实例化预制体
        let alertNode = instantiate(this._socketAlertPrefab);

        // 如果找不到弹窗层，则输出错误信息
        let rootNode: Node = LayerUtil.createTopLayer('AlertLayer');
        if (!rootNode) {
            DebugLog.instance.error("Can not create top layer for alert!");
            this._isShowingToast = false;
            return;
        }

        rootNode.addChild(alertNode);
        this._currentToast = alertNode;

        // 设置提示内容
        const messageLabel = alertNode.getComponentInChildren(Label);
        if (messageLabel) {
            messageLabel.string = message;
        }

        // 创建渐隐动画
        tween(alertNode)
            .delay(3) // 延迟3秒
            .to(0.3, { scale: new Vec3(0.8, 0.8, 0.8) }) // 先缩小
            .to(0.1, { scale: new Vec3(0, 0, 0) }) // 再完全消失
            .call(() => {
                // 动画结束后销毁节点
                if (this._currentToast === alertNode) {
                    this._currentToast = null;
                }
                alertNode.destroy();

                // 标记Toast显示结束
                this._isShowingToast = false;
            })
            .start();
    }

    /**
     * 显示3秒倒计时弹窗
     * @param message 提示消息
     * @param onComplete 倒计时结束回调
     */
    public showCountdownAlert(message: string, onComplete?: () => void) {
        if (!this._socketAlertPrefab) {
            DebugLog.instance.error("Socket Alert prefab not loaded!");
            return;
        }

        // 实例化预制体
        let alertNode = instantiate(this._socketAlertPrefab);

        // 如果找不到弹窗层，则输出错误信息
        let rootNode: Node = LayerUtil.createTopLayer('AlertLayer');
        if (!rootNode) {
            DebugLog.instance.error("Can not create top layer for alert!");
            return;
        }

        rootNode.addChild(alertNode);
        this.currentAlert = alertNode;

        // 设置提示内容
        const messageLabel = alertNode.getComponentInChildren(Label);
        if (messageLabel) {
            messageLabel.string = message;
        }

        // 添加倒计时显示
        let countdownLabel: Label = null;
        const countdownNode = new Node("CountdownLabel");
        countdownLabel = countdownNode.addComponent(Label);
        countdownLabel.string = "3";
        countdownLabel.fontSize = 48;
        countdownLabel.color = new Color(255, 255, 255, 255);
        alertNode.addChild(countdownNode);
        
        // 设置倒计时标签位置（在消息下方）
        countdownNode.setPosition(0, -130);

        // 开始倒计时
        let countdown = 3;
        const countdownTimer = setInterval(() => {
            countdown--;
            if (countdownLabel) {
                countdownLabel.string = countdown.toString();
            }
            
            if (countdown <= 0) {
                clearInterval(countdownTimer);
                // 倒计时结束，执行回调
                if (onComplete) {
                    onComplete();
                }
                // 销毁弹窗
                if (this.currentAlert === alertNode) {
                    this.currentAlert = null;
                }
                alertNode.destroy();
            }
        }, 1000);

        // 添加渐隐动画（在倒计时结束后）
        tween(alertNode)
            .delay(3) // 等待3秒倒计时结束
            .to(0.3, { scale: new Vec3(0.8, 0.8, 0.8) }) // 先缩小
            .to(0.1, { scale: new Vec3(0, 0, 0) }) // 再完全消失
            .call(() => {
                // 动画结束后销毁节点
                if (this.currentAlert === alertNode) {
                    this.currentAlert = null;
                }
                alertNode.destroy();
            })
            .start();
    }

    /**
     * 开始倒计时
     * @param duration 倒计时时长（秒）
     * @param confirmButton 确认按钮
     * @param countdownCb 倒计时结束回调
     */
    private startCountdown(duration: number, confirmButton: Button, countdownCb?: () => void) {
        this.clearCountdownTimer();
        this._countdownButtonRef = confirmButton;
        TimeUtil.startButtonCountdown(confirmButton, duration, "确定", undefined, () => {
            // 倒计时结束，调用回调并关闭弹窗
            if (countdownCb) {
                countdownCb();
            }
            this.closeCurrentAlert();
        });
    }

    /**
     * 清除倒计时定时器
     */
    private clearCountdownTimer() {
        if (this._countdownButtonRef) {
            TimeUtil.stopButtonCountdown(this._countdownButtonRef, "确定");
            this._countdownButtonRef = null;
        }
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
            this.countdownTimer = null;
        }
    }

    /**
     * 更新倒计时显示
     * @param confirmButton 确认按钮
     */
    private updateCountdownDisplay(confirmButton: Button) {
        // 已改用 TimeUtil 统一处理按钮文案更新
    }

}

export class AlertData {
    public title: string = "提示";
    public message: string = "";
    public messageFontColor: string = "#FFFFFF";
    public closeBtnVisible: boolean = false;
    public cancelCb: () => void = null;
    public confirmCb: () => void = null;
    public contentClickCb: () => void = null;
    public guideCallBack:()=> void = null;
    public cancelButtonVisible: boolean = false;
    public guideButtonVisible:boolean = false;
    public guideButtonText:string = '玩法介绍';
    public cancelButtonText: string = "取消";
    public confirmButtonText: string = "确认";
    public x: number = 0; // 弹窗x坐标，默认为0表示使用默认位置
    public y: number = 0; // 弹窗y坐标，默认为0表示使用默认位置
    public countdown?: number = 0; // 倒计时秒数，0表示不启用倒计时
    public enableCountdown?: boolean = false; // 是否启用倒计时功能
    public countdownCb?: () => void = null; // 倒计时结束回调
}
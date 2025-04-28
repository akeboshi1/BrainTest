import { Button, instantiate, Label, Node, Prefab, resources, Color, UITransform, Vec3} from "cc";
import { BaseManager } from "../BaseManager";
import { DebugLog } from "../../Util/DebugLog";
import { LayerUtil } from "../../Util/LayerUtil";
import { SceneManager } from "../Scene/SceneManager";

export default class AlertManager extends BaseManager {
    private static _instance: AlertManager;

    public static getInstance(): AlertManager {
        if (!this._instance) {
            this._instance = new AlertManager();
        }
        return this._instance;
    }

    private commonAlertPrefab: Prefab = null;
    private userAgreeAlertPrefab: Prefab = null;
    private alertQueue: AlertData[] = []; // 用于存储等待显示的alert数据队列
    private currentAlert: Node = null; // 当前正在显示的alert节点

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

        // 设置弹窗位置，如果提供了x和y坐标则使用，否则使用默认位置(中央)
        if (alertData.x !== 0 || alertData.y !== 0) {
            alertNode.setPosition(alertData.x, alertData.y);
        }

        // 这里可以添加更多逻辑根据alertData设置弹窗内的文本内容、按钮显示及点击回调等

        // 假设弹窗内有对应的组件来设置标题、消息等内容，以下为示例代码（需根据实际预制体结构调整）
        let titleLabel = alertNode.getChildByName('titleLabel').getComponent(Label);
        if (titleLabel) {
            titleLabel.string = alertData.title;
        }

        let messageLabel = alertNode.getChildByName('messageLabel').getComponent(Label);
        if (messageLabel) {
            messageLabel.string = alertData.message;
        }

        let guideButton = alertNode.getChildByName('guideButton').getComponent(Button);
        if(guideButton){
            guideButton.node.active = alertData.guideButtonVisible;
            guideButton.node.on('click', () => {
                if (alertData.guideCallBack) {
                    alertData.guideCallBack();
                }
                this.closeCurrentAlert();
            });

            guideButton.node.getChildByName("Label").getComponent(Label).string = alertData.guideButtonText;
        }
        // 处理取消按钮相关逻辑，设置显示隐藏及点击回调等（示例，需根据实际调整）
        let cancelButton = alertNode.getChildByName('cancelButton').getComponent(Button);
        if (cancelButton) {
            cancelButton.node.active = alertData.cancelButtonVisible;
            cancelButton.node.on('click', () => {
                if (alertData.cancelCb) {
                    alertData.cancelCb();
                }
                this.closeCurrentAlert();
            });

            cancelButton.node.getChildByName("Label").getComponent(Label).string = alertData.cancelButtonText;
        }

        // 处理确认按钮相关逻辑，设置点击回调等（示例，需根据实际调整）
        let confirmButton = alertNode.getChildByName('confirmButton').getComponent(Button);
        if (confirmButton) {
            confirmButton.node.on('click', () => {
                if (alertData.confirmCb) {
                    alertData.confirmCb();
                }
                this.closeCurrentAlert();
            });

            confirmButton.node.getChildByName("Label").getComponent(Label).string = alertData.confirmButtonText;
            if (!alertData.cancelButtonVisible) {
                confirmButton.node.setPosition(0, confirmButton.node.position.y);
            }
        }
    }
    public showUserAgreeAlert(alertData: AlertData) {
        if (this.currentAlert) {
            this.alertQueue.push(alertData);
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
        let rootNode: Node = LayerUtil.getAlertLayer();
        if (!rootNode) {
            DebugLog.instance.error("Can not find alert layer!");
            return;
        }

        rootNode.addChild(alertNode);
        this.currentAlert = alertNode;

        // 设置弹窗位置，如果提供了x和y坐标则使用，否则使用默认位置(中央)
        if (alertData.x !== 0 || alertData.y !== 0) {
            alertNode.setPosition(alertData.x, alertData.y);
        }

        // 这里可以添加更多逻辑根据alertData设置弹窗内的文本内容、按钮显示及点击回调等

        // 假设弹窗内有对应的组件来设置标题、消息等内容，以下为示例代码（需根据实际预制体结构调整）
        let titleLabel = alertNode.getChildByName('titleLabel').getComponent(Label);
        if (titleLabel) {
            titleLabel.string = alertData.title;
        }

        // let messageLabel = alertNode.getChildByName('messageLabel').getComponent(Label);
        // if (messageLabel) {
        //     messageLabel.string = alertData.message;
        //     messageLabel.color = new Color(alertData.messageFontColor);
        //     messageLabel.node.on('click', () => {
        //         console.log('contentClick');
        //         if (alertData.contentClickCb) {
        //             alertData.contentClickCb();
        //         }
        //         this.closeCurrentAlert();
        //     });

        // }

        // 处理取消按钮相关逻辑，设置显示隐藏及点击回调等（示例，需根据实际调整）
        let cancelButton = alertNode.getChildByName('cancelButton').getComponent(Button);
        if (cancelButton) {
            cancelButton.node.active = alertData.cancelButtonVisible;
            cancelButton.node.on('click', () => {
                if (alertData.cancelCb) {
                    alertData.cancelCb();
                }
                this.closeCurrentAlert();
            });

            cancelButton.node.getChildByName("Label").getComponent(Label).string = alertData.cancelButtonText;
        }

        // 处理确认按钮相关逻辑，设置点击回调等（示例，需根据实际调整）
        let confirmButton = alertNode.getChildByName('confirmButton').getComponent(Button);
        if (confirmButton) {
            confirmButton.node.on('click', () => {
                if (alertData.confirmCb) {
                    alertData.confirmCb();
                }
                this.closeCurrentAlert();
            });

            confirmButton.node.getChildByName("Label").getComponent(Label).string = alertData.confirmButtonText;
            if (!alertData.cancelButtonVisible) {
                confirmButton.node.setPosition(0, confirmButton.node.position.y);
            }
        }
    }

    public closeCurrentAlert() {
        if (this.currentAlert) {
            this.currentAlert.destroy();
            this.currentAlert = null;
            // 检查队列中是否还有等待显示的alert，如果有则弹出下一个显示
            if (this.alertQueue.length > 0) {
                let nextAlertData = this.alertQueue.shift();
                this.showAlert(nextAlertData);
            }
        }
    }

    public onSceneChanged(sceneName: string, lastSceneName: string) {
        this.alertQueue = [];
        this.closeCurrentAlert();
    }
}

export class AlertData {
    public title: string = "提示";
    public message: string = "";
    public messageFontColor: string = "#FFFFFF";
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

}
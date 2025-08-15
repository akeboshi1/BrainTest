import { _decorator, Camera, Node, director, WebView, sys } from 'cc';
import { EventManager } from "./Core/Manager/Event/EventManager";
import { SocketManager } from "./Core/Manager/Net/SocketManager";
import { UIManager } from "./Core/Manager/UI/UIManager";
import { SceneManager } from "./Core/Manager/Scene/SceneManager";
import { PoolManager } from "./Core/Manager/Pool/PoolManager";
import { DebugLog } from './Core/Util/DebugLog';
import { BaseObejct } from "./Core/Object/BaseObject";
import { UserData } from "./Core/Data/UserData";
import { Global } from "./Core/Manager/Config/Global";
import { TaskManager } from "db://assets/resources/scripts/Game/Task/TaskManager";
import { LoginManager } from "db://assets/resources/scripts/Core/Manager/LoginManager/LoginManager";
import { ChatFlowModel } from './Game/UI/ChatPanel/Model/ChatFlowModel';
import  {AlertManager, AlertData } from './Core/Manager/Alert/AlertManager';
import { BundlePreloadManager } from './Core/Manager/Load/BundlePreloadManager';
import { AudioManager } from './Core/Manager/Audio/AudioManager';
import { GuideManager } from "db://assets/resources/scripts/Core/Manager/Guide/GuideManager";
import FeatureTogglesSetting from './FeatureTogglesSetting';
import { NativeEventManager } from './Core/Manager/Event/NativeEventManager';
import { AdaptComponent } from './mainV2/AdaptComponent';
import { PublishSettingConfig } from '../../app/PublishSettingConfig';

const { ccclass, property } = _decorator;

@ccclass('App')
export class App extends AdaptComponent {

    @property(Camera)
    camera: Camera;

    @property(Node)
    panelContainer: Node

    @property(String)
    sceneName = "";

    /**
     * 是否适配paipai1.0
     */
    @property({ type: false })
    isPad = false;

    /**
     * debug标记
     */
    @property({ type: false })
    debug = true;

    /**
     * 用于本地调试tts/asr接口
     */
    @property({ type: false })
    isWebView = true;

    @property(Node)
    webView: Node;

    @property(WebView)
    tts: WebView;

    @property(WebView)
    asr: WebView;

    @property(WebView)
    fsr: WebView;

    @property(Node)
    event:Node;


    // ai
    // game
    // usercenter
    // other

    onLoad() {
        super.onLoad();
        DebugLog.instance.log('onLoad');
        // 用户数据
        Global.userData = new UserData();


        DebugLog.instance.log('sys.os = ', sys.os);
        DebugLog.instance.log('sys.platform=', sys.platform);

        this.isWebView = sys.platform != 'ANDROID';

        if (this.isWebView) {
            this.webView.active = true;
            // 增加常驻节点
            director.addPersistRootNode(this.webView);
        } else {
            this.webView.active = false;
            // 移除常驻节点
            director.removePersistRootNode(this.webView);
        }

        this.initManager();

        //预加载
        this.preLoadRes();
    }

    onEnable() {
        this.addListener();
    }

    onDisable() {
        this.removeListener();
    }

    start() {
        super.start();
        // Global.isSkewersGame = false;
        DebugLog.instance.log("常驻节点", director.isPersistRootNode(this.webView));
    }


    onDestroy() {
        super.destroy();
    }


    /**
     * socket连接成功回调   
     * debug环境下tts 连接成功回调
     */
    ttsComplete() {
        DebugLog.instance.log("ttsComplete");
    }

    /**
     * debug环境下asr 连接成功回调
     */
    asrComplete() {
        DebugLog.instance.log("asrComplete");
    }


    private async initManager() {
        EventManager.getInstance().init();
        NativeEventManager.getInstance().init();
        if (!this.isPad) {
            LoginManager.getInstance().init();
            TaskManager.getInstance().init();
            BundlePreloadManager.getInstance().init();
            ChatFlowModel.getInstance().init();
        }
        await GuideManager.getInstance().init();
        await UIManager.getInstance().init();
        SceneManager.getInstance().init();
        PoolManager.getInstance().init();
        AudioManager.getInstance().init();
        const publishSetting = PublishSettingConfig.getInstance();
        await FeatureTogglesSetting.getInstance().init(publishSetting.getIsMCI());
    }

    private async preLoadRes() {
        if (this.isPad) {
            // 初始化训练 打包单独训练用
            this.initGame();
        } else {
            await AlertManager.getInstance().init();
            await AlertManager.getInstance().initUserAgreeAlert();
            await AlertManager.getInstance().initSocketAlertPrefab();

            // 初始化socket
            const publishSetting = PublishSettingConfig.getInstance();
            SocketManager.getInstance().initSocket(publishSetting.getApiUrl()).then(() => {
                this.socketOnHandler();
            }).catch(() => {
                const alertData: AlertData = new AlertData();
                alertData.title = "连接失败";
                alertData.message = '网络链接失败，请检查网络环境';
                alertData.messageFontColor = "#FFFFFF";
                alertData.confirmButtonText = "重连";
                alertData.cancelButtonText = "退出";
                alertData.cancelButtonVisible = true;
                alertData.guideButtonVisible = false;
                alertData.guideButtonText = '玩法介绍';
                alertData.x = 0;
                alertData.y = 0;
                alertData.confirmCb = async () => {
                    // 用户选择重连，重新尝试初始化socket
                    DebugLog.instance.log("用户选择重连，重新尝试初始化socket");
                    try {
                        await SocketManager.getInstance().initSocket(publishSetting.getApiUrl());
                        this.socketOnHandler();
                    } catch (error) {
                        DebugLog.instance.error("重连失败:", error);
                        // 重连失败，继续显示alert
                        this.showReconnectFailedAlert(publishSetting);
                    }
                };
                alertData.cancelCb = () => {
                    // 用户选择退出，可以在这里添加退出逻辑
                    DebugLog.instance.log("用户选择退出");
                    // 如果需要跳转到登录界面，可以调用 LoginManager.getInstance().loginout();
                };
                alertData.contentClickCb = null;
                alertData.guideCallBack = null;
                
                AlertManager.getInstance().showAlert(alertData);
            });
        }
    }

    private addListener() {
    }

    private removeListener() {
    }

    /**
     * socket连接成功
     * @private
     */
    private async socketOnHandler() {
        DebugLog.instance.log("socket connected");

        if (this.isWebView) {
            this.tts.url = "./webview/tts.html";
            this.asr.url = "./webview/asr.html";
            this.fsr.url = "./webview/fsr.html";
        }

        LoginManager.getInstance().start();
    }

    /**
     * 初始化训练场景，单独发布某个训练
     * @private
     */
    private initGame() {
        SceneManager.getInstance().changeScene(this.sceneName).then(() => {
            DebugLog.instance.log(`${this.sceneName} 场景切换成功`);
        });
    }

    /**
     * 显示重连失败弹窗，提供退出和重连选项
     * @private
     */
    private async showReconnectFailedAlert(publishSetting: any): Promise<void> {
        return new Promise<void>((resolve) => {
            const alertData: AlertData = new AlertData();
            alertData.title = "连接失败";
            alertData.message = '网络链接失败，请检查网络环境';
            alertData.messageFontColor = "#FFFFFF";
            alertData.confirmButtonText = "重连";
            alertData.cancelButtonText = "退出";
            alertData.cancelButtonVisible = true;
            alertData.guideButtonVisible = false;
            alertData.guideButtonText = '玩法介绍';
            alertData.x = 0;
            alertData.y = 0;
            alertData.confirmCb = async () => {
                // 用户选择重连，继续尝试重连
                DebugLog.instance.log("用户选择重连，继续尝试重连");
                resolve();
                try {
                    await SocketManager.getInstance().initSocket(publishSetting.getApiUrl());
                    this.socketOnHandler();
                } catch (error) {
                    DebugLog.instance.error("重连失败:", error);
                    // 重连失败，继续显示alert
                    this.showReconnectFailedAlert(publishSetting);
                }
            };
            alertData.cancelCb = () => {
                // 用户选择退出，跳转到登录界面
                DebugLog.instance.log("用户选择退出，跳转到登录界面");
                resolve();
                // 如果需要跳转到登录界面，可以调用 LoginManager.getInstance().loginout();
            };
            alertData.contentClickCb = null;
            alertData.guideCallBack = null;
            
            AlertManager.getInstance().showAlert(alertData);
        });
    }

}



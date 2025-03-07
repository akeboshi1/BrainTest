import { _decorator, Camera, Node, director, WebView, sys } from 'cc';
import { EventManager } from "./Core/Manager/Event/EventManager";
import { SocketManager } from "./Core/Manager/Net/SocketManager";
import { UIManager } from "./Core/Manager/UI/UIManager";
import { SceneManager } from "./Core/Manager/Scene/SceneManager";
import { LoaderManager } from "./Core/Manager/Load/LoaderManager";
import { PoolManager } from "./Core/Manager/Pool/PoolManager";
import { DebugLog } from './Core/Util/DebugLog';
import { BaseObejct } from "./Core/Object/BaseObject";
import { UserData } from "./Core/Data/UserData";
import { Global } from "./Core/Manager/Config/Global";
import { TaskManager } from "db://assets/resources/scripts/Game/Task/TaskManager";
import { LoginManager } from "db://assets/resources/scripts/Core/Manager/LoginManager/LoginManager";
import { ChatFlowModel } from './Game/UI/ChatPanel/Model/ChatFlowModel';
import AlertManager, { AlertData } from './Core/Manager/Alert/AlertManager';
import { BundlePreloadManager } from './Core/Manager/Load/BundlePreloadManager';
import { AudioManager } from './Core/Manager/Audio/AudioManager';
import { GuideManager } from "db://assets/resources/scripts/Core/Manager/Guide/GuideManager";
import { PublishSetting } from './PublishSetting';

const { ccclass, property } = _decorator;

@ccclass('App')
export class App extends BaseObejct {

    @property(Camera)
    camera: Camera;

    @property(Node)
    panelContainer: Node

    @property()
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

    @property(PublishSetting)
    publishSetting: PublishSetting;

    // ai
    // game
    // usercenter
    // other

    onLoad() {
        super.onLoad();
        DebugLog.instance.log('onLoad');
        // 用户数据
        Global.userData = new UserData();


        console.log('sys.os = ', sys.os);
        console.log('sys.platform=', sys.platform);

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
        LoaderManager.getInstance().init();
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
    }

    private async preLoadRes() {
        if (this.isPad) {
            // 初始化游戏 打包单独游戏用
            this.initGame();
        } else {
            await AlertManager.getInstance().init();

            // 初始化socket
            SocketManager.getInstance().initSocket(this.publishSetting.currentApiUrl).then(() => {
                this.socketOnHandler();
            }).catch(() => {
                const alertData: AlertData = new AlertData();
                alertData.message = '网络链接失败，请检查网络环境';
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
        }

        LoginManager.getInstance().start();
    }

    /**
     * 初始化游戏场景，单独发布某个游戏
     * @private
     */
    private initGame() {
        let url = Global.RES_Root + this.sceneName;
        SceneManager.getInstance().changeScene(url, this.sceneName).then(() => {
            DebugLog.instance.log(`${this.sceneName} 场景切换成功`);
        });
    }

}



import { _decorator, find, Camera, resources, Node, director, TextAsset, WebView, sys, assetManager } from 'cc';
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
import { TaskManager } from "db://assets/scripts/Game/Task/TaskManager";
import { LoginManager } from "db://assets/scripts/Core/Manager/LoginManager/LoginManager";
import { ChatFlowModel } from './Game/UI/ChatPanel/Model/ChatFlowModel';
import AlertManager from './Core/Manager/Alert/AlertManager';
import { BundlePreloadManager } from './Core/Manager/Load/BundlePreloadManager';
import { AudioManager } from './Core/Manager/Audio/AudioManager';
import { BundleName } from './Core/Manager/Load/BundleName';
import { LoginPanel } from './Game/UI/Login/LoginPanel';


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




    private initManager() {
        EventManager.getInstance().init();
        LoaderManager.getInstance().init();
        if(!this.isPad){
            LoginManager.getInstance().init();
            TaskManager.getInstance().init();
            BundlePreloadManager.getInstance().init();
            ChatFlowModel.getInstance().init();
        }
        UIManager.getInstance().init();
        SceneManager.getInstance().init();
        PoolManager.getInstance().init();
        AlertManager.getInstance().init();
        AudioManager.getInstance().init();
    }

    private preLoadRes() {
        if (this.isPad) {
            // 初始化游戏 打包单独游戏用
            this.initGame();
        } else {
            // 初始化socket
            EventManager.getInstance().on(SocketManager.SOCKET_ON, this.socketOnHandler, this);
            SocketManager.getInstance().initSocket();
        }
    }

    private addListener() {
        EventManager.getInstance().on(SocketManager.SOCKET_OFF, this.socketOffHandler, this);
        EventManager.getInstance().on(SocketManager.SOCKET_ONERROR, this.socketErrorHandler, this);
    }

    private removeListener() {
        EventManager.getInstance().off(SocketManager.SOCKET_OFF, this);
        EventManager.getInstance().off(SocketManager.SOCKET_ONERROR, this);
    }

    /**
     * socket连接成功
     * @private
     */
    private async socketOnHandler(data, context) {
        DebugLog.instance.log("socket connected");
        EventManager.getInstance().off(SocketManager.SOCKET_ON, context);

        if (context.isWebView) {
            context.tts.url = "./webview/tts.html";
            context.asr.url = "./webview/asr.html";
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

    /**
     * socket连接关闭
     * @private
     */
    private socketOffHandler(data, context) {

    }

    /**
     * socket连接失败
     * @param error
     * @private
     */
    private socketErrorHandler(error, context) {

    }
}



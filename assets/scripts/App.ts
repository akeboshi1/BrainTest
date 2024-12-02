import { _decorator, find,Camera,resources,Node,director,TextAsset,WebView } from 'cc';
import {EventManager} from "./Core/Manager/Event/EventManager";
import {SocketManager} from "./Core/Manager/Net/SocketManager";
import {UIManager} from "./Core/Manager/UI/UIManager";
import {SceneManager} from "./Core/Manager/Scene/SceneManager";
import {LoaderManager} from "./Core/Manager/Load/LoaderManager";
import {PoolManager} from "./Core/Manager/Pool/PoolManager";
import {SpriteManager} from "./Core/Manager/Sprite/SpriteManager";
import { DebugLog } from './Core/Util/DebugLog';
import {BaseObejct} from "./Core/Object/BaseObject";
import {UserData} from "./Core/Data/UserData";
import {Global} from "./Core/Manager/Config/Global";
import {TaskManager} from "db://assets/scripts/Game/Task/TaskManager";
import {LoginManager} from "db://assets/scripts/Core/Manager/LoginManager/LoginManager";
import { ChatFlowModel } from './Game/UI/ChatPanel/Model/ChatFlowModel';


const { ccclass, property } = _decorator;

@ccclass('App')
export class App extends BaseObejct {

    @property(Camera)
    camera: Camera;

    @property(Node)
    panelContainer:Node

    @property()
    sceneName = "";

    @property({type:false})
    isPad = false;

    /**
     * 用于本地调试tts/asr接口
     */
    @property({type:false})
    isWebView = false;

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

    onLoad(){
        super.onLoad();
        DebugLog.instance.log('onLoad');
        // 用户数据
        Global.userData = new UserData();

        // 常驻节点
        if(this.isWebView){
            director.addPersistRootNode(this.webView);
            this.webView.active = true;
        }else{
            director.removePersistRootNode(this.webView);
            this.webView.active = false;
        }

        this.initManager();

        //预加载
        this.preLoadRes();
    }

    onEnable(){
        this.addListener();
    }

    onDisable(){
        this.removeListener();
    }

    start() {
        // Global.isSkewersGame = false;
        DebugLog.instance.log("常驻节点",director.isPersistRootNode(this.webView));
    }


    onDestroy(){
        super.destroy();
    }


    /**
     * debug环境下tts 连接成功回调
     */
    ttsComplete(){
        DebugLog.instance.log("ttsComplete");
    }

    /**
     * debug环境下asr 连接成功回调
     */
    asrComplete(){
        DebugLog.instance.log("asrComplete");
    }




    private initManager() {
        LoaderManager.getInstance().init();
        LoginManager.getInstance().init();
        UIManager.getInstance().init();
        SceneManager.getInstance().init();
        EventManager.getInstance().init();
        PoolManager.getInstance().init();
        SpriteManager.getInstance().init();
        TaskManager.getInstance().init();
        ChatFlowModel.getInstance().init();
        SpriteManager.getInstance().init();
    }

    private preLoadRes(){
        let self = this;
        UIManager.getInstance().perloadRes().then(()=>{
            UIManager.getInstance().showLoadingPanel();
            if(self.isPad){
                // 初始化游戏 打包单独游戏用
                self.initGame();
            }else{
                // 初始化socket
                EventManager.getInstance().on(SocketManager.SOCKET_ON,this.socketOnHandler,this);
                SocketManager.getInstance().initSocket();
            }
        });
    }

    private addListener(){
        EventManager.getInstance().on(SocketManager.SOCKET_OFF,this.socketOffHandler,this);
        EventManager.getInstance().on(SocketManager.SOCKET_ONERROR,this.socketErrorHandler,this);
    }

    private removeListener(){
        EventManager.getInstance().off(SocketManager.SOCKET_OFF,this);
        EventManager.getInstance().off(SocketManager.SOCKET_ONERROR,this);
    }

    /**
     * socket连接成功
     * @private
     */
    private socketOnHandler(data,context){
        DebugLog.instance.log("socket connected");
        EventManager.getInstance().off(SocketManager.SOCKET_ON,context);

        if(context.isWebView){
            context.tts.url = "./webview/tts.html";
            context.asr.url= "./webview/asr.html";
        }

        // 请求项目资源地址
        // SocketManager.getInstance().send(new SocketData({"action": "init.root", "data": {"xx": "xxx"}}));
        // EventManager.getInstance().on(SocketManager.xxx,(data,context)=>{
        //    Global.API_Root = data.apiRoot;
        //    Global.RES_Root = data.resRoot;

        LoginManager.getInstance().start(context.panelContainer);

        // },this);




    }

    /**
     * 初始化游戏场景，单独发布某个游戏
     * @private
     */
    private initGame(){
        let url = Global.RES_Root +this.sceneName;
        SceneManager.getInstance().changeScene(url,this.sceneName).then(()=>{
             DebugLog.instance.log(`${this.sceneName} 场景切换成功`);
        });
        // LoaderManager.getInstance().assetBundleLoad(self.sceneName,self.sceneName).then((bundle:AssetManager.Bundle)=>{
        //     bundle.loadScene(self.sceneName,(err,scene)=>{
        //         director.loadScene(self.sceneName,(err,scene)=>{
        //             if(err)DebugLog.instance.error(err);
        //         })
        //     });
        // });
    }

    /**
     * socket连接关闭
     * @private
     */
    private socketOffHandler(data,context){

    }

    /**
     * socket连接失败
     * @param error
     * @private
     */
    private socketErrorHandler(error,context){

    }


}



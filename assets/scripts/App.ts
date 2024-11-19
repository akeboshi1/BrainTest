import { _decorator, Component,Camera,AssetManager,Node,director,instantiate,WebView } from 'cc';
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
import {LoginPanel} from "./Game/UI/Login/LoginPanel";
import {Global} from "./Core/Manager/Config/Global";
import {SkewersManager} from "./Game/Skewers/SkewersManager";


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

        // 常驻节点
        director.addPersistRootNode(this.node);

        this.initManager();

        //预加载
        this.preLoadRes();

        // 用户数据
        Global.userData = new UserData();
    }

    onEnable(){
        this.addListener();
    }

    onDisable(){
        this.removeListener();
    }

    start() {
      DebugLog.instance.log(director.isPersistRootNode(this.node));
    }

    update(deltaTime: number) {
        
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


    private initSocket(){
        EventManager.getInstance().on(SocketManager.SOCKET_ON,this.socketOnHandler,this);
        // 初始化socket
        const url = "wss://test.paipai2.xinjiaxianglao.com/api/home";
        SocketManager.getInstance().initSocket(url);

    }

    private initManager() {
        LoaderManager.getInstance().init();
        UIManager.getInstance().init();
        SceneManager.getInstance().init();
        EventManager.getInstance().init();
        PoolManager.getInstance().init();
        SpriteManager.getInstance().init();
        SkewersManager.getInstance().init();
    }

    private preLoadRes(){
        let self = this;
        UIManager.getInstance().perloadRes().then(()=>{
            UIManager.getInstance().showLoadingPanel();
            if(!Global.isSkewersGame){
                if(self.isPad){
                    // 初始化游戏
                    self.initGame();
                }else{
                    // 初始化socket
                    self.initSocket();
                }
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

        if(this.isWebView){
            this.tts.url ="https://kele.paipai.xinjiaxianglao.com/webview/dev/tts.html";
            this.asr.url="https://kele.paipai.xinjiaxianglao.com/webview/dev/asr.html";

        }

        // 请求项目资源地址
        // SocketManager.getInstance().send(new SocketData({"action": "init.root", "data": {"xx": "xxx"}}));
        // EventManager.getInstance().on(SocketManager.xxx,(data,context)=>{
        //    Global.API_Root = data.apiRoot;
        //    Global.RES_Root = data.resRoot;

        let self = context;
        LoaderManager.getInstance().resourcesLoadPrefab(Global.RES_Root+"prefab/LoginPanel").then((resource)=>{
            const node = instantiate(resource);
            UIManager.getInstance().registerView(LoginPanel.NAME,node);
            UIManager.getInstance().showView(LoginPanel.NAME,self.panelContainer);
            node.setPosition(0,0,0);
        });



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



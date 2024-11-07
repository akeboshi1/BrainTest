import { _decorator, Component,Camera,profiler,Node,director,instantiate,v2 } from 'cc';
import {EventManager} from "./Core/Manager/Event/EventManager";
import {SocketManager} from "./Core/Manager/Net/SocketManager";
import {UIManager} from "./Core/Manager/UI/UIManager";
import {SceneManager} from "./Core/Manager/Scene/SceneManager";
import {LoaderManager} from "./Core/Manager/Load/LoaderManager";
import {PoolManager} from "./Core/Manager/Pool/PoolManager";
import {SpriteManager} from "./Core/Manager/Sprite/SpriteManager";
import { DebugLog } from './Core/Util/DebugLog';
import {BaseObejct} from "./Core/Object/BaseObject";


const { ccclass, property } = _decorator;

@ccclass('App')
export class App extends BaseObejct {

    @property(Camera)
    camera: Camera;

    @property(Node)
    panelContainer:Node;
    
    // ai
    // game
    // usercenter
    // other

    onLoad(){
        super.onLoad();
        DebugLog.instance.log('onLoad');

        this.addLoadingPanel();

        // 初始化socket
        this.initSocket();
        this.initManager();
    }

    onEnable(){
        this.addListener();
    }

    onDisable(){
        this.removeListener();
    }

    start() {

    }

    update(deltaTime: number) {
        
    }

    private initSocket(){
        EventManager.getInstance().init();
        EventManager.getInstance().on(SocketManager.SOCKET_ON,this.socketOnHandler,this);
        // 初始化socket
        const url = "wss://test.paipai2.xinjiaxianglao.com/api/home";
        SocketManager.getInstance().initSocket(url);

    }

    private initManager(){
        UIManager.getInstance().init();
        SceneManager.getInstance().init();
        LoaderManager.getInstance().init();
        PoolManager.getInstance().init();
        SpriteManager.getInstance().init();
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
    private socketOnHandler(){
        DebugLog.instance.log("socket connected");
        EventManager.getInstance().off(SocketManager.SOCKET_ON,this);
        LoaderManager.getInstance().resourcesLoad("prefab/LoginPanel").then((resource)=>{
            const node = instantiate(resource);
            SceneManager.getInstance().addUIToContainer(node,this.context.panelContainer);
        });
    }

    /**
     * socket连接关闭
     * @private
     */
    private socketOffHandler(){

    }

    /**
     * socket连接失败
     * @param error
     * @private
     */
    private socketErrorHandler(error){

    }

    private addLoadingPanel(){
        LoaderManager.getInstance().resourcesLoad("prefab/LoadPanel").then((prefab)=>{
            const name = "LoadPanel";
            PoolManager.getInstance().initPool(name,prefab,1);
            const node = PoolManager.getInstance().get(name);
            // 获取当前场景
            SceneManager.getInstance().addUIToContainerByName(node,"PanelContainer");
        })
    }
}



import { _decorator, Component,Camera,profiler,Node,director,instantiate,v2 } from 'cc';
import {SocketManager} from "db://assets/scripts/Core/Manager/Net/SocketManager";
import {EventManager} from "db://assets/scripts/Core/Manager/Event/EventManager";
import {UIManager} from "db://assets/scripts/Core/Manager/UI/UIManager";
import {SceneManager} from "db://assets/scripts/Core/Manager/Scene/SceneManager";
import {LoaderManager} from "db://assets/scripts/Core/Manager/Load/LoaderManager";
import {PoolManager} from "db://assets/scripts/Core/Manager/Pool/PoolManager";
import {SpriteManager} from "db://assets/scripts/Core/Manager/Sprite/SpriteManager";
import {DebugLog} from "db://assets/scripts/Core/Util/DebugLog";
const { ccclass, property } = _decorator;

@ccclass('App')
export class App extends Component {

    @property(Camera)
    camera: Camera;

    @property(Node)
    panelContainer:Node;
    
    // ai
    // game
    // usercenter
    // other

    onLoad(){
        // 将调试信息隐藏
        profiler.hideStats();
        console.log('onLoad');

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
       // TODO SOCKET ON
        DebugLog.instance.log("socket connected");
        EventManager.getInstance().off(SocketManager.SOCKET_ON,this);

        LoaderManager.getInstance().resourcesLoad("prefab/LoginPanel").then((resource)=>{
            const node = instantiate(resource);
            // 获取当前场景
            SceneManager.getInstance().addUIToScene(node,"PanelContainer");
            SceneManager.getInstance().preloadScene("AI",(data)=>{
                DebugLog.instance.log("preloadScene success",data);
            });
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
            SceneManager.getInstance().addUIToScene(node,"PanelContainer");
        })
    }
}



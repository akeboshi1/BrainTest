import { _decorator, Component,Camera,profiler } from 'cc';
import {SocketManager} from "db://assets/scripts/Net/SocketManager";
import {EventManager} from "db://assets/scripts/Dispatch/EventManager";
const { ccclass, property } = _decorator;

@ccclass('App')
export class App extends Component {

    @property(Camera)
    camera: Camera;

    // ai
    // game
    // usercenter
    // other

    onLoad(){
        // 将调试信息隐藏
        profiler.hideStats();

        console.log('onLoad');
    }

    onEnable(){
        this.addListener();
        this.initManager();
    }

    onDisable(){
        this.removeListener();
    }

    start() {

    }

    update(deltaTime: number) {
        
    }

    private initManager(){
        // 初始化socket
        EventManager.getInstance().on(SocketManager.SOCKET_ON,this.socketOnHandler,this);
        const url = "wss://test.paipai2.xinjiaxianglao.com/api/home";
        SocketManager.getInstance().initSocket(url);

        // 初始化

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
}



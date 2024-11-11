import {BaseManager} from "../BaseManager";
import { DebugLog } from "../../Util/DebugLog";
import {EventManager} from "../Event/EventManager";

export class SocketManager extends BaseManager{
    private static _instance: SocketManager;
    public static SOCKET_ON:string = "socket_on";
    public static SOCKET_OFF:string = "socket_off";
    public static SOCKET_ONMESSAGE:string = "socket_onmessage";
    public static SOCKET_ONERROR:string = "socket_onerror";
    private _socket: WebSocket;
    public static getInstance():SocketManager {
        if(!SocketManager._instance) {
            SocketManager._instance = new SocketManager();
        }
        return SocketManager._instance;
    }

    init(){

    }

    update(){

    }

    destroy(){
        this._socket.close();
    }

    public initSocket(url:string):void {
       if(this._socket!=null){
           DebugLog.instance.error("socket已初始化");
           return;
       }
       DebugLog.instance.log("init socket");
       this._socket=new WebSocket(url);
       this._socket.onopen = ()=>{
           EventManager.getInstance().emit(SocketManager.SOCKET_ON);
       };
       this._socket.onclose = ()=>{
           EventManager.getInstance().emit(SocketManager.SOCKET_OFF);
       };
       this._socket.onmessage = (data) => {
           let jsonString = JSON.stringify(data.data);
           EventManager.getInstance().emit(jsonString["code"], data.data);
       }
       this._socket.onerror = (err) => {
           EventManager.getInstance().emit(SocketManager.SOCKET_ONERROR, err);
       }
    }

    public send(data){
       this._socket.send(JSON.stringify(data));
    }

}
import {BaseManager} from "../BaseManager";
import { DebugLog } from "../../Util/DebugLog";
import {EventManager} from "../Event/EventManager";
import {SocketData} from "../../../Core/Manager/Net/SocketData";

export class SocketManager extends BaseManager{
    private static _instance: SocketManager;
    public static SOCKET_ON:string = "socket_on";
    public static SOCKET_OFF:string = "socket_off";
    public static SOCKET_ONMESSAGE:string = "socket_onmessage";
    public static SOCKET_ONERROR:string = "socket_onerror";
    private _socket: WebSocket;

    private _socketDatas:Map<string,SocketData>;
    public static getInstance():SocketManager {
        if(!SocketManager._instance) {
            SocketManager._instance = new SocketManager();
        }
        SocketManager._instance.init();
        return SocketManager._instance;
    }

    init(){
        this._socketDatas = new Map();
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
           let jsonString = JSON.parse(data.data);
           const action = jsonString.action;
           const _tmpData = this._socketDatas.get(action);
           if(!_tmpData){
               DebugLog.instance.error(`${action} is not in data`);
               return;
           }
           //todo uid处理
           _tmpData.feedback = true;
           _tmpData.refureshData(jsonString);
           EventManager.getInstance().emit(jsonString["action"], jsonString);
       };
       this._socket.onerror = (err) => {
           EventManager.getInstance().emit(SocketManager.SOCKET_ONERROR, err);
       };
    }

    public send(data:SocketData){
        const _tmpData:SocketData= this._socketDatas.get(data.action);
        if(_tmpData && !_tmpData.feedback){
            // todo check uid
            DebugLog.instance.log(`${data.action},已经发送过了，请等待回复`);
            return;
        }
        this._socket.send(JSON.stringify(data));
        this._socketDatas.set(data.action, data);
    }

}
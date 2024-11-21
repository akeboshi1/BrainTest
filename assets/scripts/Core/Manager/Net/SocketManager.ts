import {BaseManager} from "../BaseManager";
import { DebugLog } from "../../Util/DebugLog";
import {EventManager} from "../Event/EventManager";
import {SocketData} from "../../../Core/Manager/Net/SocketData";
import {TimeUtil} from "db://assets/scripts/Core/Util/TimeUtil";

export class SocketManager extends BaseManager{
    private static _instance: SocketManager;
    public static SOCKET_ON:string = "socket_on";
    public static SOCKET_OFF:string = "socket_off";
    public static SOCKET_ONMESSAGE:string = "socket_onmessage";
    public static SOCKET_ONERROR:string = "socket_onerror";
    private _socket: WebSocket;

    private _socketDatas:Map<string,SocketData[]>;
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

    initSocket(url:string = null):void {
       if(this._socket!=null){
           DebugLog.instance.error("socket已初始化");
           return;
       }
        // 初始化socket
       if(url == null) url = "wss://test.paipai2.xinjiaxianglao.com/api/home";
       DebugLog.instance.log("socket init");
       this._socket=new WebSocket(url);
       this._socket.onopen = ()=>{
           EventManager.getInstance().emit(SocketManager.SOCKET_ON);
       };
       this._socket.onclose = ()=>{
           EventManager.getInstance().emit(SocketManager.SOCKET_OFF);
       };
       this._socket.onmessage = (data) => {
           let jsonObj = JSON.parse(data.data);
           const action = jsonObj.action;
           const _tmpDatas = this._socketDatas.get(action);
           if(!_tmpDatas){
               DebugLog.instance.error(`${action} is not in data`);
               return;
           }
           // check uid
           const uid = jsonObj['uid'];
           // 创建一个新的数组，用于存储需要保留的元素
           let updatedDatas = [];
           let tmpSocketData = null;
           for (let i:number = 0;i<_tmpDatas.length;i++){
               let socketData:SocketData = _tmpDatas[i];
               if(socketData.uid == uid){
                   tmpSocketData = socketData;
               }else{
                   updatedDatas.push(socketData);
               }
           }
           this._socketDatas.set(action,updatedDatas);
           if(tmpSocketData){
               DebugLog.instance.log(`接收：${data.data}`)
               EventManager.getInstance().emit(jsonObj["action"], jsonObj);
           }
       };
       this._socket.onerror = (err) => {
           EventManager.getInstance().emit(SocketManager.SOCKET_ONERROR, err);
       };
    }

    public send(data:SocketData){
        let _tmpDatas:SocketData[]= this._socketDatas.get(data.action);
        if(!_tmpDatas){
            _tmpDatas = [];
        }
        for(let i=0; i<_tmpDatas.length; i++){
            let _tmpData:SocketData = _tmpDatas[i];
            if(_tmpData.uid == data.uid){
                DebugLog.instance.log(`${data.action},已经发送过了，请等待回复`);
                return;
            }
        }
        _tmpDatas.push(data);
        const jsonStr = JSON.stringify(data);
        this._socket.send(jsonStr);
        DebugLog.instance.log(`发送：${jsonStr}`);
        this._socketDatas.set(data.action, _tmpDatas);
    }

}
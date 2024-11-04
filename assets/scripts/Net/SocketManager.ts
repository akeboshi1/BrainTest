import {DebugLog} from "db://assets/scripts/Util/DebugLog";

export class SocketManager {
    private static _instance: SocketManager;
    private _socket: WebSocket;
    public getInstance():SocketManager {
        if(!SocketManager._instance) {
            SocketManager._instance = new SocketManager();
        }
        return SocketManager._instance;
    }

    public constructor() {

    }

    public initSocket(url:string):void {
       if(this._socket!=null){
           DebugLog.instance.error("socket已初始化");
           return;
       }
       this._socket=new WebSocket(url);
       this._socket.onopen = ()=>{

       };
       this._socket.onclose = ()=>{

       };
       this._socket.onmessage = (data) => {

       }
       this._socket.onerror = (err) => {
           DebugLog.instance.error(err);
       }
    }

    public send(data){
       this._socket.send(JSON.stringify(data));
    }

}
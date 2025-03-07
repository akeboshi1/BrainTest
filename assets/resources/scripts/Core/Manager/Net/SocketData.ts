import {TimeUtil} from "../../../Core/Util/TimeUtil";
import {Global} from "../../../Core/Manager/Config/Global";
import {SocketManager} from "db://assets/resources/scripts/Core/Manager/Net/SocketManager";

export enum SocketDataStatus{
    None,
    request,
    complete
}

/**
 * socket数据data
 */
export class SocketData {

    public uid:string;

    public action:string;

    public token:string;

    public status:number = 0; // 0失败 1成功

    public message:string;

    /**
     * 是否是流式数据
     */
    public isStream:boolean = false;

    /**
     * 当前数据，如果是流式得数据，则data是最新收到得流式样数据
     */
    public data:any;

    /**
     * socket数据请求状态
     */
    public netStatus:number = SocketDataStatus.None;


    constructor(data:any) {
        this.action = data.action;
        this.data = data.data;
        //==== 通用数据默认处理
        this.uid = data.uid||TimeUtil.getNow();
        this.token = Global.userData.token;
    }

    refreshData(data:any){
        //==== 独立数据
        this.action = data.action;
        this.data = data.data;
    }



}
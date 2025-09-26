import {TimeUtil} from "../../../Core/Util/TimeUtil";
import {Global} from "../../../Core/Manager/Config/Global";
import {SocketManager} from "db://assets/resources/scripts/Core/Manager/Net/SocketManager";
import {AlertManager, AlertData } from "../../../Core/Manager/Alert/AlertManager";
import {LoginManager} from "db://assets/resources/scripts/Core/Manager/LoginManager/LoginManager";

/**
 * SocketData使用示例：
 * 
 * // 普通请求
 * const normalData = new SocketData({
 *     action: "login",
 *     data: { username: "test", password: "123456" }
 * });
 * 
 * // 跳过防抖的请求
 * const skipDebounceData = new SocketData({
 *     action: "heartbeat",
 *     data: { timestamp: Date.now() },
 *     skipDebounce: true
 * });
 * 
 * SocketManager.getInstance().send(normalData);
 * SocketManager.getInstance().send(skipDebounceData);
 */

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
     * 当前数据，如果是流式得数据，则data是最新收到得流式样数据
     */
    public data:any;

    /**
     * socket数据请求状态
     */
    public netStatus:number = SocketDataStatus.None;

    /**
     * 是否跳过防抖处理（废弃了，暂时不删除）
     */
    public skipDebounce:boolean = false;

    constructor(data:any) {
        this.action = data.action;
        this.data = data.data;
        //==== 通用数据默认处理
        this.uid = data.uid||TimeUtil.getNow();
        this.token = Global.userData.token;
        this.skipDebounce = data.skipDebounce || false;
    }

}
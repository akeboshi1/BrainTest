import {TimeUtil} from "../../../Core/Util/TimeUtil";
import {Global} from "../../../Core/Manager/Config/Global";
import {SocketManager} from "db://assets/resources/scripts/Core/Manager/Net/SocketManager";
import AlertManager, { AlertData } from "../../../Core/Manager/Alert/AlertManager";
import { LocalStorageUtil } from "../../../Core/Util/LocalStorageUtil";
import { SceneManager } from "../../../Core/Manager/Scene/SceneManager";
import { BundleName } from "../../../Core/Manager/Load/BundleName";

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

    /**
     * 最大重试次数
     */
    private readonly MAX_RETRY_COUNT: number = 3;

    /**
     * 超时时间(毫秒)
     */
    private readonly TIMEOUT: number = 3000;

    /**
     * 当前重试次数
     */
    private _currentRetryCount: number = 0;

    /**
     * 发送时间
     */
    private _sendTime: number = 0;

    /**
     * 是否已过期
     */
    private _isExpired: boolean = false;

    constructor(data:any) {
        this.action = data.action;
        this.data = data.data;
        //==== 通用数据默认处理
        this.uid = data.uid||TimeUtil.getNow();
        this.token = Global.userData.token;
    }

    /**
     * 记录发送时间
     */
    public recordSendTime(): void {
        this._sendTime = Date.now();
        this._isExpired = false;
    }

    /**
     * 检查是否超时
     */
    public isTimeout(): boolean {
        if (this._isExpired) return true;

        const currentTime = Date.now();
        const elapsed = currentTime - this._sendTime;

        if (elapsed >= this.TIMEOUT) {
            this._isExpired = true;
            return true;
        }

        return false;
    }

    /**
     * 检查是否需要重试
     * @returns boolean 是否需要重试
     */
    public needRetry():boolean {
        if (this._currentRetryCount >= this.MAX_RETRY_COUNT) {
            this.handleMaxRetriesReached();
            return false;
        }

        return this.isTimeout();
    }

    /**
     * 处理达到最大重试次数的情况
     */
    private handleMaxRetriesReached(): void {
        const alertData: AlertData = new AlertData();
        alertData.message = '网络遇到问题，请重新登录';
        alertData.confirmCb = () => {
            this.cleanup();
            // 清理本地存储
            LocalStorageUtil.clean();
            // 切换到登录场景
            SceneManager.getInstance().changeScene(BundleName.MAIN, "start").then(() => {
                console.log('已切换到登录场景');
            });
        };
        AlertManager.getInstance().showAlert(alertData);
    }

    /**
     * 清理所有状态和计时器
     */
    public cleanup(): void {
        // 重置所有状态
        this._currentRetryCount = 0;
        this._sendTime = 0;
        this._isExpired = false;
        this.netStatus = SocketDataStatus.None;

        // 清理数据
        this.data = null;
        this.message = null;
        this.status = 0;
        this.isStream = false;

        // 从SocketManager中移除这个数据
        SocketManager.getInstance().removeSocketData(this);
    }

    /**
     * 增加重试次数
     */
    public incrementRetryCount(): void {
        this._currentRetryCount++;
        this._isExpired = false;
    }

    /**
     * 重置重试状态
     */
    public resetRetry():void {
        this._currentRetryCount = 0;
        this._isExpired = false;
    }

    /**
     * 获取当前重试次数
     */
    public getCurrentRetryCount():number {
        return this._currentRetryCount;
    }

    /**
     * 获取剩余重试次数
     */
    public getRemainingRetryCount():number {
        return this.MAX_RETRY_COUNT - this._currentRetryCount;
    }

    /**
     * 获取剩余超时时间(毫秒)
     */
    public getRemainingTimeout(): number {
        if (this._isExpired) return 0;
        const currentTime = Date.now();
        const elapsed = currentTime - this._sendTime;
        return Math.max(0, this.TIMEOUT - elapsed);
    }

    refreshData(data:any){
        //==== 独立数据
        this.action = data.action;
        this.data = data.data;
    }
}
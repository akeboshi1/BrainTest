import { BaseManager } from "../BaseManager";
import { DebugLog } from "../../Util/DebugLog";
import { EventManager } from "../Event/EventManager";
import { SocketData, SocketDataStatus } from "../../../Core/Manager/Net/SocketData";
import { UIManager } from "../UI/UIManager";
import { LoginManager } from "../LoginManager/LoginManager";
import { ReconnectPanel } from "../../../Game/UI/Login/ReconnectPanel";
import { BundleName } from "../Load/BundleName";
import { LayerUtil } from "../../Util/LayerUtil";
import AlertManager, { AlertData } from "../Alert/AlertManager";
import { LocalStorageUtil } from "../../Util/LocalStorageUtil";
import { SceneManager } from "../Scene/SceneManager";

export class SocketManager extends BaseManager {
    private static _instance: SocketManager;
    public static SOCKET_ON: string = "socket_on";
    public static SOCKET_OFF: string = "socket_off";
    public static SOCKET_ONMESSAGE: string = "socket_onmessage";
    public static SOCKET_ONERROR: string = "socket_onerror";

    private _socket: WebSocket;
    private _reconnectInterval: number = 5; // 重连尝试间隔，单位秒
    private _reconnectMaxCount: number = 5; // 重连最大尝试次数
    private _isReconnecting: boolean = false;
    private api_url: string = "";
    private _socketDatas: Map<string, SocketData[]>;
    private _retryTimer: NodeJS.Timeout | null = null;

    public static getInstance(): SocketManager {
        if (!SocketManager._instance) {
            SocketManager._instance = new SocketManager();
            SocketManager._instance.init();
        }
        return SocketManager._instance;
    }

    init() {
        this._socketDatas = new Map();
        this.startRetryCheck();
    }

    update() {
        // 检查重试
        this.checkRetry();
    }

    destroy() {
        if (this._retryTimer) {
            clearInterval(this._retryTimer);
        }
        this._socket.close();
    }

    private startRetryCheck() {
        // 每秒检查一次需要重试的请求
        this._retryTimer = setInterval(() => {
            this.checkRetry();
        }, 1000);
    }

    private checkRetry() {
        if (!this._socket || this._socket.readyState !== WebSocket.OPEN) {
            return;
        }

        this._socketDatas.forEach((datas, action) => {
            datas.forEach((socketData: SocketData) => {
                if (socketData.netStatus === SocketDataStatus.request && socketData.needRetry()) {
                    this.resendSocketData(socketData);
                    DebugLog.instance.error(`重试请求: ${action}, 当前重试次数: ${socketData.getCurrentRetryCount()}, 剩余超时时间: ${socketData.getRemainingTimeout()}ms`);
                }
            });
        });
    }

    private resendSocketData(socketData: SocketData) {
        if (socketData.getCurrentRetryCount() >= 3) {
            DebugLog.instance.error(`请求 ${socketData.action} 重试次数已达上限`);
            const alertData: AlertData = new AlertData();
            alertData.message = '服务器响应超时，请稍后重试';
            AlertManager.getInstance().showAlert(alertData);
            return;
        }

        socketData.incrementRetryCount(); // 增加重试次数
        const jsonStr = JSON.stringify(socketData);
        this._socket.send(jsonStr);
        DebugLog.instance.error(`重试发送：${jsonStr}`);
    }

    private onSocketMessage(data) {
        let jsonObj = JSON.parse(data.data);
        const action = jsonObj.action;
        let updatedDatas = [];
        let tmpSocketData: SocketData = null;

        // 服务的主动推送数据 action = event
        if (action == "event") {
            let streamstatus = -1;
            if (jsonObj.hasOwnProperty('finish_reason')) {
                streamstatus = jsonObj['finish_reason'] || 0;
            }
            tmpSocketData = new SocketData({ action: action, uid: jsonObj.uid, data: jsonObj.data });
            tmpSocketData.netStatus = SocketDataStatus.complete;
            if (streamstatus != null) {
                tmpSocketData.isStream = true;
                if (streamstatus != 1) {
                    updatedDatas.push(tmpSocketData);
                }
            } else {
                updatedDatas.push(tmpSocketData);
            }
        } else {
            const _tmpDatas = this._socketDatas.get(action);
            if (!_tmpDatas) {
                DebugLog.instance.error(`${action} is not in data`);
                return;
            }

            const uid = jsonObj['uid'];
            let streamstatus = -1;
            if (jsonObj.hasOwnProperty('finish_reason')) {
                streamstatus = jsonObj['finish_reason'] || 0;
            }

            for (let i: number = 0; i < _tmpDatas.length; i++) {
                let socketData: SocketData = _tmpDatas[i];
                if (socketData.uid == uid) {
                    tmpSocketData = socketData;
                    tmpSocketData.netStatus = SocketDataStatus.complete;
                    tmpSocketData.resetRetry(); // 重置重试状态
                    if (streamstatus != null) {
                        tmpSocketData.isStream = true;
                        if (streamstatus != 1) {
                            updatedDatas.push(tmpSocketData);
                        }
                    }
                } else {
                    updatedDatas.push(socketData);
                }
            }
        }

        this._socketDatas.set(action, updatedDatas);
        if (tmpSocketData) {
            DebugLog.instance.log(`接收：${data.data}`);
            EventManager.getInstance().emit(jsonObj["action"], jsonObj);
        }
    }

    async connectSocket(url: string = null): Promise<WebSocket> {
        return new Promise<WebSocket>((resolve, reject) => {
            DebugLog.instance.log("socket init");
            let socket = new WebSocket(url);
            socket.onopen = () => {
                resolve(socket);
            };
            socket.onclose = () => {
                reject();
            };
        });
    }

    async initSocket(url: string = null): Promise<void> {
        if (this._socket != null) {
            this._socket = null;
        }

        if(url != null){
            this.api_url = url;
        }

        if(this.api_url == null){
            DebugLog.instance.error("set socket url first!");
            return;
        }

        let socket = await this.connectSocket(this.api_url);
        return new Promise<void>((resolve, reject) => {
            if (socket) {
                this._socket = socket;
                this._socket.onmessage = this.onSocketMessage.bind(this);
                this._socket.onerror = this.onSocketError.bind(this);
                this._socket.onclose = this.onSocketClose.bind(this);
                this._socket.onopen = null;
                resolve();
            } else {
                reject();
            }
        });
    }

    private onSocketClose() {
        DebugLog.instance.log('Socket is closed : start reconnect !');
        this.processReconnectFlow();
    }

    private onSocketError(wb: WebSocket, ev: Event) {
        DebugLog.instance.warn('onSocketError !');
    }

    //重连成功返回true
    async processReconnectFlow(): Promise<boolean> {
        if (this._isReconnecting) return;
        this._isReconnecting = true;

        UIManager.getInstance().registerPanel(ReconnectPanel.NAME, BundleName.RESOURCES, "prefab/Common/ReconnectPanel", ReconnectPanel);

        let eventName: string = 'Socket.reconnectCountChange';

        await UIManager.getInstance().showPanel(ReconnectPanel.NAME, { eventName }, false);

        for (let attempt = 1; attempt <= this._reconnectMaxCount; attempt++) {
            EventManager.getInstance().emit(eventName);
            try {
                await this.initSocket();
                DebugLog.instance.log('Reconnected successfully.');

                await new Promise<void>((resolve) => {
                    LoginManager.getInstance().requestTokenVerification((result) => {
                        if (!result) {
                            //回退到主界面
                            LocalStorageUtil.clean();

                            SceneManager.getInstance().changeScene(BundleName.MAIN, "start").then(() => {
                                DebugLog.instance.log(`start场景切换成功`);
                            });
                        }

                        UIManager.getInstance().hidePanel(ReconnectPanel.NAME);

                        resolve();
                    });
                });

                this._isReconnecting = false;
                return true;
            } catch (error) {
                DebugLog.instance.warn(`Reconnect attempt ${attempt} failed:`, error);
                if (attempt < this._reconnectMaxCount) {
                    let ispanelActive = UIManager.getInstance().isPanelActive(ReconnectPanel.NAME);
                    if(!ispanelActive){
                        await UIManager.getInstance().showPanel(ReconnectPanel.NAME, { eventName }, false);
                    }

                    await new Promise<void>((resolve) => {
                        const timer = setTimeout(() => {
                            clearTimeout(timer);
                            resolve();
                        }, this._reconnectInterval * 1000);
                    });
                }
            }
        }

        DebugLog.instance.error('Reached maximum reconnect attempts. Giving up.');

        UIManager.getInstance().hidePanel(ReconnectPanel.NAME);

        const alertData: AlertData = new AlertData();
        alertData.message = '重连失败，请检查设备的网络链接。';
        AlertManager.getInstance().showAlert(alertData);

        this._isReconnecting = false;
        return false;
    }

    public send(data: SocketData) {
        if (!this._socket || this._socket.readyState != this._socket.OPEN) {
            DebugLog.instance.warn('socket state is error! can not send message!');
            this.processReconnectFlow();
            return;
        }

        let _tmpDatas: SocketData[] = this._socketDatas.get(data.action);
        if (!_tmpDatas) {
            _tmpDatas = [];
        }

        for (let i = 0; i < _tmpDatas.length; i++) {
            let _tmpData: SocketData = _tmpDatas[i];
            if (_tmpData.uid == data.uid || Number(data.uid) - Number(_tmpData.uid) <= 200) {
                DebugLog.instance.error(`${data.action},已经发送过了，请等待回复`);
                return;
            }
        }

        _tmpDatas.push(data);
        const jsonStr = JSON.stringify(data);
        DebugLog.instance.log(data);
        this._socket.send(jsonStr);
        data.netStatus = SocketDataStatus.request;
        data.recordSendTime(); // 记录发送时间
        DebugLog.instance.log(`发送：${jsonStr}`);
        this._socketDatas.set(data.action, _tmpDatas);
    }

    /**
     * 移除指定的SocketData
     * @param socketData 要移除的SocketData
     */
    public removeSocketData(socketData: SocketData): void {
        const datas = this._socketDatas.get(socketData.action);
        if (datas) {
            const index = datas.findIndex(data => data.uid === socketData.uid);
            if (index !== -1) {
                datas.splice(index, 1);
                if (datas.length === 0) {
                    this._socketDatas.delete(socketData.action);
                }
            }
        }
    }
}
import { BaseManager } from "../BaseManager";
import { DebugLog } from "../../Util/DebugLog";
import { EventManager } from "../Event/EventManager";
import { SocketData, SocketDataStatus } from "../../../Core/Manager/Net/SocketData";
import { UIManager } from "../UI/UIManager";
import { LoginErrorCode, LoginManager } from "../LoginManager/LoginManager";
import { ReconnectPanel } from "../../../Game/UI/Login/ReconnectPanel";
import { BundleName } from "../Load/BundleName";
import { AlertManager, AlertData } from "../Alert/AlertManager";
import { Prefab, resources, Node, instantiate, Label, UITransform } from "cc";
import { SwitchLoginPanel } from "../../../Game/UI/Login/SwitchLoginPanel";
import { SocketUtil } from "./SocketUtil";
import { LayerUtil } from "../../Util/LayerUtil";
import { ScreenSizeUtil } from "../../../Adapter/ScreenSizeUtil";

export class SocketManager extends BaseManager {
    private static _instance: SocketManager;

    private _socket: WebSocket;
    private _reconnectInterval: number = 5; // 重连尝试间隔，单位秒
    private _reconnectMaxCount: number = 5; // 重连最大尝试次数
    private _isReconnecting: boolean = false;
    private api_url: string = "";

    // 重构后的数据结构
    private _processingSocketData: SocketData | null = null; // 当前正在处理的消息
    private _pendingSocketDatas: SocketData[] = []; // 待处理的消息队列
    private _reconnectPanel: Prefab = null;
    private _socketScreenLockerPrefab: Prefab = null;
    public static SCREEN_LOCKER_PREFAB_PATH: string = "prefab/Common/SocketScreenLocker";

    private _socketProcessingTimeout: number = 6;// 消息处理超时时间，单位秒
    private _processingTimeoutTimer: NodeJS.Timeout | null = null; // 消息处理超时定时器

    // ScreenLocker 相关属性
    private _socketScreenLockerNode: Node = null;

    public static getInstance(): SocketManager {
        if (!SocketManager._instance) {
            SocketManager._instance = new SocketManager();
            SocketManager._instance.init();
        }
        return SocketManager._instance;
    }

    init() {
        this._processingSocketData = null;
        this._pendingSocketDatas = [];
        this._processingTimeoutTimer = null;
        this._socketScreenLockerNode = null;

        // 注册重连面板 并且预加载
        UIManager.getInstance().registerPanel(ReconnectPanel.NAME, BundleName.RESOURCES, "prefab/Common/ReconnectPanel", ReconnectPanel);
        resources.load("prefab/Common/ReconnectPanel", Prefab, (err, prefab: Prefab) => {
            if (err) {
                DebugLog.instance.error('Prefab load error , url:' + "prefab/Common/ReconnectPanel");
            } else {
                this._reconnectPanel = prefab;
            }
        });

        resources.load(SocketManager.SCREEN_LOCKER_PREFAB_PATH, Prefab, null, (err: Error, prefab: Prefab) => {
            if (err) {
                DebugLog.instance.error('Prefab load error , url:' + SocketManager.SCREEN_LOCKER_PREFAB_PATH);
            } else {
                this._socketScreenLockerPrefab = prefab;
            }
        });
    }

    cleanSocketDatas() {
        this._processingSocketData = null;
        this._pendingSocketDatas = [];
        this.clearProcessingTimeout();
        this.closeSocketScreenLocker();
    }


    destroy() {
        //不会被调用
    }

    /**
     * 开始消息处理超时计时
     */
    private startProcessingTimeout(): void {
        this.clearProcessingTimeout(); // 先清除之前的定时器

        this._processingTimeoutTimer = setTimeout(() => {
            DebugLog.instance.error(`消息处理超时: ${this._processingSocketData?.action}, uid: ${this._processingSocketData?.uid}`);
            this.handleProcessingTimeout();
        }, this._socketProcessingTimeout * 1000);
    }

    /**
     * 清除消息处理超时计时
     */
    private clearProcessingTimeout(): void {
        if (this._processingTimeoutTimer) {
            clearTimeout(this._processingTimeoutTimer);
            this._processingTimeoutTimer = null;
        }
    }

    /**
     * 处理消息超时
     */
    private handleProcessingTimeout(): void {
        if (this._processingSocketData) {
            DebugLog.instance.error(`消息处理超时，清空处理中的消息: ${this._processingSocketData.action}, uid: ${this._processingSocketData.uid}`);

            this._processingSocketData.refreshUid();
            // 关闭 ScreenLocker
            this.closeSocketScreenLocker();

            const alertData: AlertData = new AlertData();
            alertData.message = "网络状况差，请检查网络环境";
            alertData.confirmButtonText = "重试";
            alertData.confirmCb = () => {
                this.sendMessageToSocket(this._processingSocketData);
            };
            AlertManager.getInstance().showAlert(alertData);
        }
    }

    private onSocketMessage(data) {
        const jsonObj = JSON.parse(data.data);
        const action = jsonObj.action;
        const isEventMessage = action === "event";

        let socketData: SocketData = null;

        if (isEventMessage) {
            // 处理服务端主动推送的事件消息
            socketData = this.handleEventMessage(jsonObj);
        } else {
            // 处理请求响应消息
            socketData = this.handleResponseMessage(jsonObj);
        }

        if (socketData) {
            this.processSocketData(socketData, jsonObj);
        }
    }


    /**
     * 处理事件消息（服务端主动推送）
     * @param jsonObj 消息对象
     * @returns 处理后的SocketData
     */
    private handleEventMessage(jsonObj: any): SocketData {
        const socketData = new SocketData({
            action: jsonObj.action,
            uid: jsonObj.uid,
            data: jsonObj.data
        });
        socketData.netStatus = SocketDataStatus.complete;

        return socketData;
    }

    /**
     * 处理响应消息（请求的回复）
     * @param jsonObj 消息对象
     * @returns 处理后的SocketData
     */
    private handleResponseMessage(jsonObj: any): SocketData {
        const uid = jsonObj.uid;

        // 检查是否是当前正在处理的消息的回复
        if (!this._processingSocketData || this._processingSocketData.uid !== uid) {
            DebugLog.instance.error(`No matching processing request found for uid: ${uid}`);
            return null;
        }

        const socketData = this._processingSocketData;
        socketData.netStatus = SocketDataStatus.complete;

        // 清除超时计时
        this.clearProcessingTimeout();

        // 处理完成后，开始处理下一个待处理的消息
        this.processNextPendingMessage();

        return socketData;
    }


    /**
     * 处理SocketData的后续逻辑
     * @param socketData 处理后的SocketData
     * @param jsonObj 原始消息对象
     */
    private processSocketData(socketData: SocketData, jsonObj: any): void {
        // 处理登录错误
        this.handleLoginErrors(jsonObj);

        // 记录日志并发送事件
        DebugLog.instance.log(`接收：${JSON.stringify(jsonObj)}`);
        EventManager.getInstance().emit(jsonObj.action, jsonObj);
    }

    /**
     * 处理登录相关错误
     * @param jsonObj 消息对象
     */
    private handleLoginErrors(jsonObj: any): void {
        if (jsonObj.status === 0 && jsonObj.error && LoginErrorCode[jsonObj.error]) {
            const errorCode = LoginErrorCode[jsonObj.error];
            if (errorCode === LoginErrorCode.INVALID_TOKEN || errorCode === LoginErrorCode.USER_NOT_FOUND) {
                const alertData: AlertData = new AlertData();
                alertData.message = errorCode;
                alertData.confirmCb = () => {
                    LoginManager.getInstance().loginout(() => {
                        UIManager.getInstance().showPanel(SwitchLoginPanel.NAME);
                    });
                };
                AlertManager.getInstance().showAlert(alertData);
            }
        }
    }

    /**
     * 处理下一个待处理的消息
     */
    private processNextPendingMessage(): void {
        // 清空当前正在处理的消息
        this._processingSocketData = null;

        // 如果还有待处理的消息，取出第一个进行处理
        if (this._pendingSocketDatas.length > 0) {
            const nextMessage = this._pendingSocketDatas.shift();
            this._processingSocketData = nextMessage;
            
            this.sendMessageToSocket(nextMessage);
        } else {
            // 所有消息都处理完了，关闭 ScreenLocker
            this.closeSocketScreenLocker();
        }
    }

    /**
     * 打开 Socket ScreenLocker
     */
    private openSocketScreenLocker(): void {
        // 防止重复调用
        if (this._socketScreenLockerNode != null) {
            DebugLog.instance.log("SocketScreenLocker 已经存在，跳过创建");
            return;
        }

        if (!this._socketScreenLockerPrefab) {
            DebugLog.instance.warn("SocketScreenLocker.prefab 没有正确加载");
            return;
        }

        let sl = instantiate(this._socketScreenLockerPrefab);

        // 设置屏幕适配尺寸
        const screenSize = ScreenSizeUtil.getUISize();
        const slTransform = sl.getComponent(UITransform);
        if (slTransform && screenSize) {
            slTransform.setContentSize(screenSize.width, screenSize.height);
        }

        let parent = LayerUtil.getLoaderLayer();
        if (!parent) {
            DebugLog.instance.error('get LoaderLayer failed');
            return;
        } else {
            parent.addChild(sl);
        }

        this._socketScreenLockerNode = sl;
        DebugLog.instance.log("SocketScreenLocker 已创建");
    }

    /**
     * 关闭 Socket ScreenLocker
     */
    private closeSocketScreenLocker(): void {
        if (this._socketScreenLockerNode) {
            this._socketScreenLockerNode.removeFromParent();
            this._socketScreenLockerNode = null;
            DebugLog.instance.log("SocketScreenLocker 已关闭");
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

        if (url != null) {
            this.api_url = url;
        }

        if (this.api_url == null) {
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
        DebugLog.instance.error("网络断开：", SocketUtil.getInstance().socketType);
        this.clearProcessingTimeout(); // 断开连接时取消计时
        this.processReconnectFlow();
    }

    private onSocketError(wb: WebSocket, ev: Event) {
        DebugLog.instance.error('onSocketError !');
        DebugLog.instance.error("网络错误：", SocketUtil.getInstance().socketType);
        this.clearProcessingTimeout(); // 连接错误时取消计时
        this.processReconnectFlow();
    }

    //重连成功返回true
    async processReconnectFlow(): Promise<boolean> {
        this.closeSocketScreenLocker();

        if (this._isReconnecting) return;
        this._isReconnecting = true;

        let eventName: string = 'Socket.reconnectCountChange';

        await UIManager.getInstance().showPanel(ReconnectPanel.NAME, { eventName }, false);

        DebugLog.instance.error("网络重连：", SocketUtil.getInstance().socketType);

        for (let attempt = 1; attempt <= this._reconnectMaxCount; attempt++) {
            EventManager.getInstance().emit(eventName);
            try {
                await this.initSocket();
                DebugLog.instance.error('Reconnected successfully.');

                // 重连成功后，如果有正在处理的消息，重新发送
                if (this._processingSocketData) {
                    DebugLog.instance.log(`重连成功，重新发送处理中的消息: ${this._processingSocketData.action}, uid: ${this._processingSocketData.uid}`);
                    this.sendMessageToSocket(this._processingSocketData); // sendMessageToSocket 会自动开始超时计时
                }

                UIManager.getInstance().hidePanel(ReconnectPanel.NAME);
                this._isReconnecting = false;
                return true;
            } catch (error) {
                DebugLog.instance.warn(`Reconnect attempt ${attempt} failed:`, error);
                if (attempt < this._reconnectMaxCount) {
                    let ispanelActive = UIManager.getInstance().isPanelActive(ReconnectPanel.NAME);
                    if (!ispanelActive) {
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

        this._isReconnecting = false;
        this.showReconnectFailedAlert();
        return false;
    }


    public send(data: SocketData) {
        if (!this._socket || this._socket.readyState != this._socket.OPEN) {
            DebugLog.instance.warn('socket state is error! can not send message!');
            return;
        }

        // 如果当前有正在处理的消息，检查是否需要防止重复
        if (this._processingSocketData) {
            // 如果新消息的 action 与正在处理的消息的 action 一致，则拒绝发送
            if (this._processingSocketData.action === data.action) {
                DebugLog.instance.warn(`消息被拒绝：action "${data.action}" 正在处理中，请等待回复后再发送`);
                return;
            }

            // 检查待处理队列中是否已有相同 action 的消息
            const hasSameActionInQueue = this._pendingSocketDatas.some(pendingData => pendingData.action === data.action);
            if (hasSameActionInQueue) {
                DebugLog.instance.warn(`消息被拒绝：action "${data.action}" 已在待处理队列中`);
                return;
            }

            // 将新消息加入待处理队列
            this._pendingSocketDatas.push(data);
            DebugLog.instance.log(`消息已加入待处理队列: ${data.action}, uid: ${data.uid}, 队列长度: ${this._pendingSocketDatas.length}`);
            return;
        }

        // 如果没有正在处理的消息，直接发送
        this._processingSocketData = data;
        this.sendMessageToSocket(data);
    }

    /**
     * 发送消息到Socket
     * @param data SocketData对象
     */
    private sendMessageToSocket(data: SocketData): void {
        const jsonStr = JSON.stringify(data);
        DebugLog.instance.log(data);
        this._socket.send(jsonStr);
        data.netStatus = SocketDataStatus.request;
        DebugLog.instance.log(`发送：${jsonStr}`);

        // 开始处理消息时打开 ScreenLocker
        if (data.needTouchMask) {
            this.openSocketScreenLocker(); 
        }
        // 开始消息处理超时计时
        if (data.needTimeout) {
            this.startProcessingTimeout();
        }
    }

    /**
     * 显示重连失败弹窗，提供退出和重连选项
     */
    private async showReconnectFailedAlert(): Promise<void> {
        return new Promise<void>((resolve) => {
            const alertData = {
                title: "连接失败",
                message: "网络连接失败，请检查网络设置后重试",
                messageFontColor: "#FFFFFF",
                confirmButtonText: "重连",
                cancelButtonText: "退出",
                cancelButtonVisible: false, // 隐藏退出按钮
                guideButtonVisible: false,
                closeBtnVisible: false,
                guideButtonText: '玩法介绍',
                x: 0,
                y: 0,
                confirmCb: async () => {
                    // 用户选择重连，继续尝试重连
                    DebugLog.instance.log("用户选择重连，继续尝试重连");
                    resolve();
                    // 重新开始重连流程
                    SocketManager.getInstance().processReconnectFlow();
                },
                cancelCb: null,
                contentClickCb: null,
                guideCallBack: null
            };

            AlertManager.getInstance().showAlert(alertData as any);
        });
    }
}
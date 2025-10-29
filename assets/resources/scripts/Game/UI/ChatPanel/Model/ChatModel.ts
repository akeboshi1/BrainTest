
import { director, native, sys } from "cc";
import { EventManager } from "../../../../Core/Manager/Event/EventManager";
import { DebugLog } from "../../../../Core/Util/DebugLog";
import { NativeEventManager } from "../../../../Core/Manager/Event/NativeEventManager";
import { NativeEvent } from "../../../../Core/Manager/Event/NativeEvent";
import { DataProvider } from "../../../../Core/Data/DataProvider";
import { ChatCharacter, ChatProtocol, ChatSkin } from "./ChatProtocol";
import { SocketManager } from "../../../../Core/Manager/Net/SocketManager";
import { SocketData } from "../../../../Core/Manager/Net/SocketData";

// 字幕列表DataProvider（需要特殊方法，保留子类）
export class SubtitleListDataProvider extends DataProvider<SubtitleItem[]> {
    constructor() {
        super();
        this.data = [];
    }

    public addSubtitle(text: string, speaker: 'user' | 'assistant'): void {
        const subtitle: SubtitleItem = {
            id: Date.now().toString(),
            text: text,
            timestamp: Date.now(),
            speaker: speaker
        };

        const currentList = this.data || [];
        const newList = [...currentList, subtitle];

        // 限制字幕缓存数量，避免内存过多占用
        if (newList.length > 100) {
            newList.shift();
        }

        this.data = newList;
    }

    public clearSubtitles(): void {
        this.data = [];
    }

    public removeSubtitle(id: string): void {
        const currentList = this.data || [];
        const newList = currentList.filter(item => item.id !== id);
        this.data = newList;
    }
}

// 聊天连接状态枚举
export enum ChatConnectionState {
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected'
}

// 麦克风状态枚举
export enum MicrophoneState {
    CLOSED = 'closed',
    OPEN = 'open',
    PENDING = 'pending'
}

// 休眠状态枚举
export enum SleepState {
    AWAKE = 'awake',
    SLEEPING = 'sleeping'
}

// AI说话状态枚举
export enum AISpeakingState {
    IDLE = 'idle',
    SPEAKING = 'speaking',
    FINISHED = 'finished'
}

// 字幕缓存项接口
export interface SubtitleItem {
    id: string;
    text: string;
    timestamp: number;
    speaker: 'user' | 'assistant';
}

export class ChatModel {
    private static _instance: ChatModel;

    public static getInstance(): ChatModel {
        if (!ChatModel._instance) {
            ChatModel._instance = new ChatModel();
        }
        return ChatModel._instance;
    }

    // 独立的DataProvider实例
    public readonly premissionProvider: DataProvider<boolean>;
    public readonly connectionStateProvider: DataProvider<ChatConnectionState>;
    public readonly microphoneStateProvider: DataProvider<MicrophoneState>;
    public readonly sleepStateProvider: DataProvider<SleepState>;
    public readonly aiSpeakingStateProvider: DataProvider<AISpeakingState>;
    public readonly subtitleListProvider: SubtitleListDataProvider;

    public readonly charactorListProvider: DataProvider<Map<number, ChatCharacter>>;
    public readonly charactorChoosenSkin: DataProvider<string>;

    // 用户消息暂存
    private _pendingUserMessage: string | null = null;

    private _defaultCharactorId: number = 1;
    private _defaultCharactorSkin: number = 1;
    private _selectedCharactorId: number = 0;
    private _selectedCharactorSkin: number = 0;

    public get selectedCharactorId(): number {
        return this._selectedCharactorId;
    }
    public get selectedCharactorSkin(): number {
        return this._selectedCharactorSkin;
    }

    constructor() {
        // 初始化各个DataProvider
        this.premissionProvider = new DataProvider<boolean>();
        this.premissionProvider.data = false;

        this.connectionStateProvider = new DataProvider<ChatConnectionState>();
        this.connectionStateProvider.data = ChatConnectionState.DISCONNECTED;

        this.microphoneStateProvider = new DataProvider<MicrophoneState>();
        this.microphoneStateProvider.data = MicrophoneState.CLOSED;

        this.sleepStateProvider = new DataProvider<SleepState>();
        this.sleepStateProvider.data = SleepState.AWAKE;

        this.aiSpeakingStateProvider = new DataProvider<AISpeakingState>();
        this.aiSpeakingStateProvider.data = AISpeakingState.IDLE;

        this.subtitleListProvider = new SubtitleListDataProvider();

        this.charactorListProvider = new DataProvider<Map<number, ChatCharacter>>();
        this.charactorChoosenSkin = new DataProvider<string>();
    }

    private initFlag = false;

    init() {
        if (!this.initFlag) {
            this.initNativeEventListeners();
            this.initWebSocketListeners();
            this.initFlag = true;
        }
    }

    /**
     * 初始化原生事件监听器
     */
    private initNativeEventListeners() {
        if (sys.platform === 'ANDROID') {
            NativeEventManager.getInstance().on(NativeEvent.CHAT_RECORDING_PERM, this.onChatRecordingPerm, this);
            NativeEventManager.getInstance().on(NativeEvent.CHAT_READY, this.onChatReady, this);
            NativeEventManager.getInstance().on(NativeEvent.CHAT_STOPPED, this.onChatStopped, this);
            NativeEventManager.getInstance().on(NativeEvent.CHAT_RECORDING_STOPPED, this.onChatRecordingStopped, this);
            NativeEventManager.getInstance().on(NativeEvent.CHAT_RECORDING_READY, this.onChatRecordingReady, this);
            NativeEventManager.getInstance().on(NativeEvent.CHAT_USER, this.onChatUser, this);
            NativeEventManager.getInstance().on(NativeEvent.CHAT_ASSISTANT_DELTA, this.onChatAssistantDelta, this);
            NativeEventManager.getInstance().on(NativeEvent.CHAT_ASSISTANT_FINAL, this.onChatAssistantFinal, this);
        }
    }

    private initWebSocketListeners() {
        EventManager.getInstance().on(ChatProtocol.GET_CHARACTERS, this.onGetCharactorList, this);
        EventManager.getInstance().on(ChatProtocol.GET_CHOOSEN_CHARACTER, this.onGetChoosenCharactor, this);
        EventManager.getInstance().on(ChatProtocol.CHOOSEN_CHARACTER, this.onChooseCharactor, this);
    }

    /**
     * 获取录音权限
     */
    public getRecordingPermission(): void {
        DebugLog.instance.log('ChatModel: 获取录音权限');

        if (sys.platform === 'ANDROID') {
            native.bridge.sendToNative(NativeEvent.CHAT_RECORDING_GET_PERMISSION, "start");
        }
    }

    /**
     * 启动聊天
     * @param params 聊天参数
     * @param params.token 当前用户token
     * @param params.userNickName 用户昵称
     * @param params.roleId 角色id（当前数字人的id）
     */
    public startChat(params: { token: string; userNickName: string; roleId: string }): void {
        DebugLog.instance.log('ChatModel: 启动聊天', params);
        this.connectionStateProvider.data = ChatConnectionState.CONNECTING;

        if (sys.platform === 'ANDROID') {
            this.connectionStateProvider.data = ChatConnectionState.CONNECTING;
            this.microphoneStateProvider.data = MicrophoneState.PENDING;
            native.bridge.sendToNative(NativeEvent.CHAT_START, JSON.stringify({
                "token": params.token,
                "userNickName": params.userNickName,
                "roleId": params.roleId
            }));
        }
    }

    /**
     * 退出聊天
     */
    public endChat(): void {
        DebugLog.instance.log('ChatModel: 退出聊天');

        if (sys.platform === 'ANDROID') {
            native.bridge.sendToNative(NativeEvent.CHAT_END);
        }
    }

    /**
     * 关闭麦克风
     */
    public stopRecording(): void {
        DebugLog.instance.log('ChatModel: 关闭麦克风');

        if (sys.platform === 'ANDROID') {
            this.microphoneStateProvider.data = MicrophoneState.PENDING;
            native.bridge.sendToNative(NativeEvent.CHAT_RECORDING_STOP);
        }
    }

    /**
     * 恢复麦克风
     */
    public startRecording(): void {
        DebugLog.instance.log('ChatModel: 恢复麦克风');

        if (sys.platform === 'ANDROID') {
            this.microphoneStateProvider.data = MicrophoneState.PENDING;
            native.bridge.sendToNative(NativeEvent.CHAT_RECORDING_START);
        }
    }

    /**
     * 添加字幕到缓存
     */
    public addSubtitle(text: string, speaker: 'user' | 'assistant'): void {
        this.subtitleListProvider.addSubtitle(text, speaker);
    }

    /**
     * 清空字幕缓存
     */
    public clearSubtitles(): void {
        this.subtitleListProvider.clearSubtitles();
    }

    /**
     * 获取当前暂存的用户消息
     * @returns 暂存的消息，如果没有则返回null
     */
    public getPendingUserMessage(): string | null {
        return this._pendingUserMessage;
    }

    /**
     * 手动处理暂存的消息（用于调试或特殊情况）
     */
    public processPendingMessage(): void {
        if (this._pendingUserMessage) {
            this.addSubtitle(this._pendingUserMessage, "user");
            this._pendingUserMessage = null;
            DebugLog.instance.log('ChatModel: 手动处理暂存的用户消息');
        }
    }

    /**
     * 重置所有状态
     */
    public reset(): void {
        this.connectionStateProvider.data = ChatConnectionState.DISCONNECTED;
        this.microphoneStateProvider.data = MicrophoneState.CLOSED;
        this.sleepStateProvider.data = SleepState.AWAKE;
        this.aiSpeakingStateProvider.data = AISpeakingState.IDLE;
        this._pendingUserMessage = null; // 清空暂存消息
        this.clearSubtitles();
    }

    // 原生事件回调方法（具体实现细节待补充）
    private onChatRecordingPerm(data: any): void {
        console.log("权限状态" + typeof data.code + " " + data.code + " " + (data.code == 0 || data.code == "0"));
        let bool = data.code == 0 || data.code == "0";
        if (bool) {
            console.log("获取权限成功");
        } else {
            console.log("获取权限失败");
        }
        this.premissionProvider.data = bool;
    }

    private onChatReady(data: any): void {
        DebugLog.instance.log('ChatModel: 聊天准备就绪');
        this.connectionStateProvider.data = ChatConnectionState.CONNECTED;
    }

    private onChatStopped(data: any): void {
        DebugLog.instance.log('ChatModel: 聊天停止');
        this.connectionStateProvider.data = ChatConnectionState.DISCONNECTED;
    }

    private onChatRecordingStopped(data: any): void {
        DebugLog.instance.log('ChatModel: 录音停止');
        this.microphoneStateProvider.data = MicrophoneState.CLOSED;
    }

    private onChatRecordingReady(data: any): void {
        DebugLog.instance.log('ChatModel: 录音准备就绪');
        this.microphoneStateProvider.data = MicrophoneState.OPEN;
    }

    private onChatUser(data: any): void {
        let text = data.text;

        // 检查AI是否正在说话
        if (this.aiSpeakingStateProvider.data === AISpeakingState.SPEAKING) {
            // AI正在说话，暂存用户消息
            this._pendingUserMessage = text;
            DebugLog.instance.log('ChatModel: AI正在说话，暂存用户消息:', text);
        } else {
            // AI没有在说话，直接添加字幕
            this.addSubtitle(text, "user");
            DebugLog.instance.log('ChatModel: 直接添加用户消息:', text);
        }
    }

    private onChatAssistantDelta(data: any): void {
        if (this.aiSpeakingStateProvider.data != AISpeakingState.SPEAKING) {
            this.aiSpeakingStateProvider.data = AISpeakingState.SPEAKING;
        }
        let text = data.text;
        this.addSubtitle(text, "assistant");
    }

    private onChatAssistantFinal(data: any): void {
        if (this.aiSpeakingStateProvider.data != AISpeakingState.FINISHED) {
            this.aiSpeakingStateProvider.data = AISpeakingState.FINISHED;
            if (this._pendingUserMessage) {
                this.addSubtitle(this._pendingUserMessage, "user");
                this._pendingUserMessage = null;
                DebugLog.instance.log('ChatModel: 处理暂存的用户消息');
            }
        }
    }


    //------------websocket request----------//
    public getCharactorList(): void {
        SocketManager.getInstance().send(new SocketData({
            action: ChatProtocol.GET_CHARACTERS,
            data: {}
        }));
    }

    private onGetCharactorList(data: any): void {
        let characters = data.data.result;
        let charactorMap = new Map<number, ChatCharacter>();
        characters.forEach(character => {
            charactorMap.set(character.id, character);
        });
        this.charactorListProvider.data = charactorMap;
    }

    public getChoosenCharactor(): void {
        SocketManager.getInstance().send(new SocketData({
            action: ChatProtocol.GET_CHOOSEN_CHARACTER,
            data: {}
        }))
    }

    private onGetChoosenCharactor(data: any): void {
        let result = data.data.result;
        let chat_character_id = result? result.chat_character_id : this._defaultCharactorId;
        let chat_character_skin_id = result? result.chat_character_skin_id : this._defaultCharactorSkin;

        if(this.charactorListProvider.data.has(chat_character_id)){
            let skinlist:ChatSkin[] = this.charactorListProvider.data.get(chat_character_id).skins;
            skinlist.forEach(chatskin =>{
                if(chatskin.id == chat_character_skin_id){
                    this.charactorChoosenSkin.data = chatskin.code;
                    this._selectedCharactorId = chat_character_id;
                    this._selectedCharactorSkin = chat_character_skin_id;
                }
            });
        }
    }

    public chooseCharactor(character_id:number,skin_id:number){
        SocketManager.getInstance().send(new SocketData({
            action: ChatProtocol.CHOOSEN_CHARACTER,
            data: {
                chat_character_id: character_id,
                chat_character_skin_id: skin_id
            }
        }));
    }

    private onChooseCharactor(data: any): void {
        let result = data.data;
        let chat_character_id = result.chat_character_id;
        let chat_character_skin_id = result.chat_character_skin_id;

        if(this.charactorListProvider.data.has(chat_character_id)){
            let skinlist:ChatSkin[] = this.charactorListProvider.data.get(chat_character_id).skins;
            skinlist.forEach(chatskin =>{
                if(chatskin.id == chat_character_skin_id){
                    this.charactorChoosenSkin.data = chatskin.code;
                    this._selectedCharactorId = chat_character_id;
                    this._selectedCharactorSkin = chat_character_skin_id;
                }
            });
        }
    }
}




import { director, native, sys } from "cc";
import { EventManager } from "../../../../Core/Manager/Event/EventManager";
import { DebugLog } from "../../../../Core/Util/DebugLog";
import { NativeEventManager } from "../../../../Core/Manager/Event/NativeEventManager";
import { NativeEvent } from "../../../../Core/Manager/Event/NativeEvent";
import { DataProvider } from "../../../../Core/Data/DataProvider";
import { AnimationTimelineNode, ChatCharacter, ChatMonthUsage, ChatProtocol, ChatSkin, ChatSong } from "./ChatProtocol";
import { SocketManager } from "../../../../Core/Manager/Net/SocketManager";
import { SocketData } from "../../../../Core/Manager/Net/SocketData";
import { Environment, PublishSettingConfig } from "db://assets/app/PublishSettingConfig";
import { LocalStorageKeyEnum, LocalStorageUtil } from "db://assets/resources/scripts/Core/Util/LocalStorageUtil";
import { PersonalCenterManager } from "db://assets/resources/scripts/Game/PersonalCenterManager/PersonalCenterManager";

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
    PENDING = 'pending',
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
    public readonly characterSongsProvider: DataProvider<ChatSong[]>;

    public readonly currentPlayingSong: DataProvider<ChatSong>;
    public readonly currentPlayingSongState: DataProvider<"playing" | "paused" | "ended">;

    public readonly currentPlayingSongTimeline: DataProvider<AnimationTimelineNode[]>;

    public readonly monthUsageProvider: DataProvider<ChatMonthUsage>;

    public static readonly MONTH_USAGE_LIMIT_EXCEEDED_EVENT: string = "MONTH_USAGE_LIMIT_EXCEEDED_EVENT";

    // 用户消息暂存
    private _pendingUserMessage: string | null = null;

    private _defaultCharactorId: number = 1;
    private _defaultCharactorSkin: number = 1;
    private _selectedCharactorId: number = 0;
    private _selectedCharactorSkin: number = 0;
    private _lastSwitchedCharactorId: number = 0;
    private _canSwitchCharactor: boolean = true; // 是否允许切换数字人，只有收到切换完成事件后才能继续切换

    private _pendingSong: ChatSong = null;

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

        this.characterSongsProvider = new DataProvider<ChatSong[]>();

        this.currentPlayingSong = new DataProvider<ChatSong>();
        this.currentPlayingSongState = new DataProvider<"playing" | "paused" | "ended">();

        this.currentPlayingSongTimeline = new DataProvider<AnimationTimelineNode[]>();

        this.monthUsageProvider = new DataProvider<ChatMonthUsage>();
    }

    /**
     * 重置所有状态
     */
    public reset(): void {
        this.premissionProvider.reset();
        this.connectionStateProvider.reset();
        this.microphoneStateProvider.reset();
        this.sleepStateProvider.reset();
        this.aiSpeakingStateProvider.reset();
        this.charactorListProvider.reset();
        this.charactorChoosenSkin.reset();
        this.characterSongsProvider.reset();
        this.currentPlayingSong.reset();
        this.currentPlayingSongState.reset();
        this.currentPlayingSongTimeline.reset();
        this.clearSubtitles();
        this.subtitleListProvider.reset();
        this._pendingUserMessage = null;
        this._pendingSong = null;
        this._selectedCharactorId = 0;
        this._lastSwitchedCharactorId = 0;
        this._canSwitchCharactor = true;
    }

    private initFlag = false;

    init() {
        if (!this.initFlag) {
            this.initNativeEventListeners();
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

            NativeEventManager.getInstance().on(NativeEvent.CHAT_SONG_PAUSED, this.onChatSongPaused, this);
            NativeEventManager.getInstance().on(NativeEvent.CHAT_SONG_RESUMED, this.onChatSongResumed, this);
            NativeEventManager.getInstance().on(NativeEvent.CHAT_SONG_END, this.onChatSongEnd, this);
            NativeEventManager.getInstance().on(NativeEvent.CHAT_MODE_SWITCHED, this.onChatModeSwitched, this);
            NativeEventManager.getInstance().on(NativeEvent.CHAT_CHARACTER_SWITCHED,this.onChatCharacterSwitched,this);
            NativeEventManager.getInstance().on(NativeEvent.CHAT_USAGE_LIMIT_EXCEEDED, this.onChatUsageLimitExceeded, this);
        }
    }

    public initWebSocketListeners() {
        EventManager.getInstance().on(ChatProtocol.GET_CHARACTERS, this.onGetCharactorList, this);
        EventManager.getInstance().on(ChatProtocol.GET_CHOOSEN_CHARACTER, this.onGetChoosenCharactor, this);
        EventManager.getInstance().on(ChatProtocol.CHOOSEN_CHARACTER, this.onChooseCharactor, this);
        EventManager.getInstance().on(ChatProtocol.GET_CHARACTER_SONGS, this.onGetCharacterSongs, this);
        EventManager.getInstance().on(ChatProtocol.GET_SONG_TIMELINES, this.onGetSongTimelines, this);
    }

    public removeWebSocketListeners() {
        EventManager.getInstance().off(ChatProtocol.GET_CHARACTERS, this);
        EventManager.getInstance().off(ChatProtocol.GET_CHOOSEN_CHARACTER, this);
        EventManager.getInstance().off(ChatProtocol.CHOOSEN_CHARACTER, this);
        EventManager.getInstance().off(ChatProtocol.GET_CHARACTER_SONGS, this);
        EventManager.getInstance().off(ChatProtocol.GET_SONG_TIMELINES, this);
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
        console.log('ChatModel: 启动聊天', params);

        this.connectionStateProvider.data = ChatConnectionState.CONNECTING;

        if (sys.platform === 'ANDROID') {
            this.connectionStateProvider.data = ChatConnectionState.CONNECTING;
            this.microphoneStateProvider.data = MicrophoneState.PENDING;
            console.log('ChatModel: 启动聊天1');
            native.bridge.sendToNative(NativeEvent.CHAT_START, JSON.stringify({
                "token": params.token,
                "userNickName": params.userNickName,
                "characterId": params.roleId,
                "isProduction": PublishSettingConfig.getInstance().getEnvironment() === Environment.PRODUCTION
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

    public playMusic(song: ChatSong): void {
        this._pendingSong = song;
        this.getSongTimelines(song.id);
    }

    public backToChat(): void {
        if (sys.platform === 'ANDROID') {
            DebugLog.instance.log('ChatModel: 返回聊天');
            native.bridge.sendToNative(NativeEvent.CHAT_MODE_SWITCH, JSON.stringify({
                "mode": "chat"
            }));
        }
    }

    public pauseMusic(): void {
        if (sys.platform === 'ANDROID') {
            DebugLog.instance.warn('ChatModel: 暂停歌曲');
            native.bridge.sendToNative(NativeEvent.CHAT_SONG_PAUSE, JSON.stringify({}));
        }
    }

    public resumeMusic(): void {
        if (sys.platform === 'ANDROID') {
            DebugLog.instance.warn('ChatModel: 恢复歌曲');
            native.bridge.sendToNative(NativeEvent.CHAT_SONG_RESUME, JSON.stringify({}));
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
            console.log('刷新测试界面：AI正在说话，暂存用户消息:', text);
        } else {
            // AI没有在说话，直接添加字幕
            this.addSubtitle(text, "user");
            console.log('刷新测试界面：AI没有说话直接添加字幕 直接添加用户消息:', text);
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

    private onChatSongPaused(data: any): void {
        DebugLog.instance.log('ChatModel: 歌曲暂停');
        this.currentPlayingSongState.data = "paused";
    }

    private onChatSongResumed(data: any): void {
        DebugLog.instance.log('ChatModel: 歌曲恢复');
        this.currentPlayingSongState.data = "playing";
    }

    private onChatSongEnd(data: any): void {
        DebugLog.instance.log('ChatModel: 歌曲结束');
        this.currentPlayingSongState.data = "ended";
    }

    private onChatModeSwitched(data: any): void {
        let mode = data.mode;
        DebugLog.instance.log('ChatModel: 模式切换 mode: ' + mode);
        if (mode == "song") {
            this.onChatAssistantFinal(null);
            this.currentPlayingSongState.data = "playing";
            let song: ChatSong = null;
            DebugLog.instance.log('ChatModel: 歌曲id: ' + data.songId);
            DebugLog.instance.log('ChatModel: 歌曲名称: ' + data.songName);
            this.characterSongsProvider.data.forEach((csong: ChatSong, index: number) => {
                if (csong.id.toString() == data.songId.toString()) {
                    csong.isPlaying = true;
                    song = { ...csong };
                } else {
                    csong.isPlaying = false;
                }
            });
            this.characterSongsProvider.triggerCallback();
            this.currentPlayingSong.data = song;
            this.microphoneStateProvider.triggerCallback();
        } else if (mode == "chat") {
            this.currentPlayingSongState.data = null;
            this.currentPlayingSong.data = null;
            this.microphoneStateProvider.triggerCallback();
            this.aiSpeakingStateProvider.data = AISpeakingState.IDLE;
        }
    }

    private onChatUsageLimitExceeded(data: any): void {
        EventManager.getInstance().emit(ChatModel.MONTH_USAGE_LIMIT_EXCEEDED_EVENT);
    }

    private onChatCharacterSwitched(data: any): void {
        console.log('ChatModel: 数字人角色切换完成');
        // 收到切换完成事件后，允许继续切换数字人
        this._canSwitchCharactor = true;
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
        let chat_character_id = result ? result.chat_character_id : this._defaultCharactorId;
        let chat_character_skin_id = result ? result.chat_character_skin_id : this._defaultCharactorSkin;
        this._selectedCharactorId = chat_character_id;
        console.log("chat:","startChat 2")
        if (this.charactorListProvider.data.has(chat_character_id)) {
            console.log("chat:","startChat 3")
            let chatactor = this.charactorListProvider.data.get(chat_character_id);
            this.updateCharactorChoosenSkinData(chatactor, chat_character_skin_id);
            // const token = LocalStorageUtil.get(LocalStorageKeyEnum.USER_TOKEN);
            // const userData = PersonalCenterManager.getInstance().userInfoData;
            // const roleId = this.selectedCharactorId+"";
            // this.startChat({ token: token, userNickName: userData.nickname, roleId });
             // 更新初始化获得的数字人id
            this._lastSwitchedCharactorId = this._selectedCharactorId;
        }
    }

    /**
     * 切换数字人角色
     */
    switchCharactor(){
        //  // 如果没有收到上次切换完成的事件，则不能再次切换
        //  if (!this._canSwitchCharactor) {
        //     console.log('ChatModel: 上次切换未完成，无法再次切换数字人');
        //     return;
        // }

        // 如果这次切换的数字人id和上一次切换的数字人id一样，则直接返回
        if (this._selectedCharactorId === this._lastSwitchedCharactorId) {
            console.log('ChatModel: 上次切换相同数字人'+this._selectedCharactorId);
            return;
        }
        
        
        if (sys.platform === 'ANDROID') {
            console.log("ChatModel: 请求切换数字人"+this._selectedCharactorId);
            // 设置标志位为false，禁止再次切换直到收到切换完成事件
            this._canSwitchCharactor = false;
            const token = LocalStorageUtil.get(LocalStorageKeyEnum.USER_TOKEN);
            const userData = PersonalCenterManager.getInstance().userInfoData;
            const roleId = this._selectedCharactorId + "";
            // 更新上次切换的数字人id
            this._lastSwitchedCharactorId = this._selectedCharactorId;
            native.bridge.sendToNative(NativeEvent.CHAT_CHARACTER_SWITCH, JSON.stringify({
                "token": token,  // 当前用户token
                "userNickName": userData.nickname,  // 用户昵称
                "characterId": roleId,  // 角色id（当前数字人的id，通过websocket接口获取）,
                "isProduction":  PublishSettingConfig.getInstance().getEnvironment() === Environment.PRODUCTION // 是否生成环境
            }));
        }
    }

    public chooseCharactor(character_id: number, skin_id: number) {
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
        if (this.charactorListProvider.data.has(chat_character_id)) {
            let chatactor = this.charactorListProvider.data.get(chat_character_id);
            this.updateCharactorChoosenSkinData(chatactor, chat_character_skin_id);
            this.switchCharactor();
        }
    }

    public updateCharactorChoosenSkinData(chatactor: ChatCharacter, defaultSkinid: number = -1) {
        let skinlist: ChatSkin[] = chatactor?.skins;
        if (skinlist) {
            if (defaultSkinid == -1) {
                defaultSkinid = skinlist[0].id;
            }
            skinlist.forEach(chatskin => {
                if (chatskin.id == defaultSkinid) {
                    this.charactorChoosenSkin.data = chatskin.code;
                    this._selectedCharactorId = chatactor.id;
                    this._selectedCharactorSkin = defaultSkinid;
                }
            });
        }
    }

    public getMusicList(): void {
        SocketManager.getInstance().send(new SocketData({
            action: ChatProtocol.GET_CHARACTER_SONGS,
            data: {
                chat_character_id: this._selectedCharactorId,
                chat_character_skin_id: this._selectedCharactorSkin
            }
        }));
    }

    private onGetCharacterSongs(data: any): void {
        let result = data.data.result;
        let songs: ChatSong[] = result;
        songs.forEach((song: ChatSong) => {
            song.isPlaying = false;
        });
        this.characterSongsProvider.data = songs;
    }

    public getSongTimelines(songId: number): void {
        SocketManager.getInstance().send(new SocketData({
            action: ChatProtocol.GET_SONG_TIMELINES,
            data: {
                song_id: songId
            }
        }));
    }

    private onGetSongTimelines(data: any): void {
        let result = data.data.result;
        let timelines: AnimationTimelineNode[] = result;
        this.currentPlayingSongTimeline.data = timelines;
        if (sys.platform === 'ANDROID') {
            const song = this._pendingSong;
            this._pendingSong = null;
            DebugLog.instance.warn('ChatModel: 播放歌曲', song);
            native.bridge.sendToNative(NativeEvent.CHAT_MODE_SWITCH, JSON.stringify({
                "mode": "song",
                "songName": song.name,
                "songId": song.id
            }));
        }
    }

    public getMonthUsage(): void {
        EventManager.getInstance().on(ChatProtocol.GET_MONTH_USAGE, this.onGetMonthUsage, this, true);
        SocketManager.getInstance().send(new SocketData({
            action: ChatProtocol.GET_MONTH_USAGE,
            data: {}
        }));
    }

    private onGetMonthUsage(data: any): void {
        let result = data.data.result;
        let monthUsage: ChatMonthUsage = result;
        DebugLog.instance.log('ChatModel: 获取本月剩余使用时长: ' + monthUsage.remaining_seconds);
        this.monthUsageProvider.data = monthUsage;
    }
}



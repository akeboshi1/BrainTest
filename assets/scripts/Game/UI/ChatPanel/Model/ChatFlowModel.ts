import { director, Director, native, sys, WebView } from "cc";
import { BaseManager } from "../../../../Core/Manager/BaseManager";
import { EventManager } from "../../../../Core/Manager/Event/EventManager";
import { SocketData } from "../../../../Core/Manager/Net/SocketData";
import { SocketManager } from "../../../../Core/Manager/Net/SocketManager";
import { DebugLog } from "../../../../Core/Util/DebugLog";
import { NativeEventManager } from "../../../../Core/Manager/Event/NativeEventManager";
import { NativeEvent } from "../../../../Core/Manager/Event/NativeEvent";

// 定义一个类来作为Model层管理聊天数据
export class ChatFlowModel extends BaseManager {

    private static _instance: ChatFlowModel;

    public static getInstance(): ChatFlowModel {
        if (!ChatFlowModel._instance) {
            ChatFlowModel._instance = new ChatFlowModel();
        }
        return ChatFlowModel._instance;
    }

    public static ChatMessageEvent: string = "ChatFlowMode.ChatMessageEvent";

    public static TTSFlowStartEvent: string = "ChatFlowMode.TTSFlowStartEvent";
    public static TTSFlowCompleteEvent: string = "ChatFlowMode.TTSFlowCompleteEvent";

    public static ASRFlowStartEvent: string = "ChatFlowMode.ASRFlowStartEvent";
    public static ASRFlowCompleteEvent: string = "ChatFlowMode.ASRFlowCompleteEvent";

    public static WaittingEvent: string = "ChatFlowMode.WaittingEvent";
    public static WaittingEventStrings: any = {
        normal: "正在加载",
        ttsConnect: "链接tts中",
        ttsClose: "关闭tts中",
        asrConnect: "链接asr中",
        asrClose: "关闭asr中",
    }

    private textCache: string = "";
    private seq: number = 0; // 当前期望的序号
    private seqTimeout: number = 5000; // 序号缺失等待超时时间（单位毫秒，可根据实际调整）
    private waitingForSeq: number | null = null; // 正在等待的缺失序号，如果为null表示没有等待的缺失序号

    private chat_get_greeting: string = "chat.get_greeting";
    private chat_chat: string = "chat.chat";

    private resolveFn: (() => void) | null = null;
    private rejectFn: ((reason?: any) => void) | null = null;
    private inChatRequestFlow: boolean = false;
    private chatMessageMap: Map<string, { speaker: 0 | 1, message: string }> = new Map();
    private currentSpeaker: 0 | 1 = 0; //0是机器人讲话， 1是用户
    private currentSpeechSeq: number = 0;

    private ttsOpenState: boolean = false;
    private ttsInConnectFlow: boolean = false;
    private ttsPostUid: number = 0;
    private ttsLastPostUid: number = 0;

    private asrOpenState: boolean = false;

    private tts_open_resolveFn: (() => void) | null = null;
    private tts_post_cacheData: Map<number, string> = new Map();

    private initFlag = false;

    init() {
        if (!this.initFlag) {
            this.initTTSandARS();
            this.initEventList();
            this.initFlag = true;
        }
    }

    public initTTSandARS() {
        console.log('sys.os = ', sys.os);
        console.log('sys.platform=', sys.platform);

        if (sys.platform === 'ANDROID') {
            NativeEventManager.getInstance().on(NativeEvent.ASRResult, this.onASRResultHandle, this);
            NativeEventManager.getInstance().on(NativeEvent.ASRConnected, this.onASRConnectedHandle, this);
            NativeEventManager.getInstance().on(NativeEvent.ASRClosed, this.onASRClosedHandle, this);
            NativeEventManager.getInstance().on(NativeEvent.TTSConnected, this.onTTSConnectedHandle, this);
            NativeEventManager.getInstance().on(NativeEvent.TTSClosed, this.onTTSClosedHandle, this);
            NativeEventManager.getInstance().on(NativeEvent.TTSEnd, this.onTTSEndHandle, this);
        } else {
            window.addEventListener("message", (event) => {
                if (event.data && event.data.type === "ASRResult") {
                    let msg = JSON.parse(event.data.data);
                    this.onASRResultHandle(msg);
                }

                if (event.data && event.data.type === "ASRConnected") {
                    this.onASRConnectedHandle();
                }

                if (event.data && event.data.type === "ASRClosed") {
                    this.onASRClosedHandle();
                }

                if (event.data && event.data.type === "TTSConnected") {
                    this.onTTSConnectedHandle();
                }

                if (event.data && event.data.type === "TTSClosed") {
                    this.onTTSClosedHandle();
                }

                if (event.data && event.data.type === "TTSEnd") {
                    this.onTTSEndHandle(event.data);
                }
            });
        }
    }

    public initEventList() {
        EventManager.getInstance().on(this.chat_get_greeting, this.handleMessageChunk, this);
        EventManager.getInstance().on(this.chat_chat, this.handleMessageChunk, this);
    }

    public clearEventList() {
        EventManager.getInstance().off(this.chat_get_greeting, this);
        EventManager.getInstance().off(this.chat_chat, this);
    }

    private onASRResultHandle(data: any) {
        if (this.asrOpenState) {
            DebugLog.instance.log("ASR Result " + data.content);

            this.sendToView(data.content, 1);
            this.currentSpeechSeq++;

            this.sendChatRequest(data.content);
            this.onCloseASR();
        }
    }

    private onASRConnectedHandle(data: any = null) {
        DebugLog.instance.log("ASRConnected");
        this.asrOpenState = true;
        EventManager.getInstance().emit(ChatFlowModel.ASRFlowStartEvent, {});
    }

    private onASRClosedHandle(data: any = null) {
        DebugLog.instance.log("ASRClosed");
        EventManager.getInstance().emit(ChatFlowModel.ASRFlowCompleteEvent, {});
    }

    private onTTSConnectedHandle(data: any = null) {
        DebugLog.instance.log("TTSConnected");
        this.ttsOpenState = true;
        this.ttsInConnectFlow = false;
        if (this.tts_open_resolveFn) {
            this.tts_open_resolveFn();
            this.tts_open_resolveFn = null;
        }
    }

    private onTTSClosedHandle(data: any = null) {
        DebugLog.instance.log("TTSClosed");
        this.ttsOpenState = false;
    }

    private onTTSEndHandle(data: any) {
        DebugLog.instance.log("TTSEnd " + data);
        if (data.uid == this.ttsLastPostUid) {
            DebugLog.instance.log("TTSEnd _last event");
            EventManager.getInstance().emit(ChatFlowModel.TTSFlowCompleteEvent, {});
        }
    }

    // 发起greeting请求的方法，这里简单示意，实际可能涉及具体的网络请求库调用等
    public async sendChatRequest(message: string, isGreeting: boolean = false): Promise<void> {
        return new Promise((resolve, reject) => {
            this.resolveFn = resolve;
            this.rejectFn = reject;
            this.inChatRequestFlow = true;

            EventManager.getInstance().emit(ChatFlowModel.WaittingEvent, { message: ChatFlowModel.WaittingEventStrings.normal });
            if (isGreeting) {
                this.currentSpeechSeq = 0;

                SocketManager.getInstance().send(new SocketData({ "action": this.chat_get_greeting, "data": {} }));
            }
            else {
                SocketManager.getInstance().send(new SocketData({ "action": this.chat_chat, "data": { message: message } }));
            }
        });
    }

    // 处理消息块的方法，接收流式传输过来的每个数据块（这里假设是Buffer类型，根据实际可能需要调整）
    private handleMessageChunk(chunk: any, context: ChatFlowModel): void {
        const self = context;
        const data = chunk.data;
        const seq = data.seq;
        const content_type = data.content_type;
        const content = data.content;
        const finish_reason = data.finish_reason;
        //DebugLog.instance.log(`handleMessageChunk: ${content}`);
        // 校验序号是否连续
        if (seq !== self.seq) {
            if (self.waitingForSeq === null) {
                // 开始等待缺失的数据包，设置超时定时器
                self.waitingForSeq = seq;
                setTimeout(() => {
                    if (self.waitingForSeq === seq) {
                        // 超时处理，这里可以添加合适的日志或者错误提示等逻辑
                        console.error(`Seq ${seq} is missing and timeout!`);
                        self.waitingForSeq = null;
                        if (self.rejectFn) {
                            self.rejectFn({ reason: "seqError" });
                        }
                        self.endChatRequestFlow();
                    }
                }, self.seqTimeout);
            }
            self;
        }

        self.seq++;
        self.waitingForSeq = null;

        if (!content_type || content_type == "text") {
            self.textCache += content;
        }

        let textCache: string = self.textCache;

        let startIndex: number = 0;
        let currentIndex: number = 0;

        while (currentIndex < textCache.length) {
            // 定义标点符号集合，你可以根据实际需求增加更多标点符号
            const punctuationMarks: string[] = [',', '.', ';', '!', '?', '，', '。', '；', '！', '？',];
            if (punctuationMarks.indexOf(textCache[currentIndex]) >= 0) {
                // 截取从开始位置到当前标点符号位置（包含标点符号）的字符串
                let subString: string = textCache.substring(startIndex, currentIndex + 1);
                startIndex = currentIndex + 1;

                self.sendToView(subString, 0);

                self.ttsPostUid++;

                self.ttsLastPostUid = self.ttsPostUid;

                self.callTts(subString);
            }
            currentIndex++;
            // 处理最后一个字符的情况，避免遗漏
            if (currentIndex === textCache.length) {
                self.textCache = textCache.substring(startIndex);
            }
        }

        // 如果是最后一个数据包，等待TTS接口的finish消息
        if (finish_reason === 'stop') {
            if (self.resolveFn) {
                self.resolveFn();
            }
            self.endChatRequestFlow();
        }
    }

    private endChatRequestFlow() {
        this.rejectFn = null;
        this.resolveFn = null;
        this.inChatRequestFlow = false;
        this.currentSpeechSeq++;
        this.currentSpeaker = 0;
        this.ttsPostUid = 0;
    }

    private sendToView(text: string, speaker: 0 | 1): void {
        DebugLog.instance.log(`Send to view: ${text}`);
        EventManager.getInstance().emit(ChatFlowModel.ChatMessageEvent, { speaker: speaker, message: text, seq: this.currentSpeechSeq });
    }

    private callTts(text: string): void {
        if (this.ttsOpenState) {
            this.onPostTTS(text, this.ttsPostUid);
            if (this.ttsPostUid == 1) {
                EventManager.getInstance().emit(ChatFlowModel.TTSFlowStartEvent, {});
            }
        }
        else {
            this.tts_post_cacheData.set(this.ttsPostUid, text);
            if (!this.ttsInConnectFlow) {
                this.onOpenTTS().then(() => {
                    for (let [key, value] of this.tts_post_cacheData.entries()) {
                        this.onPostTTS(value, key);
                    }
                    this.tts_post_cacheData.clear();
                    EventManager.getInstance().emit(ChatFlowModel.TTSFlowStartEvent, {});
                });
            }
        }
    }

    addChatMessage(id: string, speaker: 0 | 1, message: string): void {
        this.chatMessageMap.set(id, { speaker, message });
    }

    getChatMessage(id: string): { speaker: 0 | 1, message: string } | undefined {
        return this.chatMessageMap.get(id);
    }

    onOpenASR() {
        // 连接ASR
        if (sys.platform.toUpperCase().endsWith("BROWSER")) {
            var webViewNode = director.getScene().getChildByName("webview");
            let webviewasr = webViewNode.getChildByName("asr").getComponent(WebView);
            webviewasr.evaluateJS("connect()");
            EventManager.getInstance().emit(ChatFlowModel.WaittingEvent, { message: ChatFlowModel.WaittingEventStrings.asrConnect });
        }

        if (sys.platform === 'ANDROID') {
            DebugLog.instance.log('android asr connect');
            native.bridge.sendToNative('ASR', 'connect');
        }

    }

    onCloseASR() {
        if (!this.asrOpenState) return;
        if (sys.platform.toUpperCase().endsWith("BROWSER")) {
            var webViewNode = director.getScene().getChildByName("webview");
            let webviewasr = webViewNode.getChildByName("asr").getComponent(WebView);
            this.asrOpenState = false;
            webviewasr.evaluateJS("close()");
        }

        if (sys.platform === 'ANDROID') {
            DebugLog.instance.log('android asr close');
            native.bridge.sendToNative('ASR', 'close');
        }
    }

    onPostTTS(message: string, uid: number) {
        DebugLog.instance.log(`Post TTS for: ${message} ; uid = ${uid}`);
        if (sys.platform.toUpperCase().endsWith("BROWSER")) {
            var webViewNode = director.getScene().getChildByName("webview");
            let webviewTTS = webViewNode.getChildByName("tts").getComponent(WebView);
            webviewTTS.evaluateJS("start('" + uid + "', '" + message + "')");
        }

        if (sys.platform === 'ANDROID') {
            DebugLog.instance.log('android tts post');
            native.bridge.sendToNative('TTS', JSON.stringify({ uid: uid, text: message }));
        }
    }

    public async onOpenTTS(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.tts_open_resolveFn = resolve;
            this.ttsInConnectFlow = true;

            if (sys.platform.toUpperCase().endsWith("BROWSER")) {
                var webViewNode = director.getScene().getChildByName("webview");
                let webviewTTS = webViewNode.getChildByName("tts").getComponent(WebView);
                EventManager.getInstance().emit(ChatFlowModel.WaittingEvent, { message: ChatFlowModel.WaittingEventStrings.ttsConnect });
                webviewTTS.evaluateJS("connect()");
            }
            if (sys.platform === 'ANDROID') {
                DebugLog.instance.log('android tts connect');
                native.bridge.sendToNative('TTS', 'connect');
            }
        });
    }

    onCloseTTS() {
        if (!this.ttsOpenState) return;

        if (sys.platform.toUpperCase().endsWith("BROWSER")) {
            var webViewNode = director.getScene().getChildByName("webview");
            let webviewTTS = webViewNode.getChildByName("tts").getComponent(WebView);
            EventManager.getInstance().emit(ChatFlowModel.WaittingEvent, { message: ChatFlowModel.WaittingEventStrings.ttsClose });
            webviewTTS.evaluateJS("close()");
        }

        if (sys.platform === 'ANDROID') {
            DebugLog.instance.log('android tts close');
            native.bridge.sendToNative('TTS', 'close');
        }
    }

    reset() {
        this.onCloseTTS();
        this.onCloseASR();

        this.rejectFn = null;
        this.resolveFn = null;
        this.inChatRequestFlow = false;
        this.currentSpeechSeq = 0;
        this.currentSpeaker = 0;
        this.ttsPostUid = 0;
        this.ttsLastPostUid = 0;
        this.textCache = "";
        this.seq = 0;
        this.waitingForSeq = null;
        this.chatMessageMap = new Map();
    }
}
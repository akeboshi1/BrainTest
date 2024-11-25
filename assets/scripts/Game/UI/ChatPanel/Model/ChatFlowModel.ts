import { director, Director, WebView } from "cc";
import { BaseManager } from "../../../../Core/Manager/BaseManager";
import { EventManager } from "../../../../Core/Manager/Event/EventManager";
import { SocketData } from "../../../../Core/Manager/Net/SocketData";
import { SocketManager } from "../../../../Core/Manager/Net/SocketManager";
import { DebugLog } from "../../../../Core/Util/DebugLog";

// 定义一个类来作为Model层管理聊天数据
export class ChatFlowModel extends BaseManager{

    private static _instance: ChatFlowModel;

    public static getInstance():ChatFlowModel {
        if(!ChatFlowModel._instance) {
            ChatFlowModel._instance = new ChatFlowModel();
        }
        ChatFlowModel._instance.init();
        return ChatFlowModel._instance;
    }

    public static ChatMessageEvent:string = "ChatFlowMode.ChatMessageEvent";

    private textCache: string = "";
    private seq: number = 0; // 当前期望的序号
    private seqTimeout: number = 5000; // 序号缺失等待超时时间（单位毫秒，可根据实际调整）
    private waitingForSeq: number | null = null; // 正在等待的缺失序号，如果为null表示没有等待的缺失序号

    private chat_get_greeting:string="chat.get_greeting";

    private resolveFn: (() => void) | null = null;
    private rejectFn: ((reason?:any) => void) | null = null; 
    private inGreetingRequestFlow:boolean = false;
    private chatMessageMap: Map<string, { speaker: 0 | 1, message: string }> = new Map();
    private currentSpeaker: 0 | 1 = 0; //0是机器人讲话， 1是用户
    private currentSpeechSeq: number = 0; 

    public initTTSandARS(){
        window.addEventListener("message", (event) => {
            //console.log('on message >>'+event.origin+"<<");

            if (event.data && event.data.type === "ASRResult") {
                // asr 识别结果
                let msg = JSON.parse(event.data.data);
                //let label = find("Canvas/Label").getComponent(Label);
                //label.string = msg.content;
                DebugLog.instance.log("ASR Result "+ msg.content);
            }

            if (event.data && event.data.type === "ASRConnected") {
                // asr 连接
                DebugLog.instance.log("ASRConnected ");
            }

            if (event.data && event.data.type === "ASRClosed") {
                // asr 断开
                DebugLog.instance.log("ASRClosed ");
            }

            if (event.data && event.data.type === "TTSConnected") {
                // tts连接
                //labelConn.string = "tts 已连接"
                DebugLog.instance.log("TTSConnected ");
            }

            if (event.data && event.data.type === "TTSClosed") {
                // tts断开
                DebugLog.instance.log("TTSClosed ");
            }

            if (event.data && event.data.type === "TTSEnd") {
                // tts播放结束
                DebugLog.instance.log("TTSEnd ");
            }
        });
    }

    public initEventList(){
        EventManager.getInstance().on(this.chat_get_greeting, this.handleMessageChunk, this);
    }

    public clearEventList(){
        EventManager.getInstance().off(this.handleMessageChunk, this);
    }

    // 发起greeting请求的方法，这里简单示意，实际可能涉及具体的网络请求库调用等
    public async sendGreetingRequest(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.resolveFn = resolve;
            this.rejectFn = reject;
            this.inGreetingRequestFlow = true;
            SocketManager.getInstance().send(new SocketData({ "action": this.chat_get_greeting, "data": {} }));
        });
    }

    // 处理消息块的方法，接收流式传输过来的每个数据块（这里假设是Buffer类型，根据实际可能需要调整）
    private handleMessageChunk(chunk: any, context:ChatFlowModel): void {
        const self = context;
        const data = chunk.data;
        const seq = data.seq;
        //const content_type = data.content_type;
        const content = data.content;
        const finish_reason = data.finish_reason;
        DebugLog.instance.log(`handleMessageChunk: ${content}`);
        // 校验序号是否连续
        if (seq!== self.seq) {
            if (self.waitingForSeq === null) {
                // 开始等待缺失的数据包，设置超时定时器
                self.waitingForSeq = seq;
                setTimeout(() => {
                    if (self.waitingForSeq === seq) {
                        // 超时处理，这里可以添加合适的日志或者错误提示等逻辑
                        console.error(`Seq ${seq} is missing and timeout!`);
                        self.waitingForSeq = null;
                        if(self.rejectFn)
                        {
                            self.rejectFn({reason:"seqError"});
                        }
                        self.endGreetingRequestFlow();
                    }
                }, self.seqTimeout);
            }
            self;
        }

        self.seq++;
        self.waitingForSeq = null;

        self.textCache += content;

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

                self.sendToView(subString);
                self.callTts(subString);
            }
            currentIndex++;
            // 处理最后一个字符的情况，避免遗漏
            if (currentIndex === textCache.length) {
                self.textCache = textCache.substring(startIndex);
            }
        }

        // 如果是最后一个数据包，等待TTS接口的finish消息
        if (finish_reason ==='stop') {
            self.waitForTtsFinish();
            if (self.resolveFn) {
                self.resolveFn();
            }
            self.endGreetingRequestFlow();
        }
    }

    private endGreetingRequestFlow(){
        this.rejectFn = null;
        this.resolveFn = null;
        this.inGreetingRequestFlow = false;
        this.currentSpeechSeq++;
        this.currentSpeaker = this.currentSpeaker == 0 ? 1 : 0;
    }

    private sendToView(text: string): void {
        DebugLog.instance.log(`Send to view: ${text}`);
        EventManager.getInstance().emit(ChatFlowModel.ChatMessageEvent,{speaker:this.currentSpeaker,message:text,seq:this.currentSpeechSeq});
    }

    private callTts(text: string): void {
        DebugLog.instance.log(`Call TTS for: ${text}`);
    }

    addChatMessage(id: string, speaker: 0 | 1, message: string): void {
        this.chatMessageMap.set(id, { speaker, message });
    }

    getChatMessage(id: string): { speaker: 0 | 1, message: string } | undefined {
        return this.chatMessageMap.get(id);
    }

    private waitForTtsFinish(): void {
       
    }

    testTTS(){
        var webView = director.getScene().getChildByName("webview");
        if(webView)
        {
            DebugLog.instance.log("find web view");
            this.onOpenTTS();
            //webView.getChildByName("tts").getComponent(WebView).evaluateJS("start('今天天气真好！')");
        }
    }

    onOpenASR() {
        // 连接ASR
        var webViewNode = director.getScene().getChildByName("webview");
        let webviewasr = webViewNode.getChildByName("asr").getComponent(WebView);
        
        webviewasr.evaluateJS("connect()");
    }

    onCloseASR() {
        // 断开ASR
        var webViewNode = director.getScene().getChildByName("webview");
        let webviewasr = webViewNode.getChildByName("asr").getComponent(WebView);
        webviewasr.evaluateJS("close()");
    }

    
    onClickTTS() {
        var webViewNode = director.getScene().getChildByName("webview");
        let webviewTTS = webViewNode.getChildByName("tts").getComponent(WebView);
        //let textbox = find("Canvas/EditBox").getComponent(EditBox);
        webviewTTS.evaluateJS("start('123456123123')");
    }

    onOpenTTS() {
        // 连接TTS
        var webViewNode = director.getScene().getChildByName("webview");
        let webviewTTS = webViewNode.getChildByName("tts").getComponent(WebView);
        webviewTTS.evaluateJS("connect()");
    }

    onCloseTTS() {
        // 断开TTS
        var webViewNode = director.getScene().getChildByName("webview");
        let webviewTTS = webViewNode.getChildByName("tts").getComponent(WebView);

        webviewTTS.evaluateJS("close()");
    }
}
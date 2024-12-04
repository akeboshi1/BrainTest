import { _decorator, Animation, AnimationClip, Component, instantiate, Label, Node, Prefab, UITransform, VideoPlayer, WebView } from 'cc';
import { ChatFlowModel } from './Model/ChatFlowModel';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { DebugLog } from '../../../Core/Util/DebugLog';
import { ChatBubbleCtrl } from './ChatBubbleCtrl';
import { FrameComponent } from '../../../Core/Component/FrameComponent';
const { ccclass, property } = _decorator;

// 定义枚举类型ChatState来表示聊天状态
enum ChatState {
    Empty = "empty",
    Loading = "loadingState",
    ReceivingSpeech = "reciveingSpeeshState",
    OpponentSpeaking = "opponentSpeakingState",
    Sleeping = "asrSleeping",
    Mute = "muteState"
}

@ccclass('ChatPanelCtrl')
export class ChatPanelCtrl extends Component {
    public static ChatPanelCloseEvent: string = "ChatPanelCtrl.ChatPanelCloseEvent";
    private chatState: ChatState;
    private lastChatState: ChatState = ChatState.Empty;

    private chatFlowModel: ChatFlowModel = null;

    @property({ type: Node })
    private chatStateAnimNode: Node = null;

    @property({ type: Node })
    private inOutAnimNode: Node = null;

    @property({ type: Label })
    private waittingLabel: Label = null;

    @property({ type: FrameComponent })
    private frameComponent: FrameComponent = null;

    @property({ type: VideoPlayer })
    private vp_idle: VideoPlayer = null;

    @property({ type: VideoPlayer })
    private vp_speak: VideoPlayer = null;

    @property({ type: Label })
    private subtitlesLabel: Label = null;

    private chatMessageCachesMap: Map<number, string> = new Map();
    private currentSpeechSeq: number = -1;

    private speakerTitle: string[] = ["可乐派：", "你："];

    private lastEventTime: number = 0; // 记录最后一次收到事件回调的时间
    private timerInterval: number = 30; // 设定的时间间隔，单位为秒，这里设置为180秒，可以根据需求调整

    start() {

    }

    private updateLastEventTime() {
        this.lastEventTime = Date.now() / 1000;
    }

    protected onEnable(): void {
        this.chatFlowModel = ChatFlowModel.getInstance();

        EventManager.getInstance().on(ChatFlowModel.ChatMessageEvent, this.onGetChatMessage, this);
        EventManager.getInstance().on(ChatFlowModel.TTSFlowCompleteEvent, this.onTTSFlowCompleted, this);
        EventManager.getInstance().on(ChatFlowModel.TTSFlowStartEvent, this.onTTSFlowStart, this);
        EventManager.getInstance().on(ChatFlowModel.WaittingEvent, this.onWaittingEvent, this);
        EventManager.getInstance().on(ChatFlowModel.ASRFlowStartEvent, this.onASRConnected, this);

        this.chatState = ChatState.Loading;
        this.playAnimationByState(this.chatState);
        this.updateLastEventTime();

        this.clickGreeting();
    }

    protected onDisable(): void {
        EventManager.getInstance().off(ChatFlowModel.ChatMessageEvent, this);
        EventManager.getInstance().off(ChatFlowModel.TTSFlowCompleteEvent, this);
        EventManager.getInstance().off(ChatFlowModel.TTSFlowStartEvent, this);
        EventManager.getInstance().off(ChatFlowModel.WaittingEvent, this);
        EventManager.getInstance().off(ChatFlowModel.ASRFlowStartEvent, this);

        const animationComponent = this.inOutAnimNode.getComponent(Animation);
        animationComponent.off(Animation.EventType.FINISHED);

        this.chatFlowModel.reset();
        this.resetPanel();
    }

    private resetPanel() {
        this.hideSubtitle();
    }

    enterState(state: ChatState) {
        if (state != this.chatState) {
            this.lastChatState = this.chatState;
            this.chatState = state;
        }
    }

    public clickGreeting() {
        this.chatFlowModel.sendChatRequest("", true);
    }

    public clickChat() {
        this.chatFlowModel.sendChatRequest("我打算出去玩请给我推荐一个景点。").then(() => {
            console.log('chat request completed.');
        }).catch((error) => {
            console.error('Error sending chat request:', error);
        });
        this.chatFlowModel.onCloseASR();
    }

    public clickInterruptButton() {
        DebugLog.instance.log("clickInterruptButton");
        if (this.chatState == ChatState.Loading) return;

        this.chatFlowModel.onCloseTTS();
        this.enterUserSpeakState();
    }

    public clickAwakeFromSleeping() {
        this.enterState(ChatState.Loading);
        this.enterUserSpeakState();
        this.updateLastEventTime();
    }

    public clickBackButton() {
        if (this.chatState == ChatState.Loading) return;

        //this.fadeOut();
        this.node.active = false;
        EventManager.getInstance().emit(ChatPanelCtrl.ChatPanelCloseEvent, {});
    }

    public clickMuteButton() {
        if (this.chatState == ChatState.Loading) return;

        if (this.chatState != ChatState.Mute) {
            this.chatFlowModel.onCloseASR();
            this.chatFlowModel.onCloseTTS();
            this.enterState(ChatState.Mute);
        } else {
            this.enterState(ChatState.Loading);
            this.enterUserSpeakState();
        }

    }

    public fadeIn() {
        this.node.active = true;
        let clipToPlay: AnimationClip = this.getAnimationClipByName(this.inOutAnimNode, "chatPanelFadeIn");
        if (clipToPlay) {
            const animationComponent = this.inOutAnimNode.getComponent(Animation);
            animationComponent.play(clipToPlay.name);
        }
    }

    public fadeOut() {
        let clipToPlay: AnimationClip = this.getAnimationClipByName(this.inOutAnimNode, "chatPanelFadeOut");
        if (clipToPlay) {
            const animationComponent = this.inOutAnimNode.getComponent(Animation);
            animationComponent.on(Animation.EventType.FINISHED, () => {
                this.node.active = false;
            }, this);
            animationComponent.play(clipToPlay.name);
        }
    }

    private chatStateChanged(): boolean {
        return this.chatState != this.lastChatState;
    }

    update(deltaTime: number) {
        const currentTime = Date.now() / 1000; // 获取当前时间（单位转换为秒）
        if (currentTime - this.lastEventTime >= this.timerInterval) {
            // 超过设定时间间隔，进入休眠状态
            if (this.chatState == ChatState.ReceivingSpeech) {
                this.enterState(ChatState.Sleeping);
                this.chatFlowModel.onCloseASR();
                this.hideSubtitle();
            }
        }

        if (this.chatStateChanged()) {
            this.lastChatState = this.chatState;
            this.playAnimationByState(this.chatState);
        }
    }

    private playAnimationByState(state: ChatState) {
        let clipToPlay: AnimationClip = this.getAnimationClipByName(this.chatStateAnimNode, state);

        if (clipToPlay) {
            const animationComponent = this.chatStateAnimNode.getComponent(Animation);
            animationComponent.play(clipToPlay.name);
        }

        if (state == ChatState.OpponentSpeaking) {
            //this.frameComponent.playAnimation("speaking", 24);
            this.vp_idle.stop();
            this.vp_speak.play();
            this.vp_speak.loop = true;
        }
        else if (state != ChatState.Sleeping) {
            //this.frameComponent.playAnimation("idle", 24);
            this.vp_speak.stop();
            this.vp_idle.play();
            this.vp_speak.loop = true;
        }
    }

    private getAnimationClipByName(animNode: Node, name: string): AnimationClip {
        const animationComponent = animNode.getComponent(Animation);
        if (animationComponent) {
            const clips = animationComponent.clips;
            return clips.find(clip => clip.name === name);
        }
        return null;
    }

    private onTTSFlowCompleted(data: any, context: ChatPanelCtrl) {
        this.enterUserSpeakState();
        this.updateLastEventTime();
    }

    private onTTSFlowStart(data: any, context: ChatPanelCtrl) {
        if (this.chatState == ChatState.Mute) {
            return;
        }

        if (context.chatState != ChatState.OpponentSpeaking) {
            context.enterState(ChatState.OpponentSpeaking);
        }
        const ttsUid: number = Number(data.ttsUid);
        const chatmessage = this.chatMessageCachesMap.get(ttsUid);

        if (chatmessage) {
            this.showSubtitle(this.chatMessageCachesMap.get(ttsUid), ttsUid, 0);
        }
        else {
            DebugLog.instance.log("chatMessageCachesMap lost data, ttsUid == " + ttsUid);
        }

        context.updateLastEventTime();
    }

    private onWaittingEvent(data: any, context: ChatPanelCtrl) {
        if (this.chatState == ChatState.Mute) {
            return;
        }
        context.waittingLabel.string = data.message;
        context.enterState(ChatState.Loading);
        context.updateLastEventTime();
    }

    private onASRConnected(data: any, context: ChatPanelCtrl) {
        context.enterState(ChatState.ReceivingSpeech);
        context.updateLastEventTime();
    }

    private enterUserSpeakState() {
        this.chatFlowModel.onOpenASR();
    }

    private onGetChatMessage(data: any, context: ChatPanelCtrl) {
        if (this.chatState == ChatState.Mute) {
            return;
        }
        DebugLog.instance.log("onGetChatMessage View Get ========= Message : " + data.message + ",seq : " + data.seq);
        context.updateLastEventTime();
        const { message, seq, speaker, ttsUid } = data;

        DebugLog.instance.log("chatMessageCachesMap push data, seq == " + ttsUid + "   ----   " + message);
        if (speaker == 0) {
            this.chatMessageCachesMap.set(ttsUid, message);
        }
        else {
            this.showSubtitle(message, 0, 1);
        }
    }

    private showSubtitle(message: string, seq: number, speaker: 0 | 1) {
        this.subtitlesLabel.string = this.speakerTitle[speaker] + message;
        this.currentSpeechSeq = seq;
    }

    private hideSubtitle(delay: number = 0) {
        this.currentSpeechSeq = -1;
        this.subtitlesLabel.string = "";
    }
}


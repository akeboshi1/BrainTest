import { _decorator, Animation, AnimationClip, Component, instantiate, Label, Node, Prefab, UITransform, WebView } from 'cc';
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
    CanReceiveSpeech = "reciveingSpeeshState_waitting",
    OpponentSpeaking = "opponentSpeakingState",
    Sleeping = "asrSleeping"
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

    @property([Prefab])
    private chatBubblePrefab: Prefab[] = [];

    @property({ type: Node })
    private chatBubbleParentNode: Node = null;

    @property({ type: FrameComponent })
    private frameComponent: FrameComponent = null;

    private chatBubbleNodeMap: Map<string, Node> = null;

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
        while (this.chatBubbleNodeMap.size > 0) {
            const oldestBubbleSeq = this.getOldestBubbleSeq();
            const oldestBubbleNode = this.chatBubbleNodeMap.get(oldestBubbleSeq);
            if (oldestBubbleNode) {
                oldestBubbleNode.removeFromParent();
                this.chatBubbleNodeMap.delete(oldestBubbleSeq);
            }
        }
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
        this.chatFlowModel.onCloseTTS();
        this.enterUserSpeakState();

        let lastEntry;
        for (const value of this.chatBubbleNodeMap.values()) {
            lastEntry = value;
        }
        lastEntry.getComponent(ChatBubbleCtrl).stopTyping();
    }

    public clickAwakeFromSleeping() {
        this.enterState(ChatState.Loading);
        this.enterUserSpeakState();
        this.updateLastEventTime();
    }

    public clickBackButton() {
        this.fadeOut();
        EventManager.getInstance().emit(ChatPanelCtrl.ChatPanelCloseEvent, {});
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
            if (this.chatState == ChatState.CanReceiveSpeech || this.chatState == ChatState.ReceivingSpeech) {
                this.enterState(ChatState.Sleeping);
                this.chatFlowModel.onCloseASR();
            }
        }

        if (this.chatStateChanged()) {
            this.lastChatState = this.chatState;
            this.playAnimationByState(this.chatState);
        }
    }

    private playAnimationByState(state: ChatState) {
        let clipToPlay: AnimationClip = this.getAnimationClipByName(this.chatStateAnimNode, state);

        if (state == ChatState.OpponentSpeaking) {
            this.frameComponent.playAnimation("speaking", 24);
        }
        else {
            this.frameComponent.playAnimation("idle", 24);
        }

        if (clipToPlay) {
            const animationComponent = this.chatStateAnimNode.getComponent(Animation);
            animationComponent.play(clipToPlay.name);
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
        context.enterUserSpeakState();
        context.updateLastEventTime();
    }

    private onTTSFlowStart(data: any, context: ChatPanelCtrl) {
        if (context.chatState != ChatState.OpponentSpeaking) {
            context.enterState(ChatState.OpponentSpeaking);
        }
        context.updateLastEventTime();
    }

    private onWaittingEvent(data: any, context: ChatPanelCtrl) {
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
        DebugLog.instance.log("onGetChatMessage View Get ========= Message : " + data.message + ",seq : " + data.seq);
        context.updateLastEventTime();
        const { message, seq, speaker } = data;

        // 创建一个Map用于存放以序号为键，对应的聊天气泡节点为值的键值对（如果还未创建的话）
        if (!context.chatBubbleNodeMap) {
            context.chatBubbleNodeMap = new Map();
        }

        // 根据说话人获取对应的聊天气泡预制体
        const bubblePrefab = context.chatBubblePrefab[speaker];
        if (bubblePrefab) {
            let newBubbleNode = context.chatBubbleNodeMap.get(seq);
            if (!newBubbleNode) {
                // 检查聊天气泡数量，如果超过4个，移除最旧的聊天气泡
                if (context.chatBubbleNodeMap.size >= 4) {
                    const oldestBubbleSeq = context.getOldestBubbleSeq();
                    const oldestBubbleNode = context.chatBubbleNodeMap.get(oldestBubbleSeq);
                    if (oldestBubbleNode) {
                        context.removeBubble(oldestBubbleNode);
                        context.chatBubbleNodeMap.delete(oldestBubbleSeq);
                    }
                }
                // 实例化预制体
                newBubbleNode = instantiate(bubblePrefab);
                // 添加到聊天气泡父容器下
                context.chatBubbleParentNode.addChild(newBubbleNode);

                // 根据说话人设置位置（0左对齐，1右对齐），这里简单示例设置x坐标，你可按需调整具体位置布局逻辑
                if (speaker === 0) {
                    newBubbleNode.setPosition(-newBubbleNode.getComponent(UITransform).width / 2, 0);
                } else {
                    newBubbleNode.setPosition(newBubbleNode.getComponent(UITransform).width / 2, 0);
                }

                // 将新创建的聊天气泡节点存入Map，键为序号
                context.chatBubbleNodeMap.set(seq, newBubbleNode);
            }

            let ctb: ChatBubbleCtrl = newBubbleNode.getComponent(ChatBubbleCtrl);
            if (ctb) {
                if (speaker == 0) {
                    ctb.typeText(message);
                } else {
                    ctb.typeText(message, 0.5);
                }
            }

        }
    }

    private getOldestBubbleSeq(): string {
        return this.chatBubbleNodeMap.keys().next().value;
    }

    private removeBubble(bubbleNode: Node) {
        const animationComponent = bubbleNode.getComponent(Animation);
        if (animationComponent) {
            const fadeOutClip = this.getAnimationClipByName(bubbleNode, 'chatBubbleFadeOut');
            if (fadeOutClip) {
                animationComponent.on(Animation.EventType.FINISHED, () => {
                    bubbleNode.removeFromParent();
                });
                animationComponent.play(fadeOutClip.name);
            }
        } else {
            bubbleNode.removeFromParent();
        }
    }
}


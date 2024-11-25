import { _decorator, Animation, AnimationClip, Component, instantiate, Node, Prefab, UITransform } from 'cc';
import { ChatFlowModel } from './Model/ChatFlowModel';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { DebugLog } from '../../../Core/Util/DebugLog';
import { ChatBubbleCtrl } from './ChatBubbleCtrl';
const { ccclass, property } = _decorator;

// 定义枚举类型ChatState来表示聊天状态
enum ChatState {
    Empty = "empty",
    Loading = "loadingState",
    ReceivingSpeech = "reciveingSpeeshState",
    CanReceiveSpeech = "reciveingSpeeshState_waitting",
    OpponentSpeaking = "opponentSpeakingState"
}

@ccclass('ChatPanelCtrl')
export class ChatPanelCtrl extends Component {
    private chatState:ChatState;
    private lastChatState:ChatState = ChatState.Empty;

    private chatFlowModel:ChatFlowModel = null;

    @property({ type: Node })
    private chatStateAnimNode: Node = null;

    @property([Prefab])
    private chatBubblePrefab: Prefab[] = [];

    @property({ type: Node })
    private chatBubbleParentNode: Node = null;

    private chatBubbleNodeMap: Map<string, Node> = null;

    start() {
        this.chatState = ChatState.Loading;
        this.playAnimationByState(this.chatState);
    }

    protected onEnable(): void {
        this.chatFlowModel = ChatFlowModel.getInstance();
        this.chatFlowModel.initEventList();
        EventManager.getInstance().on(ChatFlowModel.ChatMessageEvent,this.onGetChatMessage,this);
    }

    protected onDisable(): void {
        this.chatFlowModel.clearEventList();
        EventManager.getInstance().off(this.onGetChatMessage,this);
    }

    enterState(state:ChatState){
        if(state != this.chatState)
        {
            this.lastChatState = this.chatState;
            this.chatState = state;
        }
    }

    public clickGreeting(data:any){
        this.chatFlowModel.testTTS();
        // this.chatFlowModel.sendGreetingRequest().then(() => {
        //     console.log('Greeting request completed.');
        // }).catch((error) => {
        //     console.error('Error sending greeting request:', error);
        // });
    }

    private chatStateChanged(): boolean {
        return this.chatState != this.lastChatState;
    }

    update(deltaTime: number) {
        if (this.chatStateChanged()) {
            this.playAnimationByState(this.chatState);
        }
    }

    private playAnimationByState(state: ChatState) {
        let clipToPlay: AnimationClip = this.getAnimationClipByName(this.chatStateAnimNode,state);

        if (clipToPlay) {
            const animationComponent = this.chatStateAnimNode.getComponent(Animation);
            animationComponent.play(clipToPlay.name);
        }
    }

    private getAnimationClipByName(animNode:Node,name: string): AnimationClip {
        const animationComponent = animNode.getComponent(Animation);
        if (animationComponent) {
            const clips = animationComponent.clips;
            return clips.find(clip => clip.name === name);
        }
        return null;
    }

    private onGetChatMessage(data:any,context:ChatPanelCtrl){
        DebugLog.instance.log("ChatPanel View Get ========= Message : "+ data.message);
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

            let ctb:ChatBubbleCtrl = newBubbleNode.getComponent(ChatBubbleCtrl);
            if (ctb) {
                // 调用typeText方法显示文本内容
                ctb.typeText(message);
            }

        }
    }

    private getOldestBubbleSeq(): string {
        return this.chatBubbleNodeMap.keys().next().value;
    }

    private removeBubble(bubbleNode: Node) {
        const animationComponent = bubbleNode.getComponent(Animation);
        if (animationComponent) {
            const fadeOutClip = this.getAnimationClipByName(bubbleNode,'chatBubbleFadeOut');
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


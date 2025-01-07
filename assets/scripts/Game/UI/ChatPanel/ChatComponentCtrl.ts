import { _decorator, Component, Label } from 'cc';
import { ChatFlowModel } from './Model/ChatFlowModel';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
const { ccclass, property } = _decorator;

@ccclass('ChatComponentCtrl')
export class ChatComponentCtrl extends Component {
    @property(Label)
    textLabel:Label;

    private model:ChatFlowModel = null;

    private greetingMessages:string[] = [];

    start() {
        this.model = ChatFlowModel.getInstance();

        this.requestGreeting();
    }

    protected onEnable(): void {
        EventManager.getInstance().on(ChatFlowModel.ChatMessageEvent, this.onGetChatMessage, this);
    }

    protected onDisable(): void {
        EventManager.getInstance().off(ChatFlowModel.ChatMessageEvent, this);
    }

    private requestGreeting(){
        this.textLabel.string = "唤醒中...";
        this.model.sendChatRequest("",true);
    }

    private onGetChatMessage(data: any) {
        const { message, seq, speaker, ttsUid } = data;
        this.greetingMessages.push(message);
    }

    protected update(dt: number): void {
        
    }
}



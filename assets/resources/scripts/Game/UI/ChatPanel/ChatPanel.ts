import { _decorator, Color, Component, instantiate, Label, Node, ScrollView, Sprite, SpriteFrame, UITransform, tween, Vec3, view } from 'cc';
import { AISpeakingState, ChatConnectionState, ChatModel, MicrophoneState, SubtitleItem } from './Model/ChatModel';
import { LocalStorageKeyEnum, LocalStorageUtil } from '../../../Core/Util/LocalStorageUtil';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { PersonalCenterManager } from '../../PersonalCenterManager/PersonalCenterManager';
import { stat } from 'fs';
import { FrameComponent } from '../../../Core/Component/FrameComponent';
const { ccclass, property } = _decorator;

@ccclass('ChatPanel')
export class ChatPanel extends BasePanel {
    public static NAME = 'ChatPanel2';

    @property(Color)
    private userSublineColor: Color = new Color(255, 255, 255, 255);
    @property(Color)
    private aiSublineColor: Color = new Color(255, 255, 255, 255);

    @property(Label)
    private talkingLabel: Label = null;
    @property(Node)
    private talkingAnimNode: Node = null;

    @property(SpriteFrame)
    private microTurnOffSP: SpriteFrame = null;
    @property(SpriteFrame)
    private microTurnONSP: SpriteFrame = null;

    @property(Sprite)
    private microIcon: Sprite = null;
    @property(Node)
    private microBtnMask: Node = null;

    @property(Node)
    private sublineNode: Node = null;

    @property(Node)
    private sublineContainer: Node = null;

    @property(Label)
    private sublineBtnLabel: Label = null;

    @property(ScrollView)
    private sublineScrollView: ScrollView = null;

    @property(Node)
    private loadingNode: Node = null;

    @property(Node)
    private charactorNode: Node = null;

    @property(FrameComponent)
    private charactorFrame: FrameComponent = null;

    private _sublineBtnTurnOnStr: string = "开启字幕";
    private _sublineBtnTurnOffStr: string = "关闭字幕";
    private _sublineShowState: boolean = false;
    private _microOpenStr: string = "正在听";
    private _microCloseStr: string = "您已静音";

    private _chatModel: ChatModel = null;

    // 角色节点动画状态
    private _charactorAnimating: boolean = false;
    private _charactorCurrentState: number = 1; // 1: 状态1, 2: 状态2

    onEnable(): void {
        this._chatModel = ChatModel.getInstance();
        this._chatModel.init();
        this._chatModel.premissionProvider.addListener(this.onPremissionChanged.bind(this));
        this._chatModel.connectionStateProvider.addListener(this.onConnectionStateChanged.bind(this));
        this._chatModel.microphoneStateProvider.addListener(this.onMicrophoneStateChanged.bind(this));
        this._chatModel.subtitleListProvider.addListener(this.onSubtitleListChanged.bind(this));
        this._chatModel.aiSpeakingStateProvider.addListener(this.onAiSpeakerStatueChanged.bind(this));

        this._chatModel.getRecordingPermission();

        this.sublineScrollView.node.active = this._sublineShowState;
        this.charactorFrame.playAnimation("frame", 22, true, true);
    }

    onDisable(): void {
        this._chatModel.premissionProvider.removeAllListeners();
        this._chatModel.connectionStateProvider.removeAllListeners();
        this._chatModel.microphoneStateProvider.removeAllListeners();
        this._chatModel.subtitleListProvider.removeAllListeners();
        this._chatModel.aiSpeakingStateProvider.removeAllListeners();

        this._chatModel.endChat();
        this._chatModel.reset();
    }

    onSubtitleListChanged(subtitleList: SubtitleItem[]) {
        console.log("刷新测试界面：字幕列表： " + subtitleList);

        // 如果字幕列表为空，直接返回
        if (subtitleList.length === 0) {
            return;
        }

        // 获取最后一条字幕
        const lastSubtitle = subtitleList[subtitleList.length - 1];

        // 实例化新的字幕节点
        const newNode = instantiate(this.sublineNode);
        newNode.active = true;
        newNode.getComponent(Label).string = lastSubtitle.text;
        newNode.getComponent(Label).color = lastSubtitle.speaker == "assistant" ? this.aiSublineColor : this.userSublineColor;
        this.sublineContainer.addChild(newNode);
        newNode.setPosition(0, 0);

        // 检查子节点数量，如果超过20个，移除头部的节点
        while (this.sublineContainer.children.length > 20) {
            const firstChild = this.sublineContainer.children[0];
            this.sublineContainer.removeChild(firstChild);
        }

        // 延迟一帧调用，确保UI布局更新完成后再进行滚动判断
        this.scheduleOnce(() => {
            this.scrollToBottomIfNeeded();
        }, 0);
    }

    onAiSpeakerStatueChanged(state: AISpeakingState) {
        console.log("刷新测试界面：AI说话状态： " + state);
        this.talkingAnimNode.active = state == AISpeakingState.FINISHED;
        this.talkingLabel.node.active = state == AISpeakingState.FINISHED;
    }

    onPremissionChanged(bool: Boolean) {
        console.log("chatPanel：权限状态： " + bool);
        if (bool) {
            this.startChat();
        } else {
            UIManager.getInstance().hidePanel(ChatPanel.NAME);
        }
    }

    onClickCloseBtn() {
        UIManager.getInstance().hidePanel(ChatPanel.NAME);
    }

    startChat() {
        const token = LocalStorageUtil.get(LocalStorageKeyEnum.USER_TOKEN);
        const userData = PersonalCenterManager.getInstance().userInfoData;
        this._chatModel.startChat({ token: token, userNickName: userData.nickname, roleId: "1234567890" });
    }

    onClickMicroCtrlBtn() {
        switch (this._chatModel.microphoneStateProvider.data) {
            case MicrophoneState.CLOSED:
                this.openMicro();
                break;
            case MicrophoneState.OPEN:
                this.closeMicro();
                break;
            case MicrophoneState.PENDING:
            //doNothing
            default:
                break;
        }
    }

    openMicro() {
        this._chatModel.startRecording();
    }

    closeMicro() {
        this._chatModel.stopRecording();
    }

    onConnectionStateChanged(state: ChatConnectionState) {
        console.log("chatPanel：连接状态： " + state);
        if (state == ChatConnectionState.CONNECTED) {
            this.loadingNode.active = false;
        } else {
            this.loadingNode.active = true;
        }
    }

    onMicrophoneStateChanged(state: MicrophoneState) {
        console.log("chatPanel：麦克风状态:" + state);
        if (state == MicrophoneState.OPEN) {
            this.talkingLabel.string = this._microOpenStr;
            this.microIcon.spriteFrame = this.microTurnOffSP;
        } else if (state == MicrophoneState.CLOSED) {
            this.talkingLabel.string = this._microCloseStr;
            this.microIcon.spriteFrame = this.microTurnONSP;
        } else if (state == MicrophoneState.PENDING) {
            this.talkingLabel.string = "";
        }
        this.microBtnMask.active = state == MicrophoneState.PENDING;
    }

    onClickShowSublineBtn() {
        if (this._sublineShowState) {
            this.hideSubline();
            this.animateCharactorToState1();
        } else {
            this.showSubline();
            this.animateCharactorToState2();
        }
        this._sublineShowState = !this._sublineShowState;
    }

    showSubline() {
        this.sublineBtnLabel.string = this._sublineBtnTurnOffStr;
        this.sublineScrollView.node.active = true;
        this.scheduleOnce(() => {
            this.scrollToBottomIfNeeded();
        }, 0);
    }

    hideSubline() {
        this.sublineBtnLabel.string = this._sublineBtnTurnOnStr;
        this.sublineScrollView.node.active = false;
    }

    /**
     * 检查是否需要滚动到底部
     * 只有当字幕容器高度超过滚动视图高度时才滚动
     */
    private scrollToBottomIfNeeded(): void {
        if (!this.sublineScrollView || !this.sublineContainer) {
            return;
        }

        // 获取字幕容器的UITransform组件
        const containerTransform = this.sublineContainer.getComponent(UITransform);
        if (!containerTransform) {
            return;
        }

        // 获取滚动视图的UITransform组件
        const scrollViewTransform = this.sublineScrollView.node.getComponent(UITransform);
        if (!scrollViewTransform) {
            return;
        }

        // 比较容器高度和滚动视图高度
        const containerHeight = containerTransform.height;
        const scrollViewHeight = scrollViewTransform.height;

        // 只有当容器高度超过滚动视图高度时才滚动到底部
        if (containerHeight > scrollViewHeight) {
            this.sublineScrollView.scrollToBottom();
            console.log(`字幕容器高度(${containerHeight}) > 滚动视图高度(${scrollViewHeight})，滚动到底部`);
        } else {
            console.log(`字幕容器高度(${containerHeight}) <= 滚动视图高度(${scrollViewHeight})，无需滚动`);
        }
    }

    /**
     * 角色节点动画：从状态1移动到状态2
     * 状态1: x=0, y=200, scale=1
     * 状态2: x=-330, y=(屏幕高度/2-100), scale=0.4
     */
    public animateCharactorToState2(): void {
        if (!this.charactorNode) {
            return;
        }

        // 如果已经在状态2，不需要动画
        if (this._charactorCurrentState === 2) {
            return;
        }

        // 停止当前动画
        this.stopCharactorAnimation();

        this._charactorAnimating = true;

        // 获取屏幕高度
        const screenHeight = view.getVisibleSize().height;
        const targetY = screenHeight / 2 - 80;

        // 目标位置和缩放
        const targetPosition = new Vec3(-300, targetY, 0);
        const targetScale = new Vec3(0.4, 0.4, 1);

        // 执行动画
        this._charactorCurrentState = 2;
        tween(this.charactorNode)
            .to(0.5, {
                position: targetPosition,
                scale: targetScale
            }, {
                easing: 'cubicOut'
            })
            .call(() => {
                this._charactorAnimating = false;

                console.log('角色动画完成：移动到状态2');
            })
            .start();
    }

    /**
     * 角色节点动画：从状态2移动到状态1
     * 状态1: x=0, y=200, scale=1
     * 状态2: x=-330, y=(屏幕高度/2-100), scale=0.4
     */
    public animateCharactorToState1(): void {
        if (!this.charactorNode) {
            return;
        }

        // 如果已经在状态1，不需要动画
        if (this._charactorCurrentState === 1) {
            return;
        }

        // 停止当前动画
        this.stopCharactorAnimation();

        this._charactorAnimating = true;

        // 目标位置和缩放
        const targetPosition = new Vec3(0, 200, 0);
        const targetScale = new Vec3(1, 1, 1);

        // 执行动画
        this._charactorCurrentState = 1;
        tween(this.charactorNode)
            .to(0.5, {
                position: targetPosition,
                scale: targetScale
            }, {
                easing: 'cubicOut'
            })
            .call(() => {
                this._charactorAnimating = false;

                console.log('角色动画完成：移动到状态1');
            })
            .start();
    }

    /**
     * 检查角色节点是否正在动画中
     */
    public isCharactorAnimating(): boolean {
        return this._charactorAnimating;
    }

    /**
     * 获取角色节点当前状态
     * @returns 1: 状态1, 2: 状态2
     */
    public getCharactorCurrentState(): number {
        return this._charactorCurrentState;
    }

    /**
     * 强制停止角色节点动画
     */
    public stopCharactorAnimation(): void {
        if (this.charactorNode) {
            tween(this.charactorNode).stop();
            this._charactorAnimating = false;
            console.log('角色动画已停止');
        }
    }
}



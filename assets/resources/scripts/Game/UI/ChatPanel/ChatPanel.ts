import { _decorator, Color, Component, instantiate, Label, Node, ScrollView, Sprite, SpriteFrame, UITransform, tween, Vec3, view, Prefab, resources, UIOpacity } from 'cc';
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

    @property(Prefab)
    private sublinePrefab: Prefab = null;

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

    @property(Label)
    private loadingLabel: Label = null;

    @property(Node)
    private frameComponentNode: Node = null;

    @property(Node)
    private thinkingBubbleNode: Node = null;

    private _sublineBtnTurnOnStr: string = "开启字幕";
    private _sublineBtnTurnOffStr: string = "关闭字幕";
    private _sublineShowState: boolean = false;
    private _microOpenStr: string = "正在听";
    private _microCloseStr: string = "您已静音";

    private _chatModel: ChatModel = null;

    // 角色节点动画状态
    private _charactorAnimating: boolean = false;
    private _charactorCurrentState: number = 1; // 1: 状态1, 2: 状态2

    private _thinkingBubbleState: boolean = false;
    private _thinkingBubbleAnimating: boolean = false;

    private _loadingDotCount: number = 0;
    private _loadingAnimationRunning: boolean = false;

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
        this.loadFrameComponent();
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

    loadFrameComponent() {
        this.showLoadingAnimation();
        resources.load('texture/chatpanel/v2/charactor/denglijun', Prefab, (err, prefab) => {
            if (err) {
                console.log("loadFrameComponent error: " + err);
                this.hideLoadingAnimation();
                return;
            }
            const frameComponent = instantiate(prefab);
            this.frameComponentNode.addChild(frameComponent);
            frameComponent.getComponent(FrameComponent).playAnimation("frame", 22, true, true);
            this.hideLoadingAnimation();
        });
    }

    showLoadingAnimation() {
        this.loadingLabel.string = "形象加载中";
        this.loadingNode.active = true;
        this.startLoadingDotAnimation();
    }

    hideLoadingAnimation() {
        this.stopLoadingDotAnimation();
        this.loadingLabel.string = "";
        this.loadingNode.active = false;
    }

    onSubtitleListChanged(subtitleList: SubtitleItem[]) {
        console.log("刷新测试界面：字幕列表： " + subtitleList);

        // 如果字幕列表为空，直接返回
        if (subtitleList.length === 0) {
            return;
        }

        // 获取最后一条字幕和上一条字幕
        const lastSubtitle = subtitleList[subtitleList.length - 1];
        const beforeSubtitle = subtitleList.length > 1 ? subtitleList[subtitleList.length - 2] : null;

        // 判断是否是新段落：最新一条的speaker和上一条的不一样
        const isNewParagraph = !beforeSubtitle || lastSubtitle.speaker !== beforeSubtitle.speaker;

        if (isNewParagraph) {
            // 新段落：创建新的字幕节点
            const newNode = instantiate(this.sublinePrefab);
            newNode.active = true;
            const label = newNode.getChildByName("sublineLabel").getComponent(Label);
            label.string = lastSubtitle.text;
            label.color = lastSubtitle.speaker == "assistant" ? this.aiSublineColor : this.userSublineColor;
            this.sublineContainer.addChild(newNode);
            newNode.setPosition(0, 0);

            let iconUrl = '';
            if (lastSubtitle.speaker == "assistant") {
                iconUrl = 'texture/chatpanel/icon/icon_1/spriteFrame';
                if (this._thinkingBubbleState) {
                    this.hideThinkingBubble();
                }
            } else {
                let userData = PersonalCenterManager.getInstance().userInfoData;
                iconUrl = userData.gender == 1 ? 'textureV2/indexPage/male/spriteFrame' : 'textureV2/indexPage/female/spriteFrame';
                this.showThinkingBubble();
            }

            const sprite = newNode.getChildByName("icon").getComponent(Sprite);
            this.loadSprite(iconUrl).then(spriteFrame => {
                sprite.spriteFrame = spriteFrame;
            });
        } else {
            // 同一段落：在最后一个字幕节点中追加文本
            const lastChild = this.sublineContainer.children[this.sublineContainer.children.length - 1];
            if (lastChild) {
                const label = lastChild.getChildByName("sublineLabel").getComponent(Label);
                label.string += lastSubtitle.text;
            }
        }

        // 检查子节点数量，如果超过20个，移除头部的节点
        while (this.sublineContainer.children.length > 20) {
            const firstChild = this.sublineContainer.children[0];
            this.sublineContainer.removeChild(firstChild);
        }

        // 延迟一帧调用，确保UI布局更新完成后再进行滚动判断
        this.scheduleOnce(() => {
            this.scrollToBottomIfNeeded();
        }, 0.1);
    }

    async loadSprite(path: string): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            resources.load(path, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!spriteFrame) {
                    reject(new Error('Loaded sprite frame is null'));
                    return;
                }
                resolve(spriteFrame);
            });
        })
    }

    showThinkingBubble() {
        // 如果已经在显示状态，直接返回
        if (this._thinkingBubbleState) {
            return;
        }

        // 如果正在播放动画，先中断当前动画
        if (this._thinkingBubbleAnimating) {
            this.stopThinkingBubbleAnimation();
        }

        this._thinkingBubbleState = true;
        this._thinkingBubbleAnimating = true;
        this.thinkingBubbleNode.active = true;

        // 设置初始状态：缩放为0，透明度为0
        this.thinkingBubbleNode.setScale(0, 0, 1);
        this.thinkingBubbleNode.getComponent(UIOpacity).opacity = 0;

        // 弹出动画：缩放 + 淡入
        tween(this.thinkingBubbleNode)
            .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .call(() => {
                this._thinkingBubbleAnimating = false;
                console.log('思考气泡弹出动画完成');
            })
            .start();

        // 淡入动画
        tween(this.thinkingBubbleNode.getComponent(UIOpacity))
            .to(0.25, { opacity: 255 })
            .start();
    }

    hideThinkingBubble() {
        // 如果已经在隐藏状态，直接返回
        if (!this._thinkingBubbleState) {
            return;
        }

        // 如果正在播放动画，先中断当前动画
        if (this._thinkingBubbleAnimating) {
            this.stopThinkingBubbleAnimation();
        }

        this._thinkingBubbleState = false;
        this._thinkingBubbleAnimating = true;

        // 缩回动画：缩放 + 淡出
        tween(this.thinkingBubbleNode)
            .to(0.25, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
            .call(() => {
                this.thinkingBubbleNode.active = false;
                this._thinkingBubbleAnimating = false;
                console.log('思考气泡缩回动画完成');
            })
            .start();

        // 淡出动画
        tween(this.thinkingBubbleNode.getComponent(UIOpacity))
            .to(0.2, { opacity: 0 })
            .start();
    }

    onAiSpeakerStatueChanged(state: AISpeakingState) {
        console.log("刷新测试界面：AI说话状态： " + state);
        this.talkingAnimNode.active = state == AISpeakingState.FINISHED && this._chatModel.microphoneStateProvider.data == MicrophoneState.OPEN;
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
        this.talkingAnimNode.active = this._chatModel.aiSpeakingStateProvider.data == AISpeakingState.FINISHED && state == MicrophoneState.OPEN;
    }

    onClickShowSublineBtn() {
        if (this._sublineShowState) {
            this.hideSubline();
            this.animateCharactorToState1();
        } else {
            this.showSubline();
            this.scheduleOnce(() => {
                this.animateCharactorToState2();
            }, 0);
        }
        this._sublineShowState = !this._sublineShowState;
    }

    onClickCharactorBtn() {
        if (this._sublineShowState) {
            this.hideSubline();
            this.animateCharactorToState1();
            this._sublineShowState = !this._sublineShowState;
        }
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

        const targetY = this.sublineScrollView.node.position.y + 180;

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

    /**
     * 强制停止思考气泡动画
     */
    public stopThinkingBubbleAnimation(): void {
        if (this.thinkingBubbleNode) {
            tween(this.thinkingBubbleNode).stop();
            tween(this.thinkingBubbleNode.getComponent(UIOpacity)).stop();
            this._thinkingBubbleAnimating = false;
            console.log('思考气泡动画已停止');
        }
    }

    /**
     * 开始加载点动画
     */
    private startLoadingDotAnimation(): void {
        this.stopLoadingDotAnimation(); // 先停止之前的动画
        this._loadingDotCount = 0;
        this._loadingAnimationRunning = true;
        this.updateLoadingText();

        this.schedule(this.updateLoadingDots, 0.5); // 每0.5秒更新一次
    }

    /**
     * 更新加载点的定时器回调
     */
    private updateLoadingDots(): void {
        if (!this._loadingAnimationRunning) {
            return;
        }
        this._loadingDotCount = (this._loadingDotCount + 1) % 4; // 0, 1, 2, 3 循环
        this.updateLoadingText();
    }

    /**
     * 停止加载点动画
     */
    private stopLoadingDotAnimation(): void {
        this._loadingAnimationRunning = false;
        this.unschedule(this.updateLoadingDots);
    }

    /**
     * 更新加载文本
     */
    private updateLoadingText(): void {
        const dots = '.'.repeat(this._loadingDotCount);
        this.loadingLabel.string = `形象加载中${dots}`;
    }
}



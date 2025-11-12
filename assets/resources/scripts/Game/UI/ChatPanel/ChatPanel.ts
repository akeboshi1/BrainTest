import { _decorator, Color, Component, instantiate, Label, Node, ScrollView, Sprite, SpriteFrame, UITransform, tween, Vec3, view, Prefab, resources, UIOpacity, Quat } from 'cc';
import { AISpeakingState, ChatConnectionState, ChatModel, MicrophoneState, SubtitleItem } from './Model/ChatModel';
import { LocalStorageKeyEnum, LocalStorageUtil } from '../../../Core/Util/LocalStorageUtil';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { PersonalCenterManager } from '../../PersonalCenterManager/PersonalCenterManager';
import { stat } from 'fs';
import { FrameComponent } from '../../../Core/Component/FrameComponent';
import { ChatCharacter, ChatSong, AnimationTimelineNode, AnimationType } from './Model/ChatProtocol';
import { ChatCharactorChoosePanel } from './ChatCharactorChoosePanel';
import { BundleName } from '../../../Core/Manager/Load/BundleName';
import { ChatMusicPanel } from './ChatMusicPanel';
import { ChatSublineItem } from './ChatSublineItem';
import { DataProvider } from '../../../Core/Data/DataProvider';
import { DebugLog } from '../../../Core/Util/DebugLog';
import { AlertData, AlertManager } from '../../../Core/Manager/Alert/AlertManager';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
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
    @property(SpriteFrame)
    private microTurnUnavailableSP: SpriteFrame = null;

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

    @property(Node)
    private reloadCharactorBtn: Node = null;

    @property(Label)
    private charactorBtnLabel: Label = null;
    @property(Sprite)
    private charactorBtnIcon: Sprite = null;
    @property(Sprite)
    private charactorBtnBg: Sprite = null;
    @property(Color)
    private charactorBtnColor: Color = new Color(255, 255, 255, 255);

    @property(SpriteFrame)
    private musicBtnPerple: SpriteFrame = null;
    @property(SpriteFrame)
    private musicBtnWhite: SpriteFrame = null;
    @property(Sprite)
    private musicBtn: Sprite = null;

    @property(Node)
    private state3Node: Node = null;

    @property(Node)
    private sublineBtnNode: Node = null;
    @property(Node)
    private changeCharactorBtnNode: Node = null;

    @property(Label)
    private debugMusicTimeLineLabel: Label = null;

    private _sublineBtnTurnOnStr: string = "开启字幕";
    private _sublineBtnTurnOffStr: string = "关闭字幕";
    private _sublineShowState: boolean = false;
    private _subtitleIconSPMap: Map<string, DataProvider<SpriteFrame>> = null;

    private _microOpenStr: string = "正在听";
    private _microCloseStr: string = "您已静音";

    private _chatModel: ChatModel = null;

    // 角色节点动画状态
    private _charactorAnimating: boolean = false;
    private _charactorCurrentState: number = 1; // 1: 状态1, 2: 状态2, 3: 状态3
    private _lastCharactorState: number = 0;

    private _thinkingBubbleState: boolean = false;
    private _thinkingBubbleAnimating: boolean = false;

    private _loadingDotCount: number = 0;
    private _loadingAnimationRunning: boolean = false;

    private _framePath: string = 'texture/chatpanel/v2/charactor/denglijun_changfa';
    private _reloadPath: string = '';

    private _musicPanelShowState: boolean = false;

    // 队列化加载管理
    private _isLoadingFrameComponent: boolean = false;
    private _frameComponentQueue: string[] = [];

    private _musicBtnTween: any = null;

    // 测试相关变量
    private _testSubtitleList: SubtitleItem[] = [];
    private _testCounter: number = 0;
    private _testIsRunning: boolean = false;

    // 歌曲时间线相关变量
    private _songTimeline: AnimationTimelineNode[] = null;
    private _songTimelineCurrentAnimation: AnimationType = "idle";
    private _songTimelineCurrentIndex: number = 0;
    private _songStartTime: number = 0;
    private _songTimelineCallback: () => void = null;
    private _songTimelinePausedOffset: number = 0; // 暂停时的已播放时间偏移（秒）
    private _songTimelineIsPaused: boolean = false;

    onEnable(): void {
        this._chatModel = ChatModel.getInstance();
        this._chatModel.init();
        this._chatModel.initWebSocketListeners();
        this._chatModel.premissionProvider.addListener(this.onPremissionChanged.bind(this));
        this._chatModel.connectionStateProvider.addListener(this.onConnectionStateChanged.bind(this));
        this._chatModel.microphoneStateProvider.addListener(this.onMicrophoneStateChanged.bind(this));
        this._chatModel.subtitleListProvider.addListener(this.onSubtitleListChanged.bind(this));
        this._chatModel.aiSpeakingStateProvider.addListener(this.onAiSpeakerStatueChanged.bind(this));
        this._chatModel.charactorListProvider.addListener(this.onCharactorListChanged.bind(this));
        this._chatModel.charactorChoosenSkin.addListener(this.onCharactorChoosenSkinChanged.bind(this));
        this._chatModel.currentPlayingSongState.addListener(this.onCurrentPlayingSongStateChanged.bind(this));
        this._chatModel.currentPlayingSong.addListener(this.onCurrentPlayingSongChanged.bind(this));
        this._chatModel.getRecordingPermission();
        EventManager.getInstance().on(ChatModel.MONTH_USAGE_LIMIT_EXCEEDED_EVENT, this.onMonthUsageLimitExceeded, this);

        this.sublineScrollView.node.active = this._sublineShowState;

        this._chatModel.getCharactorList();

        UIManager.getInstance().registerPanel(ChatCharactorChoosePanel.NAME, BundleName.RESOURCES, "/prefab/ChatPanel/ChatCharactorChoosePanel", ChatCharactorChoosePanel);
        UIManager.getInstance().registerPanel(ChatMusicPanel.NAME, BundleName.RESOURCES, "/prefab/ChatPanel/ChatMusicPanel", ChatMusicPanel);

        // 测试字幕代码，每秒生成一段字幕，模拟用户和AI交替对话
        //this.startTestSubtitleGeneration();
    }

    onDisable(): void {
        this._chatModel.removeWebSocketListeners();
        this._chatModel.premissionProvider.removeAllListeners();
        this._chatModel.connectionStateProvider.removeAllListeners();
        this._chatModel.microphoneStateProvider.removeAllListeners();
        this._chatModel.subtitleListProvider.removeAllListeners();
        this._chatModel.aiSpeakingStateProvider.removeAllListeners();
        this._chatModel.charactorListProvider.removeAllListeners();
        this._chatModel.charactorChoosenSkin.removeAllListeners();
        this._chatModel.currentPlayingSongState.removeAllListeners();
        this._chatModel.currentPlayingSong.removeAllListeners();
        this._chatModel.endChat();
        this._chatModel.reset();

        // 清理加载队列
        this._frameComponentQueue = [];
        this._isLoadingFrameComponent = false;

        EventManager.getInstance().off(ChatModel.MONTH_USAGE_LIMIT_EXCEEDED_EVENT, this);

        if(this._subtitleIconSPMap != null){
            this._subtitleIconSPMap.forEach(spDataProvider => {
                spDataProvider.removeAllListeners();
            });
            this._subtitleIconSPMap.clear();
        }

        this._chatModel.getMonthUsage();
        // 停止测试
        this.stopTestSubtitleGeneration();

        // 停止歌曲时间线
        this.stopSongTimeline();
    }

    /**
     * 队列化加载帧组件
     * 如果正在加载中，会将请求添加到队列中等待执行
     * @param path 资源路径
     */
    loadFrameComponent(path: string) {
        // 如果正在加载，添加到队列中
        if (this._isLoadingFrameComponent) {
            this._frameComponentQueue.push(path);
            console.log(`loadFrameComponent: 正在加载中，已添加到队列。当前队列长度: ${this._frameComponentQueue.length}`);
            return;
        }

        // 直接执行加载
        this._executeLoadFrameComponent(path);
    }

    /**
     * 内部方法：实际执行加载帧组件的逻辑
     * @param path 资源路径
     */
    private _executeLoadFrameComponent(path: string) {
        // 标记为正在加载
        this._isLoadingFrameComponent = true;

        // 清理旧的组件
        this.frameComponentNode.removeAllChildren();

        this.showLoadingAnimation();

        resources.load(path, Prefab, (err, prefab) => {
            if (err) {
                console.log("loadFrameComponent error: " + err);
                this.hideLoadingAnimation();
                this.reloadCharactorBtn.active = true;
                this._reloadPath = path;
                
                // 标记加载完成，处理队列中的下一个任务
                this._isLoadingFrameComponent = false;
                this._processNextInQueue();
                return;
            }

            const frameComponent = instantiate(prefab);
            this.frameComponentNode.addChild(frameComponent);
            const aispeakingState = this._chatModel.aiSpeakingStateProvider.data;
            this.playFrameAnimation();
            this.hideLoadingAnimation();

            // 标记加载完成，处理队列中的下一个任务
            this._isLoadingFrameComponent = false;
            this._processNextInQueue();
        });
    }

    private getCurrentFrameAnimationName(): string {
        // 如果正在播放歌曲且有时间线配置，优先使用时间线动画状态
        const isPlayingSong = this._chatModel.currentPlayingSongState.data == "playing";
        if (isPlayingSong && this._songTimeline != null && this._songTimeline.length > 0) {
            return this._songTimelineCurrentAnimation;
        }

        // 否则使用原有的逻辑
        const aispeakingState = this._chatModel.aiSpeakingStateProvider.data;
        return aispeakingState == AISpeakingState.SPEAKING || isPlayingSong ? "talking" : "idle";
    }

    private getCurrentFramePerSecond(): number {
        const isPlayingSong = this._chatModel.currentPlayingSongState.data == "playing";
        return isPlayingSong ? 14 : 22;
    }

    /**
     * 处理队列中的下一个加载任务
     */
    private _processNextInQueue() {
        if (this._frameComponentQueue.length > 0) {
            const nextPath = this._frameComponentQueue.shift();
            console.log(`loadFrameComponent: 处理队列中的下一个任务: ${nextPath}`);
            this._executeLoadFrameComponent(nextPath);
        }
    }

    onClickReloadCharactorBtn() {
        this.reloadCharactorBtn.active = false;
        this.loadFrameComponent(this._reloadPath);
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

    private getSubtitleIconUrl(speaker: string): string {
        let iconUrl = '';
        if (speaker == "assistant" && this._chatModel.charactorChoosenSkin.data != null) {
            iconUrl = 'texture/chatpanel/icon/icon_' + this._chatModel.charactorChoosenSkin.data + '/spriteFrame';
        } else {
            let userData = PersonalCenterManager.getInstance().userInfoData;
            iconUrl = userData.gender == 1 ? 'textureV2/indexPage/male/spriteFrame' : 'textureV2/indexPage/female/spriteFrame';
        }
        return iconUrl;
    }

    private getSubtitleIconSPDataProvider(iconUrl: string): DataProvider<SpriteFrame> {
        if(this._subtitleIconSPMap == null){
            this._subtitleIconSPMap = new Map<string, DataProvider<SpriteFrame>>();
        }
        if(this._subtitleIconSPMap.has(iconUrl)){
            return this._subtitleIconSPMap.get(iconUrl);
        } else {
            let spDataProvider = new DataProvider<SpriteFrame>();
            this._subtitleIconSPMap.set(iconUrl, spDataProvider);
            resources.load(iconUrl, SpriteFrame, (err, spriteFrame) => {
                if(err){
                    DebugLog.instance.log("加载字幕图标失败：" + err);
                    return;
                }
                spDataProvider.data = spriteFrame;
            });
            return spDataProvider;
        }
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
            this.sublineContainer.addChild(newNode);
            newNode.setPosition(0, 0);

            newNode.getComponent(ChatSublineItem).setData({
                text: lastSubtitle.text,
                speaker: lastSubtitle.speaker,
                aiColor: this.aiSublineColor,
                userColor: this.userSublineColor,
                spDataProvider: this.getSubtitleIconSPDataProvider(this.getSubtitleIconUrl(lastSubtitle.speaker)),
            });

            if (lastSubtitle.speaker == "assistant") {
                if (this._thinkingBubbleState) {
                    this.hideThinkingBubble();
                }
            } else {
                this.showThinkingBubble();
            }

        } else {
            // 同一段落：在最后一个字幕节点中追加文本
            const lastChild = this.sublineContainer.children[this.sublineContainer.children.length - 1];
            if (lastChild) {
                lastChild.getComponent(ChatSublineItem).addSubtitleText(lastSubtitle.text);
            }
        }

        // 检查子节点数量，如果超过20个，移除头部的节点
        while (this.sublineContainer.children.length > 20) {
            const firstChild = this.sublineContainer.children[0];
            firstChild.getComponent(ChatSublineItem).removeAllListeners();
            this.sublineContainer.removeChild(firstChild);
        }

        // 延迟一帧调用，确保UI布局更新完成后再进行滚动判断
        this.scheduleOnce(() => {
            this.scrollToBottomIfNeeded();
        }, 0.1);
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
        // 如果正在连接中，优先显示loadingNode，不更新talkingLabel和talkingAnimNode
        if (this._chatModel.connectionStateProvider.data == ChatConnectionState.CONNECTING) {
            return;
        }
        
        // 只有连接成功后才更新显示
        if (this._chatModel.connectionStateProvider.data == ChatConnectionState.CONNECTED) {
            this.talkingAnimNode.active = state == AISpeakingState.FINISHED && this._chatModel.microphoneStateProvider.data == MicrophoneState.OPEN;
            this.talkingLabel.node.active = state == AISpeakingState.FINISHED;
        }

        this.playFrameAnimation();
    }

    onPremissionChanged(bool: Boolean) {
        console.log("chatPanel：权限状态： " + bool);
        if (bool) {
            this.startChat();
        } else {
            this.onClickCloseBtn();
        }
    }

    onCharactorListChanged(charactorMap: Map<number, ChatCharacter>) {
        this._chatModel.getChoosenCharactor();
    }

    onCharactorChoosenSkinChanged(skin: string) {
        console.log("刷新测试界面：已选择角色皮肤： " + skin);
        this._framePath = 'texture/chatpanel/v2/charactor/' + skin;
        this.loadFrameComponent(this._framePath);

        this.sublineContainer.children.forEach(child => {
            if(child.getComponent(ChatSublineItem).speaker == "assistant"){
                child.getComponent(ChatSublineItem).changeSpProvider(this.getSubtitleIconSPDataProvider(this.getSubtitleIconUrl(child.getComponent(ChatSublineItem).speaker)));
            }
        });
    }

    onMonthUsageLimitExceeded() {
        DebugLog.instance.log('ChatPanel: 使用限制超出');
        let alertData: AlertData = new AlertData();
        alertData.title = "温馨提示";
        alertData.message = "您本次的暖心聊天时长已经用完啦~";
        alertData.confirmButtonText = "我知道了";
        alertData.confirmCb = () => {
            this.onClickCloseBtn();
        };
        AlertManager.getInstance().showAlert(alertData);
    }

    onClickCloseBtn() {
        if(this._musicPanelShowState){
            UIManager.getInstance().hidePanel(ChatMusicPanel.NAME);
        }

        UIManager.getInstance().hidePanel(ChatPanel.NAME);
    }

    startChat() {
        // 没有获取数字人数据时，不做开启聊天操作
        if(this._chatModel.selectedCharactorId<=0)return;
        const token = LocalStorageUtil.get(LocalStorageKeyEnum.USER_TOKEN);
        const userData = PersonalCenterManager.getInstance().userInfoData;
        const roleId = this._chatModel.selectedCharactorId+"";
        this._chatModel.startChat({ token: token, userNickName: userData.nickname, roleId });
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
            // 连接成功后，更新talkingLabel的显示逻辑
            this.updateTalkingLabelDisplay();
        } else if(state == ChatConnectionState.DISCONNECTED){
            this.loadingNode.active = false;
        } else if(state == ChatConnectionState.CONNECTING){
            this.loadingNode.active = true;
            // 连接中时，隐藏talkingLabel，优先显示loadingNode
            this.talkingLabel.node.active = false;
            this.talkingAnimNode.active = false;
        }
    }

    /**
     * 更新talkingLabel的显示逻辑（连接成功后调用）
     */
    private updateTalkingLabelDisplay(): void {
        const microphoneState = this._chatModel.microphoneStateProvider.data;
        const aiSpeakingState = this._chatModel.aiSpeakingStateProvider.data;
        
        // 更新talkingLabel的文本
        if (microphoneState == MicrophoneState.OPEN) {
            this.talkingLabel.string = this._microOpenStr;
        } else if (microphoneState == MicrophoneState.CLOSED) {
            this.talkingLabel.string = this._microCloseStr;
        } else if (microphoneState == MicrophoneState.PENDING) {
            this.talkingLabel.string = "";
        }
        
        // 更新talkingLabel和talkingAnimNode的显示状态
        this.talkingLabel.node.active = aiSpeakingState == AISpeakingState.FINISHED;
        this.talkingAnimNode.active = aiSpeakingState == AISpeakingState.FINISHED && microphoneState == MicrophoneState.OPEN;
    }

    onMicrophoneStateChanged(state: MicrophoneState) {
        console.log("chatPanel：麦克风状态:" + state);
        // 如果正在连接中，优先显示loadingNode，不更新talkingLabel
        if (this._chatModel.connectionStateProvider.data == ChatConnectionState.CONNECTING) {
            return;
        }
        
        if (state == MicrophoneState.OPEN) {
            this.talkingLabel.string = this._microOpenStr;
        } else if (state == MicrophoneState.CLOSED) {
            this.talkingLabel.string = this._microCloseStr;
        } else if (state == MicrophoneState.PENDING) {
            this.talkingLabel.string = "";
        }
        this.microIcon.spriteFrame = this.getMicroIconSpriteFrame();
        this.microBtnMask.active = !this.getMicroAvailable();
        // 只有连接成功后才更新talkingAnimNode
        if (this._chatModel.connectionStateProvider.data == ChatConnectionState.CONNECTED) {
            this.talkingAnimNode.active = this._chatModel.aiSpeakingStateProvider.data == AISpeakingState.FINISHED && state == MicrophoneState.OPEN;
        }
    }

    private getMicroIconSpriteFrame(): SpriteFrame {
        let microphoneState = this._chatModel.microphoneStateProvider.data;
        let curmusic = this._chatModel.currentPlayingSong.data;
        if(curmusic != null){
            return this.microTurnUnavailableSP;
        } else {
            if(microphoneState == MicrophoneState.PENDING){
                return this.microTurnUnavailableSP;
            } else if(microphoneState == MicrophoneState.CLOSED){
                return this.microTurnONSP;
            } else if(microphoneState == MicrophoneState.OPEN){
                return this.microTurnOffSP;
            } else {
                return this.microTurnUnavailableSP;
            }
        }
    }

    private getMicroAvailable(): boolean {
        let microphoneState = this._chatModel.microphoneStateProvider.data;
        let curmusic = this._chatModel.currentPlayingSong.data;
        if(curmusic != null){
            return false;
        } else {
            return microphoneState != MicrophoneState.PENDING;
        }
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
     public animateCharactorToState3(): void {
        if (!this.charactorNode) {
            return;
        }

        // 如果已经在状态2，不需要动画
        if (this._charactorCurrentState === 3) {
            return;
        }

        // 停止当前动画
        this.stopCharactorAnimation();

        this._charactorAnimating = true;

        const targetY = this.state3Node.position.y;

        // 目标位置和缩放
        const targetPosition = new Vec3(0, targetY, 0);
        const targetScale = new Vec3(0.9, 0.9, 1);

        // 执行动画
        this._charactorCurrentState = 3;
        tween(this.charactorNode)
            .to(0.5, {
                position: targetPosition,
                scale: targetScale
            }, {
                easing: 'cubicOut'
            })
            .call(() => {
                this._charactorAnimating = false;

                console.log('角色动画完成：移动到状态3');
            })
            .start();
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

    public showCharactorChoosePanel():void {
        UIManager.getInstance().showPanel(ChatCharactorChoosePanel.NAME, {closeCallback: this.setCharactorBtnState.bind(this)});
        this.setCharactorBtnState(true);
    }

    public setCharactorBtnState(isShow: boolean):void {
        this.charactorBtnBg.color = isShow ? this.charactorBtnColor : Color.WHITE;
        this.charactorBtnIcon.color = isShow ? Color.WHITE : this.charactorBtnColor;
        this.charactorBtnLabel.color = isShow ? Color.WHITE : this.charactorBtnColor;
    }

    public showMusicPanel():void {
        if(this._musicPanelShowState){
            return;
        }
        this._chatModel.getMusicList();
        this._musicPanelShowState = true;
        this.musicBtn.spriteFrame = this.musicBtnWhite;
        this.onMusicPanelShow();
        UIManager.getInstance().showPanel(ChatMusicPanel.NAME, {chatModel: this._chatModel, closeCallback: this.onMusicPanelClose.bind(this)});
    }

    private onMusicPanelShow():void {
        this.hideSubline();
        this._lastCharactorState = this._charactorCurrentState;
        this.animateCharactorToState3();
        this.sublineBtnNode.active = false;
        this.changeCharactorBtnNode.active = false;
    }

    private onMusicPanelClose():void {
        this._musicPanelShowState = false;
        this.musicBtn.spriteFrame = this.musicBtnPerple;
        this.musicBtn.node.setRotation(Quat.IDENTITY);
        // 停止按钮旋转动画
        if(this._musicBtnTween){
            this._musicBtnTween.stop();
            this._musicBtnTween = null;
        }
        this.musicBtn.node.angle = 0;

        switch(this._lastCharactorState){
            case 1:
                this.animateCharactorToState1();
                break;
            case 2:
                this.animateCharactorToState2();
                break;
            case 3:
                this.animateCharactorToState3();
                break;
            default:
                break;
        }   
        this._lastCharactorState = 0;
        if(this._sublineShowState){
            this.showSubline();
        }else{
            this.hideSubline();
        }
        this.sublineBtnNode.active = true;
        this.changeCharactorBtnNode.active = true;
    }

    private onCurrentPlayingSongChanged(song: ChatSong) {
        // 停止之前的时间线计时器并重置所有状态
        this.stopSongTimeline();

        if (song == null) {
            // 歌曲为空，重置时间线状态
            this._songTimeline = null;
            this._songTimelineCurrentAnimation = "idle";
            // 清空调试标签
            if (this.debugMusicTimeLineLabel) {
                this.debugMusicTimeLineLabel.string = "";
            }
            this.playFrameAnimation();
            return;
        }

        // 获取该歌曲的时间线配置
        const timeline = this._chatModel.currentPlayingSongTimeline.data;
        if (timeline == null || timeline.length === 0) {
            DebugLog.instance.warn(`歌曲 ID ${song.id} 没有时间线配置`);
            this._songTimeline = null;
            this._songTimelineCurrentAnimation = "talking";
            // 清空调试标签
            if (this.debugMusicTimeLineLabel) {
                this.debugMusicTimeLineLabel.string = "";
            }
            this.playFrameAnimation();
            return;
        }

        // 初始化时间线
        this._songTimeline = timeline;

        // 如果当前正在播放，启动时间线计时器（会重置所有状态）
        if (this._chatModel.currentPlayingSongState.data === "playing") {
            this.startSongTimeline(true);
        } else {
            // 如果未播放，只设置初始状态
            this._songTimelineCurrentIndex = 0;
            this._songTimelineCurrentAnimation = timeline[0].animation;
            // 更新调试标签显示初始时间
            this.updateDebugTimeLineLabel(0);
        }

        this.playFrameAnimation();
    }


    private onCurrentPlayingSongStateChanged(state: "playing" | "paused" | "ended"):void {
        if(state === "playing"){
            if(!this._musicBtnTween){
                // 无限慢速旋转一圈需8秒左右（你可以调节时间）
                this._musicBtnTween = tween(this.musicBtn.node)
                    .by(8, { angle: 360 })
                    .repeatForever()
                    .start();
            }
            // 恢复或启动时间线计时器
            this.resumeSongTimeline();
        }else if(state === "paused"){
            if(this._musicBtnTween){
                this._musicBtnTween.stop();
                this._musicBtnTween = null;
            }
            // 恢复到初始角度、防止残留角度
            this.musicBtn.node.angle = 0;
            // 暂停时间线计时器
            this.pauseSongTimeline();
        }else if(state === "ended"){
            if(this._musicBtnTween){
                this._musicBtnTween.stop();
                this._musicBtnTween = null;
            }
            // 恢复到初始角度、防止残留角度
            this.musicBtn.node.angle = 0;
            // 停止并重置时间线计时器
            this._songTimelineCurrentAnimation = "idle";
            this.stopSongTimeline();
        }
        
        this.playFrameAnimation();
    }

    private playFrameAnimation():void {
        if(this.frameComponentNode.children.length > 0){
            this.frameComponentNode.children[0].getComponent(FrameComponent).playAnimation(this.getCurrentFrameAnimationName(), this.getCurrentFramePerSecond(), true, true);
        }
    }

    /**
     * 测试方法：每秒生成一段字幕
     * 模拟用户和AI交替对话
     */
    public startTestSubtitleGeneration(): void {
        if (this._testIsRunning) {
            console.log("字幕测试已在运行中");
            return;
        }

        this._testIsRunning = true;
        this._testSubtitleList = [];
        this._testCounter = 0;

        console.log("开始字幕测试，每秒生成一段字幕");

        // 立即生成第一条字幕
        this._generateTestSubtitle();

        // 每秒生成一条字幕
        this.schedule(this._generateTestSubtitle, 1.0);
    }

    /**
     * 停止字幕测试
     */
    public stopTestSubtitleGeneration(): void {
        if (!this._testIsRunning) {
            return;
        }

        this._testIsRunning = false;
        this.unschedule(this._generateTestSubtitle);
        this._testSubtitleList = [];
        this._testCounter = 0;

        console.log("已停止字幕测试");
    }

    /**
     * 内部方法：生成测试字幕
     */
    private _generateTestSubtitle(): void {
        this._testCounter++;

        // 交替生成用户和AI的字幕
        const speaker: 'user' | 'assistant' = this._testCounter % 2 === 1 ? 'user' : 'assistant';
        const speakerName = speaker === 'user' ? '用户' : 'AI助手';

        // 模拟不同的字幕文本
        const testTexts = [
            '这是第' + this._testCounter + '条测试字幕',
            '你好，这是' + speakerName + '在说话',
            '测试字幕内容：' + this._testCounter,
            '这是一段较长的测试字幕，用来测试字幕显示效果和换行功能。',
            '测试中：' + Date.now(),
        ];

        const text = testTexts[this._testCounter % testTexts.length];

        // 创建字幕项
        const subtitle: SubtitleItem = {
            id: `test_${Date.now()}_${this._testCounter}`,
            text: text,
            timestamp: Date.now(),
            speaker: speaker
        };

        // 添加到列表
        this._testSubtitleList.push(subtitle);

        // 调用 onSubtitleListChanged 方法
        this.onSubtitleListChanged(this._testSubtitleList);

        console.log(`生成测试字幕 #${this._testCounter}: [${speakerName}] ${text}`);
    }

    /**
     * 启动歌曲时间线计时器
     * @param reset 是否重置时间线和索引（新歌曲时设为true，恢复播放时设为false）
     */
    private startSongTimeline(reset: boolean = false): void {
        if (this._songTimeline == null || this._songTimeline.length === 0) {
            return;
        }

        // 如果已经启动，先停止
        if (this._songTimelineCallback) {
            this.unschedule(this._songTimelineCallback);
        }

        if (reset) {
            // 重置开始时间和索引
            this._songStartTime = Date.now();
            this._songTimelineCurrentIndex = 0;
            this._songTimelinePausedOffset = 0;
            this._songTimelineIsPaused = false;
            
            // 设置初始动画
            if (this._songTimeline.length > 0) {
                this._songTimelineCurrentAnimation = this._songTimeline[0].animation;
            }
        } else {
            // 恢复播放：调整开始时间，使其等于当前时间减去已播放时间
            this._songStartTime = Date.now() - this._songTimelinePausedOffset * 1000;
            this._songTimelineIsPaused = false;
        }

        // 创建回调函数并保存引用
        this._songTimelineCallback = () => {
            this.updateSongTimeline();
        };

        // 启动定时器，每0.1秒检查一次
        this.schedule(this._songTimelineCallback, 0.1);

        // 立即更新一次动画状态和调试标签
        const currentTime = reset ? 0 : (Date.now() - this._songStartTime) / 1000;
        this.updateDebugTimeLineLabel(currentTime);
        this.playFrameAnimation();
    }

    /**
     * 暂停歌曲时间线计时器
     */
    private pauseSongTimeline(): void {
        if (this._songTimeline == null || this._songTimeline.length === 0) {
            return;
        }

        if (this._songTimelineCallback) {
            this.unschedule(this._songTimelineCallback);
        }

        // 记录暂停时的已播放时间
        if (!this._songTimelineIsPaused) {
            const elapsedTime = (Date.now() - this._songStartTime) / 1000;
            this._songTimelinePausedOffset = elapsedTime;
            this._songTimelineIsPaused = true;
            
            // 更新调试标签显示（暂停时的当前时间）
            this.updateDebugTimeLineLabel(this._songTimelinePausedOffset);
            
            DebugLog.instance.log(`时间线已暂停，已播放时间: ${this._songTimelinePausedOffset.toFixed(2)}秒`);
        }
    }

    /**
     * 恢复歌曲时间线计时器（从暂停的位置继续）
     */
    private resumeSongTimeline(): void {
        if (this._songTimeline == null || this._songTimeline.length === 0) {
            return;
        }

        if (this._songTimelineIsPaused) {
            // 从暂停的位置恢复
            this.startSongTimeline(false);
            DebugLog.instance.log(`时间线已恢复，从 ${this._songTimelinePausedOffset.toFixed(2)}秒 继续播放`);
        } else {
            // 如果还没有开始过，正常启动
            this.startSongTimeline(true);
        }
    }

    /**
     * 停止歌曲时间线计时器并重置所有状态
     */
    private stopSongTimeline(): void {
        if (this._songTimelineCallback) {
            this.unschedule(this._songTimelineCallback);
            this._songTimelineCallback = null;
        }

        // 重置所有状态
        this._songTimelinePausedOffset = 0;
        this._songTimelineIsPaused = false;
        this._songTimelineCurrentIndex = 0;
        
        // 清空调试标签
        if (this.debugMusicTimeLineLabel) {
            this.debugMusicTimeLineLabel.string = "";
        }
        
        DebugLog.instance.log("时间线已停止并重置");
    }

    /**
     * 更新歌曲时间线状态
     */
    private updateSongTimeline(): void {
        if (this._songTimeline == null || this._songTimeline.length === 0) {
            return;
        }

        // 计算当前播放时间（秒）
        let currentTime = 0;
        if (this._songTimelineIsPaused) {
            // 暂停时使用已播放时间偏移
            currentTime = this._songTimelinePausedOffset;
        } else {
            // 播放时计算实时时间
            currentTime = (Date.now() - this._songStartTime) / 1000;
        }

        // 更新调试标签显示
        this.updateDebugTimeLineLabel(currentTime);

        if (this._songTimelineIsPaused) {
            return;
        }

        // 查找当前应该播放的动画
        // 从后往前查找最后一个不超过当前时间的时间点
        let targetIndex = 0;
        for (let i = this._songTimeline.length - 1; i >= 0; i--) {
            if (currentTime >= this._songTimeline[i].time) {
                targetIndex = i;
                break;
            }
        }

        // 如果索引发生变化，更新动画
        if (targetIndex !== this._songTimelineCurrentIndex) {
            this._songTimelineCurrentIndex = targetIndex;
            const newAnimation = this._songTimeline[targetIndex].animation;
            
            if (newAnimation !== this._songTimelineCurrentAnimation) {
                this._songTimelineCurrentAnimation = newAnimation;
                this.playFrameAnimation();
                DebugLog.instance.log(`时间线动画切换: ${newAnimation} (时间: ${currentTime.toFixed(2)}秒, 索引: ${targetIndex})`);
            }
        }
    }

    /**
     * 格式化时间为 mm:ss 格式
     * @param seconds 秒数
     * @returns 格式化后的时间字符串
     */
    private formatTime(seconds: number): string {
        const totalSeconds = Math.floor(seconds);
        const minutes = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * 更新调试时间线标签
     * @param currentTime 当前播放时间（秒）
     */
    private updateDebugTimeLineLabel(currentTime: number): void {
        if (!this.debugMusicTimeLineLabel) {
            return;
        }

        // 获取当前歌曲信息
        const currentSong = this._chatModel.currentPlayingSong.data;
        if (!currentSong || !currentSong.duration) {
            this.debugMusicTimeLineLabel.string = "";
            return;
        }

        // 格式化时间显示
        const currentTimeStr = this.formatTime(currentTime);
        const totalTimeStr = this.formatTime(currentSong.duration);
        this.debugMusicTimeLineLabel.string = `${currentTimeStr} / ${totalTimeStr}`;
    }
}



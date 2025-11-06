import { _decorator, Component, Label, Node, UITransform, VideoPlayer, Prefab, tween, Vec3, UIOpacity, VideoClip, native, sys, Texture2D, Scene, macro, Sprite, assetManager, ImageAsset, SpriteFrame } from 'cc';
import { FingerGameModel, FingerGameModelEvent } from './FingerGameModel';
import { fingerGameConfig, SectionConfig, SetConfig } from '../config/fingerGameConfig';
import { SegmentProgressBar } from './SegmentProgressBar';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { NativeEventManager } from '../../resources/scripts/Core/Manager/Event/NativeEventManager';
import { NativeEvent } from '../../resources/scripts/Core/Manager/Event/NativeEvent';
import { LocalStorageKeyEnum, LocalStorageUtil } from '../../resources/scripts/Core/Util/LocalStorageUtil';
import { FingerGameResultData, FingerGameResult } from './FingerGameResultData';
import { FingerGameSetFinishPanel, IFingerGameSetFinishPanelData } from './FingerGameSetFinishPanel';
import { FingerGameCompletePanel, IFingerGameCompletePanelData } from './FingerGameCompletePanel';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
import { IFingerActivity, IFingerActivityResult, IFingerActivityScore, IFingerSet } from './FingerGameProtocol';
import { DataProvider } from '../../resources/scripts/Core/Data/DataProvider';
import { GameType } from '../../resources/scripts/Core/Scene/SceneModel/BaseGameModel';
import { FingerGameSectionsSelectPanel } from './FingerGameSectionsSelectPanel';
import { FingerGameAnimationPanel } from './FingerGameAnimationPanel';
import { GlobalConfigManager } from '../../resources/scripts/Config/GlobalConfigManager';
import { Environment, PublishSettingConfig } from '../../app/PublishSettingConfig';
import { FingerGameSetsSelectPanel } from './FingerGameSetsSelectPanel';
const { ccclass, property } = _decorator;

@ccclass('FingerGameScene')
export class FingerGameScene extends Component {

    @property(Node)
    private gameViewNode: Node = null;

    @property(VideoPlayer)
    private videoPlayer: VideoPlayer = null;

    @property(Label)
    private titleLabel: Label = null;

    @property(Label)
    private countNumLabel: Label = null;

    @property(Node)
    private maskNode: Node = null;

    @property(UIOpacity)
    private countNumOpacity: UIOpacity = null;

    @property(SegmentProgressBar)
    private segmentProgressBar: SegmentProgressBar = null;

    @property(Label)
    private recorderResultLabel: Label = null;

    @property(Node)
    private skipButton: Node = null;

    @property(Node)
    private noticeNode: Node = null;

    @property(Label)
    private loadingLabel: Label = null;

    @property(Label)
    private debugLabel: Label = null;

    @property(Node)
    private titleBg: Node = null;

    @property(Node)
    private titleIcon: Node = null;

    @property(Node)
    private titleText: Node = null;

    @property(Node)
    private btnExit:Node = null;

    private _model: FingerGameModel = null;
    private _currentSetIndex: number = -1;
    private _currentSectionIndex: number = -1;
    private _isPlayingPreview: boolean = false;
    private _currentVideoDuration: number = 0;
    private _timers: any[] = [];
    private _previewVideoTimer: any = null;
    private _animationPanelTimer: any = null;

    private _absolutePath: string = '';
    private _isRecording: boolean = false;
    
    // 加载动画相关变量
    private _loadingDotCount: number = 1;
    private _loadingDotAnimStarted: boolean = false;

    private _finishPanelData: DataProvider<IFingerGameSetFinishPanelData> = null;
    private _completePanelData: DataProvider<IFingerGameCompletePanelData> = null;

    private _blackMaskUid: string = 'c78f6df5-23d8-4296-8ede-202c6e535fe0';
    private _leftrightRectUid: string = '6dfdc8c5-ad70-454f-b754-383a18e80c4a';
    private _emptyRectUid: string = '72391fb4-6ab4-47c9-8bc2-3d17c9197e33';

    private _sectionConfig: SectionConfig = null;

    // 首页配置相关属性
    private _configApplied: boolean = false; // 防止重复应用配置


    async onLoad() {
        // 注册面板
        UIManager.getInstance().registerPanel(FingerGameCompletePanel.NAME, BundleName.FINGERGAME, "panel/FingerGameCompletePanel", FingerGameCompletePanel);
        UIManager.getInstance().registerPanel(FingerGameSetFinishPanel.NAME, BundleName.FINGERGAME, "panel/FingerGameSetFinishPanel", FingerGameSetFinishPanel);
        UIManager.getInstance().registerPanel(FingerGameSectionsSelectPanel.NAME, BundleName.FINGERGAME, "panel/FingerGameSectionsSelectPanel", FingerGameSectionsSelectPanel);
        UIManager.getInstance().registerPanel(FingerGameAnimationPanel.NAME, BundleName.FINGERGAME, "panel/FingerGameAnimationPanel", FingerGameAnimationPanel);
        UIManager.getInstance().registerPanel(FingerGameSetsSelectPanel.NAME, BundleName.FINGERGAME, "panel/FingerGameSetsSelectPanel", FingerGameSetsSelectPanel);
        // 预加载所有面板预制体
        const panelNames = [
            FingerGameCompletePanel.NAME,
            FingerGameSetFinishPanel.NAME,
            FingerGameSectionsSelectPanel.NAME,
            FingerGameAnimationPanel.NAME,
            FingerGameSetsSelectPanel.NAME
        ];

        try {
            const result = await UIManager.getInstance().preloadPanels(panelNames);
            DebugLog.instance.log(`FingerGame面板预加载完成 - 成功: ${result.success.length}, 失败: ${result.failed.length}`);
        } catch (error) {
            DebugLog.instance.error('FingerGame面板预加载过程中出现错误:', error);
        }
    }



    start() {
        this.gameViewNode.active = false;
        this.btnExit.active = true;
        this.segmentProgressBar.node.active = false;
        this.skipButton.active = false;
        this._model = new FingerGameModel();
        this._model.init();
        // 获取相机权限
        this.getCameraPremission();

        // 应用首页配置
        this.applyIndexPageConfig();

        if (sys.platform === 'ANDROID') {
            NativeEventManager.getInstance().on(NativeEvent.CAMERARECORDERRESULT, this.onCameraRecorderResult, this);
            NativeEventManager.getInstance().on(NativeEvent.POSTVIDEODATAFINISHED, this.onPostVideoDataFinished, this);
            NativeEventManager.getInstance().on(NativeEvent.POSTVIDEODATAERROR, this.onPostVideoDataError, this);
        }

        this._model.on(FingerGameModelEvent.GET_SETS_FINISHED, this.onGetSetsFinished, this);
        this._model.on(FingerGameModelEvent.SKEWERSGAME_NEXT, this.onSkewersGameNext, this);
        this._model.on(FingerGameModelEvent.GET_ALL_TASK_ACTIVITIES_RESULT, this.onGetAllTaskActivitiesResult, this);
        this._model.on(FingerGameModelEvent.SELECT_EXPERIENCE_SECTION, this.onSelectExperienceSection, this);

        this._model.getSets();
    }

    private get currentSectionIndex(): number {
        return this._model.activity.seq - 1;
    }

    onSelectExperienceSection(sectionConfig: SectionConfig) {
        DebugLog.instance.log('onSelectExperienceSection ============= sectionConfig=' + sectionConfig.name);
        this._sectionConfig = sectionConfig;
        this.btnExit.active = true;
        this.noticeNode.active = true;
        this.titleLabel.string = "";
    }

    private onSkewersGameNext(setIndex: number){
        this.noticeNode.active = true;
        this.btnExit.active = true;
        this._currentSetIndex = setIndex;
        this._currentSectionIndex = 0;
        this.titleLabel.string = "";
    }

    onGetAllTaskActivitiesResult(data: IFingerActivityResult) {
        let panelData: IFingerGameCompletePanelData = {
            showStatue: true,
            data: data,
            goonHandler: this.handleSummaryBack.bind(this)
        };

        this._completePanelData.data = panelData;
    }

    onGetSetsFinished(data: IFingerSet[]) {
        let self = this;
        if (this._model.isExperienceMode()) {
            // 游戏大厅进入
            UIManager.getInstance().showPanel(FingerGameSectionsSelectPanel.NAME, { fingerSets: data, model: this._model },false, null, true, true).then(() => {
                self.gameViewNode.active = true;
                self.noticeNode.active = false;
                self.btnExit.active = false;
            });
        } else {
            // 主页面进入
            UIManager.getInstance().showPanel(FingerGameSetsSelectPanel.NAME, {fingerSets:data, model: this._model}, false, null, true, true).then(() => {
                self.gameViewNode.active = true;
                self.noticeNode.active = false;
                self.btnExit.active = false;
            });
        }
    }

    update(deltaTime: number) {
        if (this.videoPlayer.isPlaying) {
            const progress = this.videoPlayer.currentTime / this._currentVideoDuration;
            this.segmentProgressBar.setProgress(progress);
        }
    }

    /**
     * 恢复场景数据
     * @param setIndex 第几套
     * @param sectionIndex 第几节
     */
    public async restoreSceneData(setIndex: number, sectionIndex: number) {
        this._model.startTaskActivity();
        this.btnExit.active = true;
        this._currentSetIndex = setIndex;
        this._currentSectionIndex = sectionIndex;

        let title = "益脑手指操（" + (sectionIndex + 1) + "/" + this._model.activities.length + "）";
        this.titleLabel.string = title;

        const config = fingerGameConfig.fingerSets[setIndex]?.sections[this.currentSectionIndex];
        this._sectionConfig = config;
        DebugLog.instance.log('restoreSceneData ============= setIndex=' + setIndex + ' sectionIndex=' + sectionIndex);
        if (!config) {
            DebugLog.instance.error(`Invalid set or section index: set=${setIndex}, section=${sectionIndex}`);
            return;
        }

        // 重新激活进度条
        this.segmentProgressBar.node.active = true;

        // 显示相机预览
        this.showCameraPreview();

        // 加载视频
        try {
            this.showLoading();
            await this._model.loadVideoClips([
                config.previewVideo.path,
                config.demoVideo.path
            ]);
            this.hideLoading();
            // 开始播放预览视频
            this.playPreviewVideo(config);
        } catch (error) {
            DebugLog.instance.error('Failed to load videos:', error);
        }
    }

    //体验模式入口
    public async restoreSceneDataWithSectionConfig(sectionConfig: SectionConfig) {
        let title = "益脑手指操";
        this.titleLabel.string = title;
        const config = sectionConfig;

        // 重新激活进度条
        this.segmentProgressBar.node.active = true;

        // 显示相机预览
        this.showCameraPreview();

        // 加载视频
        try {
            this.showLoading();
            await this._model.loadVideoClips([
                config.previewVideo.path,
                config.demoVideo.path
            ]);
            this.hideLoading();
            this.videoPlayer.node.active = true;
            // 开始播放预览视频
            this.playPreviewVideo(sectionConfig);
        } catch (error) {
            DebugLog.instance.error('Failed to load videos:', error);
        }
    }

    private playPreviewVideo(config: SectionConfig) {
        const previewClip = this._model.getVideoClip(config.previewVideo.path);
        if (!previewClip) {
            DebugLog.instance.error('Preview video clip not found');
            return;
        }

        this.videoPlayer.node.active = true;
        this._isPlayingPreview = true;
        this._currentVideoDuration = config.previewVideo.duration;
        DebugLog.instance.log(`Playing preview video with duration: ${this._currentVideoDuration}`);
        this.videoPlayer.currentTime = 0;
        this.videoPlayer.clip = null;
        this.videoPlayer.clip = previewClip;
        this.segmentProgressBar.setProgress(0);
        this.videoPlayer.play();

        let topUid = this._sectionConfig.handMode === 1 ? this._leftrightRectUid : this._emptyRectUid;
        this.showImageOverlay(topUid, this._blackMaskUid);
        this.skipButton.active = true;

        // 用计时器控制播放完成
        this._previewVideoTimer = setTimeout(() => {
            this.onVideoCompleted();
        }, (this._currentVideoDuration + 0.1) * 1000);
        this._timers.push(this._previewVideoTimer);
    }

    skipPreviewVideo() {
        const endDuration = 5;
        this.seekToTime(this._currentVideoDuration - endDuration);
        this.skipButton.active = false;

        // 停止预览视频计时器
        if (this._previewVideoTimer) {
            clearTimeout(this._previewVideoTimer);
            this._previewVideoTimer = null;
        }

        // 启动5秒计时器
        this._previewVideoTimer = setTimeout(() => {
            this.onVideoCompleted();
        }, endDuration * 1000);
        this._timers.push(this._previewVideoTimer);
    }

    private playDemoVideo(config: SectionConfig) {
        if (!config) return;

        const demoClip = this._model.getVideoClip(config.demoVideo.path);
        if (!demoClip) {
            DebugLog.instance.error('Demo video clip not found');
            return;
        }

        this._isPlayingPreview = false;
        this._currentVideoDuration = config.demoVideo.duration;
        this.videoPlayer.clip = demoClip;
        this.segmentProgressBar.setProgress(0);
        this.videoPlayer.play();

        // 如果当前是会员，则开始录制
        if (!this._model.isExperienceMode() && this._model.isMember() && this._model.is_evaluable(this._currentSectionIndex)) {
            DebugLog.instance.log('开始录制 ----- ');
            this.startRecorder();
        }

        let topUid = this._sectionConfig.handMode === 1 ? this._leftrightRectUid : this._emptyRectUid;
        this.showImageOverlay(topUid);
        this.skipButton.active = false;
        // 用计时器控制播放完成
        const timer = setTimeout(() => {
            this._finishPanelData = new DataProvider<IFingerGameSetFinishPanelData>();
            if (!this._model.isExperienceMode() && this._model.isMember() && this._model.is_evaluable(this._currentSectionIndex)) {
                DebugLog.instance.log('停止录制 ----- ');
                this.stopRecorder();
            }
            
            this.onVideoCompleted();
        }, (this._currentVideoDuration + 0.1) * 1000);
        this._timers.push(timer);
    }

    private onVideoCompleted() {
        if (this._isPlayingPreview) {
            // 预览视频播放完成，等待3秒后播放演示视频
            const timer = setTimeout(() => {
                this.playDemoVideo(this._sectionConfig);
            }, 500);
            this._timers.push(timer);
        } else {
            // 演示视频播放完成，进入结算逻辑
            DebugLog.instance.log('视频播放完成，进入结算逻辑');
            this.videoPlayer.stop();

            this.hideCameraPreview();
            this.hideImageOverlay();
            this.videoPlayer.node.active = false;

            //播放完成的动画 3秒后自动关闭动画面板
            let self = this;
            UIManager.getInstance().showPanel(FingerGameAnimationPanel.NAME).then(() => {
                // 3秒后自动关闭动画面板
                self._animationPanelTimer = setTimeout(() => {
                    UIManager.getInstance().hidePanel(FingerGameAnimationPanel.NAME);
                    self.onAnimationPanelHide();
                }, 3000);
                self._timers.push(self._animationPanelTimer);
            });
        }
    }

    private onAnimationPanelHide() {
        this.segmentProgressBar.node.active = false;
        this.skipButton.active = false;
        this.btnExit.active = false;
        if (this._model.isExperienceMode()) {
            this._currentSectionIndex = this._model.currentSectionIndex;

            let self = this;
            UIManager.getInstance().showPanel(FingerGameSectionsSelectPanel.NAME, { fingerSets: this._model.fingerSets, model: this._model },false,null,true,true).then(() => {
                self.gameViewNode.active = true;
                self.noticeNode.active = false;
            });
        } else {
            let isLastSection = this._model.isLastSection;
            if (isLastSection) {
                this._completePanelData = new DataProvider<IFingerGameCompletePanelData>();
                let panelData: IFingerGameCompletePanelData = null;

                this._model.getAllTaskActivitiesResult();

                panelData = {
                    showStatue: false,
                    data: null,
                    goonHandler: this.handleSummaryBack.bind(this)
                };

                this._completePanelData.data = panelData;

                UIManager.getInstance().showPanel(FingerGameCompletePanel.NAME, this._completePanelData);
            } else {
                DebugLog.instance.log('nextActivity seq =============' + this._model.getNextActivity().seq);
                DebugLog.instance.log('currentSectionIndex =============' + this._currentSectionIndex);
                DebugLog.instance.log('fingerGameConfig.fingerSets.sections length =============' + fingerGameConfig.fingerSets[this._currentSetIndex].sections.length);
                let nextSectionName = fingerGameConfig.fingerSets[this._currentSetIndex].sections[this._model.getNextActivity().seq - 1].name;
                let nextSectionIconUrl = fingerGameConfig.fingerSets[this._currentSetIndex].sections[this._model.getNextActivity().seq - 1].icon;

                let panelData: IFingerGameSetFinishPanelData = {
                    showResult: false,
                    result: null,
                    nextSectionName: nextSectionName,
                    nextSectionIconUrl: nextSectionIconUrl,
                    back: this.handleSummaryBack.bind(this),
                    goNext: this.handleSummaryGoNext.bind(this),
                    reStart: this.handleSummaryReStart.bind(this)
                }
                this._finishPanelData.data = panelData;
                UIManager.getInstance().showPanel(FingerGameSetFinishPanel.NAME, this._finishPanelData);
            }
        }
    }

    public onClickExit() {
        this.gameViewNode.active = false;
        this.segmentProgressBar.node.active = false;
        this.skipButton.active = false;
        this.hideCameraPreview();
        this.hideImageOverlay();
        this.videoPlayer.node.active = false;
        this.videoPlayer.stop();
        this.segmentProgressBar.setProgress(0);
        this.stopRecorder(false);
        this.hideLoading();
        // 清理所有定时器
        this._timers.forEach(timer => clearTimeout(timer));
        this._timers = [];

        this._model.getSets();
    }

    onDestroy() {
        // 清理所有定时器
        this._timers.forEach(timer => clearTimeout(timer));
        this._timers = [];

        // 停止加载动画
        this._stopLoadingDotAnimation();

        // 停止视频播放
        if (this.videoPlayer && this.videoPlayer.isPlaying) {
            this.videoPlayer.stop();
        }

        // 停止录制
        this.stopRecorder(false);

        // 隐藏相机预览
        this.hideCameraPreview();
        this.hideImageOverlay();

        // 释放模型资源
        this._model.dispose();

        if (sys.platform === 'ANDROID') {
            NativeEventManager.getInstance().off(NativeEvent.CAMERARECORDERRESULT, this);
            NativeEventManager.getInstance().off(NativeEvent.POSTVIDEODATAFINISHED, this);
            NativeEventManager.getInstance().off(NativeEvent.POSTVIDEODATAERROR, this);
        }
    }

    onClickComfirmedNotice() {
        this.noticeNode.active = false;
        this.segmentProgressBar.node.active = true;
        if (this._model.isExperienceMode()) {
            this.restoreSceneDataWithSectionConfig(this._sectionConfig);
        } else {
            this.restoreSceneData(this._currentSetIndex, this._currentSectionIndex);
        }
    }

    getCameraPremission() {
        if (sys.platform === 'ANDROID') {
            DebugLog.instance.log('getCameraPremission =============');
            native.bridge.sendToNative(NativeEvent.CAMERA, 'getPremission');
        }
    }

    showCameraPreview() {
        if (sys.platform === 'ANDROID') {
            DebugLog.instance.log('showCameraPreview =============');
            native.bridge.sendToNative(NativeEvent.CAMERA, 'start');
            this.showImageOverlay(this._emptyRectUid, this._blackMaskUid);
        }
    }

    hideCameraPreview() {
        if (sys.platform === 'ANDROID') {
            DebugLog.instance.log('hideCameraPreview =============');
            native.bridge.sendToNative(NativeEvent.CAMERA, 'stop');
        }
    }

    showImageOverlay(topUid: string, bottomUid: string | null = null) {
        if (sys.platform === 'ANDROID') {
            DebugLog.instance.log('showImageOverlay =============');
            let arg1 = topUid;
            if (bottomUid) {
                arg1 = arg1 + ',' + bottomUid;
            }
            native.bridge.sendToNative(NativeEvent.CAMERAOVERLAY, arg1);
        }
    }

    hideImageOverlay() {
        if (sys.platform === 'ANDROID') {
            DebugLog.instance.log('hideImageOverlay =============');
            native.bridge.sendToNative(NativeEvent.CAMERAOVERLAYHIDE, '');
        }
    }

    startRecorder() {
        if (sys.platform === 'ANDROID') {
            if (this._isRecording) return;
            this._isRecording = true;
            DebugLog.instance.log('startRecorder =============');
            native.bridge.sendToNative(NativeEvent.CAMERARECORDER, 'start');
            this.recorderResultLabel.string = '录制中...';
        }
    }

    stopRecorder(save: boolean = true) {
        if (sys.platform === 'ANDROID') {
            if (!this._isRecording) return;
            this._isRecording = false;
            DebugLog.instance.log('stopRecorder =============');
            let parma = save ? 'stop' : 'stopWithoutSave';
            native.bridge.sendToNative(NativeEvent.CAMERARECORDER, parma);
            this.recorderResultLabel.string = '保存中...';
        }
    }

    onCameraRecorderResult(data: any) {
        DebugLog.instance.log('onCameraRecorderResult =============');
        DebugLog.instance.log(data);
        if (data.code === 0) {
            this._absolutePath = data.absolutePath;
            this.recorderResultLabel.string = this._absolutePath;
            DebugLog.instance.log('this._absolutePath =============');
            DebugLog.instance.log(this._absolutePath);

            this.PostVideoData();
        } else {
            this.recorderResultLabel.string = '保存失败';
        }
    }

    PostVideoData() {
        if (sys.platform === 'ANDROID') {
            DebugLog.instance.log('PostVideoData =============');

            const token = LocalStorageUtil.get(LocalStorageKeyEnum.USER_TOKEN);
            let task_id = this._model.getTaskId();
            DebugLog.instance.log('taskid = ' + task_id + ' =============');

            let group_size = 4;
            let post_data = {
                token: token,
                task_id: task_id,
                activity_id: this._model.activity.id,
                group_size: group_size,
                absolutePath: this._absolutePath,
                is_production: PublishSettingConfig.getInstance().getEnvironment() === Environment.PRODUCTION,
            }
            let json = JSON.stringify(post_data);
            DebugLog.instance.log('PostVideoData json =============');
            DebugLog.instance.log(json);
            native.bridge.sendToNative(NativeEvent.POSTVIDEO, json);
        }
    }

    onPostVideoDataFinished(data: FingerGameResultData) {
        DebugLog.instance.log('onPostVideoDataFinished =============');
        DebugLog.instance.log(JSON.stringify(data));

        // 使用新的数据类型处理结果
        const result = new FingerGameResult(data);

        if (result.isValid()) {
            this.recorderResultLabel.string = '上传成功';
            // 可以访问具体的得分数据
            DebugLog.instance.log(`任务ID: ${result.taskId}`);
            DebugLog.instance.log(`文件名: ${result.filename}`);
            DebugLog.instance.log(`左手平均分: ${result.avgLeftScore}`);
            DebugLog.instance.log(`右手平均分: ${result.avgRightScore}`);
            DebugLog.instance.log(`总组数: ${result.totalGroups}`);
            DebugLog.instance.log(`最高得分: ${result.maxScore}`);
            DebugLog.instance.log(`最低得分: ${result.minScore}`);

            // 遍历所有组的数据
            result.groups.forEach(group => {
                DebugLog.instance.log(`第${group.seq}组 - 左手: ${group.left_score}, 右手: ${group.right_score}`);
            });
        } else {
            this.recorderResultLabel.string = '上传失败';
        }
    }

    onPostVideoDataError(data: any) {
        DebugLog.instance.log('onPostVideoDataError =============');
        DebugLog.instance.log(data);
        this.recorderResultLabel.string = '上传出现错误';
    }

    handleSummaryBack() {
        let restoreData = SceneManager.getInstance().getRestoreData();
        if (restoreData && restoreData.gametype === GameType.GAME_CENTER) {
            SceneManager.getInstance().backToGameCenter();
        } else {
            SceneManager.getInstance().backToHall();
        }
    }

    handleSummaryGoNext() {
        this._currentSectionIndex++;
        this._model.addSectionIndex();
        this.restoreSceneData(this._currentSetIndex, this._currentSectionIndex);
    }

    handleSummaryReStart() {
        this.restoreSceneData(this._currentSetIndex, this._currentSectionIndex);
    }

    /**
     * 跳转到视频指定时间
     * @param targetTime 目标时间（秒）
     */
    public seekToTime(targetTime: number) {
        if (this.videoPlayer && this.videoPlayer.clip) {
            // 确保时间在有效范围内
            const duration = this._currentVideoDuration;
            const clampedTime = Math.max(0, Math.min(targetTime, duration));

            DebugLog.instance.log(`跳转到视频时间: ${clampedTime}秒`);
            this.videoPlayer.currentTime = clampedTime;

            // 更新进度条
            const progress = clampedTime / duration;
            this.segmentProgressBar.setProgress(progress);
        } else {
            DebugLog.instance.error('VideoPlayer 未初始化或没有视频剪辑');
        }
    }

    public showLoading() {
        this.loadingLabel.node.active = true;
        this._startLoadingDotAnimation();
    }
    
    
    public hideLoading() {
        this.loadingLabel.node.active = false;
        this._stopLoadingDotAnimation();
    }

    /**
     * 开始加载动画的点动画效果
     */
    private _startLoadingDotAnimation() {
        if (!this._loadingDotAnimStarted) {
            this._loadingDotAnimStarted = true;
            this._loadingDotCount = 1;
            this.schedule(() => {
                this._loadingDotCount = (this._loadingDotCount % 3) + 1;
                const dots = '.'.repeat(this._loadingDotCount);
                this.loadingLabel.string = `视频加载中${dots}`;
            }, 0.5, macro.REPEAT_FOREVER);
        }
    }

    /**
     * 停止加载动画的点动画效果
     */
    private _stopLoadingDotAnimation() {
        this.unscheduleAllCallbacks();
        this._loadingDotAnimStarted = false;
    }

    //debug------------------------------------------------------------------------------------------------
    debugCompletePanel() {
        let panelData: IFingerGameCompletePanelData = {
            showStatue: false,
            data: null,
            goonHandler: this.handleSummaryBack.bind(this)
        };

        this._completePanelData = new DataProvider<IFingerGameCompletePanelData>();
        this._completePanelData.data = panelData;

        this.scheduleOnce(() => {
            let newPanelData: IFingerGameCompletePanelData = {
                showStatue: true,
                data: {
                    task_id: 123,
                    left_overall_score: 70,
                    right_overall_score: 50,
                    activities: [{
                        id: 1,
                        seq: 1,
                        name: 'test',
                        is_evaluable: true,
                        left_score: 70,
                        right_score: 50,
                        completed_at: '2021-01-01 12:00:00'
                    }, {
                        id: 2,
                        seq: 2,
                        name: 'test2',
                        is_evaluable: true,
                        left_score: 80,
                        right_score: 60,
                        completed_at: '2021-01-01 12:00:00'
                    }, {
                        id: 3,
                        seq: 3,
                        name: 'test3',
                        is_evaluable: true,
                        left_score: 90,
                        right_score: 70,
                        completed_at: '2021-01-01 12:00:00'
                    }, {
                        id: 4,
                        seq: 4,
                        name: 'test4',
                        is_evaluable: true,
                        left_score: 100,
                        right_score: 100,
                        completed_at: '2021-01-01 12:00:00'
                    }, {
                        id: 5,
                        seq: 5,
                        name: 'test5',
                        is_evaluable: true,
                        left_score: 100,
                        right_score: 100,
                        completed_at: '2021-01-01 12:00:00'
                    }, {
                        id: 6,
                        seq: 6,
                        name: 'test6',
                        is_evaluable: true,
                        left_score: 100,
                        right_score: 100,
                        completed_at: '2021-01-01 12:00:00'
                    }, {
                        id: 7,
                        seq: 7,
                        name: 'test7',
                        is_evaluable: true,
                        left_score: 100,
                        right_score: 100,
                        completed_at: '2021-01-01 12:00:00'
                    }]
                },
                goonHandler: this.handleSummaryBack.bind(this)
            };
            this._completePanelData.data = newPanelData;
        }, 3);

        UIManager.getInstance().showPanel(FingerGameCompletePanel.NAME, this._completePanelData);
    }

    debugPostVideoDataFinished() {
        let data = new FingerGameResult({
            status: 200,
            data: {
                task_id: 123,
                filename: 'test.mp4',
                avg_left_score: 100,
                avg_right_score: 100,
                groups: [{
                    seq: 1,
                    left_score: 100,
                    right_score: 100,
                }, {
                    seq: 2,
                    left_score: 100,
                    right_score: 100,
                }, {
                    seq: 3,
                    left_score: 100,
                    right_score: 100,
                }, {
                    seq: 4,
                    left_score: 100,
                    right_score: 100,
                }]
            }
        });

        let isLastSection = false;
        let nextSectionName = isLastSection ? null : fingerGameConfig.fingerSets[this._currentSetIndex].sections[1].name;
        let nextSectionIconUrl = isLastSection ? null : fingerGameConfig.fingerSets[this._currentSetIndex].sections[1].icon;

        this._finishPanelData = new DataProvider<IFingerGameSetFinishPanelData>()
        let panelData: IFingerGameSetFinishPanelData = {
            showResult: false,
            result: null,
            nextSectionName: null,
            nextSectionIconUrl: null,
            back: this.handleSummaryBack.bind(this),
            goNext: this.handleSummaryGoNext.bind(this),
            reStart: this.handleSummaryReStart.bind(this)
        }

        this._finishPanelData.data = panelData;


        UIManager.getInstance().showPanel(FingerGameSetFinishPanel.NAME, this._finishPanelData);
    }

    debugShowImageOverlay() {
        this.showImageOverlay(this._leftrightRectUid, this._blackMaskUid);
    }

    debugShowImageOverlay2() {
        this.showImageOverlay(this._emptyRectUid);
    }

    /**
     * 应用首页配置到UI
     */
    async applyIndexPageConfig() {
        // 防止重复调用
        if (this._configApplied) {
            DebugLog.instance.log("FingerGameScene配置已经应用过，跳过重复调用");
            return;
        }
        
        DebugLog.instance.log("FingerGameScene开始应用首页配置");
        
        // 使用GlobalConfigManager的公共方法
        await GlobalConfigManager.getInstance().applyIndexPageConfig(
            this.titleBg,
            this.titleIcon,
            this.titleText
        );
        
        this._configApplied = true;
        DebugLog.instance.log("FingerGameScene首页配置应用完成");
    }

}



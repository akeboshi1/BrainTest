import { _decorator, Component, Label, Node, UITransform, VideoPlayer, ProgressBar, tween, Vec3, UIOpacity, VideoClip, native, sys, Texture2D } from 'cc';
import { FingerGameModel, FingerGameModelEvent } from './FingerGameModel';
import { fingerGameConfig, SectionConfig } from '../config/fingerGameConfig';
import { SegmentProgressBar } from './SegmentProgressBar';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { NativeEventManager } from '../../resources/scripts/Core/Manager/Event/NativeEventManager';
import { NativeEvent } from '../../resources/scripts/Core/Manager/Event/NativeEvent';
import { LocalStorageKeyEnum, LocalStorageUtil } from '../../resources/scripts/Core/Util/LocalStorageUtil';
import { FingerGameResultData, FingerGameResult } from './FingerGameResultData';
import { FingerGameSetFinishPanel, IFingerGameSetFinishPanelData } from './FingerGameSetFinishPanel';
import { FingerGameCompletePanel, IFingerGameCompleteData } from './FingerGameCompletePanel';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
import { IFingerActivity, IFingerActivityResult, IFingerActivityScore } from './FingerGameProtocol';
import { DataProvider } from '../../resources/scripts/Core/Data/DataProvider';
import { FingerGameSectionsPanel } from './FingerGameSectionsPanel';
const { ccclass, property } = _decorator;

@ccclass('FingerGameScene')
export class FingerGameScene extends Component {
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
    private debugLabel: Label = null;

    private _model: FingerGameModel = null;
    private _currentSetIndex: number = -1;
    private _currentSectionIndex: number = -1;
    private _isPlayingPreview: boolean = false;
    private _currentVideoDuration: number = 0;
    private _timers: any[] = [];
    private _previewVideoTimer: any = null;

    private _absolutePath: string = '';
    private _isRecording: boolean = false;

    private _finishPanelData: DataProvider<IFingerGameSetFinishPanelData> = null;
    private _completePanelData: DataProvider<IFingerGameCompleteData[]> = null;

    start() {
        this._model = new FingerGameModel();
        this._model.init();
        // 获取相机权限
        this.getCameraPremission();

        UIManager.getInstance().registerPanel(FingerGameCompletePanel.NAME, BundleName.FINGERGAME, "panel/FingerGameCompletePanel", FingerGameCompletePanel);
        UIManager.getInstance().registerPanel(FingerGameSetFinishPanel.NAME, BundleName.FINGERGAME, "panel/FingerGameSetFinishPanel", FingerGameSetFinishPanel);
        UIManager.getInstance().registerPanel(FingerGameSectionsPanel.NAME, BundleName.FINGERGAME, "panel/FingerGameSectionsPanel", FingerGameSectionsPanel);

        if (sys.platform === 'ANDROID') {
            NativeEventManager.getInstance().on(NativeEvent.CAMERARECORDERRESULT, this.onCameraRecorderResult, this);
            NativeEventManager.getInstance().on(NativeEvent.POSTVIDEODATAFINISHED, this.onPostVideoDataFinished, this);
            NativeEventManager.getInstance().on(NativeEvent.POSTVIDEODATAERROR, this.onPostVideoDataError, this);
        }

        this._model.on(FingerGameModelEvent.GET_LIST_FINISHED, this.onGetTaskListFinished, this);
        this._model.on(FingerGameModelEvent.GET_ALL_TASK_ACTIVITIES_RESULT, this.onGetAllTaskActivitiesResult, this);
        this._model.getTaskList();
    }

    onGetAllTaskActivitiesResult(data: IFingerActivityResult) {
        let panelData: IFingerGameCompleteData[] = [];
        for (let i = 0; i < data.activities.length; i++) {
            panelData.push({
                name: data.activities[i].name,
                status: data.activities[i].rating
            });
        }

        this._completePanelData.data = panelData;
    }

    onGetTaskListFinished(data: IFingerActivity[]) {
        let currentSectionIndex = this._model.currentSectionIndex;
        const setIndex = 0; // 默认第一套
        this._currentSetIndex = setIndex;
        this._currentSectionIndex = currentSectionIndex;
        this.noticeNode.active = true;

        //todo 创建一个新界面展示所有的section信息
        let sectionData: SectionConfig[] = [];
        for (let i = 0; i < data.length; i++) {
            sectionData.push(fingerGameConfig.fingerSets[setIndex].sections[data[i].id - 1]);
        }
        UIManager.getInstance().showPanel(FingerGameSectionsPanel.NAME, sectionData);
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

        this._currentSetIndex = setIndex;
        this._currentSectionIndex = sectionIndex;

        this.titleLabel.string = "益脑手指操（" + (sectionIndex + 1) + "/" + this._model.activities.length + "）";
        
        const config = fingerGameConfig.fingerSets[setIndex]?.sections[this._model.activity.id - 1];
        DebugLog.instance.log('restoreSceneData ============= setIndex=' + setIndex + ' sectionIndex=' + sectionIndex);
        if (!config) {
            DebugLog.instance.error(`Invalid set or section index: set=${setIndex}, section=${sectionIndex}`);
            return;
        }

        // 显示相机预览
        this.showCameraPreview();

        // 加载视频
        try {
            await this._model.loadVideoClips([
                config.previewVideo.path,
                config.demoVideo.path
            ]);

            // 开始播放预览视频
            this.playPreviewVideo();
        } catch (error) {
            DebugLog.instance.error('Failed to load videos:', error);
        }
    }

    private playPreviewVideo() {
        const config = fingerGameConfig.fingerSets[this._currentSetIndex]?.sections[this._model.activity.id - 1];
        if (!config) return;

        const previewClip = this._model.getVideoClip(config.previewVideo.path);
        if (!previewClip) {
            DebugLog.instance.error('Preview video clip not found');
            return;
        }

        this.videoPlayer.node.active = true;
        this._isPlayingPreview = true;
        this._currentVideoDuration = config.previewVideo.duration;
        DebugLog.instance.log(`Playing preview video with duration: ${this._currentVideoDuration}`);
        this.videoPlayer.clip = previewClip;
        this.segmentProgressBar.setProgress(0);
        this.videoPlayer.play();
        this.showImageOverlay();
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

    private playDemoVideo() {
        const config = fingerGameConfig.fingerSets[this._currentSetIndex]?.sections[this._model.activity.id - 1];
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
        if (this._model.isMember() && this._model.is_evaluable(this._currentSectionIndex)) {
            DebugLog.instance.log('开始录制 ----- ');
            this.startRecorder();
        }

        this.hideImageOverlay();
        this.skipButton.active = false;
        // 用计时器控制播放完成
        const timer = setTimeout(() => {
            this.onVideoCompleted();


            this._finishPanelData = new DataProvider<IFingerGameSetFinishPanelData>();
            if (this._model.isMember() && this._model.is_evaluable(this._currentSectionIndex)) {
                DebugLog.instance.log('停止录制 ----- ');
                this.stopRecorder();
            } else {
                DebugLog.instance.log('非会员，直接上传 ----- ');
                let postData: IFingerActivityScore = {
                    task_id: this._model.getTaskId(),
                    activity_id: this._model.activity.id,
                    avg_left_score: null,
                    avg_right_score: null,
                    groups: null
                }
                this._model.completeTaskActivity(postData);
                this.hideAllNativeNode();

                let isLastSection = this._model.isLastSection;
                let nextSectionName = isLastSection ? null : fingerGameConfig.fingerSets[this._currentSetIndex].sections[this._model.getNextActivity().id - 1].name;
                let nextSectionIconUrl = isLastSection ? null : fingerGameConfig.fingerSets[this._currentSetIndex].sections[this._model.getNextActivity().id - 1].icon;

                let panelData: IFingerGameSetFinishPanelData = {
                    result: null,
                    nextSectionName: nextSectionName,
                    nextSectionIconUrl: nextSectionIconUrl,
                    back: this.handleSummaryBack.bind(this),
                    goNext: this.handleSummaryGoNext.bind(this)
                }
                this._finishPanelData.data = panelData;
                UIManager.getInstance().showPanel(FingerGameSetFinishPanel.NAME, this._finishPanelData);
            }
        }, (this._currentVideoDuration + 0.1) * 1000);
        this._timers.push(timer);
    }

    private onVideoCompleted() {
        if (this._isPlayingPreview) {
            // 预览视频播放完成，等待3秒后播放演示视频
            const timer = setTimeout(() => {
                this.playDemoVideo();
                this.hideImageOverlay();
            }, 500);
            this._timers.push(timer);
        } else {
            // 演示视频播放完成，进入结算逻辑
            DebugLog.instance.log('视频播放完成，进入结算逻辑');
        }
    }

    public onClickExit() {
        this.hideAllNativeNode();

        SceneManager.getInstance().backToHall();

        // 清理所有定时器
        this._timers.forEach(timer => clearTimeout(timer));
        this._timers = [];
    }

    onDestroy() {
        // 清理所有定时器
        this._timers.forEach(timer => clearTimeout(timer));
        this._timers = [];

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

        this.restoreSceneData(this._currentSetIndex, this._currentSectionIndex);
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
            this.showImageOverlay();
        }
    }

    hideCameraPreview() {
        if (sys.platform === 'ANDROID') {
            DebugLog.instance.log('hideCameraPreview =============');
            native.bridge.sendToNative(NativeEvent.CAMERA, 'stop');
        }
    }

    showImageOverlay() {
        if (sys.platform === 'ANDROID') {
            DebugLog.instance.log('showImageOverlay =============');
            native.bridge.sendToNative(NativeEvent.CAMERAOVERLAY, 'edbdf22c-072e-4d09-9f60-b1431c2c35fb');
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
            this.hideAllNativeNode();

            UIManager.getInstance().showPanel(FingerGameSetFinishPanel.NAME, this._finishPanelData).then((isShow: boolean) => {
                this.PostVideoData();
            });
        } else {
            this.recorderResultLabel.string = '保存失败';
        }
    }

    PostVideoData() {
        if (sys.platform === 'ANDROID') {
            DebugLog.instance.log('PostVideoData =============');

            const token = LocalStorageUtil.get(LocalStorageKeyEnum.USER_TOKEN);
            let task_id = this._model.getTaskId();
            let group_size = 4;
            let post_data = {
                token: token,
                task_id: task_id,
                group_size: group_size,
                absolutePath: this._absolutePath,
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

            try {
                DebugLog.instance.log('准备创建postData =============');
                let postData: IFingerActivityScore = {
                    task_id: this._model.getTaskId(),
                    activity_id: this._model.activity.id,
                    avg_left_score: result.avgLeftScore,
                    avg_right_score: result.avgRightScore,
                    groups: result.groups
                }
                DebugLog.instance.log('postData创建完成 =============');
                DebugLog.instance.log(JSON.stringify(postData));

                DebugLog.instance.log('准备调用completeTaskActivity =============');
                this._model.completeTaskActivity(postData);
                DebugLog.instance.log('completeTaskActivity调用完成 =============');

                DebugLog.instance.log('准备创建panelData =============');
                let isLastSection = this._model.isLastSection;
                let nextSectionName = isLastSection ? null : fingerGameConfig.fingerSets[this._currentSetIndex].sections[this._model.getNextActivity().id - 1].name;
                let nextSectionIconUrl = isLastSection ? null : fingerGameConfig.fingerSets[this._currentSetIndex].sections[this._model.getNextActivity().id - 1].icon;

                let panelData: IFingerGameSetFinishPanelData = {
                    result: result,
                    nextSectionName: nextSectionName,
                    nextSectionIconUrl: nextSectionIconUrl,
                    back: this.handleSummaryBack.bind(this),
                    goNext: this.handleSummaryGoNext.bind(this)
                }
                DebugLog.instance.log('panelData创建完成 =============');
                DebugLog.instance.log(JSON.stringify(panelData));

                DebugLog.instance.log('this._finishPanelData =============');
                DebugLog.instance.log(this._finishPanelData);

                // 检查_finishPanelData是否已初始化
                if (!this._finishPanelData) {
                    DebugLog.instance.log('_finishPanelData未初始化，正在初始化 =============');
                    this._finishPanelData = new DataProvider<IFingerGameSetFinishPanelData>();
                }

                DebugLog.instance.log('准备设置_finishPanelData.data =============');
                this._finishPanelData.data = panelData;
                DebugLog.instance.log('_finishPanelData.data设置完成 =============');
            } catch (error) {
                DebugLog.instance.error('onPostVideoDataFinished执行过程中出现异常:', error);
                this.recorderResultLabel.string = '处理结果时出错';
            }
        } else {
            this.recorderResultLabel.string = '上传失败';
        }
    }

    onPostVideoDataError(data: any) {
        DebugLog.instance.log('onPostVideoDataError =============');
        DebugLog.instance.log(data);
        this.recorderResultLabel.string = '上传出现错误';
    }

    private hideAllNativeNode() {
        this.hideCameraPreview();
        this.hideImageOverlay();
        this.stopRecorder(false);
        this.videoPlayer.node.active = false;
    }

    handleSummaryBack() {
        SceneManager.getInstance().backToHall();
    }

    handleSummaryGoNext() {
        let isLastSection = this._model.isLastSection;
        if (isLastSection) {
            this._completePanelData = new DataProvider<IFingerGameCompleteData[]>();

            if (this._model.isMember()) {
                this._model.getAllTaskActivitiesResult();
            } else {
                let panelData: IFingerGameCompleteData[] = [];
                for (let i = 0; i < this._model.activities.length; i++) {
                    panelData.push({
                        name: fingerGameConfig.fingerSets[this._currentSetIndex].sections[this._model.activities[i].id - 1].name,
                        status: 0
                    });
                }

                this._completePanelData.data = panelData;
            }

            UIManager.getInstance().showPanel(FingerGameCompletePanel.NAME, this._completePanelData);
        } else {
            this._currentSectionIndex++;
            this._model.addSectionIndex();
            this.restoreSceneData(this._currentSetIndex, this._currentSectionIndex);
        }
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

    //debug
    debugCompletePanel() {
        let panelData: IFingerGameCompleteData[] = [];
        panelData.push({
            name: '测试',
            status: 1
        });
        panelData.push({
            name: '测试2',
            status: 2
        });
        panelData.push({
            name: '测试3',
            status: 3
        });
        panelData.push({
            name: '测试4',
            status: null
        });

        this._completePanelData = new DataProvider<IFingerGameCompleteData[]>();

        setTimeout(() => {
            this._completePanelData.data = panelData;
        }, 3000);

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
            result: data,
            nextSectionName: nextSectionName,
            nextSectionIconUrl: nextSectionIconUrl,
            back: this.handleSummaryBack.bind(this),
            goNext: this.handleSummaryGoNext.bind(this)
        }
        setTimeout(() => {
            this._finishPanelData.data = panelData;
        }, 3000);

        UIManager.getInstance().showPanel(FingerGameSetFinishPanel.NAME, this._finishPanelData);
    }

    debugMemberState() {
        this._model._ismember = !this._model.isMember();
        this.debugLabel.string = this._model.isMember() ? "开" : "关";
    }

}



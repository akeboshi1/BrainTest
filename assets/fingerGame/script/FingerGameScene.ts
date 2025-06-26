import { _decorator, Component, Label, Node, UITransform, VideoPlayer, ProgressBar, tween, Vec3, UIOpacity, VideoClip, native, sys, Texture2D } from 'cc';
import { FingerGameModel } from './FingerGameModel';
import { fingerGameConfig } from '../config/fingerGameConfig';
import { SegmentProgressBar } from './SegmentProgressBar';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { FingerGameSelectSetPanel } from './FingerGameSelectSetPanel';
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { EventManager } from '../../resources/scripts/Core/Manager/Event/EventManager';
import { NativeEventManager } from '../../resources/scripts/Core/Manager/Event/NativeEventManager';
import { NativeEvent } from '../../resources/scripts/Core/Manager/Event/NativeEvent';
import { LocalStorageKeyEnum, LocalStorageUtil } from '../../resources/scripts/Core/Util/LocalStorageUtil';
import { SocketManager } from '../../resources/scripts/Core/Manager/Net/SocketManager';
import { SocketData } from '../../resources/scripts/Core/Manager/Net/SocketData';
import { FingerGameResultData, FingerGameResult } from './FingerGameResultData';
import { FingerGameSummaryPanel } from './FingerGameSummaryPanel';
const { ccclass, property } = _decorator;

@ccclass('FingerGameScene')
export class FingerGameScene extends Component {
    private static STARTTASK: string = "finger_exercise.start_task";

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

    @property(Texture2D)
    private cameraOverlay: Texture2D = null;

    @property(Label)
    private recorderResultLabel: Label = null;

    @property(Node)
    private skipButton: Node = null;

    @property(Node)
    private noticeNode: Node = null;

    private _model: FingerGameModel = null;
    private _currentSetIndex: number = -1;
    private _currentSectionIndex: number = -1;
    private _isPlayingPreview: boolean = false;
    private _currentVideoDuration: number = 0;
    private _timers: any[] = [];
    private _previewVideoTimer: any = null;

    private _absolutePath: string = '';
    private _task_id: string = '';
    private _isRecording: boolean = false;

    start() {
        this._model = new FingerGameModel();

        // 获取相机权限
        this.getCameraPremission();

        // 注册选择面板，但不自动显示
        UIManager.getInstance().registerPanel(FingerGameSelectSetPanel.NAME, BundleName.FINGERGAME, "panel/FingerGameSelectSetPanel", FingerGameSelectSetPanel);
        UIManager.getInstance().registerPanel(FingerGameSummaryPanel.NAME, BundleName.FINGERGAME, "panel/FingerGameSummaryPanel", FingerGameSummaryPanel);

        // 如果没有传入参数，则显示选择面板
        if (this._currentSetIndex === -1 && this._currentSectionIndex === -1) {
            UIManager.getInstance().showPanel(FingerGameSelectSetPanel.NAME);
        }

        // 监听FINGER_GAME_SECTION_SELECTED事件
        EventManager.getInstance().on('FINGER_GAME_SECTION_SELECTED', this.onSectionSelected, this);
        EventManager.getInstance().on(FingerGameScene.STARTTASK, this.onStartTaskResult, this);

        if (sys.platform === 'ANDROID') {
            NativeEventManager.getInstance().on(NativeEvent.CAMERARECORDERRESULT, this.onCameraRecorderResult, this);
            NativeEventManager.getInstance().on(NativeEvent.POSTVIDEODATAFINISHED, this.onPostVideoDataFinished, this);
            NativeEventManager.getInstance().on(NativeEvent.POSTVIDEODATAERROR, this.onPostVideoDataError, this);
        }

        this._task_id = Date.now().toString();
        this.startTask();
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
        this._currentSetIndex = setIndex;
        this._currentSectionIndex = sectionIndex;

        const config = fingerGameConfig.fingerSets[setIndex]?.sections[sectionIndex];
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
        const config = fingerGameConfig.fingerSets[this._currentSetIndex]?.sections[this._currentSectionIndex];
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
        const config = fingerGameConfig.fingerSets[this._currentSetIndex]?.sections[this._currentSectionIndex];
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
        this.startRecorder();
        this.hideImageOverlay();
        this.skipButton.active = false;
        // 用计时器控制播放完成
        const timer = setTimeout(() => {
            this.onVideoCompleted();
            this.stopRecorder();
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
        UIManager.getInstance().showPanel(FingerGameSelectSetPanel.NAME);

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

        // 移除事件监听
        EventManager.getInstance().off('FINGER_GAME_SECTION_SELECTED', this);
        if (sys.platform === 'ANDROID') {
            NativeEventManager.getInstance().off(NativeEvent.CAMERARECORDERRESULT, this);
            NativeEventManager.getInstance().off(NativeEvent.POSTVIDEODATAFINISHED, this);
            NativeEventManager.getInstance().off(NativeEvent.POSTVIDEODATAERROR, this);
        }
        EventManager.getInstance().off(FingerGameScene.STARTTASK, this);
    }

    private onSectionSelected(data: any) {
        // 处理FINGER_GAME_SECTION_SELECTED事件
        const setIndex = data.setIndex;
        const sectionIndex = data.sectionIndex;
        this._currentSetIndex = setIndex;
        this._currentSectionIndex = sectionIndex;

        this.noticeNode.active = true;
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
            this.PostVideoData();
        } else {
            this.recorderResultLabel.string = '保存失败';
        }
    }

    PostVideoData() {
        if (sys.platform === 'ANDROID') {
            DebugLog.instance.log('PostVideoData =============');

            const token = LocalStorageUtil.get(LocalStorageKeyEnum.USER_TOKEN);
            let task_id = this._task_id;
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
        DebugLog.instance.log(data);

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

            this.hideAllNativeNode();
            UIManager.getInstance().showPanel(FingerGameSummaryPanel.NAME, 
                { 
                    result: result, 
                    back: this.handleSummaryBack.bind(this), 
                    goNext: this.handleSummaryGoNext.bind(this) 
                }
            );
        } else {
            this.recorderResultLabel.string = '上传失败';
        }
    }

    debugPostVideoDataFinished() {
        let data: FingerGameResultData = {
            status: 1,
            data: {
                task_id: '1234567890',
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
                }],
            }
        }
        this.onPostVideoDataFinished(data);
    }

    onPostVideoDataError(data: any) {
        DebugLog.instance.log('onPostVideoDataError =============');
        DebugLog.instance.log(data);
        this.recorderResultLabel.string = '上传出现错误';
    }

    private startTask() {
        let socketData = new SocketData({
            action: FingerGameScene.STARTTASK,
            data: {
                task_id: this._task_id,
            }
        });
        SocketManager.getInstance().send(socketData);
    }

    private onStartTaskResult(data: any) {
        DebugLog.instance.log('onStartTaskResult =============');
        DebugLog.instance.log(data);
        this.recorderResultLabel.string = '任务开始';
    }

    private hideAllNativeNode() {
        this.hideCameraPreview();
        this.hideImageOverlay();
        this.stopRecorder(false);
        this.videoPlayer.node.active = false;
    }

    handleSummaryBack() {
        UIManager.getInstance().showPanel(FingerGameSelectSetPanel.NAME);
    }

    handleSummaryGoNext() {
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
}



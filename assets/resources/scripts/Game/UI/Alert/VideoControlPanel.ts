import { _decorator, Button, Component, Label, Node, VideoPlayer } from 'cc';
const { ccclass, property } = _decorator;

// 视频播放状态枚举
enum VideoPlayState {
    STOPPED = 0,  // 停止
    PLAYING = 1,  // 播放中
    PAUSED = 2    // 暂停
}

/**
 * 视频控制面板组件
 * 提供播放、暂停、停止功能
 */
@ccclass('VideoControlPanel')
export class VideoControlPanel extends Component {

    @property(VideoPlayer)
    videoPlayer: VideoPlayer = null;

    @property(Button)
    playPauseBtn: Button = null;

    @property(Label)
    playPauseLabel: Label = null;

    @property(Button)
    stopBtn: Button = null;

    @property(Label)
    stopLabel: Label = null;

    // 视频播放状态
    private videoPlayState: VideoPlayState = VideoPlayState.STOPPED;

    onLoad() {
        this.initVideoControl();
    }

    /**
     * 初始化视频控制
     */
    private initVideoControl() {
        if (this.videoPlayer) {
            // 设置视频播放器事件监听
            this.videoPlayer.node.on(VideoPlayer.EventType.PLAYING, this.onVideoPlaying, this);
            this.videoPlayer.node.on(VideoPlayer.EventType.PAUSED, this.onVideoPaused, this);
            this.videoPlayer.node.on(VideoPlayer.EventType.STOPPED, this.onVideoStopped, this);
            this.videoPlayer.node.on(VideoPlayer.EventType.COMPLETED, this.onVideoCompleted, this);
            
            // 初始化按钮状态
            this.updateButtonStates();
        }
    }

    /**
     * 播放/暂停按钮点击事件
     */
    onPlayPauseClick() {
        if (!this.videoPlayer) return;

        switch (this.videoPlayState) {
            case VideoPlayState.STOPPED:
                this.playVideo();
                break;
            case VideoPlayState.PLAYING:
                this.pauseVideo();
                break;
            case VideoPlayState.PAUSED:
                this.resumeVideo();
                break;
        }
    }

    /**
     * 停止按钮点击事件
     */
    onStopClick() {
        this.stopVideo();
    }

    /**
     * 播放视频
     */
    private playVideo() {
        if (this.videoPlayer) {
            this.videoPlayer.play();
            this.videoPlayState = VideoPlayState.PLAYING;
            this.updateButtonStates();
        }
    }

    /**
     * 暂停视频
     */
    private pauseVideo() {
        if (this.videoPlayer && this.videoPlayer.isPlaying) {
            this.videoPlayer.pause();
            this.videoPlayState = VideoPlayState.PAUSED;
            this.updateButtonStates();
        }
    }

    /**
     * 恢复视频播放
     */
    private resumeVideo() {
        if (this.videoPlayer) {
            this.videoPlayer.resume();
            this.videoPlayState = VideoPlayState.PLAYING;
            this.updateButtonStates();
        }
    }

    /**
     * 停止视频
     */
    private stopVideo() {
        if (this.videoPlayer) {
            this.videoPlayer.stop();
            this.videoPlayState = VideoPlayState.STOPPED;
            this.updateButtonStates();
        }
    }

    /**
     * 更新按钮状态
     */
    private updateButtonStates() {
        // 更新播放/暂停按钮
        if (this.playPauseLabel) {
            switch (this.videoPlayState) {
                case VideoPlayState.STOPPED:
                    this.playPauseLabel.string = "播放";
                    break;
                case VideoPlayState.PLAYING:
                    this.playPauseLabel.string = "暂停";
                    break;
                case VideoPlayState.PAUSED:
                    this.playPauseLabel.string = "继续";
                    break;
            }
        }

        // 更新停止按钮状态
        if (this.stopBtn) {
            this.stopBtn.interactable = this.videoPlayState !== VideoPlayState.STOPPED;
        }

        if (this.stopLabel) {
            this.stopLabel.string = "停止";
        }
    }

    /**
     * 视频开始播放事件
     */
    private onVideoPlaying() {
        this.videoPlayState = VideoPlayState.PLAYING;
        this.updateButtonStates();
    }

    /**
     * 视频暂停事件
     */
    private onVideoPaused() {
        this.videoPlayState = VideoPlayState.PAUSED;
        this.updateButtonStates();
    }

    /**
     * 视频停止事件
     */
    private onVideoStopped() {
        this.videoPlayState = VideoPlayState.STOPPED;
        this.updateButtonStates();
    }

    /**
     * 视频播放完成事件
     */
    private onVideoCompleted() {
        this.videoPlayState = VideoPlayState.STOPPED;
        this.updateButtonStates();
    }

    /**
     * 设置视频源
     * @param videoClip 视频剪辑
     */
    setVideoClip(videoClip: any) {
        if (this.videoPlayer) {
            this.videoPlayer.clip = videoClip;
            this.videoPlayer.resourceType = 0; // 设置为本地资源类型
            this.stopVideo(); // 重置播放状态
        }
    }

    /**
     * 设置远程视频URL
     * @param url 视频URL
     */
    setRemoteURL(url: string) {
        if (this.videoPlayer) {
            this.videoPlayer.remoteURL = url;
            this.stopVideo(); // 重置播放状态
        }
    }

    /**
     * 获取当前播放状态
     */
    getPlayState(): VideoPlayState {
        return this.videoPlayState;
    }

    /**
     * 获取视频播放器实例
     */
    getVideoPlayer(): VideoPlayer {
        return this.videoPlayer;
    }

    onDestroy() {
        // 移除事件监听
        if (this.videoPlayer) {
            this.videoPlayer.node.off(VideoPlayer.EventType.PLAYING, this.onVideoPlaying, this);
            this.videoPlayer.node.off(VideoPlayer.EventType.PAUSED, this.onVideoPaused, this);
            this.videoPlayer.node.off(VideoPlayer.EventType.STOPPED, this.onVideoStopped, this);
            this.videoPlayer.node.off(VideoPlayer.EventType.COMPLETED, this.onVideoCompleted, this);
        }
    }
} 
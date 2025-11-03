import { _decorator, Component, Node, VideoPlayer, Button, Label } from 'cc';
import { VideoControlPanel } from './VideoControlPanel';
const { ccclass, property } = _decorator;

/**
 * 视频控制使用示例
 * 展示如何在场景中设置和使用VideoControlPanel
 */
@ccclass('VideoControlExample')
export class VideoControlExample extends Component {

    @property(VideoControlPanel)
    videoControlPanel: VideoControlPanel = null;

    @property(VideoPlayer)
    videoPlayer: VideoPlayer = null;

    @property(Button)
    playButton: Button = null;

    @property(Button)
    pauseButton: Button = null;

    @property(Button)
    stopButton: Button = null;

    onLoad() {
        this.setupVideoControl();
    }

    /**
     * 设置视频控制
     */
    private setupVideoControl() {
        // 方法1：使用VideoControlPanel组件（推荐）
        if (this.videoControlPanel) {
            // 设置本地视频剪辑
            // this.videoControlPanel.setVideoClip(videoClip);
            
            // 或者设置远程视频URL
            this.videoControlPanel.setRemoteURL("https://example.com/tutorial.mp4");
            
            console.log("VideoControlPanel 已设置");
        }

        // 方法2：直接使用VideoPlayer（简单控制）
        if (this.videoPlayer) {
            // 设置视频属性
            this.videoPlayer.volume = 1.0;
            this.videoPlayer.loop = false;
            this.videoPlayer.playOnAwake = false;
            
            console.log("VideoPlayer 已设置");
        }
    }

    /**
     * 播放按钮点击事件
     */
    onPlayButtonClick() {
        if (this.videoControlPanel) {
            // 使用VideoControlPanel播放
            const videoPlayer = this.videoControlPanel.getVideoPlayer();
            if (videoPlayer) {
                videoPlayer.play();
            }
        } else if (this.videoPlayer) {
            // 直接使用VideoPlayer播放
            this.videoPlayer.play();
        }
    }

    /**
     * 暂停按钮点击事件
     */
    onPauseButtonClick() {
        if (this.videoControlPanel) {
            const videoPlayer = this.videoControlPanel.getVideoPlayer();
            if (videoPlayer && videoPlayer.isPlaying) {
                videoPlayer.pause();
            }
        } else if (this.videoPlayer && this.videoPlayer.isPlaying) {
            this.videoPlayer.pause();
        }
    }

    /**
     * 停止按钮点击事件
     */
    onStopButtonClick() {
        if (this.videoControlPanel) {
            const videoPlayer = this.videoControlPanel.getVideoPlayer();
            if (videoPlayer) {
                videoPlayer.stop();
            }
        } else if (this.videoPlayer) {
            this.videoPlayer.stop();
        }
    }

    /**
     * 设置视频URL
     */
    setVideoURL(url: string) {
        if (this.videoControlPanel) {
            this.videoControlPanel.setRemoteURL(url);
        } else if (this.videoPlayer) {
            this.videoPlayer.remoteURL = url;
        }
    }

    /**
     * 获取当前播放状态
     */
    getPlayState() {
        if (this.videoControlPanel) {
            return this.videoControlPanel.getPlayState();
        }
        return null;
    }
} 
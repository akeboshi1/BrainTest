# 视频控制功能使用说明

## 概述

本项目提供了两种视频控制方案：

1. **VideoControlPanel组件** - 完整的视频控制面板，包含播放/暂停和停止按钮
2. **直接VideoPlayer控制** - 简单的视频播放器控制

## 方案一：VideoControlPanel组件（推荐）

### 1. 组件特性

- 自动管理播放状态（停止、播放中、暂停）
- 智能按钮状态更新
- 完整的事件监听和清理
- 支持本地视频剪辑和远程URL

### 2. 在场景中使用

#### 步骤1：创建UI结构
```
VideoControlNode (挂载VideoControlPanel组件)
├── VideoPlayer (VideoPlayer组件)
├── PlayPauseButton (Button组件)
│   └── PlayPauseLabel (Label组件)
└── StopButton (Button组件)
    └── StopLabel (Label组件)
```

#### 步骤2：配置组件属性
在VideoControlPanel组件中设置：
- `videoPlayer`: 拖拽VideoPlayer组件
- `playPauseBtn`: 拖拽播放/暂停按钮
- `playPauseLabel`: 拖拽播放/暂停按钮的Label
- `stopBtn`: 拖拽停止按钮
- `stopLabel`: 拖拽停止按钮的Label

#### 步骤3：设置按钮事件
- PlayPauseButton的Click事件绑定到`VideoControlPanel.onPlayPauseClick`
- StopButton的Click事件绑定到`VideoControlPanel.onStopClick`

### 3. 代码使用示例

```typescript
// 获取VideoControlPanel组件
const videoControl = this.getComponent(VideoControlPanel);

// 设置本地视频剪辑
videoControl.setVideoClip(videoClip);

// 设置远程视频URL
videoControl.setRemoteURL("https://example.com/video.mp4");

// 获取播放状态
const playState = videoControl.getPlayState();

// 获取VideoPlayer实例
const videoPlayer = videoControl.getVideoPlayer();
```

### 4. 本地视频文件加载

```typescript
// 从resources目录加载本地视频文件
resources.load("mp4/finding_guide", VideoClip, (err, videoClip) => {
    if (err) {
        console.warn("加载视频失败:", err);
        return;
    }
    
    // 设置到VideoControlPanel
    videoControl.setVideoClip(videoClip);
});
```

## 方案二：直接VideoPlayer控制

### 1. 基本使用

```typescript
@property(VideoPlayer)
videoPlayer: VideoPlayer = null;

// 播放视频
this.videoPlayer.play();

// 暂停视频
if (this.videoPlayer.isPlaying) {
    this.videoPlayer.pause();
}

// 停止视频
this.videoPlayer.stop();

// 恢复播放
this.videoPlayer.resume();
```

### 2. 事件监听

```typescript
onLoad() {
    // 监听视频事件
    this.videoPlayer.node.on(VideoPlayer.EventType.PLAYING, this.onVideoPlaying, this);
    this.videoPlayer.node.on(VideoPlayer.EventType.PAUSED, this.onVideoPaused, this);
    this.videoPlayer.node.on(VideoPlayer.EventType.STOPPED, this.onVideoStopped, this);
    this.videoPlayer.node.on(VideoPlayer.EventType.COMPLETED, this.onVideoCompleted, this);
}

onVideoPlaying() {
    console.log("视频开始播放");
}

onVideoPaused() {
    console.log("视频已暂停");
}

onVideoStopped() {
    console.log("视频已停止");
}

onVideoCompleted() {
    console.log("视频播放完成");
}

onDestroy() {
    // 移除事件监听
    this.videoPlayer.node.off(VideoPlayer.EventType.PLAYING, this.onVideoPlaying, this);
    this.videoPlayer.node.off(VideoPlayer.EventType.PAUSED, this.onVideoPaused, this);
    this.videoPlayer.node.off(VideoPlayer.EventType.STOPPED, this.onVideoStopped, this);
    this.videoPlayer.node.off(VideoPlayer.EventType.COMPLETED, this.onVideoCompleted, this);
}
```

## 在GuidePanel中的使用

GuidePanel已经集成了视频控制功能：

### 1. 自动视频设置
根据训练类型自动加载对应的本地教程视频（不会自动播放）：

```typescript
private loadLocalVideo() {
    let videoPath = "";
    
    switch(this.gameName) {
        case BundleName.FINGING:
            videoPath = "mp4/finding_guide"; // 对应 mp4/finding_guide.mp4
            break;
        case BundleName.FANPAI:
            videoPath = "mp4/fanpai_guide"; // 对应 mp4/fanpai_guide.mp4
            break;
        case BundleName.CATCHFISH:
            videoPath = "video/fishguide"; // 对应 video/fishguide.mp4
            break;
        // ... 其他训练类型
    }
    
    if (videoPath) {
        // 从resources目录加载视频文件
        resources.load(videoPath, VideoClip, (err, videoClip) => {
            if (err) {
                console.warn(`加载视频失败: ${videoPath}`, err);
                return;
            }
            
            // 设置视频到播放器，但不自动播放
            this.videoPlayer.clip = videoClip;
            this.videoPlayer.playOnAwake = false; // 确保不会自动播放
        });
    }
}
```

### 2. 视频点击控制（推荐）
视频节点本身支持点击控制，无需额外按钮：

#### 功能特性
- **点击视频播放**：点击视频区域开始播放
- **点击视频暂停**：播放中途点击视频暂停播放
- **自动停止**：播放完成后自动停止
- **智能状态切换**：根据当前播放状态智能切换

#### 自动设置
代码会自动设置视频节点为可点击状态，无需手动配置。

### 3. 按钮控制设置（可选）
如果需要额外的控制按钮，可以在UI中设置：

#### 步骤1：创建控制按钮
在GuidePanel的预制体中添加视频控制按钮：
- 播放/暂停按钮
- 停止按钮（可选）

#### 步骤2：绑定按钮事件
在Cocos Creator编辑器中设置按钮的Click事件：
- 目标：GuidePanel节点
- 组件：GuidePanel
- 处理函数：`onPlayPauseClick` 或 `onVideoControlClick`

#### 步骤3：代码中的控制方法
```typescript
// 视频点击事件处理（自动调用）
onVideoClick() {
    if (this.videoPlayer.isPlaying) {
        this.pauseVideo();
    } else {
        this.playVideo();
    }
}

// 播放/暂停切换
onPlayPauseClick() {
    if (this.videoPlayer.isPlaying) {
        this.pauseVideo();
    } else {
        this.playVideo();
    }
}

// 播放视频
playVideo() {
    if (this.videoPlayer) {
        this.videoPlayer.play();
    }
}

// 暂停视频
pauseVideo() {
    if (this.videoPlayer && this.videoPlayer.isPlaying) {
        this.videoPlayer.pause();
    }
}

// 停止视频
stopVideo() {
    if (this.videoPlayer) {
        this.videoPlayer.stop();
    }
}

// 视频播放完成事件（自动调用）
onVideoCompleted() {
    console.log("视频播放完成");
    this.stopVideo(); // 自动停止
}
```

### 2. 外部控制接口
提供了外部调用的视频控制接口：

```typescript
// 播放视频
guidePanel.playVideo();

// 暂停视频
guidePanel.pauseVideo();

// 停止视频
guidePanel.stopVideo();
```

## 视频播放器属性设置

### 推荐设置
```typescript
videoPlayer.volume = 1.0;           // 音量
videoPlayer.loop = false;           // 不循环播放
videoPlayer.playOnAwake = false;    // 不自动播放
videoPlayer.keepAspectRatio = true; // 保持宽高比
videoPlayer.fullScreenOnAwake = false; // 不全屏播放
```

### 支持的视频格式
- **Web平台**: MP4, WebM, Ogg
- **移动平台**: MP4, MOV
- **桌面平台**: MP4, AVI, MOV

### 本地视频文件组织
项目中的视频文件位于以下目录：
- `assets/resources/mp4/` - 主要视频文件目录
- `assets/resources/video/` - 其他视频文件目录

建议的命名规范：
- 教程视频：`{训练类型}_guide.mp4`
- 示例：`finding_guide.mp4`, `fanpai_guide.mp4`

## 注意事项

1. **事件清理**: 记得在组件销毁时移除事件监听，避免内存泄漏
2. **状态管理**: 使用VideoControlPanel时，组件会自动管理播放状态
3. **错误处理**: 建议添加视频加载失败的错误处理
4. **性能优化**: 大视频文件建议使用远程URL，避免打包到项目中
5. **平台兼容**: 不同平台对视频格式的支持可能不同，建议使用MP4格式

## 常见问题

### Q: 视频无法播放？
A: 检查以下几点：
- 视频文件路径是否正确
- 视频格式是否支持
- 网络连接是否正常（远程视频）
- 视频文件是否损坏

### Q: 按钮状态不正确？
A: 确保正确绑定了VideoControlPanel的事件监听，组件会自动更新按钮状态。

### Q: 视频播放有延迟？
A: 远程视频需要下载时间，建议添加加载提示。本地视频延迟较小。

### Q: 如何自定义按钮样式？
A: 可以修改VideoControlPanel中的updateButtonStates方法来自定义按钮显示逻辑。 
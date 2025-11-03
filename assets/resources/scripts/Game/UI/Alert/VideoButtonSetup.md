# GuidePanel视频控制按钮设置指南

## UI结构建议

在GuidePanel预制体中添加以下UI结构：

```
GuidePanel (GuidePanel组件)
├── VideoPlayer (VideoPlayer组件)
├── VideoControlButtons (Node)
│   ├── PlayPauseButton (Button组件)
│   │   └── PlayPauseLabel (Label组件) - 显示"播放"/"暂停"
│   └── StopButton (Button组件) - 可选
│       └── StopLabel (Label组件) - 显示"停止"
└── 其他现有UI元素...
```

## 按钮设置步骤

### 1. 创建播放/暂停按钮

1. 在GuidePanel节点下创建一个新的Button节点
2. 命名为"PlayPauseButton"
3. 添加Label子节点，命名为"PlayPauseLabel"
4. 设置按钮样式和位置

### 2. 设置按钮事件

在Cocos Creator编辑器中：

1. 选中PlayPauseButton节点
2. 在Inspector面板中找到Button组件
3. 展开Click Events
4. 添加新的事件：
   - **Target**: GuidePanel节点
   - **Component**: GuidePanel
   - **Handler**: onPlayPauseClick

### 3. 可选：创建停止按钮

1. 创建StopButton节点
2. 添加StopLabel子节点
3. 设置事件绑定到`stopVideo`方法

## 代码中的按钮状态管理

### 自动更新按钮文本

可以在GuidePanel中添加方法来更新按钮文本：

```typescript
/**
 * 更新播放按钮文本
 */
private updatePlayButtonText() {
    // 如果有按钮Label引用，可以在这里更新文本
    if (this.playPauseLabel) {
        if (this.videoPlayer && this.videoPlayer.isPlaying) {
            this.playPauseLabel.string = "暂停";
        } else {
            this.playPauseLabel.string = "播放";
        }
    }
}

// 在播放/暂停方法中调用
playVideo() {
    if (this.videoPlayer) {
        this.videoPlayer.play();
        this.updatePlayButtonText();
    }
}

pauseVideo() {
    if (this.videoPlayer && this.videoPlayer.isPlaying) {
        this.videoPlayer.pause();
        this.updatePlayButtonText();
    }
}
```

### 按钮交互性控制

```typescript
/**
 * 控制按钮的交互性
 */
private updateButtonInteractable() {
    if (this.playPauseButton) {
        // 只有在视频加载完成后才允许交互
        this.playPauseButton.interactable = this.videoPlayer && this.videoPlayer.clip;
    }
    
    if (this.stopButton) {
        // 只有在视频播放中才允许停止
        this.stopButton.interactable = this.videoPlayer && this.videoPlayer.isPlaying;
    }
}
```

## 完整的按钮控制示例

```typescript
@ccclass('GuidePanel')
export class GuidePanel extends BasePanel {
    @property(VideoPlayer)
    videoPlayer: VideoPlayer = null;

    @property(Button)
    playPauseButton: Button = null;

    @property(Label)
    playPauseLabel: Label = null;

    @property(Button)
    stopButton: Button = null;

    // 视频加载完成后调用
    private onVideoLoaded() {
        this.updateButtonInteractable();
        this.updatePlayButtonText();
    }

    // 播放/暂停按钮点击
    onPlayPauseClick() {
        if (!this.videoPlayer || !this.videoPlayer.clip) {
            console.warn("视频未加载完成");
            return;
        }

        if (this.videoPlayer.isPlaying) {
            this.pauseVideo();
        } else {
            this.playVideo();
        }
    }

    // 停止按钮点击
    onStopClick() {
        this.stopVideo();
    }

    private playVideo() {
        if (this.videoPlayer) {
            this.videoPlayer.play();
            this.updatePlayButtonText();
            this.updateButtonInteractable();
        }
    }

    private pauseVideo() {
        if (this.videoPlayer && this.videoPlayer.isPlaying) {
            this.videoPlayer.pause();
            this.updatePlayButtonText();
            this.updateButtonInteractable();
        }
    }

    private stopVideo() {
        if (this.videoPlayer) {
            this.videoPlayer.stop();
            this.updatePlayButtonText();
            this.updateButtonInteractable();
        }
    }

    private updatePlayButtonText() {
        if (this.playPauseLabel) {
            if (this.videoPlayer && this.videoPlayer.isPlaying) {
                this.playPauseLabel.string = "暂停";
            } else {
                this.playPauseLabel.string = "播放";
            }
        }
    }

    private updateButtonInteractable() {
        if (this.playPauseButton) {
            this.playPauseButton.interactable = this.videoPlayer && this.videoPlayer.clip;
        }
        
        if (this.stopButton) {
            this.stopButton.interactable = this.videoPlayer && this.videoPlayer.isPlaying;
        }
    }
}
```

## 注意事项

1. **按钮位置**：确保按钮位置合理，不影响其他UI元素
2. **按钮大小**：建议按钮大小适中，便于用户点击
3. **视觉反馈**：可以添加按钮按下效果和状态变化
4. **错误处理**：在视频未加载时禁用按钮，避免错误操作
5. **性能优化**：避免频繁更新按钮状态，可以在状态变化时才更新

## 测试建议

1. 测试视频加载完成后按钮是否可用
2. 测试播放/暂停功能是否正常
3. 测试按钮文本是否正确更新
4. 测试视频播放完成后的状态
5. 测试面板关闭时是否正确停止视频 
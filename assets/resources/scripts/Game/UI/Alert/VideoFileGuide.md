# 视频文件组织指南

## 目录结构

根据当前项目结构，建议按以下方式组织视频文件：

```
assets/resources/
├── mp4/                    # 主要视频文件目录
│   ├── finding_guide.mp4   # 找茬训练教程
│   ├── fanpai_guide.mp4    # 翻牌训练教程
│   ├── puzzle_guide.mp4    # 拼图训练教程
│   ├── guessing_guide.mp4  # 猜谜训练教程
│   ├── sentence_guide.mp4  # 造句训练教程
│   ├── theater_guide.mp4   # 小剧场教程
│   └── effect/             # 特效视频
├── video/                  # 其他视频文件
│   └── fishguide.mp4       # 捕鱼训练教程（已存在）
```

## 文件命名规范

### 1. 教程视频命名
- 格式：`{训练类型}_guide.mp4`
- 示例：
  - `finding_guide.mp4` - 找茬训练教程
  - `fanpai_guide.mp4` - 翻牌训练教程
  - `puzzle_guide.mp4` - 拼图训练教程

### 2. 其他视频命名
- 格式：`{用途}_{序号}.mp4`
- 示例：
  - `effect_1.mp4` - 特效视频1
  - `intro_1.mp4` - 介绍视频1

## 代码中的路径映射

在GuidePanel.ts中，视频路径映射如下：

```typescript
switch(this.gameName) {
    case BundleName.FINGING:
        videoPath = "mp4/finding_guide"; // 对应 mp4/finding_guide.mp4
        break;
    case BundleName.FANPAI:
        videoPath = "mp4/fanpai_guide"; // 对应 mp4/fanpai_guide.mp4
        break;
    case BundleName.PUZZLE:
        videoPath = "mp4/puzzle_guide"; // 对应 mp4/puzzle_guide.mp4
        break;
    case BundleName.CATCHFISH:
        videoPath = "video/fishguide"; // 对应 video/fishguide.mp4
        break;
    case BundleName.GUESSINGGAME:
        videoPath = "mp4/guessing_guide"; // 对应 mp4/guessing_guide.mp4
        break;
    case BundleName.SENTENCEMAKING:
        videoPath = "mp4/sentence_guide"; // 对应 mp4/sentence_guide.mp4
        break;
    case BundleName.SMALLTHEATER:
        videoPath = "mp4/theater_guide"; // 对应 mp4/theater_guide.mp4
        break;
}
```

## 添加新视频文件的步骤

### 1. 准备视频文件
- 确保视频格式为MP4
- 建议分辨率：1920x1080或1280x720
- 文件大小建议控制在10MB以内

### 2. 放置文件
- 将视频文件放入对应的目录
- 例如：`assets/resources/mp4/finding_guide.mp4`

### 3. 更新代码（如需要）
- 如果添加新的训练类型，需要在GuidePanel.ts中添加对应的case
- 如果使用不同的命名规范，需要更新loadLocalVideo方法中的路径

### 4. 测试
- 在Cocos Creator中刷新资源
- 测试视频加载和播放功能

## 注意事项

1. **文件路径**：代码中的路径不包含文件扩展名（.mp4），Cocos Creator会自动处理
2. **资源加载**：使用`resources.load()`方法加载本地视频文件
3. **错误处理**：代码中已包含加载失败的错误处理
4. **性能优化**：建议视频文件大小控制在合理范围内，避免影响加载性能

## 现有视频文件

根据当前项目结构，已发现的视频文件：

- `assets/resources/video/fishguide.mp4` - 捕鱼训练教程（3.6MB）
- `assets/resources/mp4/word_1.mp4` - 文字相关视频（299KB）
- `assets/resources/mp4/idle_1.mp4` - 空闲状态视频（269KB）

## 建议

1. **统一命名**：建议将所有教程视频统一命名为`{训练类型}_guide.mp4`格式
2. **目录整理**：建议将相关视频文件整理到合适的目录中
3. **文件优化**：对视频文件进行压缩优化，减少文件大小
4. **版本控制**：在版本控制中忽略大型视频文件，或使用Git LFS 
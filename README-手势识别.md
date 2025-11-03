# 🤚 手势识别系统

基于MediaPipe的实时手势识别与分析系统，使用JavaScript开发，支持多种手势识别和手部运动分析。

## 📋 项目概述

这是一个完整的手势识别解决方案，包含以下核心功能：

- **实时手势识别**：支持多种常见手势的实时识别
- **手部关键点检测**：精确检测21个手部关键点
- **运动分析**：分析手部运动方向和速度
- **多手检测**：同时支持双手检测
- **历史平滑**：通过历史数据平滑识别结果
- **可视化界面**：美观的现代化用户界面

## 🚀 快速开始

### 环境要求

- 现代浏览器（Chrome、Firefox、Safari、Edge）
- 摄像头设备
- HTTPS环境（本地开发可使用localhost）

### 安装步骤

1. **克隆或下载项目文件**
   ```bash
   # 确保以下文件在同一目录下：
   - gesture-recognition.html          # 基础版本
   - gesture-recognition-demo.html     # 高级演示版本
   - gesture-recognition-advanced.js   # 高级手势识别模块
   ```

2. **启动本地服务器**
   ```bash
   # 使用Python启动简单HTTP服务器
   python -m http.server 8000
   
   # 或使用Node.js的http-server
   npx http-server
   
   # 或使用Live Server扩展（VS Code）
   ```

3. **访问应用**
   ```
   http://localhost:8000/gesture-recognition-demo.html
   ```

## 📁 文件结构

```
项目根目录/
├── gesture-recognition.html          # 基础手势识别页面
├── gesture-recognition-demo.html     # 高级演示页面
├── gesture-recognition-advanced.js   # 高级手势识别模块
└── README-手势识别.md               # 项目说明文档
```

## 🎯 功能特性

### 支持的手势

| 手势名称 | 描述 | 识别特征 |
|---------|------|----------|
| 拳头 | 所有手指弯曲 | 五指收拢 |
| 张开手掌 | 所有手指伸直 | 五指展开 |
| 点赞 | 拇指向上 | 拇指伸直，其他手指弯曲 |
| 胜利手势 | V字手势 | 食指和中指伸直 |
| OK手势 | 拇指食指形成圆圈 | 拇指与食指接触 |
| 指向 | 食指指向 | 仅食指伸直 |
| 摇滚手势 | 食指和小指伸直 | 食指、小指伸直 |
| 打电话手势 | 拇指和小指伸直 | 拇指、小指伸直 |

### 技术特性

- **实时性能**：60FPS的流畅识别
- **高精度**：基于21个手部关键点的精确检测
- **多手支持**：同时识别双手手势
- **运动分析**：检测手部运动方向和速度
- **历史平滑**：减少识别抖动，提高稳定性
- **响应式设计**：适配各种屏幕尺寸

## 🛠️ 使用方法

### 基础使用

1. **打开应用页面**
2. **允许摄像头权限**
3. **点击"开始识别"按钮**
4. **将手放在摄像头前进行手势**

### 高级功能

#### 手势识别设置
```javascript
// 在gesture-recognition-advanced.js中可以调整识别参数
const gestureRecognizer = new AdvancedGestureRecognition();

// 设置历史平滑参数
gestureRecognizer.maxHistoryLength = 10;
gestureRecognizer.smoothingFactor = 0.7;
```

#### MediaPipe配置
```javascript
// 在主应用中可以调整MediaPipe参数
this.hands.setOptions({
    maxNumHands: 2,                    // 最大检测手数
    modelComplexity: 1,                // 模型复杂度 (0-1)
    minDetectionConfidence: 0.7,       // 最小检测置信度
    minTrackingConfidence: 0.5         // 最小跟踪置信度
});
```

## 🎨 界面说明

### 主要区域

1. **视频显示区域**
   - 实时摄像头画面
   - 手部关键点可视化
   - 手势识别结果叠加

2. **控制面板**
   - 开始/停止识别
   - 显示/隐藏关键点
   - 重置历史记录

3. **信息面板**
   - 当前手势显示
   - 识别置信度
   - 手部数量统计
   - FPS性能指标

4. **手指状态显示**
   - 五个手指的实时状态
   - 伸直/弯曲状态可视化

5. **运动分析**
   - 手部运动方向
   - 运动速度显示

6. **支持手势列表**
   - 所有可识别手势
   - 手势描述说明

## 🔧 自定义开发

### 添加新手势

1. **在手势数据库中添加新手势**
```javascript
// 在gesture-recognition-advanced.js中
initializeGestureDatabase() {
    return {
        // 现有手势...
        'custom_gesture': {
            name: '自定义手势',
            description: '手势描述',
            pattern: [true, false, true, false, true], // 手指状态模式
            confidence: 0.8
        }
    };
}
```

2. **实现特殊手势检测**
```javascript
// 添加特殊检测逻辑
detectCustomGesture(landmarks) {
    // 实现自定义检测算法
    // 返回 { isCustom: boolean, confidence: number }
}
```

### 修改识别算法

```javascript
// 自定义手指伸直检测
isFingerExtended(landmarks, fingerIndices) {
    // 修改检测逻辑
    // 可以调整角度阈值或使用其他算法
}
```

### 添加新功能

```javascript
// 扩展手势识别器类
class CustomGestureRecognition extends AdvancedGestureRecognition {
    // 添加新方法
    detectComplexGesture(landmarks) {
        // 实现复杂手势检测
    }
    
    // 重写现有方法
    recognizeGesture(landmarks) {
        // 调用父类方法
        const result = super.recognizeGesture(landmarks);
        
        // 添加自定义处理
        return this.enhanceResult(result);
    }
}
```

## 📊 性能优化

### 提升识别性能

1. **调整MediaPipe参数**
   - 降低`modelComplexity`以提升速度
   - 调整置信度阈值平衡精度和性能

2. **优化渲染**
   - 减少不必要的Canvas绘制
   - 使用requestAnimationFrame优化动画

3. **内存管理**
   - 限制历史记录长度
   - 及时清理不用的数据

### 降低延迟

```javascript
// 减少处理延迟
this.hands.setOptions({
    modelComplexity: 0,        // 使用轻量级模型
    minDetectionConfidence: 0.5, // 降低检测阈值
    minTrackingConfidence: 0.3   // 降低跟踪阈值
});
```

## 🐛 常见问题

### 摄像头无法访问
- 确保使用HTTPS或localhost
- 检查浏览器摄像头权限
- 确认摄像头设备正常工作

### 识别不准确
- 确保光线充足
- 保持手部在摄像头视野内
- 调整手势幅度和清晰度
- 重置历史记录重新开始

### 性能问题
- 关闭其他占用摄像头的应用
- 降低MediaPipe模型复杂度
- 检查浏览器性能设置

### 兼容性问题
- 使用最新版本的现代浏览器
- 确保WebRTC支持
- 检查MediaPipe库加载状态

## 🔗 技术依赖

- **MediaPipe Hands**：Google开发的手部检测库
- **WebRTC**：浏览器摄像头访问
- **Canvas API**：图形绘制和可视化
- **ES6+**：现代JavaScript特性

## 📄 许可证

本项目仅供学习和研究使用。MediaPipe库遵循Apache 2.0许可证。

## 🤝 贡献

欢迎提交Issue和Pull Request来改进项目：

1. Fork项目
2. 创建功能分支
3. 提交更改
4. 发起Pull Request

## 📞 支持

如果您在使用过程中遇到问题，可以：

1. 查看常见问题部分
2. 检查浏览器控制台错误信息
3. 确认网络连接和CDN资源加载
4. 尝试不同的浏览器或设备

---

**享受手势识别的乐趣！** 🎉 
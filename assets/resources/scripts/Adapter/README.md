# ScreenAdapter 使用说明

本项目提供了增强版的 `ScreenAdapter`，可以适配各种宽高的设备并动态调整UI背景。

## 主要功能

### 1. 简化适配逻辑
- 背景采用平铺适配，尺寸按实际窗口尺寸
- 其他UI元素通过Widget组件自动处理适配
- 自动适配不同屏幕尺寸（手机、平板、桌面）
- 支持横屏/竖屏自动切换
- 处理安全区域（刘海屏、挖孔屏等）

### 2. 背景平铺适配
- 背景尺寸直接使用实际窗口尺寸（非设计尺寸）
- 使用九宫格模式（Sprite.Type.SLICED）支持平铺
- 根据屏幕宽高比自动切换背景图片
- 支持多种背景颜色动态调整
- **支持动态子页面背景适配**：自动适配通过addChild添加的子页面背景
- **强制实际尺寸适配**：确保所有背景都使用真实的屏幕尺寸

### 3. Widget自动适配
- 所有UI元素通过Widget组件自动处理适配
- 无需手动计算缩放比例
- 支持各种对齐方式（左上、居中、右下等）
- 自动处理安全区域适配

## 使用方法

### 1. 基础配置

在场景中添加 `ScreenAdapter` 组件：

```typescript
// 在需要适配的节点上添加组件
const adapter = node.addComponent(ScreenAdapter);
```

### 2. 配置属性

在编辑器中配置以下属性：

- **parentNode**: 父节点（需要适配的根节点）
- **childNodes**: 子节点数组（需要适配的UI元素）
- **backgroundNode**: 背景节点（可选，用于动态背景）
- **backgroundSprites**: 背景图片数组（支持多张图片切换）
- **backgroundColors**: 背景颜色数组
- **designWidth/designHeight**: 设计尺寸（默认1080x1920）
- **enableSafeArea**: 是否启用安全区域适配（默认true）
- **enableDynamicBackground**: 是否启用动态背景（默认true）
- **backgroundFitMode**: 背景填充模式（stretch/fill/fit，默认fit）
- **enableOrientationAdapt**: 是否启用方向适配（默认true）

### 3. 空容器场景配置

如果您的场景没有背景，只有空容器，可以这样配置：

```typescript
// 禁用背景功能
adapter.enableDynamicBackground = false;
adapter.backgroundNode = null;
adapter.backgroundSprites = [];
adapter.backgroundColors = [];

// 只配置UI适配
adapter.parentNode = containerNode;
adapter.childNodes = [child1, child2, child3];
adapter.enableSafeArea = true;
adapter.enableOrientationAdapt = true;
```

### 3. 代码中使用

```typescript
// 获取屏幕信息
const screenInfo = adapter.getScreenInfo();
console.log('当前屏幕信息:', screenInfo);

// 切换背景
adapter.switchBackground(1); // 切换到索引为1的背景

// 设置背景颜色
adapter.setBackgroundColor(new Color(255, 0, 0, 255));

// 设置背景图片
adapter.setBackgroundSprite(spriteFrame);

// 手动触发适配
adapter.forceAdapt();

// 获取背景信息（用于调试）
const backgroundInfo = adapter.getBackgroundInfo();
console.log('背景信息:', backgroundInfo);

// 动态添加子节点
adapter.addChildNode(newNode);

// 移除子节点
adapter.removeChildNode(oldNode);
```

## 使用场景

### 1. 基础UI适配
```typescript
// 配置基础适配
adapter.parentNode = uiRoot;
adapter.childNodes = [contentNode1, contentNode2, contentNode3];
adapter.designWidth = 1080;
adapter.designHeight = 1920;
```

### 2. 空容器适配
```typescript
// 空容器场景配置
adapter.parentNode = containerNode;
adapter.childNodes = containerNode.children; // 自动获取所有子节点
adapter.enableDynamicBackground = false; // 禁用背景功能
adapter.enableSafeArea = true;
adapter.enableOrientationAdapt = true;
```

### 3. Widget自动适配
```typescript
// 为UI元素添加Widget组件
// 设置合适的对齐方式（左上、居中、右下等）
// 适配器会自动更新Widget组件

// 例如：设置按钮居中显示
const buttonWidget = buttonNode.getComponent(Widget);
buttonWidget.alignMode = Widget.AlignMode.ON_WINDOW_RESIZE;
buttonWidget.isAlignTop = false;
buttonWidget.isAlignBottom = false;
buttonWidget.isAlignLeft = false;
buttonWidget.isAlignRight = false;
buttonWidget.isAlignCenterHorizontal = true;
buttonWidget.isAlignCenterVertical = true;
```

### 4. 动态子页面适配
```typescript
// 当通过addChild添加新页面时，适配器会自动适配其背景
homePage.addChild(newPage);
adapter.addChildNode(newPage); // 自动适配新页面的背景

// 或者手动适配指定页面
adapter.adaptSpecificChildPage(newPage);

// 适配所有子页面
adapter.adaptAllChildPages();
```

### 5. 多背景切换
```typescript
// 准备多张背景图片
adapter.backgroundNode = backgroundNode;
adapter.backgroundSprites = [portraitBg, landscapeBg, squareBg];
adapter.backgroundColors = [portraitColor, landscapeColor, squareColor];

// 根据屏幕方向自动切换
const screenInfo = adapter.getScreenInfo();
if (screenInfo.isLandscape) {
    adapter.switchBackground(1); // 横屏背景
} else {
    adapter.switchBackground(0); // 竖屏背景
}
```

### 6. 动态适配
```typescript
// 监听屏幕变化
view.on('canvas-resize', () => {
    adapter.forceAdapt();
});

// 获取实时屏幕信息
const info = adapter.getScreenInfo();
console.log('屏幕宽高比:', info.aspectRatio);
console.log('是否横屏:', info.isLandscape);
console.log('当前背景索引:', info.currentBackgroundIndex);
```

## 背景适配模式

### 平铺适配模式
- 背景尺寸直接使用实际窗口尺寸
- 使用九宫格模式（Sprite.Type.SLICED）支持平铺
- 背景图片会根据九宫格设置自动平铺
- **实时更新**：背景尺寸会实时跟随屏幕变化
- **强制刷新**：使用 `markForUpdateRenderData()` 确保Sprite尺寸更新
- **简化配置**：无需复杂的填充模式选择

### 背景Sprite尺寸更新
如果发现背景Sprite尺寸没有正确更新，可以：
1. 检查背景图片是否设置了九宫格（Sliced）
2. 调用 `forceRefreshBackground()` 强制刷新
3. 查看控制台日志确认尺寸更新情况

## 背景尺寸实时更新

适配器内部自动监听多种应用尺寸变化事件，并实时更新背景尺寸：

### 自动监听的事件类型

1. **画布尺寸变化** (`canvas-resize`)
   - 训练画布尺寸发生变化时自动触发

2. **设备方向变化** (`orientation-change`)
   - 设备横竖屏切换时自动触发

3. **窗口尺寸变化** (Web平台)
   - 浏览器窗口大小改变时自动触发

4. **安全区域变化** (移动设备)
   - 定期检查安全区域变化（每0.5秒）

### 使用示例

```typescript
// 适配器会自动监听所有变化，无需手动设置
// 但您可以通过以下方法进行控制：

// 手动触发背景尺寸更新
adapter.updateBackgroundSize();

// 强制刷新背景Sprite（如果背景尺寸没有正确更新）
adapter.forceRefreshBackground();

// 手动适配指定子页面的背景
adapter.adaptSpecificChildPage(childPageNode);

// 适配所有子页面的背景
adapter.adaptAllChildPages();

// 强制适配所有背景到实际屏幕尺寸
adapter.forceAdaptAllBackgroundsToActualSize();

// 获取实际屏幕尺寸
const actualSize = adapter.getActualScreenSize();
console.log('实际屏幕尺寸:', actualSize);

// 启用/禁用自动适配
adapter.setAutoAdaptEnabled(true);  // 启用
adapter.setAutoAdaptEnabled(false); // 禁用

// 手动检查背景信息
const backgroundInfo = adapter.getBackgroundInfo();
console.log('当前背景尺寸:', backgroundInfo.backgroundSize);
console.log('当前屏幕尺寸:', backgroundInfo.screenSize);

// 查看控制台日志了解适配过程
// 适配器会输出详细的适配信息
```

## 配置建议

### 1. 设计尺寸
- 建议使用 1080x1920 作为基准设计尺寸
- 支持自定义设计尺寸

### 2. 背景图片
- 准备多种宽高比的背景图片
- 建议准备：竖屏、横屏、正方形三种
- 图片尺寸建议为设计尺寸的2倍（适配高分辨率设备）

### 3. 安全区域
- 在iOS设备上建议启用安全区域适配
- 在Android设备上可根据需要选择

### 4. 性能优化
- 合理使用动态背景功能
- 避免频繁切换背景图片
- 及时移除不需要的子节点

## 注意事项

1. **组件依赖**：确保节点上有必要的组件（UITransform、Sprite等）
2. **资源加载**：背景图片需要提前加载到内存中
3. **事件监听**：适配器会自动监听屏幕变化事件，注意及时清理
4. **性能考虑**：避免在update中频繁调用适配方法
5. **兼容性**：适配器兼容Cocos Creator 3.x版本

## 扩展功能

可以根据项目需求扩展以下功能：
- 添加背景切换动画效果
- 支持更多背景填充模式
- 添加性能监控和优化
- 支持配置文件管理 
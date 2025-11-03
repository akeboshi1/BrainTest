# BundlePreloadManager 超时功能说明

## 功能概述

`BundlePreloadManager` 现在已集成完整的超时检测功能，当资源加载超时时会自动派发相应事件，由 `GameCenterManager` 和 `SkewersManager` 监听这些事件并显示提示弹窗。

## 架构设计

### 🔧 **BundlePreloadManager 职责**
- 超时检测和事件派发
- 不直接处理UI弹窗
- 派发 `TIMEOUT` 和 `FAILED` 事件

### 🎯 **Manager 职责**
- `GameCenterManager`: 监听事件并处理训练大厅相关弹窗
- `SkewersManager`: 监听事件并处理串烧训练相关弹窗

## 超时配置

系统预设了三种超时时间：

- **资源包加载超时**: 30秒
- **场景加载超时**: 20秒  
- **资源加载超时**: 15秒

## 事件流程

### 1. **超时检测**
`BundlePreloadManager` 自动检测加载操作是否超时

### 2. **事件派发**
根据错误类型派发相应事件：
- `TIMEOUT`: 超时错误事件
- `FAILED`: 其他错误事件
- `LOAD_ERROR_HANDLED`: 错误处理完成事件

### 3. **事件监听**
`GameCenterManager` 和 `SkewersManager` 监听事件并显示弹窗

## 弹窗界面

### 训练大厅弹窗
```
┌─────────────────────────┐
│        加载超时          │
├─────────────────────────┤
│ 训练 catchFish 加载超时，│
│ 请检查网络连接后重试     │
├─────────────────────────┤
│    [返回大厅]  [重试]    │
└─────────────────────────┘
```

### 串烧训练弹窗
```
┌─────────────────────────┐
│        加载超时          │
├─────────────────────────┤
│ 训练 catchFish 加载超时，│
│ 请检查网络连接后重试     │
├─────────────────────────┤
│      [退出]  [重试]      │
└─────────────────────────┘
```

## 事件数据结构

### TIMEOUT 事件
```typescript
{
    bundleName: string,      // 超时的资源包名称
    error: any,             // 超时错误信息
    currentSceneName: string // 当前场景名称
}
```

### FAILED 事件
```typescript
{
    bundleName: string,      // 失败的资源包名称
    error: any,             // 错误信息
    currentSceneName: string // 当前场景名称
}
```

### LOAD_ERROR_HANDLED 事件
```typescript
{
    bundleName: string,      // 资源包名称
    error: any,             // 错误信息
    currentSceneName: string, // 当前场景名称
    handledSuccessfully: boolean, // 是否成功处理
    isTimeout: boolean,     // 是否为超时错误
    fallbackUsed?: boolean, // 是否使用了降级处理
    finalError?: any        // 最终错误
}
```

## 使用方式

### 1. 正常使用
```typescript
// 正常调用，超时处理已内置
BundlePreloadManager.getInstance().preload(BundleName.CATCHFISH);
```

### 2. 监听事件（可选）
```typescript
import { BundlePreloadEvent } from './BundlePreloadManager';

// 监听超时事件
EventManager.getInstance().on(BundlePreloadEvent.TIMEOUT, (data) => {
    console.log(`资源包 ${data.bundleName} 加载超时`);
    // 可以在这里添加额外的超时处理逻辑
});

// 监听错误处理完成事件
EventManager.getInstance().on(BundlePreloadEvent.LOAD_ERROR_HANDLED, (data) => {
    if (data.isTimeout) {
        console.log('超时错误已处理');
    }
});
```

## 错误处理流程

1. **检测超时**: `BundlePreloadManager` 自动检测加载操作是否超时
2. **派发事件**: 根据错误类型派发 `TIMEOUT` 或 `FAILED` 事件
3. **监听处理**: `GameCenterManager` 或 `SkewersManager` 监听事件
4. **显示弹窗**: 相应的Manager显示错误提示弹窗
5. **用户操作**: 用户选择重试或返回/退出
6. **完成通知**: 触发 `LOAD_ERROR_HANDLED` 事件

## 兼容性

- ✅ 完全向后兼容，不影响现有功能
- ✅ 原有的 `FAILED` 事件仍然正常触发
- ✅ 新增的 `TIMEOUT` 事件用于区分超时情况
- ✅ 错误处理逻辑保持一致

## 注意事项

1. **事件监听**: `GameCenterManager` 和 `SkewersManager` 会自动监听相关事件
2. **弹窗显示**: 使用 `AlertManager` 显示弹窗，确保弹窗系统正常工作
3. **网络检查**: 超时提示会建议用户检查网络连接
4. **重试机制**: 重试会重新调用完整的加载流程
5. **返回逻辑**: 返回操作会根据当前场景智能选择目标页面

## 架构优势

1. **职责分离**: `BundlePreloadManager` 专注于超时检测，Manager专注于UI处理
2. **可扩展性**: 其他Manager也可以监听这些事件进行自定义处理
3. **统一管理**: 所有超时和错误事件都通过统一的事件系统管理
4. **易于维护**: 各模块职责清晰，便于后续维护和扩展

现在您的系统具备了完整的超时处理能力，`BundlePreloadManager` 负责检测和派发事件，`GameCenterManager` 和 `SkewersManager` 负责处理弹窗显示！ 
# GuessingGameScene 机构用户特殊逻辑实现说明

## 功能概述

为 GuessingGameScene 添加了机构用户的特殊显示逻辑，通过 `PersonalCenterManager.userInfoData.is_org_user` 来判断用户类型，并实现不同的界面显示策略。

## 实现的功能

### 1. 机构用户判断
- 通过 `PersonalCenterManager.userInfoData.is_org_user` 判断是否为机构用户
- 添加了 `isOrgUser()` 方法进行封装

### 2. 阶段管理
- 添加了 `_currentPhase` 属性来跟踪当前阶段
- 支持三个阶段：`listening`（听题）、`answering`（答题）、`result`（结算）

### 3. 显示控制逻辑

#### questionLabel（问题标签）显示规则：
- **所有用户**：
  - 听题阶段：显示
  - 答题阶段：显示
  - 结算阶段：隐藏

#### optionsNode（选项节点）显示规则：
- **机构用户**：
  - 听题阶段：隐藏
  - 答题阶段：显示
  - 结算阶段：隐藏
- **普通用户**：始终显示

## 核心方法

### 1. 用户类型判断
```typescript
private isOrgUser(): boolean {
    const userInfoData = PersonalCenterManager.getInstance().userInfoData;
    return userInfoData ? userInfoData.is_org_user : false;
}
```

### 2. 显示控制方法
```typescript
// 控制问题标签显示（听题和答题阶段显示，结算阶段隐藏）
private updateQuestionLabelVisibility(): void

// 控制选项节点显示（仅对机构用户生效）
private updateOptionsNodeVisibility(): void

// 设置当前阶段并更新显示状态（更新问题标签和选项节点）
private setCurrentPhase(phase: 'listening' | 'answering' | 'result'): void
```

## 阶段切换时机

### 1. 听题阶段（listening）
- **触发时机**：
  - `onShowQuestion()` - 显示新题目时
  - `resetPanel()` - 重置面板时
- **显示状态**：
  - 所有用户：questionLabel显示
  - 机构用户：optionsNode隐藏
  - 普通用户：optionsNode显示

### 2. 答题阶段（answering）
- **触发时机**：
  - `onClickStartAnswer()` - 点击开始答题按钮时
- **显示状态**：
  - 所有用户：questionLabel显示
  - 机构用户：optionsNode显示
  - 普通用户：optionsNode显示

### 3. 结算阶段（result）
- **触发时机**：
  - `processAnswer()` - 答题完成后
  - `onClickShowAnswer()` - 点击显示答案时
- **显示状态**：
  - 所有用户：questionLabel隐藏
  - 机构用户：optionsNode隐藏
  - 普通用户：optionsNode显示

## 实现细节

### 1. 导入依赖
```typescript
import { PersonalCenterManager } from "db://assets/resources/scripts/Game/PersonalCenterManager/PersonalCenterManager";
```

### 2. 新增属性
```typescript
// 添加阶段标记，用于机构用户的显示控制
private _currentPhase: 'listening' | 'answering' | 'result' = 'listening';
```

### 3. 修改的方法
- `onShowQuestion()` - 设置听题阶段
- `onClickStartAnswer()` - 设置答题阶段
- `processAnswer()` - 设置结算阶段
- `onClickShowAnswer()` - 设置结算阶段
- `resetPanel()` - 重置为听题阶段

## 使用效果

### 机构用户体验：
1. **听题阶段**：只显示问题文本，不显示选项
2. **答题阶段**：同时显示问题文本和选项
3. **结算阶段**：隐藏问题文本和选项，只显示结果

### 普通用户体验：
- 保持原有的显示逻辑不变

## 调试信息

实现中添加了详细的调试日志：
```typescript
DebugLog.instance.log(`[GuessingGameScene] 阶段切换为: ${phase}, 机构用户: ${this.isOrgUser()}`);
```

可以通过控制台查看阶段切换和用户类型判断的日志信息。

## 注意事项

1. **兼容性**：对普通用户完全兼容，不影响现有功能
2. **性能**：显示控制逻辑轻量级，不会影响游戏性能
3. **扩展性**：可以轻松添加更多机构用户的特殊逻辑
4. **维护性**：代码结构清晰，易于维护和修改

## 测试建议

1. 使用机构用户账号测试各个阶段的显示效果
2. 使用普通用户账号验证原有功能不受影响
3. 测试阶段切换的时机是否正确
4. 验证重置功能是否正常工作

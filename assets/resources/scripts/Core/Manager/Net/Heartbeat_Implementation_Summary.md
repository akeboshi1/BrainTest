# SocketManager 心跳机制实现总结

## 实现概述

成功为 SocketManager 添加了完整的 WebSocket 心跳机制，用于防止连接频繁断线。该实现与现有的重连机制完全兼容，提供了自动化的连接状态检测和恢复功能。

## 核心功能

### 1. 心跳发送机制
- **自动发送**: 连接建立后自动开始发送心跳包
- **可配置间隔**: 默认30秒间隔，支持动态调整
- **智能检测**: 只在连接正常时发送心跳

### 2. 心跳响应检测
- **超时检测**: 发送心跳后启动超时检测机制
- **自动重连**: 超时未收到响应时自动触发重连
- **响应处理**: 正确识别和处理服务器心跳响应

### 3. 生命周期管理
- **自动启动**: WebSocket连接成功后自动启动
- **自动停止**: 连接关闭或错误时自动停止
- **资源清理**: 销毁时正确清理所有定时器

## 技术实现

### 新增属性
```typescript
private _heartbeatInterval: number = 30;        // 心跳发送间隔
private _heartbeatTimeout: number = 10;         // 心跳响应超时时间
private _heartbeatTimer: any = null;            // 心跳发送定时器
private _heartbeatResponseTimer: any = null;    // 心跳响应检测定时器
private _lastHeartbeatTime: number = 0;         // 最后心跳发送时间
private _lastHeartbeatResponseTime: number = 0; // 最后心跳响应时间
private _isHeartbeatEnabled: boolean = true;    // 心跳开关
```

### 核心方法
1. `startHeartbeat()` - 启动心跳机制
2. `stopHeartbeat()` - 停止心跳机制
3. `sendHeartbeat()` - 发送心跳包
4. `handleHeartbeatResponse()` - 处理心跳响应
5. `handleHeartbeatTimeout()` - 处理心跳超时
6. `setHeartbeatConfig()` - 设置心跳配置
7. `setHeartbeatEnabled()` - 控制心跳开关

### 消息处理增强
- 在 `onSocketMessage()` 中添加了心跳响应识别
- 支持 `heartbeat` 和 `heartbeat_response` 两种action类型
- 心跳消息不会进入正常的业务消息处理流程

## 集成点

### 1. 连接建立时
```typescript
// 在 initSocket() 方法中
if (socket) {
    // ... 现有代码 ...
    this.startHeartbeat(); // 新增：启动心跳
    resolve();
}
```

### 2. 连接关闭时
```typescript
private onSocketClose() {
    this.stopHeartbeat(); // 新增：停止心跳
    this.processReconnectFlow();
}
```

### 3. 连接错误时
```typescript
private onSocketError() {
    this.stopHeartbeat(); // 新增：停止心跳
    this.processReconnectFlow();
}
```

### 4. 资源清理时
```typescript
destroy() {
    this.cleanHeartbeatTimers(); // 新增：清理心跳定时器
    // ... 现有代码 ...
}
```

## 心跳数据格式

### 发送格式
```json
{
    "action": "heartbeat",
    "uid": "1640995200000",
    "timestamp": 1640995200000
}
```

### 响应格式
```json
{
    "action": "heartbeat_response",
    "uid": "1640995200000", 
    "timestamp": 1640995200000
}
```

## 配置建议

### 不同环境推荐配置

| 环境 | 心跳间隔 | 超时时间 | 说明 |
|------|----------|----------|------|
| 生产环境 | 30秒 | 10秒 | 网络稳定，减少服务器压力 |
| 测试环境 | 10秒 | 3秒 | 快速检测问题 |
| 移动网络 | 20秒 | 8秒 | 网络不稳定，平衡检测和性能 |
| 弱网环境 | 15秒 | 5秒 | 网络较差，更频繁检测 |

## 使用示例

### 基本使用
```typescript
// 连接WebSocket（心跳自动启动）
await SocketManager.getInstance().initSocket('ws://your-server.com');
```

### 自定义配置
```typescript
// 设置心跳参数
SocketManager.getInstance().setHeartbeatConfig(20, 5);

// 禁用心跳
SocketManager.getInstance().setHeartbeatEnabled(false);
```

## 日志输出

实现包含详细的日志输出，便于调试和监控：

- 心跳启动/停止日志
- 心跳发送日志
- 心跳响应接收日志
- 心跳超时警告日志
- 配置变更日志

## 兼容性

- ✅ 与现有重连机制完全兼容
- ✅ 不影响现有业务逻辑
- ✅ 支持动态配置和开关
- ✅ 自动资源管理
- ✅ 错误处理完善

## 测试支持

提供了 `HeartbeatTest` 类用于测试心跳功能：

```typescript
const test = HeartbeatTest.getInstance();
await test.runAllTests(); // 运行完整测试
```

## 总结

该心跳机制实现具有以下优势：

1. **自动化**: 无需手动管理，连接建立后自动工作
2. **可配置**: 支持根据环境调整参数
3. **健壮性**: 完善的错误处理和资源管理
4. **兼容性**: 与现有代码完全兼容
5. **可观测性**: 详细的日志输出便于调试

通过这个实现，WebSocket连接将更加稳定，能够及时发现和处理连接异常，大大减少因网络问题导致的连接中断。


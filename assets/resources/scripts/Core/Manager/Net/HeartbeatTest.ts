import { SocketManager } from "./SocketManager";
import { DebugLog } from "../../Util/DebugLog";

/**
 * 心跳机制测试类
 * 用于测试和演示 SocketManager 的心跳功能
 */
export class HeartbeatTest {
    private static _instance: HeartbeatTest;
    private _socketManager: SocketManager;

    public static getInstance(): HeartbeatTest {
        if (!HeartbeatTest._instance) {
            HeartbeatTest._instance = new HeartbeatTest();
        }
        return HeartbeatTest._instance;
    }

    constructor() {
        this._socketManager = SocketManager.getInstance();
    }

    /**
     * 测试心跳机制
     */
    public async testHeartbeat() {
        DebugLog.instance.log("开始测试心跳机制...");

        try {
            // 1. 设置心跳配置（测试用较短间隔）
            this._socketManager.setHeartbeatConfig(10, 5); // 10秒间隔，5秒超时
            DebugLog.instance.log("心跳配置已设置: 间隔10秒，超时5秒");

            // 2. 连接到测试服务器（需要替换为实际的WebSocket地址）
            const testUrl = "ws://echo.websocket.org"; // 这是一个公共的WebSocket测试服务器
            await this._socketManager.initSocket(testUrl);
            DebugLog.instance.log("WebSocket连接已建立，心跳机制应该已自动启动");

            // 3. 等待一段时间观察心跳日志
            DebugLog.instance.log("等待30秒观察心跳日志...");
            await this.delay(30000);

            // 4. 测试禁用心跳
            this._socketManager.setHeartbeatEnabled(false);
            DebugLog.instance.log("心跳机制已禁用");
            await this.delay(5000);

            // 5. 重新启用心跳
            this._socketManager.setHeartbeatEnabled(true);
            DebugLog.instance.log("心跳机制已重新启用");

        } catch (error) {
            DebugLog.instance.error("心跳测试失败:", error);
        }
    }

    /**
     * 测试心跳超时处理
     */
    public async testHeartbeatTimeout() {
        DebugLog.instance.log("开始测试心跳超时处理...");

        try {
            // 设置很短的超时时间用于测试
            this._socketManager.setHeartbeatConfig(5, 2); // 5秒间隔，2秒超时

            // 连接到一个不会响应心跳的服务器
            const testUrl = "ws://httpbin.org/ws"; // 这个服务器可能不会响应心跳
            await this._socketManager.initSocket(testUrl);
            DebugLog.instance.log("连接到测试服务器，等待心跳超时...");

            // 等待足够长的时间让心跳超时触发
            await this.delay(15000);

        } catch (error) {
            DebugLog.instance.error("心跳超时测试失败:", error);
        }
    }

    /**
     * 延迟函数
     * @param ms 延迟毫秒数
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 运行所有测试
     */
    public async runAllTests() {
        DebugLog.instance.log("=== 开始心跳机制完整测试 ===");

        // 测试1: 基本心跳功能
        await this.testHeartbeat();

        // 等待一段时间
        await this.delay(5000);

        // 测试2: 心跳超时处理
        await this.testHeartbeatTimeout();

        DebugLog.instance.log("=== 心跳机制测试完成 ===");
    }
}

// 使用示例：
// const heartbeatTest = HeartbeatTest.getInstance();
// heartbeatTest.runAllTests();


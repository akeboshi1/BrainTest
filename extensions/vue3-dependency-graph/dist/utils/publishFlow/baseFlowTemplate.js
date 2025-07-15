"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateFlow = void 0;
const baseFlow_1 = require("./baseFlow");
const interfaces_1 = require("./interfaces");
/**
 * 标准流程类模板
 * 所有新的流程类都应该遵循此模板来正确处理 Promise
 */
class TemplateFlow extends baseFlow_1.BaseProcessFlow {
    constructor() {
        super('模板流程', '这是一个流程类模板');
        this.canceled = false;
    }
    /**
     * 启动流程
     * @param params 流程参数
     */
    async start(params) {
        // 已经在运行，拒绝启动
        if (this.isRunning) {
            console.warn('流程已在运行中');
            return Promise.reject(new Error('流程已在运行中'));
        }
        // 创建并返回一个Promise，该Promise在流程完成时被解析
        const promise = this.createPromiseWrapper();
        // 记录流程开始
        this.isRunning = true;
        this.canceled = false;
        this.updateProgress(0, '流程开始');
        try {
            // 执行流程逻辑 - 模拟异步操作
            this.executeProcess(params).catch(error => {
                this.handleFinish(interfaces_1.FinishMethod.FAILURE, error instanceof Error ? error.message : String(error));
            });
        }
        catch (error) {
            // 处理同步错误
            this.handleFinish(interfaces_1.FinishMethod.FAILURE, `流程执行失败: ${error instanceof Error ? error.message : String(error)}`);
        }
        // 返回Promise，它将在流程真正完成时被解析
        return promise;
    }
    /**
     * 执行实际流程（这是一个内部方法，包含主要业务逻辑）
     */
    async executeProcess(params) {
        // 模拟一个分阶段的异步流程
        // 阶段 1
        this.updateProgress(20, '执行第一阶段');
        await this.simulateWork(500);
        // 检查取消状态
        if (this.canceled) {
            this.handleFinish(interfaces_1.FinishMethod.FAILURE, '操作已取消');
            return;
        }
        // 阶段 2
        this.updateProgress(40, '执行第二阶段');
        await this.simulateWork(500);
        // 检查取消状态
        if (this.canceled) {
            this.handleFinish(interfaces_1.FinishMethod.FAILURE, '操作已取消');
            return;
        }
        // 阶段 3
        this.updateProgress(60, '执行第三阶段');
        await this.simulateWork(500);
        // 检查取消状态
        if (this.canceled) {
            this.handleFinish(interfaces_1.FinishMethod.FAILURE, '操作已取消');
            return;
        }
        // 阶段 4
        this.updateProgress(80, '执行第四阶段');
        await this.simulateWork(500);
        // 检查取消状态
        if (this.canceled) {
            this.handleFinish(interfaces_1.FinishMethod.FAILURE, '操作已取消');
            return;
        }
        // 完成流程
        this.updateProgress(100, '流程完成');
        this.handleFinish(interfaces_1.FinishMethod.SUCCESS, '流程已成功完成');
    }
    /**
     * 模拟异步工作
     */
    async simulateWork(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * 取消流程
     */
    cancel() {
        if (!this.isRunning) {
            return;
        }
        this.canceled = true;
        console.log('正在取消流程...');
    }
}
exports.TemplateFlow = TemplateFlow;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZUZsb3dUZW1wbGF0ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NvdXJjZS91dGlscy9wdWJsaXNoRmxvdy9iYXNlRmxvd1RlbXBsYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHlDQUE2QztBQUM3Qyw2Q0FBNEM7QUFpQjVDOzs7R0FHRztBQUNILE1BQWEsWUFBYSxTQUFRLDBCQUFlO0lBRzdDO1FBQ0ksS0FBSyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQztRQUh2QixhQUFRLEdBQVksS0FBSyxDQUFDO0lBSWxDLENBQUM7SUFFRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQTBCO1FBQ2xDLGFBQWE7UUFDYixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQ3hCLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ2hELENBQUM7UUFFRCxtQ0FBbUM7UUFDbkMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFFNUMsU0FBUztRQUNULElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxRQUFRLEdBQUcsS0FBSyxDQUFDO1FBQ3RCLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRS9CLElBQUksQ0FBQztZQUNELGtCQUFrQjtZQUNsQixJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDdEMsSUFBSSxDQUFDLFlBQVksQ0FBQyx5QkFBWSxDQUFDLE9BQU8sRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FB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bSAnLi9iYXNlRmxvdyc7XHJcbmltcG9ydCB7IEZpbmlzaE1ldGhvZCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XHJcblxyXG4vKipcclxuICog5rWB56iL5Y+C5pWw56S65L6LXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFRlbXBsYXRlRmxvd1BhcmFtcyB7XHJcbiAgICAvKipcclxuICAgICAqIOWPguaVsDFcclxuICAgICAqL1xyXG4gICAgcGFyYW0xOiBzdHJpbmc7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5Y+C5pWwMlxyXG4gICAgICovXHJcbiAgICBwYXJhbTI6IG51bWJlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIOagh+WHhua1geeoi+exu+aooeadv1xyXG4gKiDmiYDmnInmlrDnmoTmtYHnqIvnsbvpg73lupTor6XpgbXlvqrmraTmqKHmnb/mnaXmraPnoa7lpITnkIYgUHJvbWlzZVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFRlbXBsYXRlRmxvdyBleHRlbmRzIEJhc2VQcm9jZXNzRmxvdyB7XHJcbiAgICBwcml2YXRlIGNhbmNlbGVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBcclxuICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgIHN1cGVyKCfmqKHmnb/mtYHnqIsnLCAn6L+Z5piv5LiA5Liq5rWB56iL57G75qih5p2/Jyk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5ZCv5Yqo5rWB56iLXHJcbiAgICAgKiBAcGFyYW0gcGFyYW1zIOa1geeoi+WPguaVsFxyXG4gICAgICovXHJcbiAgICBhc3luYyBzdGFydChwYXJhbXM6IFRlbXBsYXRlRmxvd1BhcmFtcyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIC8vIOW3sue7j+WcqOi/kOihjO+8jOaLkue7neWQr+WKqFxyXG4gICAgICAgIGlmICh0aGlzLmlzUnVubmluZykge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ+a1geeoi+W3suWcqOi/kOihjOS4rScpO1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCfmtYHnqIvlt7LlnKjov5DooYzkuK0nKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOWIm+W7uuW5tui/lOWbnuS4gOS4qlByb21pc2XvvIzor6VQcm9taXNl5Zyo5rWB56iL5a6M5oiQ5pe26KKr6Kej5p6QXHJcbiAgICAgICAgY29uc3QgcHJvbWlzZSA9IHRoaXMuY3JlYXRlUHJvbWlzZVdyYXBwZXIoKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDorrDlvZXmtYHnqIvlvIDlp4tcclxuICAgICAgICB0aGlzLmlzUnVubmluZyA9IHRydWU7XHJcbiAgICAgICAgdGhpcy5jYW5jZWxlZCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoMCwgJ+a1geeoi+W8gOWniycpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIOaJp+ihjOa1geeoi+mAu+i+kSAtIOaooeaLn+W8guatpeaTjeS9nFxyXG4gICAgICAgICAgICB0aGlzLmV4ZWN1dGVQcm9jZXNzKHBhcmFtcykuY2F0Y2goZXJyb3IgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVGaW5pc2goRmluaXNoTWV0aG9kLkZBSUxVUkUsIGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIC8vIOWkhOeQhuWQjOatpemUmeivr1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZUZpbmlzaChGaW5pc2hNZXRob2QuRkFJTFVSRSwgYOa1geeoi+aJp+ihjOWksei0pTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOi/lOWbnlByb21pc2XvvIzlroPlsIblnKjmtYHnqIvnnJ/mraPlrozmiJDml7booqvop6PmnpBcclxuICAgICAgICByZXR1cm4gcHJvbWlzZTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDmiafooYzlrp7pmYXmtYHnqIvvvIjov5nmmK/kuIDkuKrlhoXpg6jmlrnms5XvvIzljIXlkKvkuLvopoHkuJrliqHpgLvovpHvvIlcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBhc3luYyBleGVjdXRlUHJvY2VzcyhwYXJhbXM6IFRlbXBsYXRlRmxvd1BhcmFtcyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIC8vIOaooeaLn+S4gOS4quWIhumYtuauteeahOW8guatpea1geeoi1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOmYtuautSAxXHJcbiAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcygyMCwgJ+aJp+ihjOesrOS4gOmYtuautScpO1xyXG4gICAgICAgIGF3YWl0IHRoaXMuc2ltdWxhdGVXb3JrKDUwMCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5qOA5p+l5Y+W5raI54q25oCBXHJcbiAgICAgICAgaWYgKHRoaXMuY2FuY2VsZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVGaW5pc2goRmluaXNoTWV0aG9kLkZBSUxVUkUsICfmk43kvZzlt7Llj5bmtognKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyDpmLbmrrUgMlxyXG4gICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoNDAsICfmiafooYznrKzkuozpmLbmrrUnKTtcclxuICAgICAgICBhd2FpdCB0aGlzLnNpbXVsYXRlV29yayg1MDApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOajgOafpeWPlua2iOeKtuaAgVxyXG4gICAgICAgIGlmICh0aGlzLmNhbmNlbGVkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5GQUlMVVJFLCAn5pON5L2c5bey5Y+W5raIJyk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6Zi25q61IDNcclxuICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKDYwLCAn5omn6KGM56ys5LiJ6Zi25q61Jyk7XHJcbiAgICAgICAgYXdhaXQgdGhpcy5zaW11bGF0ZVdvcmsoNTAwKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDmo4Dmn6Xlj5bmtojnirbmgIFcclxuICAgICAgICBpZiAodGhpcy5jYW5jZWxlZCkge1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZUZpbmlzaChGaW5pc2hNZXRob2QuRkFJTFVSRSwgJ+aTjeS9nOW3suWPlua2iCcpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOmYtuautSA0XHJcbiAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcyg4MCwgJ+aJp+ihjOesrOWbm+mYtuautScpO1xyXG4gICAgICAgIGF3YWl0IHRoaXMuc2ltdWxhdGVXb3JrKDUwMCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5qOA5p+l5Y+W5raI54q25oCBXHJcbiAgICAgICAgaWYgKHRoaXMuY2FuY2VsZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVGaW5pc2goRmluaXNoTWV0aG9kLkZBSUxVUkUsICfmk43kvZzlt7Llj5bmtognKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyDlrozmiJDmtYHnqItcclxuICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKDEwMCwgJ+a1geeoi+WujOaIkCcpO1xyXG4gICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5TVUNDRVNTLCAn5rWB56iL5bey5oiQ5Yqf5a6M5oiQJyk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5qih5ouf5byC5q2l5bel5L2cXHJcbiAgICAgKi9cclxuICAgIHByaXZhdGUgYXN5bmMgc2ltdWxhdGVXb3JrKG1zOiBudW1iZXIpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4ocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIG1zKSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5Y+W5raI5rWB56iLXHJcbiAgICAgKi9cclxuICAgIGNhbmNlbCgpOiB2b2lkIHtcclxuICAgICAgICBpZiAoIXRoaXMuaXNSdW5uaW5nKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5jYW5jZWxlZCA9IHRydWU7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ+ato+WcqOWPlua2iOa1geeoiy4uLicpO1xyXG4gICAgfVxyXG59ICJdfQ==
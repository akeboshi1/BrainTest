"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseProcessFlow = void 0;
const interfaces_1 = require("./interfaces");
/**
 * 发布流程基类
 */
class BaseProcessFlow {
    /**
     * 构造函数
     * @param name 流程名称
     * @param description 流程描述
     */
    constructor(name, description) {
        /**
         * 流程是否正在运行
         */
        this.isRunning = false;
        /**
         * 进度回调函数
         */
        this.progressCallback = null;
        /**
         * 完成回调函数
         */
        this.finishCallback = null;
        /**
         * Promise 的 resolve 函数
         */
        this.resolvePromise = null;
        /**
         * Promise 的 reject 函数
         */
        this.rejectPromise = null;
        this.name = name;
        this.description = description;
    }
    /**
     * 流程完成回调，子类可以覆盖以添加自定义处理
     * @param method 完成方法
     * @param message 可选的消息
     */
    onFinished(method, message) {
        // 调用设置的回调
        if (this.finishCallback) {
            this.finishCallback(method, message);
        }
        // 解析 Promise
        if (method === interfaces_1.FinishMethod.SUCCESS) {
            if (this.resolvePromise) {
                this.resolvePromise();
            }
        }
        else {
            if (this.rejectPromise) {
                this.rejectPromise(new Error(message || '流程失败'));
            }
        }
        // 重置状态和引用
        this.isRunning = false;
        this.resolvePromise = null;
        this.rejectPromise = null;
    }
    /**
     * 设置进度回调
     * @param callback 回调函数
     */
    setProgressCallback(callback) {
        this.progressCallback = callback;
    }
    /**
     * 设置完成回调
     * @param callback 回调函数
     */
    setFinishedCallback(callback) {
        this.finishCallback = callback;
    }
    /**
     * 创建包装处理 Promise 的函数
     */
    createPromiseWrapper() {
        return new Promise((resolve, reject) => {
            this.resolvePromise = resolve;
            this.rejectPromise = reject;
        });
    }
    /**
     * 更新进度
     * @param progress 进度 (0-100)
     * @param message 可选的消息
     */
    updateProgress(progress, message) {
        if (this.progressCallback) {
            this.progressCallback(progress, message);
        }
    }
    /**
     * 处理流程完成
     * @param method 完成方法
     * @param message 完成消息
     */
    handleFinish(method, message) {
        this.onFinished(method, message);
    }
}
exports.BaseProcessFlow = BaseProcessFlow;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZUZsb3cuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvdXRpbHMvcHVibGlzaEZsb3cvYmFzZUZsb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBQXlEO0FBRXpEOztHQUVHO0FBQ0gsTUFBc0IsZUFBZTtJQW9DakM7Ozs7T0FJRztJQUNILFlBQVksSUFBWSxFQUFFLFdBQW1CO1FBOUI3Qzs7V0FFRztRQUNJLGNBQVMsR0FBWSxLQUFLLENBQUM7UUFFbEM7O1dBRUc7UUFDSyxxQkFBZ0IsR0FBMEQsSUFBSSxDQUFDO1FBRXZGOztXQUVHO1FBQ08sbUJBQWMsR0FBOEQsSUFBSSxDQUFDO1FBRTNGOztXQUVHO1FBQ08sbUJBQWMsR0FBbUMsSUFBSSxDQUFDO1FBRWhFOztXQUVHO1FBQ08sa0JBQWEsR0FBbUMsSUFBSSxDQUFDO1FBUTNELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO0lBQ25DLENBQUM7SUFhRDs7OztPQUlHO0lBQ0gsVUFBVSxDQUFDLE1BQW9CLEVBQUUsT0FBZ0I7UUFDN0MsVUFBVTtRQUNWLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ3pDLENBQUM7UUFFRCxhQUFhO1FBQ2IsSUFBSSxNQUFNLEtBQUsseUJBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFCLENBQUM7UUFDTCxDQUFDO2FBQU0sQ0FBQztZQUNKLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNyQixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sSUFBSSxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQ3JELENBQUM7UUFDTCxDQUFDO1FBRUQsVUFBVTtRQUNWLElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO1FBQzNCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO0lBQzlCLENBQUM7SUFFRDs7O09BR0c7SUFDSCxtQkFBbUIsQ0FBQyxRQUFzRDtRQUN0RSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsUUFBUSxDQUFDO0lBQ3JDLENBQUM7SUFFRDs7O09BR0c7SUFDSCxtQkFBbUIsQ0FBQyxRQUEwRDtRQUMxRSxJQUFJLENBQUMsY0FBYyxHQUFHLFFBQVEsQ0FBQztJQUNuQyxDQUFDO0lBRUQ7O09BRUc7SUFDTyxvQkFBb0I7UUFDMUIsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN6QyxJQUFJLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQztZQUM5QixJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQztRQUNoQyxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRDs7OztPQUlHO0lBQ08sY0FBYyxDQUFDLFFBQWdCLEVBQUUsT0FBZ0I7UUFDdkQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLENBQUM7SUFDTCxDQUFDO0lBRUQ7Ozs7T0FJRztJQUNPLFlBQVksQ0FBQyxNQUFvQixFQUFFLE9BQWdCO1FBQ3pELElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3JDLENBQUM7Q0FDSjtBQWxJRCwwQ0FrSUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQcm9jZXNzRmxvdywgRmluaXNoTWV0aG9kIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcclxuXHJcbi8qKlxyXG4gKiDlj5HluIPmtYHnqIvln7rnsbtcclxuICovXHJcbmV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCYXNlUHJvY2Vzc0Zsb3cgaW1wbGVtZW50cyBQcm9jZXNzRmxvdyB7XHJcbiAgICAvKipcclxuICAgICAqIOa1geeoi+WQjeensFxyXG4gICAgICovXHJcbiAgICByZWFkb25seSBuYW1lOiBzdHJpbmc7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5rWB56iL5o+P6L+wXHJcbiAgICAgKi9cclxuICAgIHJlYWRvbmx5IGRlc2NyaXB0aW9uOiBzdHJpbmc7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5rWB56iL5piv5ZCm5q2j5Zyo6L+Q6KGMXHJcbiAgICAgKi9cclxuICAgIHB1YmxpYyBpc1J1bm5pbmc6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDov5vluqblm57osIPlh73mlbBcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSBwcm9ncmVzc0NhbGxiYWNrOiAoKHByb2dyZXNzOiBudW1iZXIsIG1lc3NhZ2U/OiBzdHJpbmcpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5a6M5oiQ5Zue6LCD5Ye95pWwXHJcbiAgICAgKi9cclxuICAgIHByb3RlY3RlZCBmaW5pc2hDYWxsYmFjazogKChtZXRob2Q6IEZpbmlzaE1ldGhvZCwgbWVzc2FnZT86IHN0cmluZykgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiBQcm9taXNlIOeahCByZXNvbHZlIOWHveaVsFxyXG4gICAgICovXHJcbiAgICBwcm90ZWN0ZWQgcmVzb2x2ZVByb21pc2U6ICgodmFsdWU6IHZvaWQpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICogUHJvbWlzZSDnmoQgcmVqZWN0IOWHveaVsFxyXG4gICAgICovXHJcbiAgICBwcm90ZWN0ZWQgcmVqZWN0UHJvbWlzZTogKChyZWFzb246IGFueSkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDmnoTpgKDlh73mlbBcclxuICAgICAqIEBwYXJhbSBuYW1lIOa1geeoi+WQjeensFxyXG4gICAgICogQHBhcmFtIGRlc2NyaXB0aW9uIOa1geeoi+aPj+i/sFxyXG4gICAgICovXHJcbiAgICBjb25zdHJ1Y3RvcihuYW1lOiBzdHJpbmcsIGRlc2NyaXB0aW9uOiBzdHJpbmcpIHtcclxuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gICAgICAgIHRoaXMuZGVzY3JpcHRpb24gPSBkZXNjcmlwdGlvbjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDlvIDlp4vmtYHnqIvvvIzlrZDnsbvlv4Xpobvlrp7njrBcclxuICAgICAqIEBwYXJhbSBwYXJhbXMg5rWB56iL5Y+C5pWwXHJcbiAgICAgKi9cclxuICAgIGFic3RyYWN0IHN0YXJ0KHBhcmFtczogYW55KTogUHJvbWlzZTx2b2lkPjtcclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDlj5bmtojmtYHnqIvvvIzlrZDnsbvlv4Xpobvlrp7njrBcclxuICAgICAqL1xyXG4gICAgYWJzdHJhY3QgY2FuY2VsKCk6IHZvaWQ7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5rWB56iL5a6M5oiQ5Zue6LCD77yM5a2Q57G75Y+v5Lul6KaG55uW5Lul5re75Yqg6Ieq5a6a5LmJ5aSE55CGXHJcbiAgICAgKiBAcGFyYW0gbWV0aG9kIOWujOaIkOaWueazlVxyXG4gICAgICogQHBhcmFtIG1lc3NhZ2Ug5Y+v6YCJ55qE5raI5oGvXHJcbiAgICAgKi9cclxuICAgIG9uRmluaXNoZWQobWV0aG9kOiBGaW5pc2hNZXRob2QsIG1lc3NhZ2U/OiBzdHJpbmcpOiB2b2lkIHtcclxuICAgICAgICAvLyDosIPnlKjorr7nva7nmoTlm57osINcclxuICAgICAgICBpZiAodGhpcy5maW5pc2hDYWxsYmFjaykge1xyXG4gICAgICAgICAgICB0aGlzLmZpbmlzaENhbGxiYWNrKG1ldGhvZCwgbWVzc2FnZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOino+aekCBQcm9taXNlXHJcbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gRmluaXNoTWV0aG9kLlNVQ0NFU1MpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMucmVzb2x2ZVByb21pc2UpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVzb2x2ZVByb21pc2UoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnJlamVjdFByb21pc2UpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVqZWN0UHJvbWlzZShuZXcgRXJyb3IobWVzc2FnZSB8fCAn5rWB56iL5aSx6LSlJykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOmHjee9rueKtuaAgeWSjOW8leeUqFxyXG4gICAgICAgIHRoaXMuaXNSdW5uaW5nID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5yZXNvbHZlUHJvbWlzZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5yZWplY3RQcm9taXNlID0gbnVsbDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDorr7nva7ov5vluqblm57osINcclxuICAgICAqIEBwYXJhbSBjYWxsYmFjayDlm57osIPlh73mlbBcclxuICAgICAqL1xyXG4gICAgc2V0UHJvZ3Jlc3NDYWxsYmFjayhjYWxsYmFjazogKHByb2dyZXNzOiBudW1iZXIsIG1lc3NhZ2U/OiBzdHJpbmcpID0+IHZvaWQpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLnByb2dyZXNzQ2FsbGJhY2sgPSBjYWxsYmFjaztcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDorr7nva7lrozmiJDlm57osINcclxuICAgICAqIEBwYXJhbSBjYWxsYmFjayDlm57osIPlh73mlbBcclxuICAgICAqL1xyXG4gICAgc2V0RmluaXNoZWRDYWxsYmFjayhjYWxsYmFjazogKG1ldGhvZDogRmluaXNoTWV0aG9kLCBtZXNzYWdlPzogc3RyaW5nKSA9PiB2b2lkKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5maW5pc2hDYWxsYmFjayA9IGNhbGxiYWNrO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOWIm+W7uuWMheijheWkhOeQhiBQcm9taXNlIOeahOWHveaVsFxyXG4gICAgICovXHJcbiAgICBwcm90ZWN0ZWQgY3JlYXRlUHJvbWlzZVdyYXBwZXIoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5yZXNvbHZlUHJvbWlzZSA9IHJlc29sdmU7XHJcbiAgICAgICAgICAgIHRoaXMucmVqZWN0UHJvbWlzZSA9IHJlamVjdDtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDmm7TmlrDov5vluqZcclxuICAgICAqIEBwYXJhbSBwcm9ncmVzcyDov5vluqYgKDAtMTAwKVxyXG4gICAgICogQHBhcmFtIG1lc3NhZ2Ug5Y+v6YCJ55qE5raI5oGvXHJcbiAgICAgKi9cclxuICAgIHByb3RlY3RlZCB1cGRhdGVQcm9ncmVzcyhwcm9ncmVzczogbnVtYmVyLCBtZXNzYWdlPzogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKHRoaXMucHJvZ3Jlc3NDYWxsYmFjaykge1xyXG4gICAgICAgICAgICB0aGlzLnByb2dyZXNzQ2FsbGJhY2socHJvZ3Jlc3MsIG1lc3NhZ2UpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDlpITnkIbmtYHnqIvlrozmiJBcclxuICAgICAqIEBwYXJhbSBtZXRob2Qg5a6M5oiQ5pa55rOVXHJcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSDlrozmiJDmtojmga9cclxuICAgICAqL1xyXG4gICAgcHJvdGVjdGVkIGhhbmRsZUZpbmlzaChtZXRob2Q6IEZpbmlzaE1ldGhvZCwgbWVzc2FnZT86IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMub25GaW5pc2hlZChtZXRob2QsIG1lc3NhZ2UpO1xyXG4gICAgfVxyXG59ICJdfQ==
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishSettingFlow = void 0;
const baseFlow_1 = require("./baseFlow");
const interfaces_1 = require("./interfaces");
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
/**
 * 发布设置流程 - 负责修改publishSetting.json
 */
class PublishSettingFlow extends baseFlow_1.BaseProcessFlow {
    constructor() {
        super('修改发布设置', '修改publishSetting.json配置文件');
        this.onFinishedCallback = null;
    }
    /**
     * 启动流程
     * @param params 发布设置参数
     */
    async start(params) {
        if (this.isRunning) {
            console.warn('发布设置流程已经在运行中');
            return;
        }
        this.isRunning = true;
        this.updateProgress(0, '开始修改发布设置');
        try {
            const { projectPath, publishType, isMCI, environment, appVersion } = params;
            // 检查参数
            if (!projectPath || !publishType) {
                throw new Error('缺少必要的参数');
            }
            const publishSettingPath = (0, path_1.join)(projectPath, 'assets', 'app', 'publishSetting.json');
            this.updateProgress(20, '读取发布设置文件');
            // 读取现有的设置文件
            let publishSetting = {};
            if ((0, fs_extra_1.existsSync)(publishSettingPath)) {
                try {
                    const content = (0, fs_extra_1.readFileSync)(publishSettingPath, 'utf-8');
                    publishSetting = JSON.parse(content);
                }
                catch (error) {
                    console.error('解析发布设置文件失败:', error);
                    this.updateProgress(30, '发布设置文件解析失败，将创建新文件');
                }
            }
            else {
                this.updateProgress(30, '发布设置文件不存在，将创建新文件');
            }
            this.updateProgress(40, '更新发布设置');
            // 根据发布类型设置isRemoteBundle
            if (publishType === 'android-apk-full-package.json') {
                publishSetting.isRemoteBundle = false;
            }
            else {
                publishSetting.isRemoteBundle = true;
            }
            // 更新其他设置
            if (isMCI !== undefined) {
                publishSetting.isMCI = isMCI;
            }
            if (environment) {
                publishSetting.environment = environment;
            }
            if (appVersion) {
                publishSetting.app_version = appVersion;
            }
            this.updateProgress(60, '保存发布设置文件');
            // 保存设置文件
            try {
                (0, fs_extra_1.writeFileSync)(publishSettingPath, JSON.stringify(publishSetting, null, 2), 'utf-8');
                this.updateProgress(90, '发布设置文件保存成功');
            }
            catch (error) {
                console.error('保存发布设置文件失败:', error);
                throw new Error(`保存发布设置文件失败: ${error instanceof Error ? error.message : String(error)}`);
            }
            this.updateProgress(100, '发布设置修改完成');
            this.handleFinish(interfaces_1.FinishMethod.SUCCESS, '发布设置修改成功');
        }
        catch (error) {
            console.error('修改发布设置失败:', error);
            this.handleFinish(interfaces_1.FinishMethod.FAILURE, `修改发布设置失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * 设置完成回调
     * @param callback 回调函数
     */
    setFinishedCallback(callback) {
        this.onFinishedCallback = callback;
    }
    /**
     * 完成回调
     * @param method 完成方法
     * @param message 消息
     */
    onFinished(method, message) {
        if (this.onFinishedCallback) {
            this.onFinishedCallback(method, message);
        }
        this.isRunning = false;
        console.log(`发布设置流程${method === interfaces_1.FinishMethod.SUCCESS ? '成功' : '失败'}: ${message || ''}`);
    }
    /**
     * 取消流程
     */
    cancel() {
        if (!this.isRunning) {
            return;
        }
        this.isRunning = false;
        this.handleFinish(interfaces_1.FinishMethod.FAILURE, '发布设置流程已取消');
    }
    /**
     * 处理流程完成
     * @param method 完成方法
     * @param message 消息
     */
    handleFinish(method, message) {
        this.isRunning = false;
        this.onFinished(method, message);
    }
}
exports.PublishSettingFlow = PublishSettingFlow;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHVibGlzaFNldHRpbmdGbG93LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc291cmNlL3V0aWxzL3B1Ymxpc2hGbG93L3B1Ymxpc2hTZXR0aW5nRmxvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx5Q0FBNkM7QUFDN0MsNkNBQTRDO0FBQzVDLHVDQUFtRTtBQUNuRSwrQkFBNEI7QUFnQzVCOztHQUVHO0FBQ0gsTUFBYSxrQkFBbUIsU0FBUSwwQkFBZTtJQUduRDtRQUNJLEtBQUssQ0FBQyxRQUFRLEVBQUUsMkJBQTJCLENBQUMsQ0FBQztRQUh6Qyx1QkFBa0IsR0FBOEQsSUFBSSxDQUFDO0lBSTdGLENBQUM7SUFFRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQTRCO1FBQ3BDLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUM7WUFDN0IsT0FBTztRQUNYLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztRQUN0QixJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUVuQyxJQUFJLENBQUM7WUFDRCxNQUFNLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxHQUFHLE1BQU0sQ0FBQztZQUU1RSxPQUFPO1lBQ1AsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUMvQixNQUFNLElBQUksS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1lBQy9CLENBQUM7WUFFRCxNQUFNLGtCQUFrQixHQUFHLElBQUEsV0FBSSxFQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLHFCQUFxQixDQUFDLENBQUM7WUFFckYsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsVUFBVSxDQUFDLENB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USxDQUFDO0lBQ3ZDLENBQUM7SUFFRDs7OztPQUlHO0lBQ0gsVUFBVSxDQUFDLE1BQW9CLEVBQUUsT0FBZ0I7UUFDN0MsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFDRCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN2QixPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsTUFBTSxLQUFLLHlCQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxPQUFPLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM1RixDQUFDO0lBRUQ7O09BRUc7SUFDSCxNQUFNO1FBQ0YsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNsQixPQUFPO1FBQ1gsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxZQUFZLENBQUMseUJBQVksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDekQsQ0FBQztJQUVEOzs7O09BSUc7SUFDTyxZQUFZLENBQUMsTUFBb0IsRUFBRSxPQUFnQjtRQUN6RCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN2QixJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNyQyxDQUFDO0NBQ0o7QUFsSUQsZ0RBa0lDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQmFzZVByb2Nlc3NGbG93IH0gZnJvbSAnLi9iYXNlRmxvdyc7XHJcbmltcG9ydCB7IEZpbmlzaE1ldGhvZCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XHJcbmltcG9ydCB7IHJlYWRGaWxlU3luYywgd3JpdGVGaWxlU3luYywgZXhpc3RzU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcclxuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xyXG5cclxuLyoqXHJcbiAqIOWPkeW4g+iuvue9rua1geeoi+WPguaVsFxyXG4gKi9cclxuZXhwb3J0IGludGVyZmFjZSBQdWJsaXNoU2V0dGluZ1BhcmFtcyB7XHJcbiAgICAvKipcclxuICAgICAqIOmhueebrui3r+W+hFxyXG4gICAgICovXHJcbiAgICBwcm9qZWN0UGF0aDogc3RyaW5nO1xyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOWPkeW4g+exu+Wei1xyXG4gICAgICovXHJcbiAgICBwdWJsaXNoVHlwZTogc3RyaW5nO1xyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOaYr+WQpk1DSVxyXG4gICAgICovXHJcbiAgICBpc01DST86IGJvb2xlYW47XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5Y+R5biD546v5aKDXHJcbiAgICAgKi9cclxuICAgIGVudmlyb25tZW50Pzogc3RyaW5nO1xyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOW6lOeUqOeJiOacrOWPt1xyXG4gICAgICovXHJcbiAgICBhcHBWZXJzaW9uPzogc3RyaW5nO1xyXG59XHJcblxyXG4vKipcclxuICog5Y+R5biD6K6+572u5rWB56iLIC0g6LSf6LSj5L+u5pS5cHVibGlzaFNldHRpbmcuanNvblxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFB1Ymxpc2hTZXR0aW5nRmxvdyBleHRlbmRzIEJhc2VQcm9jZXNzRmxvdyB7XHJcbiAgICBwcml2YXRlIG9uRmluaXNoZWRDYWxsYmFjazogKChtZXRob2Q6IEZpbmlzaE1ldGhvZCwgbWVzc2FnZT86IHN0cmluZykgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcclxuICAgIFxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoJ+S/ruaUueWPkeW4g+iuvue9ricsICfkv67mlLlwdWJsaXNoU2V0dGluZy5qc29u6YWN572u5paH5Lu2Jyk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5ZCv5Yqo5rWB56iLXHJcbiAgICAgKiBAcGFyYW0gcGFyYW1zIOWPkeW4g+iuvue9ruWPguaVsFxyXG4gICAgICovXHJcbiAgICBhc3luYyBzdGFydChwYXJhbXM6IFB1Ymxpc2hTZXR0aW5nUGFyYW1zKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgaWYgKHRoaXMuaXNSdW5uaW5nKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2Fybign5Y+R5biD6K6+572u5rWB56iL5bey57uP5Zyo6L+Q6KGM5LitJyk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5pc1J1bm5pbmcgPSB0cnVlO1xyXG4gICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoMCwgJ+W8gOWni+S/ruaUueWPkeW4g+iuvue9ricpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHsgcHJvamVjdFBhdGgsIHB1Ymxpc2hUeXBlLCBpc01DSSwgZW52aXJvbm1lbnQsIGFwcFZlcnNpb24gfSA9IHBhcmFtcztcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOajgOafpeWPguaVsFxyXG4gICAgICAgICAgICBpZiAoIXByb2plY3RQYXRoIHx8ICFwdWJsaXNoVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCfnvLrlsJHlv4XopoHnmoTlj4LmlbAnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY29uc3QgcHVibGlzaFNldHRpbmdQYXRoID0gam9pbihwcm9qZWN0UGF0aCwgJ2Fzc2V0cycsICdhcHAnLCAncHVibGlzaFNldHRpbmcuanNvbicpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcygyMCwgJ+ivu+WPluWPkeW4g+iuvue9ruaWh+S7ticpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g6K+75Y+W546w5pyJ55qE6K6+572u5paH5Lu2XHJcbiAgICAgICAgICAgIGxldCBwdWJsaXNoU2V0dGluZzogUmVjb3JkPHN0cmluZywgYW55PiA9IHt9O1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGV4aXN0c1N5bmMocHVibGlzaFNldHRpbmdQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKHB1Ymxpc2hTZXR0aW5nUGF0aCwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcHVibGlzaFNldHRpbmcgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xyXG4gICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfop6PmnpDlj5HluIPorr7nva7mlofku7blpLHotKU6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoMzAsICflj5HluIPorr7nva7mlofku7bop6PmnpDlpLHotKXvvIzlsIbliJvlu7rmlrDmlofku7YnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoMzAsICflj5HluIPorr7nva7mlofku7bkuI3lrZjlnKjvvIzlsIbliJvlu7rmlrDmlofku7YnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcyg0MCwgJ+abtOaWsOWPkeW4g+iuvue9ricpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5qC55o2u5Y+R5biD57G75Z6L6K6+572uaXNSZW1vdGVCdW5kbGVcclxuICAgICAgICAgICAgaWYgKHB1Ymxpc2hUeXBlID09PSAnYW5kcm9pZC1hcGstZnVsbC1wYWNrYWdlLmpzb24nKSB7XHJcbiAgICAgICAgICAgICAgICBwdWJsaXNoU2V0dGluZy5pc1JlbW90ZUJ1bmRsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcHVibGlzaFNldHRpbmcuaXNSZW1vdGVCdW5kbGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDmm7TmlrDlhbbku5borr7nva5cclxuICAgICAgICAgICAgaWYgKGlzTUNJICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHB1Ymxpc2hTZXR0aW5nLmlzTUNJID0gaXNNQ0k7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGlmIChlbnZpcm9ubWVudCkge1xyXG4gICAgICAgICAgICAgICAgcHVibGlzaFNldHRpbmcuZW52aXJvbm1lbnQgPSBlbnZpcm9ubWVudDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgaWYgKGFwcFZlcnNpb24pIHtcclxuICAgICAgICAgICAgICAgIHB1Ymxpc2hTZXR0aW5nLmFwcF92ZXJzaW9uID0gYXBwVmVyc2lvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcyg2MCwgJ+S/neWtmOWPkeW4g+iuvue9ruaWh+S7ticpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g5L+d5a2Y6K6+572u5paH5Lu2XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB3cml0ZUZpbGVTeW5jKHB1Ymxpc2hTZXR0aW5nUGF0aCwgSlNPTi5zdHJpbmdpZnkocHVibGlzaFNldHRpbmcsIG51bGwsIDIpLCAndXRmLTgnKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoOTAsICflj5HluIPorr7nva7mlofku7bkv53lrZjmiJDlip8nKTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+S/neWtmOWPkeW4g+iuvue9ruaWh+S7tuWksei0pTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYOS/neWtmOWPkeW4g+iuvue9ruaWh+S7tuWksei0pTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoMTAwLCAn5Y+R5biD6K6+572u5L+u5pS55a6M5oiQJyk7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5TVUNDRVNTLCAn5Y+R5biD6K6+572u5L+u5pS55oiQ5YqfJyk7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcign5L+u5pS55Y+R5biD6K6+572u5aSx6LSlOicsIGVycm9yKTtcclxuICAgICAgICAgICAgdGhpcy5oYW5kbGVGaW5pc2goRmluaXNoTWV0aG9kLkZBSUxVUkUsIGDkv67mlLnlj5HluIPorr7nva7lpLHotKU6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDorr7nva7lrozmiJDlm57osINcclxuICAgICAqIEBwYXJhbSBjYWxsYmFjayDlm57osIPlh73mlbBcclxuICAgICAqL1xyXG4gICAgc2V0RmluaXNoZWRDYWxsYmFjayhjYWxsYmFjazogKG1ldGhvZDogRmluaXNoTWV0aG9kLCBtZXNzYWdlPzogc3RyaW5nKSA9PiB2b2lkKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5vbkZpbmlzaGVkQ2FsbGJhY2sgPSBjYWxsYmFjaztcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDlrozmiJDlm57osINcclxuICAgICAqIEBwYXJhbSBtZXRob2Qg5a6M5oiQ5pa55rOVXHJcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSDmtojmga9cclxuICAgICAqL1xyXG4gICAgb25GaW5pc2hlZChtZXRob2Q6IEZpbmlzaE1ldGhvZCwgbWVzc2FnZT86IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLm9uRmluaXNoZWRDYWxsYmFjaykge1xyXG4gICAgICAgICAgICB0aGlzLm9uRmluaXNoZWRDYWxsYmFjayhtZXRob2QsIG1lc3NhZ2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmlzUnVubmluZyA9IGZhbHNlO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKGDlj5HluIPorr7nva7mtYHnqIske21ldGhvZCA9PT0gRmluaXNoTWV0aG9kLlNVQ0NFU1MgPyAn5oiQ5YqfJyA6ICflpLHotKUnfTogJHttZXNzYWdlIHx8ICcnfWApO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOWPlua2iOa1geeoi1xyXG4gICAgICovXHJcbiAgICBjYW5jZWwoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmlzUnVubmluZykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHRoaXMuaXNSdW5uaW5nID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5oYW5kbGVGaW5pc2goRmluaXNoTWV0aG9kLkZBSUxVUkUsICflj5HluIPorr7nva7mtYHnqIvlt7Llj5bmtognKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDlpITnkIbmtYHnqIvlrozmiJBcclxuICAgICAqIEBwYXJhbSBtZXRob2Qg5a6M5oiQ5pa55rOVXHJcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSDmtojmga9cclxuICAgICAqL1xyXG4gICAgcHJvdGVjdGVkIGhhbmRsZUZpbmlzaChtZXRob2Q6IEZpbmlzaE1ldGhvZCwgbWVzc2FnZT86IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMuaXNSdW5uaW5nID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5vbkZpbmlzaGVkKG1ldGhvZCwgbWVzc2FnZSk7XHJcbiAgICB9XHJcbn0gIl19
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundleVersionsPushFlow = void 0;
const baseFlow_1 = require("./baseFlow");
const interfaces_1 = require("./interfaces");
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const child_process_1 = require("child_process");
/**
 * Bundle版本推送流程 - 将 bundle_versions.json 提交并推送到Git仓库
 */
class BundleVersionsPushFlow extends baseFlow_1.BaseProcessFlow {
    static getVersionFilePath(projectPath) {
        return (0, path_1.join)(projectPath, 'publish-remote-bundle', 'bundle_versions.json');
    }
    constructor() {
        super('Bundle版本推送', '将 bundle_versions.json 提交并推送到Git仓库');
        this.onFinishedCallback = null;
        this.canceled = false;
        this.resolvePromise = null;
        this.rejectPromise = null;
    }
    /**
     * 启动流程
     * @param params 推送参数
     */
    async start(params) {
        if (this.isRunning) {
            console.warn('Bundle版本推送流程已在运行');
            return Promise.reject(new Error('流程已在运行中'));
        }
        // 创建新的Promise，将resolve和reject函数保存起来，在流程真正完成时调用
        return new Promise((resolve, reject) => {
            this.resolvePromise = resolve;
            this.rejectPromise = reject;
            this.isRunning = true;
            this.canceled = false;
            this.updateProgress(0, '准备提交并推送Bundle版本');
            try {
                const { projectPath, commitMessage = 'Update bundle versions' } = params;
                // 检查版本文件是否存在
                const versionFilePath = BundleVersionsPushFlow.getVersionFilePath(projectPath);
                if (!(0, fs_extra_1.existsSync)(versionFilePath)) {
                    this.handleFinish(interfaces_1.FinishMethod.FAILURE, `版本文件不存在: ${versionFilePath}`);
                    return;
                }
                this.updateProgress(10, '检查Git仓库状态');
                // 获取当前分支
                let currentBranch;
                try {
                    currentBranch = (0, child_process_1.execSync)('git branch --show-current', {
                        cwd: projectPath,
                        encoding: 'utf-8'
                    }).trim();
                }
                catch (error) {
                    this.handleFinish(interfaces_1.FinishMethod.FAILURE, '获取Git分支失败');
                    return;
                }
                this.updateProgress(20, `当前分支: ${currentBranch}`);
                // 检查文件状态
                let gitStatus;
                try {
                    gitStatus = (0, child_process_1.execSync)('git status --porcelain publish-remote-bundle/bundle_versions.json', {
                        cwd: projectPath,
                        encoding: 'utf-8'
                    }).trim();
                }
                catch (error) {
                    this.handleFinish(interfaces_1.FinishMethod.FAILURE, '检查文件状态失败');
                    return;
                }
                // 检查是否有变更
                if (!gitStatus) {
                    this.updateProgress(100, '无变更需要提交');
                    this.handleFinish(interfaces_1.FinishMethod.SUCCESS, '版本文件无变更，无需提交');
                    return;
                }
                if (this.canceled) {
                    this.handleFinish(interfaces_1.FinishMethod.FAILURE, '操作已取消');
                    return;
                }
                this.updateProgress(30, '添加变更到暂存区');
                // 添加变更到暂存区
                try {
                    (0, child_process_1.execSync)('git add publish-remote-bundle/bundle_versions.json', {
                        cwd: projectPath
                    });
                }
                catch (error) {
                    this.handleFinish(interfaces_1.FinishMethod.FAILURE, '添加文件到暂存区失败');
                    return;
                }
                this.updateProgress(50, '提交变更');
                // 提交变更
                try {
                    (0, child_process_1.execSync)(`git commit -m "${commitMessage}"`, {
                        cwd: projectPath
                    });
                }
                catch (error) {
                    console.warn('提交失败，可能没有变更', error);
                    this.handleFinish(interfaces_1.FinishMethod.FAILURE, '提交失败，可能没有变更');
                    return;
                }
                if (this.canceled) {
                    this.handleFinish(interfaces_1.FinishMethod.FAILURE, '操作已取消');
                    return;
                }
                this.updateProgress(70, '推送到远程仓库');
                // 推送到远程仓库
                try {
                    (0, child_process_1.execSync)(`git push origin ${currentBranch}`, {
                        cwd: projectPath
                    });
                }
                catch (error) {
                    console.error('推送失败', error);
                    // 尝试使用 --force-with-lease 选项重试
                    try {
                        this.updateProgress(80, '尝试使用 --force-with-lease 选项推送');
                        (0, child_process_1.execSync)(`git push origin ${currentBranch} --force-with-lease`, {
                            cwd: projectPath
                        });
                    }
                    catch (forceError) {
                        console.error('强制推送失败', forceError);
                        this.handleFinish(interfaces_1.FinishMethod.FAILURE, `推送到远程仓库失败: ${forceError instanceof Error ? forceError.message : String(forceError)}`);
                        return;
                    }
                }
                this.updateProgress(100, '版本推送完成');
                this.handleFinish(interfaces_1.FinishMethod.SUCCESS, '版本已成功推送到远程仓库');
            }
            catch (error) {
                if (this.canceled) {
                    this.handleFinish(interfaces_1.FinishMethod.FAILURE, '操作已取消');
                }
                else {
                    console.error('推送Bundle版本失败:', error);
                    this.handleFinish(interfaces_1.FinishMethod.FAILURE, `推送失败: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        });
    }
    /**
     * 设置完成回调
     */
    setFinishedCallback(callback) {
        this.onFinishedCallback = callback;
    }
    /**
     * 完成回调
     */
    onFinished(method, message) {
        if (this.onFinishedCallback) {
            this.onFinishedCallback(method, message);
        }
        this.isRunning = false;
        // 根据完成状态解析Promise
        if (method === interfaces_1.FinishMethod.SUCCESS) {
            if (this.resolvePromise) {
                this.resolvePromise();
            }
        }
        else {
            if (this.rejectPromise) {
                this.rejectPromise(new Error(message || '推送流程失败'));
            }
        }
        // 清理引用
        this.resolvePromise = null;
        this.rejectPromise = null;
    }
    /**
     * 取消流程
     */
    cancel() {
        if (!this.isRunning) {
            return;
        }
        this.canceled = true;
        console.log('正在取消Bundle版本推送流程...');
        this.handleFinish(interfaces_1.FinishMethod.FAILURE, '用户已取消操作');
    }
    /**
     * 处理流程完成
     */
    handleFinish(method, message) {
        this.isRunning = false;
        // 记录完成状态
        console.log(`Bundle版本推送${method === interfaces_1.FinishMethod.SUCCESS ? '成功' : '失败'}: ${message || ''}`);
        // 调用完成回调
        this.onFinished(method, message);
    }
}
exports.BundleVersionsPushFlow = BundleVersionsPushFlow;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlVmVyc2lvbnNQdXNoRmxvdy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NvdXJjZS91dGlscy9wdWJsaXNoRmxvdy9idW5kbGVWZXJzaW9uc1B1c2hGbG93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHlDQUE2QztBQUM3Qyw2Q0FBNEM7QUFDNUMsK0JBQTRCO0FBQzVCLHVDQUFzQztBQUN0QyxpREFBeUM7QUFpQnpDOztHQUVHO0FBQ0gsTUFBYSxzQkFBdUIsU0FBUSwwQkFBZTtJQUMvQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsV0FBbUI7UUFDakQsT0FBTyxJQUFBLFdBQUksRUFBQyxXQUFXLEVBQUUsdUJBQXVCLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBT0Q7UUFDSSxLQUFLLENBQUMsWUFBWSxFQUFFLG9DQUFvQyxDQUFDLENBQUM7UUFOdEQsdUJBQWtCLEdBQThELElBQUksQ0FBQztRQUNyRixhQUFRLEdBQVksS0FBSyxDQUFDO1FBQ3hCLG1CQUFjLEdBQW1DLElBQUksQ0FBQztRQUN0RCxrQkFBYSxHQUFtQyxJQUFJLENBQUM7SUFJL0QsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBZ0M7UUFDeEMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQ2pDLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ2hELENBQUM7UUFFRCwrQ0FBK0M7UUFDL0MsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN6QyxJQUFJLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQztZQUM5QixJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQztZQUU1QixJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQztZQUN0QixJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztZQUN0QixJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO1lBRTFDLElBQUksQ0FBQztnQkFDRCxNQUFNLEVBQUUsV0FBVyxFQUFFLGFBQWEsR0FBRyx3QkFBd0IsRUFBRSxHQUFHLE1BQU0sQ0FBQztnQkFFekUsYUFBYTtnQkFDYixNQUFNLGVBQWUsR0FBRyxzQkFBc0IsQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDL0UsSUFBSSxDQUFDLElBQUEscUJBQVUsRUFBQyxlQUFlLENBQUMsRUFBRSxDQUFDO29CQUMvQixJQUFJLENBQUMsWUFBWSxDQUFDLHlCQUFZLENBQUMsT0FBTyxFQUFFLFlBQVksZUFBZSxFQUFFLENBQUMsQ0FBQztvQkFDdkUsT0FBTztnQkFDWCxDQUFDO2dCQUVELElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLFdBQVcsQ0FBQyxDQUFDO2dCQUVyQyxTQUFTO2dCQUNULElBQUksYUFBYSxDQUFDO2dCQUNsQixJQUFJLENBQUM7b0JBQ0QsYUFBYSxHQUFHLElBQUEsd0JBQVEsRUFBQywyQkFBMkIsRUFBRTt3QkFDbEQsR0FBRyxFQUFFLFdBQVc7d0JBQ2hCLFFBQVEsRUFBRSxPQUFPO3FCQUNwQixDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2QsQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNiLElBQUksQ0FBQyxZQUFZLENBQUMseUJBQVksQ0FBQyxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUM7b0JBQ3JELE9BQU87Z0JBQ1gsQ0FBQztnQkFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxTQUFTLGFBQWEsRUFBRSxDQUFDLENBQUM7Z0JBRWxELFNBQVM7Z0JBQ1QsSUFBSSxTQUFTLENBQUM7Z0JBQ2QsSUFBSSxDQUFDO29CQUNELFNBQVMsR0FBRyxJQUFBLHdCQUFRLEVBQUMsbUVBQW1FLEVBQUU7d0JBQ3RGLEdBQUcsRUFBRSxXQUFXO3dCQUNoQixRQUFRLEVBQUUsT0FBTztxQkFDcEIsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNkLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDYixJQUFJLENBQUMsWUFBWSxDQUFDLHlCQUFZLENBQUMsT0FBTyxFQUFFLFVBQVUsQ0FBQyxDQUFDO29CQUNwRCxPQUFPO2dCQUNYLENBQUM7Z0JBRUQsVUFBVTtnQkFDVixJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ2IsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQ3BDLElBQUksQ0FBQyxZQUFZLENBQUMseUJBQVksQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7b0JBQ3hELE9BQU87Z0JBQ1gsQ0FBQztnQkFFRCxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDaEIsSUFBSSxDQUFDLFlBQVksQ0FBQyx5QkFBWSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDakQsT0FBTztnQkFDWCxDQUFDO2dCQUVELElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLFVBQVUsQ0FBQyxDQUFDO2dCQUVwQyxXQUFXO2dCQUNYLElBQUksQ0FBQztvQkFDRCxJQUFBLHdCQUFRLEVBQUMsb0RBQW9ELEVBQUU7d0JBQzNELEdBQUcsRUFBRSxXQUFXO3FCQUNuQixDQUFDLENBQUM7Z0JBQ1AsQ0FBQztnQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO29CQUNiLElBQUksQ0FBQyxZQUFZLENBQUMseUJBQVksQ0FBQyxPQUFPLEVBQUUsWUFBWSxDQUFDLENBQUM7b0JBQ3RELE9BQU87Z0JBQ1gsQ0FBQztnQkFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFFaEMsT0FBTztnQkFDUCxJQUFJLENBQUM7b0JBQ0QsSUFBQSx3QkFBUSxFQUFDLGtCQUFrQixhQUFhLEdBQUcsRUFBRTt3QkFDekMsR0FBRyxFQUFFLFdBQVc7cUJBQ25CLENBQUMsQ0FBQztnQkFDUCxDQUFDO2dCQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7b0JBQ2IsT0FBTyxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsS0FBSyxDQUFDLENBQUM7b0JBQ25DLElBQUksQ0FBQyxZQUFZLENBQUMseUJBQVksQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7b0JBQ3ZELE9BQU87Z0JBQ1gsQ0FBQztnQkFFRCxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDaEIsSUFBSSxDQUFDLFlBQVksQ0FBQyx5QkFBWSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDakQsT0FBTztnQkFDWCxDQUFDO2dCQUVELElBQUksQ0FBQyxjQUFjLENBQUMsRUFBRSxFQUFFLFNBQVMsQ0FBQyxDQUFDO2dCQUVuQyxVQUFVO2dCQUNWLElBQUksQ0FBQztvQkFDRCxJQUFBLHdCQUFRLEVBQUMsbUJBQW1CLGFBQWEsRUFBRSxFQUFFO3dCQUN6QyxHQUFHLEVBQUUsV0FBVztxQkFDbkIsQ0FBQyxDQUFDO2dCQUNQLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDYixPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQztvQkFDN0IsK0JBQStCO29CQUMvQixJQUFJLENBQUM7d0JBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxFQUFFLEVBQUUsOEJBQThCLENBQUMsQ0FBQzt3QkFDeEQsSUFBQSx3QkFBUSxFQUFDLG1CQUFtQixhQUFhLHFCQUFxQixFQUFFOzRCQUM1RCxHQUFHLEVBQUUsV0FBVzt5QkFDbkIsQ0FBQyxDQUFDO29CQUNQLENBQUM7b0JBQUMsT0FBTyxVQUFVLEVBQUUsQ0FBQzt3QkFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7d0JBQ3BDLElBQUksQ0FBQyxZQUFZLENBQUMseUJBQVksQ0FBQyxPQUFPLEVBQUUsY0FBYyxVQUFVLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUMvSCxPQUFPO29CQUNYLENBQUM7Z0JBQ0wsQ0FBQztnQkFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLFlBQVksQ0FBQyx5QkFBWSxDQUFDLE9BQU8sRUFBRSxjQUFjLENBQUMsQ0FBQztZQUM1RCxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDYixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztvQkFDaEIsSUFBSSxDQUFDLFlBQVksQ0FBQyx5QkFBWSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztnQkFDckQsQ0FBQztxQkFBTSxDQUFDO29CQUNKLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxDQUFDO29CQUN0QyxJQUFJLENBQUMsWUFBWSxDQUFDLHlCQUFZLENBQUMsT0FBTyxFQUFFLFNBQVMsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDL0csQ0FBQztZQUNMLENBQUM7UUFDTCxDQUFDLENBQUMsQ0FBQztJQUNQLENBQUM7SUFFRDs7T0FFRztJQUNILG1CQUFtQixDQUFDLFFBQTBEO1FBQzFFLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxRQUFRLENBQUM7SUFDdkMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsVUFBVSxDQUFDLE1BQW9CLEVBQUUsT0FBZ0I7UUFDN0MsSUFBSSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQzdDLENBQUM7UUFDRCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUV2QixrQkFBa0I7UUFDbEIsSUFBSSxNQUFNLEtBQUsseUJBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQyxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDdEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFCLENBQUM7UUFDTCxDQUFDO2FBQU0sQ0FBQztZQUNKLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO2dCQUNyQixJQUFJLENBQUMsYUFBYSxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sSUFBSSxRQUFRLENBQUMsQ0FBQyxDQUFDO1lBQ3ZELENBQUM7UUFDTCxDQUFDO1FBRUQsT0FBTztRQUNQLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDO1FBQzNCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDO0lBQzlCLENBQUM7SUFFRDs7T0FFRztJQUNILE1BQU07UUFDRixJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2xCLE9BQU87UUFDWCxDQUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDckIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO1FBQ25DLElBQUksQ0FBQyxZQUFZLENBQUMseUJBQVksQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVEOztPQUVHO0lBQ08sWUFBWSxDQUFDLE1BQW9CLEVBQUUsT0FBZ0I7UUFDekQsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFFdkIsU0FBUztRQUNULE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxNQUFNLEtBQUsseUJBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLE9BQU8sSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRTVGLFNBQVM7UUFDVCxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUNyQyxDQUFDO0NBQ0o7QUE3TUQsd0RBNk1DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQmFzZVByb2Nlc3NGbG93IH0gZnJvbSAnLi9iYXNlRmxvdyc7XHJcbmltcG9ydCB7IEZpbmlzaE1ldGhvZCB9IGZyb20gJy4vaW50ZXJmYWNlcyc7XHJcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgZXhpc3RzU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcclxuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcclxuXHJcbi8qKlxyXG4gKiBCdW5kbGXniYjmnKzmjqjpgIHmtYHnqIvlj4LmlbBcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgQnVuZGxlVmVyc2lvbnNQdXNoUGFyYW1zIHtcclxuICAgIC8qKlxyXG4gICAgICog6aG555uu6Lev5b6EXHJcbiAgICAgKi9cclxuICAgIHByb2plY3RQYXRoOiBzdHJpbmc7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5o+Q5Lqk5L+h5oGvXHJcbiAgICAgKi9cclxuICAgIGNvbW1pdE1lc3NhZ2U/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBCdW5kbGXniYjmnKzmjqjpgIHmtYHnqIsgLSDlsIYgYnVuZGxlX3ZlcnNpb25zLmpzb24g5o+Q5Lqk5bm25o6o6YCB5YiwR2l05LuT5bqTXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQnVuZGxlVmVyc2lvbnNQdXNoRmxvdyBleHRlbmRzIEJhc2VQcm9jZXNzRmxvdyB7XHJcbiAgICBwcml2YXRlIHN0YXRpYyBnZXRWZXJzaW9uRmlsZVBhdGgocHJvamVjdFBhdGg6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAgICAgcmV0dXJuIGpvaW4ocHJvamVjdFBhdGgsICdwdWJsaXNoLXJlbW90ZS1idW5kbGUnLCAnYnVuZGxlX3ZlcnNpb25zLmpzb24nKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcHJpdmF0ZSBvbkZpbmlzaGVkQ2FsbGJhY2s6ICgobWV0aG9kOiBGaW5pc2hNZXRob2QsIG1lc3NhZ2U/OiBzdHJpbmcpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XHJcbiAgICBwcml2YXRlIGNhbmNlbGVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBwcm90ZWN0ZWQgcmVzb2x2ZVByb21pc2U6ICgodmFsdWU6IHZvaWQpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XHJcbiAgICBwcm90ZWN0ZWQgcmVqZWN0UHJvbWlzZTogKChyZWFzb246IGFueSkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcclxuICAgIFxyXG4gICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgc3VwZXIoJ0J1bmRsZeeJiOacrOaOqOmAgScsICflsIYgYnVuZGxlX3ZlcnNpb25zLmpzb24g5o+Q5Lqk5bm25o6o6YCB5YiwR2l05LuT5bqTJyk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5ZCv5Yqo5rWB56iLXHJcbiAgICAgKiBAcGFyYW0gcGFyYW1zIOaOqOmAgeWPguaVsFxyXG4gICAgICovXHJcbiAgICBhc3luYyBzdGFydChwYXJhbXM6IEJ1bmRsZVZlcnNpb25zUHVzaFBhcmFtcyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIGlmICh0aGlzLmlzUnVubmluZykge1xyXG4gICAgICAgICAgICBjb25zb2xlLndhcm4oJ0J1bmRsZeeJiOacrOaOqOmAgea1geeoi+W3suWcqOi/kOihjCcpO1xyXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCfmtYHnqIvlt7LlnKjov5DooYzkuK0nKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOWIm+W7uuaWsOeahFByb21pc2XvvIzlsIZyZXNvbHZl5ZKMcmVqZWN05Ye95pWw5L+d5a2Y6LW35p2l77yM5Zyo5rWB56iL55yf5q2j5a6M5oiQ5pe26LCD55SoXHJcbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPHZvaWQ+KChyZXNvbHZlLCByZWplY3QpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5yZXNvbHZlUHJvbWlzZSA9IHJlc29sdmU7XHJcbiAgICAgICAgICAgIHRoaXMucmVqZWN0UHJvbWlzZSA9IHJlamVjdDtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMuaXNSdW5uaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5jYW5jZWxlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKDAsICflh4blpIfmj5DkuqTlubbmjqjpgIFCdW5kbGXniYjmnKwnKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB7IHByb2plY3RQYXRoLCBjb21taXRNZXNzYWdlID0gJ1VwZGF0ZSBidW5kbGUgdmVyc2lvbnMnIH0gPSBwYXJhbXM7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOajgOafpeeJiOacrOaWh+S7tuaYr+WQpuWtmOWcqFxyXG4gICAgICAgICAgICAgICAgY29uc3QgdmVyc2lvbkZpbGVQYXRoID0gQnVuZGxlVmVyc2lvbnNQdXNoRmxvdy5nZXRWZXJzaW9uRmlsZVBhdGgocHJvamVjdFBhdGgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFleGlzdHNTeW5jKHZlcnNpb25GaWxlUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUZpbmlzaChGaW5pc2hNZXRob2QuRkFJTFVSRSwgYOeJiOacrOaWh+S7tuS4jeWtmOWcqDogJHt2ZXJzaW9uRmlsZVBhdGh9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKDEwLCAn5qOA5p+lR2l05LuT5bqT54q25oCBJyk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOiOt+WPluW9k+WJjeWIhuaUr1xyXG4gICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRCcmFuY2g7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRCcmFuY2ggPSBleGVjU3luYygnZ2l0IGJyYW5jaCAtLXNob3ctY3VycmVudCcsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY3dkOiBwcm9qZWN0UGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW5jb2Rpbmc6ICd1dGYtOCdcclxuICAgICAgICAgICAgICAgICAgICB9KS50cmltKCk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5GQUlMVVJFLCAn6I635Y+WR2l05YiG5pSv5aSx6LSlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKDIwLCBg5b2T5YmN5YiG5pSvOiAke2N1cnJlbnRCcmFuY2h9YCk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOajgOafpeaWh+S7tueKtuaAgVxyXG4gICAgICAgICAgICAgICAgbGV0IGdpdFN0YXR1cztcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZ2l0U3RhdHVzID0gZXhlY1N5bmMoJ2dpdCBzdGF0dXMgLS1wb3JjZWxhaW4gcHVibGlzaC1yZW1vdGUtYnVuZGxlL2J1bmRsZV92ZXJzaW9ucy5qc29uJywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjd2Q6IHByb2plY3RQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmNvZGluZzogJ3V0Zi04J1xyXG4gICAgICAgICAgICAgICAgICAgIH0pLnRyaW0oKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVGaW5pc2goRmluaXNoTWV0aG9kLkZBSUxVUkUsICfmo4Dmn6Xmlofku7bnirbmgIHlpLHotKUnKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOajgOafpeaYr+WQpuacieWPmOabtFxyXG4gICAgICAgICAgICAgICAgaWYgKCFnaXRTdGF0dXMpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKDEwMCwgJ+aXoOWPmOabtOmcgOimgeaPkOS6pCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5TVUNDRVNTLCAn54mI5pys5paH5Lu25peg5Y+Y5pu077yM5peg6ZyA5o+Q5LqkJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jYW5jZWxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5GQUlMVVJFLCAn5pON5L2c5bey5Y+W5raIJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKDMwLCAn5re75Yqg5Y+Y5pu05Yiw5pqC5a2Y5Yy6Jyk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOa3u+WKoOWPmOabtOWIsOaaguWtmOWMulxyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBleGVjU3luYygnZ2l0IGFkZCBwdWJsaXNoLXJlbW90ZS1idW5kbGUvYnVuZGxlX3ZlcnNpb25zLmpzb24nLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN3ZDogcHJvamVjdFBhdGhcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVGaW5pc2goRmluaXNoTWV0aG9kLkZBSUxVUkUsICfmt7vliqDmlofku7bliLDmmoLlrZjljLrlpLHotKUnKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoNTAsICfmj5DkuqTlj5jmm7QnKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5o+Q5Lqk5Y+Y5pu0XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGV4ZWNTeW5jKGBnaXQgY29tbWl0IC1tIFwiJHtjb21taXRNZXNzYWdlfVwiYCwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjd2Q6IHByb2plY3RQYXRoXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybign5o+Q5Lqk5aSx6LSl77yM5Y+v6IO95rKh5pyJ5Y+Y5pu0JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5GQUlMVVJFLCAn5o+Q5Lqk5aSx6LSl77yM5Y+v6IO95rKh5pyJ5Y+Y5pu0Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jYW5jZWxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5GQUlMVVJFLCAn5pON5L2c5bey5Y+W5raIJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKDcwLCAn5o6o6YCB5Yiw6L+c56iL5LuT5bqTJyk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOaOqOmAgeWIsOi/nOeoi+S7k+W6k1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBleGVjU3luYyhgZ2l0IHB1c2ggb3JpZ2luICR7Y3VycmVudEJyYW5jaH1gLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN3ZDogcHJvamVjdFBhdGhcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5o6o6YCB5aSx6LSlJywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWwneivleS9v+eUqCAtLWZvcmNlLXdpdGgtbGVhc2Ug6YCJ6aG56YeN6K+VXHJcbiAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcyg4MCwgJ+WwneivleS9v+eUqCAtLWZvcmNlLXdpdGgtbGVhc2Ug6YCJ6aG55o6o6YCBJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4ZWNTeW5jKGBnaXQgcHVzaCBvcmlnaW4gJHtjdXJyZW50QnJhbmNofSAtLWZvcmNlLXdpdGgtbGVhc2VgLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjd2Q6IHByb2plY3RQYXRoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGZvcmNlRXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5by65Yi25o6o6YCB5aSx6LSlJywgZm9yY2VFcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5GQUlMVVJFLCBg5o6o6YCB5Yiw6L+c56iL5LuT5bqT5aSx6LSlOiAke2ZvcmNlRXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGZvcmNlRXJyb3IubWVzc2FnZSA6IFN0cmluZyhmb3JjZUVycm9yKX1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcygxMDAsICfniYjmnKzmjqjpgIHlrozmiJAnKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5TVUNDRVNTLCAn54mI5pys5bey5oiQ5Yqf5o6o6YCB5Yiw6L+c56iL5LuT5bqTJyk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jYW5jZWxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5GQUlMVVJFLCAn5pON5L2c5bey5Y+W5raIJyk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+aOqOmAgUJ1bmRsZeeJiOacrOWksei0pTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVGaW5pc2goRmluaXNoTWV0aG9kLkZBSUxVUkUsIGDmjqjpgIHlpLHotKU6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiBTdHJpbmcoZXJyb3IpfWApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog6K6+572u5a6M5oiQ5Zue6LCDXHJcbiAgICAgKi9cclxuICAgIHNldEZpbmlzaGVkQ2FsbGJhY2soY2FsbGJhY2s6IChtZXRob2Q6IEZpbmlzaE1ldGhvZCwgbWVzc2FnZT86IHN0cmluZykgPT4gdm9pZCk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMub25GaW5pc2hlZENhbGxiYWNrID0gY2FsbGJhY2s7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5a6M5oiQ5Zue6LCDXHJcbiAgICAgKi9cclxuICAgIG9uRmluaXNoZWQobWV0aG9kOiBGaW5pc2hNZXRob2QsIG1lc3NhZ2U/OiBzdHJpbmcpOiB2b2lkIHtcclxuICAgICAgICBpZiAodGhpcy5vbkZpbmlzaGVkQ2FsbGJhY2spIHtcclxuICAgICAgICAgICAgdGhpcy5vbkZpbmlzaGVkQ2FsbGJhY2sobWV0aG9kLCBtZXNzYWdlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5pc1J1bm5pbmcgPSBmYWxzZTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDmoLnmja7lrozmiJDnirbmgIHop6PmnpBQcm9taXNlXHJcbiAgICAgICAgaWYgKG1ldGhvZCA9PT0gRmluaXNoTWV0aG9kLlNVQ0NFU1MpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMucmVzb2x2ZVByb21pc2UpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVzb2x2ZVByb21pc2UoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnJlamVjdFByb21pc2UpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucmVqZWN0UHJvbWlzZShuZXcgRXJyb3IobWVzc2FnZSB8fCAn5o6o6YCB5rWB56iL5aSx6LSlJykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOa4heeQhuW8leeUqFxyXG4gICAgICAgIHRoaXMucmVzb2x2ZVByb21pc2UgPSBudWxsO1xyXG4gICAgICAgIHRoaXMucmVqZWN0UHJvbWlzZSA9IG51bGw7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5Y+W5raI5rWB56iLXHJcbiAgICAgKi9cclxuICAgIGNhbmNlbCgpOiB2b2lkIHtcclxuICAgICAgICBpZiAoIXRoaXMuaXNSdW5uaW5nKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgdGhpcy5jYW5jZWxlZCA9IHRydWU7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ+ato+WcqOWPlua2iEJ1bmRsZeeJiOacrOaOqOmAgea1geeoiy4uLicpO1xyXG4gICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5GQUlMVVJFLCAn55So5oi35bey5Y+W5raI5pON5L2cJyk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5aSE55CG5rWB56iL5a6M5oiQXHJcbiAgICAgKi9cclxuICAgIHByb3RlY3RlZCBoYW5kbGVGaW5pc2gobWV0aG9kOiBGaW5pc2hNZXRob2QsIG1lc3NhZ2U/OiBzdHJpbmcpOiB2b2lkIHtcclxuICAgICAgICB0aGlzLmlzUnVubmluZyA9IGZhbHNlO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOiusOW9leWujOaIkOeKtuaAgVxyXG4gICAgICAgIGNvbnNvbGUubG9nKGBCdW5kbGXniYjmnKzmjqjpgIEke21ldGhvZCA9PT0gRmluaXNoTWV0aG9kLlNVQ0NFU1MgPyAn5oiQ5YqfJyA6ICflpLHotKUnfTogJHttZXNzYWdlIHx8ICcnfWApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOiwg+eUqOWujOaIkOWbnuiwg1xyXG4gICAgICAgIHRoaXMub25GaW5pc2hlZChtZXRob2QsIG1lc3NhZ2UpO1xyXG4gICAgfVxyXG59ICJdfQ==
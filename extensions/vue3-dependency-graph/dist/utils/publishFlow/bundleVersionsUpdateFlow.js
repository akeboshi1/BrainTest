"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundleVersionsUpdateFlow = void 0;
const baseFlow_1 = require("./baseFlow");
const interfaces_1 = require("./interfaces");
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
const child_process_1 = require("child_process");
/**
 * Bundle版本更新流程 - 从Git仓库更新bundle_versions.json
 */
class BundleVersionsUpdateFlow extends baseFlow_1.BaseProcessFlow {
    static getVersionFilePath(projectPath) {
        return (0, path_1.join)(projectPath, 'publish-remote-bundle', 'bundle_versions.json');
    }
    constructor() {
        super('Bundle版本更新', '从Git仓库更新当前分支最新的bundle_versions.json');
        this.onFinishedCallback = null;
        this.canceled = false;
        this.resolvePromise = null;
        this.rejectPromise = null;
    }
    /**
     * 启动流程
     * @param params 更新参数
     */
    async start(params) {
        if (this.isRunning) {
            console.warn('Bundle版本更新流程已在运行');
            return Promise.reject(new Error('流程已在运行中'));
        }
        // 创建新的Promise，将resolve和reject函数保存起来，在流程真正完成时调用
        return new Promise((resolve, reject) => {
            this.resolvePromise = resolve;
            this.rejectPromise = reject;
            this.isRunning = true;
            this.canceled = false;
            this.updateProgress(0, '准备更新Bundle版本信息');
            try {
                const { projectPath } = params;
                // 检查publish-remote-bundle目录是否存在，如果不存在则创建
                const publishDir = (0, path_1.join)(projectPath, 'publish-remote-bundle');
                if (!(0, fs_extra_1.existsSync)(publishDir)) {
                    this.updateProgress(10, '创建发布目录');
                    (0, fs_extra_1.mkdirSync)(publishDir, { recursive: true });
                }
                const versionFilePath = BundleVersionsUpdateFlow.getVersionFilePath(projectPath);
                this.updateProgress(20, '检查本地文件状态');
                // 检查文件是否存在及状态
                let fileExists = (0, fs_extra_1.existsSync)(versionFilePath);
                // 获取当前分支
                const currentBranch = (0, child_process_1.execSync)('git branch --show-current', {
                    cwd: projectPath,
                    encoding: 'utf-8'
                }).trim();
                this.updateProgress(30, `当前分支: ${currentBranch}`);
                // 拉取最新代码
                this.updateProgress(40, '拉取远程分支最新代码');
                try {
                    (0, child_process_1.execSync)(`git pull origin ${currentBranch}`, {
                        cwd: projectPath,
                        encoding: 'utf-8'
                    });
                }
                catch (error) {
                    console.warn('拉取远程分支失败，可能没有远程分支或网络问题', error);
                }
                // 检查文件是否有未提交的更改
                this.updateProgress(60, '检查文件状态');
                try {
                    const gitStatus = (0, child_process_1.execSync)('git status --porcelain publish-remote-bundle/bundle_versions.json', {
                        cwd: projectPath,
                        encoding: 'utf-8'
                    }).trim();
                    const hasLocalChanges = gitStatus.length > 0;
                    if (hasLocalChanges) {
                        this.updateProgress(75, '文件有本地修改');
                        // 如果有本地修改，可以选择提示用户
                        console.log('bundle_versions.json 有本地修改:');
                        console.log(gitStatus);
                    }
                    else if (fileExists) {
                        this.updateProgress(80, '文件无本地修改，使用最新版本');
                    }
                    else {
                        this.updateProgress(80, '文件不存在，尝试从远程获取');
                        // 尝试检出文件
                        try {
                            (0, child_process_1.execSync)('git checkout -- publish-remote-bundle/bundle_versions.json', {
                                cwd: projectPath
                            });
                            fileExists = (0, fs_extra_1.existsSync)(versionFilePath);
                            if (fileExists) {
                                this.updateProgress(85, '已从仓库恢复文件');
                            }
                            else {
                                this.updateProgress(85, '仓库中无此文件，将创建新文件');
                                // 创建默认版本文件
                                const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
                                const defaultVersion = {
                                    version: `${today} 0000`,
                                    bundles: {},
                                    timestamp: Math.floor(Date.now() / 1000)
                                };
                                (0, fs_extra_1.writeFileSync)(versionFilePath, JSON.stringify(defaultVersion, null, 2), 'utf-8');
                                this.updateProgress(90, '已创建默认版本文件');
                            }
                        }
                        catch (error) {
                            console.warn('从Git恢复文件失败', error);
                            // 创建默认版本文件
                            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
                            const defaultVersion = {
                                version: `${today} 0000`,
                                bundles: {},
                                timestamp: Math.floor(Date.now() / 1000)
                            };
                            (0, fs_extra_1.writeFileSync)(versionFilePath, JSON.stringify(defaultVersion, null, 2), 'utf-8');
                            this.updateProgress(90, '已创建默认版本文件');
                        }
                    }
                }
                catch (error) {
                    console.warn('检查Git状态失败', error);
                    // 如果获取Git状态失败，但文件存在，仍然可以继续
                    if (!fileExists) {
                        // 创建默认版本文件
                        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
                        const defaultVersion = {
                            version: `${today} 0000`,
                            bundles: {},
                            timestamp: Math.floor(Date.now() / 1000)
                        };
                        (0, fs_extra_1.writeFileSync)(versionFilePath, JSON.stringify(defaultVersion, null, 2), 'utf-8');
                        this.updateProgress(90, '已创建默认版本文件');
                    }
                }
                if (this.canceled) {
                    this.handleFinish(interfaces_1.FinishMethod.FAILURE, '操作已取消');
                    return;
                }
                // 最终确认文件是否存在
                fileExists = (0, fs_extra_1.existsSync)(versionFilePath);
                if (fileExists) {
                    // 读取文件内容
                    const content = (0, fs_extra_1.readFileSync)(versionFilePath, 'utf-8');
                    try {
                        const versionData = JSON.parse(content);
                        this.updateProgress(100, `版本更新完成，当前版本: ${versionData.version}`);
                        this.handleFinish(interfaces_1.FinishMethod.SUCCESS, `Bundle版本已更新，当前版本: ${versionData.version}`);
                    }
                    catch (error) {
                        console.error('解析版本文件失败', error);
                        this.handleFinish(interfaces_1.FinishMethod.FAILURE, '版本文件格式错误');
                    }
                }
                else {
                    this.handleFinish(interfaces_1.FinishMethod.FAILURE, '无法获取或创建版本文件');
                }
            }
            catch (error) {
                console.error('更新Bundle版本失败:', error);
                this.handleFinish(interfaces_1.FinishMethod.FAILURE, `更新失败: ${error instanceof Error ? error.message : String(error)}`);
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
                this.rejectPromise(new Error(message || '版本更新流程失败'));
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
        this.handleFinish(interfaces_1.FinishMethod.FAILURE, 'Bundle版本更新已取消');
    }
    /**
     * 处理流程完成
     */
    handleFinish(method, message) {
        this.isRunning = false;
        // 记录完成状态
        console.log(`Bundle版本更新${method === interfaces_1.FinishMethod.SUCCESS ? '成功' : '失败'}: ${message || ''}`);
        // 调用完成回调
        this.onFinished(method, message);
    }
}
exports.BundleVersionsUpdateFlow = BundleVersionsUpdateFlow;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVuZGxlVmVyc2lvbnNVcGRhdGVGbG93LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vc291cmNlL3V0aWxzL3B1Ymxpc2hGbG93L2J1bmRsZVZlcnNpb25zVXBkYXRlRmxvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx5Q0FBNkM7QUFDN0MsNkNBQTRDO0FBQzVDLCtCQUE0QjtBQUM1Qix1Q0FBOEU7QUFDOUUsaURBQXlDO0FBWXpDOztHQUVHO0FBQ0gsTUFBYSx3QkFBeUIsU0FBUSwwQkFBZTtJQUNqRCxNQUFNLENBQUMsa0JBQWtCLENBQUMsV0FBbUI7UUFDakQsT0FBTyxJQUFBLFdBQUksRUFBQyxXQUFXLEVBQUUsdUJBQXVCLEVBQUUsc0JBQXNCLENBQUMsQ0FBQztJQUM5RSxDQUFDO0lBT0Q7UUFDSSxLQUFLLENBQUMsWUFBWSxFQUFFLHFDQUFxQyxDQUFDLENBQUM7UUFOdkQsdUJBQWtCLEdBQThELElBQUksQ0FBQztRQUNyRixhQUFRLEdBQVksS0FBSyxDQUFDO1FBQ3hCLG1CQUFjLEdBQW1DLElBQUksQ0FBQztRQUN0RCxrQkFBYSxHQUFtQyxJQUFJLENBQUM7SUFJL0QsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBa0M7UUFDMUMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDakIsT0FBTyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1lBQ2pDLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1FBQ2hELENBQUM7UUFFRCwrQ0FBK0M7UUFDL0MsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN6QyxJQUFJLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQztZQUM5QixJQUFJLENBQUMsYUFBYSxHQUFHLE1BQU0sQ0FBQztZQUU1QixJQUFJ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QUFDO1FBRUQsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7UUFDckIsSUFBSSxDQUFDLFlBQVksQ0FBQyx5QkFBWSxDQUFDLE9BQU8sRUFBRSxlQUFlLENBQUMsQ0FBQztJQUM3RCxDQUFDO0lBRUQ7O09BRUc7SUFDTyxZQUFZLENBQUMsTUFBb0IsRUFBRSxPQUFnQjtRQUN6RCxJQUFJLENBQUMsU0FBUyxHQUFHLEtBQUssQ0FBQztRQUV2QixTQUFTO1FBQ1QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLE1BQU0sS0FBSyx5QkFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssT0FBTyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFNUYsU0FBUztRQUNULElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3JDLENBQUM7Q0FDSjtBQXBPRCw0REFvT0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCYXNlUHJvY2Vzc0Zsb3cgfSBmcm9tICcuL2Jhc2VGbG93JztcclxuaW1wb3J0IHsgRmluaXNoTWV0aG9kIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcclxuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyByZWFkRmlsZVN5bmMsIGV4aXN0c1N5bmMsIHdyaXRlRmlsZVN5bmMsIG1rZGlyU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcclxuaW1wb3J0IHsgZXhlY1N5bmMgfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcclxuXHJcbi8qKlxyXG4gKiBCdW5kbGXniYjmnKzmm7TmlrDmtYHnqIvlj4LmlbBcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgQnVuZGxlVmVyc2lvbnNVcGRhdGVQYXJhbXMge1xyXG4gICAgLyoqXHJcbiAgICAgKiDpobnnm67ot6/lvoRcclxuICAgICAqL1xyXG4gICAgcHJvamVjdFBhdGg6IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIEJ1bmRsZeeJiOacrOabtOaWsOa1geeoiyAtIOS7jkdpdOS7k+W6k+abtOaWsGJ1bmRsZV92ZXJzaW9ucy5qc29uXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQnVuZGxlVmVyc2lvbnNVcGRhdGVGbG93IGV4dGVuZHMgQmFzZVByb2Nlc3NGbG93IHtcclxuICAgIHByaXZhdGUgc3RhdGljIGdldFZlcnNpb25GaWxlUGF0aChwcm9qZWN0UGF0aDogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgICAgICByZXR1cm4gam9pbihwcm9qZWN0UGF0aCwgJ3B1Ymxpc2gtcmVtb3RlLWJ1bmRsZScsICdidW5kbGVfdmVyc2lvbnMuanNvbicpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBwcml2YXRlIG9uRmluaXNoZWRDYWxsYmFjazogKChtZXRob2Q6IEZpbmlzaE1ldGhvZCwgbWVzc2FnZT86IHN0cmluZykgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcclxuICAgIHByaXZhdGUgY2FuY2VsZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIHByb3RlY3RlZCByZXNvbHZlUHJvbWlzZTogKCh2YWx1ZTogdm9pZCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcclxuICAgIHByb3RlY3RlZCByZWplY3RQcm9taXNlOiAoKHJlYXNvbjogYW55KSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xyXG4gICAgXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcignQnVuZGxl54mI5pys5pu05pawJywgJ+S7jkdpdOS7k+W6k+abtOaWsOW9k+WJjeWIhuaUr+acgOaWsOeahGJ1bmRsZV92ZXJzaW9ucy5qc29uJyk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5ZCv5Yqo5rWB56iLXHJcbiAgICAgKiBAcGFyYW0gcGFyYW1zIOabtOaWsOWPguaVsFxyXG4gICAgICovXHJcbiAgICBhc3luYyBzdGFydChwYXJhbXM6IEJ1bmRsZVZlcnNpb25zVXBkYXRlUGFyYW1zKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgaWYgKHRoaXMuaXNSdW5uaW5nKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUud2FybignQnVuZGxl54mI5pys5pu05paw5rWB56iL5bey5Zyo6L+Q6KGMJyk7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ+a1geeoi+W3suWcqOi/kOihjOS4rScpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5Yib5bu65paw55qEUHJvbWlzZe+8jOWwhnJlc29sdmXlkoxyZWplY3Tlh73mlbDkv53lrZjotbfmnaXvvIzlnKjmtYHnqIvnnJ/mraPlrozmiJDml7bosIPnlKhcclxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnJlc29sdmVQcm9taXNlID0gcmVzb2x2ZTtcclxuICAgICAgICAgICAgdGhpcy5yZWplY3RQcm9taXNlID0gcmVqZWN0O1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy5pc1J1bm5pbmcgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmNhbmNlbGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoMCwgJ+WHhuWkh+abtOaWsEJ1bmRsZeeJiOacrOS/oeaBrycpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHsgcHJvamVjdFBhdGggfSA9IHBhcmFtcztcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5qOA5p+lcHVibGlzaC1yZW1vdGUtYnVuZGxl55uu5b2V5piv5ZCm5a2Y5Zyo77yM5aaC5p6c5LiN5a2Y5Zyo5YiZ5Yib5bu6XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwdWJsaXNoRGlyID0gam9pbihwcm9qZWN0UGF0aCwgJ3B1Ymxpc2gtcmVtb3RlLWJ1bmRsZScpO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFleGlzdHNTeW5jKHB1Ymxpc2hEaXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcygxMCwgJ+WIm+W7uuWPkeW4g+ebruW9lScpO1xyXG4gICAgICAgICAgICAgICAgICAgIG1rZGlyU3luYyhwdWJsaXNoRGlyLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc3QgdmVyc2lvbkZpbGVQYXRoID0gQnVuZGxlVmVyc2lvbnNVcGRhdGVGbG93LmdldFZlcnNpb25GaWxlUGF0aChwcm9qZWN0UGF0aCk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoMjAsICfmo4Dmn6XmnKzlnLDmlofku7bnirbmgIEnKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5qOA5p+l5paH5Lu25piv5ZCm5a2Y5Zyo5Y+K54q25oCBXHJcbiAgICAgICAgICAgICAgICBsZXQgZmlsZUV4aXN0cyA9IGV4aXN0c1N5bmModmVyc2lvbkZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g6I635Y+W5b2T5YmN5YiG5pSvXHJcbiAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50QnJhbmNoID0gZXhlY1N5bmMoJ2dpdCBicmFuY2ggLS1zaG93LWN1cnJlbnQnLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3dkOiBwcm9qZWN0UGF0aCxcclxuICAgICAgICAgICAgICAgICAgICBlbmNvZGluZzogJ3V0Zi04J1xyXG4gICAgICAgICAgICAgICAgfSkudHJpbSgpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKDMwLCBg5b2T5YmN5YiG5pSvOiAke2N1cnJlbnRCcmFuY2h9YCk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIOaLieWPluacgOaWsOS7o+eggVxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcyg0MCwgJ+aLieWPlui/nOeoi+WIhuaUr+acgOaWsOS7o+eggScpO1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICBleGVjU3luYyhgZ2l0IHB1bGwgb3JpZ2luICR7Y3VycmVudEJyYW5jaH1gLCB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGN3ZDogcHJvamVjdFBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVuY29kaW5nOiAndXRmLTgnXHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybign5ouJ5Y+W6L+c56iL5YiG5pSv5aSx6LSl77yM5Y+v6IO95rKh5pyJ6L+c56iL5YiG5pSv5oiW572R57uc6Zeu6aKYJywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDmo4Dmn6Xmlofku7bmmK/lkKbmnInmnKrmj5DkuqTnmoTmm7TmlLlcclxuICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoNjAsICfmo4Dmn6Xmlofku7bnirbmgIEnKTtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZ2l0U3RhdHVzID0gZXhlY1N5bmMoJ2dpdCBzdGF0dXMgLS1wb3JjZWxhaW4gcHVibGlzaC1yZW1vdGUtYnVuZGxlL2J1bmRsZV92ZXJzaW9ucy5qc29uJywge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjd2Q6IHByb2plY3RQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlbmNvZGluZzogJ3V0Zi04J1xyXG4gICAgICAgICAgICAgICAgICAgIH0pLnRyaW0oKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBoYXNMb2NhbENoYW5nZXMgPSBnaXRTdGF0dXMubGVuZ3RoID4gMDtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaGFzTG9jYWxDaGFuZ2VzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoNzUsICfmlofku7bmnInmnKzlnLDkv67mlLknKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOacieacrOWcsOS/ruaUue+8jOWPr+S7pemAieaLqeaPkOekuueUqOaIt1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnYnVuZGxlX3ZlcnNpb25zLmpzb24g5pyJ5pys5Zyw5L+u5pS5OicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhnaXRTdGF0dXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZmlsZUV4aXN0cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKDgwLCAn5paH5Lu25peg5pys5Zyw5L+u5pS577yM5L2/55So5pyA5paw54mI5pysJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcyg4MCwgJ+aWh+S7tuS4jeWtmOWcqO+8jOWwneivleS7jui/nOeoi+iOt+WPlicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5bCd6K+V5qOA5Ye65paH5Lu2XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleGVjU3luYygnZ2l0IGNoZWNrb3V0IC0tIHB1Ymxpc2gtcmVtb3RlLWJ1bmRsZS9idW5kbGVfdmVyc2lvbnMuanNvbicsIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjd2Q6IHByb2plY3RQYXRoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVFeGlzdHMgPSBleGlzdHNTeW5jKHZlcnNpb25GaWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZUV4aXN0cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoODUsICflt7Lku47ku5PlupPmgaLlpI3mlofku7YnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcyg4NSwgJ+S7k+W6k+S4reaXoOatpOaWh+S7tu+8jOWwhuWIm+W7uuaWsOaWh+S7ticpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWIm+W7uum7mOiupOeJiOacrOaWh+S7tlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKS5yZXBsYWNlKC8tL2csICcuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVmYXVsdFZlcnNpb24gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb246IGAke3RvZGF5fSAwMDAwYCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVuZGxlczoge30sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlRmlsZVN5bmModmVyc2lvbkZpbGVQYXRoLCBKU09OLnN0cmluZ2lmeShkZWZhdWx0VmVyc2lvbiwgbnVsbCwgMiksICd1dGYtOCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoOTAsICflt7LliJvlu7rpu5jorqTniYjmnKzmlofku7YnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybign5LuOR2l05oGi5aSN5paH5Lu25aSx6LSlJywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDliJvlu7rpu5jorqTniYjmnKzmlofku7ZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKS5yZXBsYWNlKC8tL2csICcuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkZWZhdWx0VmVyc2lvbiA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBgJHt0b2RheX0gMDAwMGAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVuZGxlczoge30sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZXN0YW1wOiBNYXRoLmZsb29yKERhdGUubm93KCkgLyAxMDAwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgd3JpdGVGaWxlU3luYyh2ZXJzaW9uRmlsZVBhdGgsIEpTT04uc3RyaW5naWZ5KGRlZmF1bHRWZXJzaW9uLCBudWxsLCAyKSwgJ3V0Zi04Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKDkwLCAn5bey5Yib5bu66buY6K6k54mI5pys5paH5Lu2Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybign5qOA5p+lR2l054q25oCB5aSx6LSlJywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOiOt+WPlkdpdOeKtuaAgeWksei0pe+8jOS9huaWh+S7tuWtmOWcqO+8jOS7jeeEtuWPr+S7pee7p+e7rVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghZmlsZUV4aXN0cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDliJvlu7rpu5jorqTniYjmnKzmlofku7ZcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApLnJlcGxhY2UoLy0vZywgJy4nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZGVmYXVsdFZlcnNpb24gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBgJHt0b2RheX0gMDAwMGAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidW5kbGVzOiB7fSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRpbWVzdGFtcDogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMClcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlRmlsZVN5bmModmVyc2lvbkZpbGVQYXRoLCBKU09OLnN0cmluZ2lmeShkZWZhdWx0VmVyc2lvbiwgbnVsbCwgMiksICd1dGYtOCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKDkwLCAn5bey5Yib5bu66buY6K6k54mI5pys5paH5Lu2Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jYW5jZWxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5GQUlMVVJFLCAn5pON5L2c5bey5Y+W5raIJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDmnIDnu4jnoa7orqTmlofku7bmmK/lkKblrZjlnKhcclxuICAgICAgICAgICAgICAgIGZpbGVFeGlzdHMgPSBleGlzdHNTeW5jKHZlcnNpb25GaWxlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoZmlsZUV4aXN0cykge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOivu+WPluaWh+S7tuWGheWuuVxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZVN5bmModmVyc2lvbkZpbGVQYXRoLCAndXRmLTgnKTtcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2ZXJzaW9uRGF0YSA9IEpTT04ucGFyc2UoY29udGVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoMTAwLCBg54mI5pys5pu05paw5a6M5oiQ77yM5b2T5YmN54mI5pysOiAke3ZlcnNpb25EYXRhLnZlcnNpb259YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5TVUNDRVNTLCBgQnVuZGxl54mI5pys5bey5pu05paw77yM5b2T5YmN54mI5pysOiAke3ZlcnNpb25EYXRhLnZlcnNpb259YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign6Kej5p6Q54mI5pys5paH5Lu25aSx6LSlJywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUZpbmlzaChGaW5pc2hNZXRob2QuRkFJTFVSRSwgJ+eJiOacrOaWh+S7tuagvOW8j+mUmeivrycpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVGaW5pc2goRmluaXNoTWV0aG9kLkZBSUxVUkUsICfml6Dms5Xojrflj5bmiJbliJvlu7rniYjmnKzmlofku7YnKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+abtOaWsEJ1bmRsZeeJiOacrOWksei0pTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUZpbmlzaChGaW5pc2hNZXRob2QuRkFJTFVSRSwgYOabtOaWsOWksei0pTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDorr7nva7lrozmiJDlm57osINcclxuICAgICAqL1xyXG4gICAgc2V0RmluaXNoZWRDYWxsYmFjayhjYWxsYmFjazogKG1ldGhvZDogRmluaXNoTWV0aG9kLCBtZXNzYWdlPzogc3RyaW5nKSA9PiB2b2lkKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5vbkZpbmlzaGVkQ2FsbGJhY2sgPSBjYWxsYmFjaztcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDlrozmiJDlm57osINcclxuICAgICAqL1xyXG4gICAgb25GaW5pc2hlZChtZXRob2Q6IEZpbmlzaE1ldGhvZCwgbWVzc2FnZT86IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLm9uRmluaXNoZWRDYWxsYmFjaykge1xyXG4gICAgICAgICAgICB0aGlzLm9uRmluaXNoZWRDYWxsYmFjayhtZXRob2QsIG1lc3NhZ2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmlzUnVubmluZyA9IGZhbHNlO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOagueaNruWujOaIkOeKtuaAgeino+aekFByb21pc2VcclxuICAgICAgICBpZiAobWV0aG9kID09PSBGaW5pc2hNZXRob2QuU1VDQ0VTUykge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5yZXNvbHZlUHJvbWlzZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXNvbHZlUHJvbWlzZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMucmVqZWN0UHJvbWlzZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWplY3RQcm9taXNlKG5ldyBFcnJvcihtZXNzYWdlIHx8ICfniYjmnKzmm7TmlrDmtYHnqIvlpLHotKUnKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5riF55CG5byV55SoXHJcbiAgICAgICAgdGhpcy5yZXNvbHZlUHJvbWlzZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5yZWplY3RQcm9taXNlID0gbnVsbDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDlj5bmtojmtYHnqItcclxuICAgICAqL1xyXG4gICAgY2FuY2VsKCk6IHZvaWQge1xyXG4gICAgICAgIGlmICghdGhpcy5pc1J1bm5pbmcpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICB0aGlzLmNhbmNlbGVkID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmhhbmRsZUZpbmlzaChGaW5pc2hNZXRob2QuRkFJTFVSRSwgJ0J1bmRsZeeJiOacrOabtOaWsOW3suWPlua2iCcpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOWkhOeQhua1geeoi+WujOaIkFxyXG4gICAgICovXHJcbiAgICBwcm90ZWN0ZWQgaGFuZGxlRmluaXNoKG1ldGhvZDogRmluaXNoTWV0aG9kLCBtZXNzYWdlPzogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgdGhpcy5pc1J1bm5pbmcgPSBmYWxzZTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDorrDlvZXlrozmiJDnirbmgIFcclxuICAgICAgICBjb25zb2xlLmxvZyhgQnVuZGxl54mI5pys5pu05pawJHttZXRob2QgPT09IEZpbmlzaE1ldGhvZC5TVUNDRVNTID8gJ+aIkOWKnycgOiAn5aSx6LSlJ306ICR7bWVzc2FnZSB8fCAnJ31gKTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDosIPnlKjlrozmiJDlm57osINcclxuICAgICAgICB0aGlzLm9uRmluaXNoZWQobWV0aG9kLCBtZXNzYWdlKTtcclxuICAgIH1cclxufSAiXX0=
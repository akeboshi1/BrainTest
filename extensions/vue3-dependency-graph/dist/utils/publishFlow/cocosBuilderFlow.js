"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CocosBuilderFlow = void 0;
const baseFlow_1 = require("./baseFlow");
const interfaces_1 = require("./interfaces");
const child_process_1 = require("child_process");
/**
 * Cocos Creator 发布流程
 */
class CocosBuilderFlow extends baseFlow_1.BaseProcessFlow {
    constructor() {
        super('Cocos Creator 发布', '执行 Cocos Creator 构建和发布流程');
        this.process = null;
        this.onFinishedCallback = null;
        this.currentProgress = 0;
        this.resolvePromise = null;
        this.rejectPromise = null;
        this.currentProgress = 0;
    }
    /**
     * 启动发布流程
     * @param params 发布参数
     */
    async start(params) {
        // 如果已经在运行中，则不重复启动
        if (this.isRunning) {
            console.warn('发布流程已经在运行中');
            return Promise.reject(new Error('发布流程已经在运行中'));
        }
        // 创建新的Promise，将resolve和reject函数保存起来，在流程真正完成时调用
        return new Promise((resolve, reject) => {
            this.resolvePromise = resolve;
            this.rejectPromise = reject;
            console.log('开始Cocos Creator发布流程');
            // 重置进度和状态
            this.isRunning = true;
            this.currentProgress = 0;
            this.updateProgress(0, '准备启动发布流程');
            try {
                const { enginePath, projectPath, configPath, debug = false, extraArgs = [] } = params;
                // 检查参数
                if (!enginePath || !projectPath || !configPath) {
                    this.handleFinish(interfaces_1.FinishMethod.FAILURE, '缺少必要的参数');
                    return;
                }
                // 构建命令行参数
                const executable = `${enginePath}/CocosCreator.exe`;
                const args = [
                    '--project', projectPath,
                    '--build', `configPath=${configPath}`
                ];
                // 添加调试参数
                if (debug) {
                    args.push('--debug');
                }
                // 添加额外参数
                if (extraArgs.length > 0) {
                    args.push(...extraArgs);
                }
                this.updateProgress(5, '启动构建进程');
                console.log('开始执行构建命令...', executable, args);
                // 启动构建进程
                this.process = (0, child_process_1.spawn)(executable, args);
                // 收集构建日志
                let buildOutput = '';
                let buildErrorOutput = '';
                if (!this.process.stdout || !this.process.stderr) {
                    this.handleFinish(interfaces_1.FinishMethod.FAILURE, '创建子进程失败，无法获取输出流');
                    return;
                }
                console.log('构建进程已启动，等待输出...');
                this.process.stdout.on('data', (data) => {
                    const output = data.toString();
                    buildOutput += output;
                    // 打印带时间戳的输出，便于调试
                    const timestamp = new Date().toLocaleTimeString();
                    console.log(`[${timestamp}] Cocos Creator 构建输出: ${output}`);
                    // 根据输出更新进度
                    this.updateBuildProgress(output);
                });
                this.process.stderr.on('data', (data) => {
                    const errorOutput = data.toString();
                    buildErrorOutput += errorOutput;
                    // 打印带时间戳的错误输出
                    const timestamp = new Date().toLocaleTimeString();
                    console.error(`[${timestamp}] Cocos Creator 构建错误: ${errorOutput}`);
                    // 错误输出也可能包含进度信息
                    this.updateBuildProgress(errorOutput);
                });
                this.process.on('close', (code) => {
                    console.log(`Cocos Creator 构建进程已结束，退出码: ${code}`);
                    this.handleBuildComplete(code, buildOutput, buildErrorOutput);
                });
                this.process.on('error', (err) => {
                    console.error('启动构建进程时出错:', err);
                    this.handleFinish(interfaces_1.FinishMethod.FAILURE, `启动构建进程时出错: ${err.message}`);
                });
            }
            catch (error) {
                console.error('命令执行失败:', error);
                this.handleFinish(interfaces_1.FinishMethod.FAILURE, `命令执行失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    /**
     * 设置完成回调
     * @param callback 回调函数
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
                this.rejectPromise(new Error(message || '发布流程失败'));
            }
        }
        // 清理引用
        this.resolvePromise = null;
        this.rejectPromise = null;
    }
    /**
     * 设置完成回调
     * @param callback 回调函数
     */
    setFinishedCallback(callback) {
        this.onFinishedCallback = callback;
    }
    /**
     * 取消发布流程
     */
    cancel() {
        if (!this.isRunning || !this.process) {
            return;
        }
        try {
            // 在 Windows 上强制终止进程
            this.process.kill('SIGTERM');
            this.handleFinish(interfaces_1.FinishMethod.FAILURE, '发布流程已取消');
        }
        catch (error) {
            console.error('取消发布流程失败:', error);
            this.handleFinish(interfaces_1.FinishMethod.FAILURE, '取消发布流程失败');
        }
    }
    /**
     * 处理构建完成
     * @param code 退出码
     * @param output 标准输出内容
     * @param errorOutput 错误输出内容
     */
    handleBuildComplete(code, output, errorOutput) {
        this.process = null;
        console.log(`构建完成，退出码: ${code}`);
        // 根据退出码判断构建结果
        switch (code) {
            case 36:
                console.log('构建过程成功完成');
                // 无论当前进度如何，构建成功时设为100%
                this.currentProgress = 100;
                this.handleFinish(interfaces_1.FinishMethod.SUCCESS, '构建过程成功完成');
                break;
            case 32:
                console.error('构建失败 —— 构建参数不合法');
                this.handleFinish(interfaces_1.FinishMethod.FAILURE, '构建失败 —— 构建参数不合法');
                break;
            case 34:
                console.error('构建失败 —— 构建过程出错失败，详情请参考构建日志');
                this.handleFinish(interfaces_1.FinishMethod.FAILURE, '构建失败 —— 构建过程出错失败，详情请参考构建日志');
                break;
            case 0:
                console.log('进程正常退出，但未返回构建状态');
                // 大多数情况下退出码0也表示成功
                this.currentProgress = 100;
                this.handleFinish(interfaces_1.FinishMethod.SUCCESS, '进程正常退出，构建成功');
                break;
            default:
                console.error(`构建过程异常，未知退出码: ${code}`);
                this.handleFinish(interfaces_1.FinishMethod.FAILURE, `构建过程异常，未知退出码: ${code}`);
                break;
        }
    }
    /**
     * 根据输出内容更新进度
     * @param output 构建输出内容
     */
    updateBuildProgress(output) {
        // 从输出中查找progress字段
        const progressRegex = /progress:\s*(\d+)%/;
        const progressMatch = output.match(progressRegex);
        if (progressMatch && progressMatch[1]) {
            const percent = parseInt(progressMatch[1], 10);
            if (!isNaN(percent) && percent >= 0 && percent <= 100) {
                // 直接使用日志中的进度百分比
                this.updateProgress(percent, `构建进度: ${percent}%`);
            }
        }
        // 还是保留一些关键词判断，用于显示特定阶段的消息
        if (output.includes('编译脚本开始')) {
            this.updateProgress(this.getCurrentProgress(), '编译脚本开始');
        }
        else if (output.includes('编译脚本完成')) {
            this.updateProgress(this.getCurrentProgress(), '编译脚本完成');
        }
        else if (output.includes('处理资源')) {
            this.updateProgress(this.getCurrentProgress(), '正在处理资源');
        }
        else if (output.includes('正在构建')) {
            this.updateProgress(this.getCurrentProgress(), '正在构建项目');
        }
        else if (output.includes('开始打包')) {
            this.updateProgress(this.getCurrentProgress(), '开始打包');
        }
        else if (output.includes('正在准备原生项目')) {
            this.updateProgress(this.getCurrentProgress(), '正在准备原生项目');
        }
        else if (output.includes('正在编译原生项目')) {
            this.updateProgress(this.getCurrentProgress(), '正在编译原生项目');
        }
        else if (output.includes('正在打包APK')) {
            this.updateProgress(this.getCurrentProgress(), '正在打包APK');
        }
        else if (output.includes('编译完成')) {
            this.updateProgress(this.getCurrentProgress(), '编译完成');
        }
        else if (output.includes('构建完毕')) {
            this.updateProgress(this.getCurrentProgress(), '构建完毕，整理输出文件');
        }
        else if (output.includes('发布完成')) {
            this.updateProgress(100, '发布完成');
        }
        // 特殊处理一些错误情况
        if (output.includes('错误') || output.includes('Error') || output.includes('Failed')) {
            this.updateProgress(this.getCurrentProgress(), `构建过程出现错误: ${output.substr(0, 100)}...`);
        }
    }
    /**
     * 处理流程完成
     * @param method 完成方法
     * @param message 完成消息
     */
    handleFinish(method, message) {
        // 更新最终进度
        if (method === interfaces_1.FinishMethod.SUCCESS) {
            this.updateProgress(100, message || '发布成功');
        }
        else {
            // 失败时保持当前进度，添加错误消息
            this.updateProgress(this.getCurrentProgress(), message || '发布失败');
        }
        // 清理资源
        this.process = null;
        this.isRunning = false;
        // 记录完成状态
        console.log(`Cocos Creator 发布流程${method === interfaces_1.FinishMethod.SUCCESS ? '成功' : '失败'}: ${message || ''}`);
        // 调用完成回调
        this.onFinished(method, message);
    }
    /**
     * 获取当前进度，如果没有设置则返回0
     */
    getCurrentProgress() {
        return this.currentProgress;
    }
    /**
     * 更新进度
     * @param progress 进度值 (0-100)
     * @param message 可选的消息
     */
    updateProgress(progress, message) {
        // 保存当前进度，确保进度不会倒退
        if (progress > this.currentProgress) {
            this.currentProgress = progress;
        }
        // 调用基类的updateProgress方法
        super.updateProgress(this.currentProgress, message);
    }
}
exports.CocosBuilderFlow = CocosBuilderFlow;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29jb3NCdWlsZGVyRmxvdy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3NvdXJjZS91dGlscy9wdWJsaXNoRmxvdy9jb2Nvc0J1aWxkZXJGbG93LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLHlDQUE2QztBQUM3Qyw2Q0FBNEM7QUFDNUMsaURBQW9EO0FBZ0NwRDs7R0FFRztBQUNILE1BQWEsZ0JBQWlCLFNBQVEsMEJBQWU7SUFPakQ7UUFDSSxLQUFLLENBQUMsa0JBQWtCLEVBQUUsMEJBQTBCLENBQUMsQ0FBQztRQVBsRCxZQUFPLEdBQXdCLElBQUksQ0FBQztRQUNwQyx1QkFBa0IsR0FBOEQsSUFBSSxDQUFDO1FBQ3JGLG9CQUFlLEdBQVcsQ0FBQyxDQUFDO1FBQzFCLG1CQUFjLEdBQW1DLElBQUksQ0FBQztRQUN0RCxrQkFBYSxHQUFtQyxJQUFJLENBQUM7UUFJM0QsSUFBSSxDQUFDLGVBQWUsR0FBRyxDQUFDLENBQUM7SUFDN0IsQ0FBQztJQUVEOzs7T0FHRztJQUNILEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBMEI7UUFDbEMsa0JBQWtCO1FBQ2xCLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDM0IsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7UUFDbkQsQ0FBQztRQUVELCtDQUErQztRQUMvQyxPQUFPLElBQUksT0FBTyxDQUFPLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3pDLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDO1lBQzlCLElBQUksQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDO1lBRTVCLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQztZQUVuQyxVQUFVO1lBQ1YsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJ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QUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDN0QsQ0FBQzthQUFNLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDN0QsQ0FBQzthQUFNLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDM0QsQ0FBQzthQUFNLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDL0QsQ0FBQzthQUFNLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3JDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDL0QsQ0FBQzthQUFNLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3BDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUQsQ0FBQzthQUFNLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFDM0QsQ0FBQzthQUFNLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFDbEUsQ0FBQzthQUFNLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3JDLENBQUM7UUFFRCxhQUFhO1FBQ2IsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQ2pGLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsYUFBYSxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDNUYsQ0FBQztJQUNMLENBQUM7SUFFRDs7OztPQUlHO0lBQ08sWUFBWSxDQUFDLE1BQW9CLEVBQUUsT0FBZ0I7UUFDekQsU0FBUztRQUNULElBQUksTUFBTSxLQUFLLHlCQUFZLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUUsT0FBTyxJQUFJLE1BQU0sQ0FBQyxDQUFDO1FBQ2hELENBQUM7YUFBTSxDQUFDO1lBQ0osbUJBQW1CO1lBQ25CLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsT0FBTyxJQUFJLE1BQU0sQ0FBQyxDQUFDO1FBQ3RFLENBQUM7UUFFRCxPQUFPO1FBQ1AsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7UUFDcEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFFdkIsU0FBUztRQUNULE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLE1BQU0sS0FBSyx5QkFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssT0FBTyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFcEcsU0FBUztRQUNULElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3JDLENBQUM7SUFFRDs7T0FFRztJQUNLLGtCQUFrQjtRQUN0QixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUM7SUFDaEMsQ0FBQztJQUVEOzs7O09BSUc7SUFDTyxjQUFjLENBQUMsUUFBZ0IsRUFBRSxPQUFnQjtRQUN2RCxrQkFBa0I7UUFDbEIsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQyxlQUFlLEdBQUcsUUFBUSxDQUFDO1FBQ3BDLENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsS0FBSyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ3hELENBQUM7Q0FDSjtBQWhURCw0Q0FnVEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBCYXNlUHJvY2Vzc0Zsb3cgfSBmcm9tICcuL2Jhc2VGbG93JztcclxuaW1wb3J0IHsgRmluaXNoTWV0aG9kIH0gZnJvbSAnLi9pbnRlcmZhY2VzJztcclxuaW1wb3J0IHsgc3Bhd24sIENoaWxkUHJvY2VzcyB9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xyXG5cclxuLyoqXHJcbiAqIENvY29zIENyZWF0b3Ig5Y+R5biD5rWB56iL5Y+C5pWwXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIENvY29zQnVpbGRlclBhcmFtcyB7XHJcbiAgICAvKipcclxuICAgICAqIOW8leaTjui3r+W+hFxyXG4gICAgICovXHJcbiAgICBlbmdpbmVQYXRoOiBzdHJpbmc7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog6aG555uu6Lev5b6EXHJcbiAgICAgKi9cclxuICAgIHByb2plY3RQYXRoOiBzdHJpbmc7XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog6YWN572u5paH5Lu26Lev5b6EXHJcbiAgICAgKi9cclxuICAgIGNvbmZpZ1BhdGg6IHN0cmluZztcclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDmmK/lkKbosIPor5XmqKHlvI9cclxuICAgICAqL1xyXG4gICAgZGVidWc/OiBib29sZWFuO1xyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOmineWklueahOWRveS7pOihjOWPguaVsFxyXG4gICAgICovXHJcbiAgICBleHRyYUFyZ3M/OiBzdHJpbmdbXTtcclxufVxyXG5cclxuLyoqXHJcbiAqIENvY29zIENyZWF0b3Ig5Y+R5biD5rWB56iLXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQ29jb3NCdWlsZGVyRmxvdyBleHRlbmRzIEJhc2VQcm9jZXNzRmxvdyB7XHJcbiAgICBwcml2YXRlIHByb2Nlc3M6IENoaWxkUHJvY2VzcyB8IG51bGwgPSBudWxsO1xyXG4gICAgcHJpdmF0ZSBvbkZpbmlzaGVkQ2FsbGJhY2s6ICgobWV0aG9kOiBGaW5pc2hNZXRob2QsIG1lc3NhZ2U/OiBzdHJpbmcpID0+IHZvaWQpIHwgbnVsbCA9IG51bGw7XHJcbiAgICBwcml2YXRlIGN1cnJlbnRQcm9ncmVzczogbnVtYmVyID0gMDtcclxuICAgIHByb3RlY3RlZCByZXNvbHZlUHJvbWlzZTogKCh2YWx1ZTogdm9pZCkgPT4gdm9pZCkgfCBudWxsID0gbnVsbDtcclxuICAgIHByb3RlY3RlZCByZWplY3RQcm9taXNlOiAoKHJlYXNvbjogYW55KSA9PiB2b2lkKSB8IG51bGwgPSBudWxsO1xyXG4gICAgXHJcbiAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICBzdXBlcignQ29jb3MgQ3JlYXRvciDlj5HluIMnLCAn5omn6KGMIENvY29zIENyZWF0b3Ig5p6E5bu65ZKM5Y+R5biD5rWB56iLJyk7XHJcbiAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3Jlc3MgPSAwO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOWQr+WKqOWPkeW4g+a1geeoi1xyXG4gICAgICogQHBhcmFtIHBhcmFtcyDlj5HluIPlj4LmlbBcclxuICAgICAqL1xyXG4gICAgYXN5bmMgc3RhcnQocGFyYW1zOiBDb2Nvc0J1aWxkZXJQYXJhbXMpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICAvLyDlpoLmnpzlt7Lnu4/lnKjov5DooYzkuK3vvIzliJnkuI3ph43lpI3lkK/liqhcclxuICAgICAgICBpZiAodGhpcy5pc1J1bm5pbmcpIHtcclxuICAgICAgICAgICAgY29uc29sZS53YXJuKCflj5HluIPmtYHnqIvlt7Lnu4/lnKjov5DooYzkuK0nKTtcclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcign5Y+R5biD5rWB56iL5bey57uP5Zyo6L+Q6KGM5LitJykpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyDliJvlu7rmlrDnmoRQcm9taXNl77yM5bCGcmVzb2x2ZeWSjHJlamVjdOWHveaVsOS/neWtmOi1t+adpe+8jOWcqOa1geeoi+ecn+ato+WujOaIkOaXtuiwg+eUqFxyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucmVzb2x2ZVByb21pc2UgPSByZXNvbHZlO1xyXG4gICAgICAgICAgICB0aGlzLnJlamVjdFByb21pc2UgPSByZWplY3Q7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygn5byA5aeLQ29jb3MgQ3JlYXRvcuWPkeW4g+a1geeoiycpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g6YeN572u6L+b5bqm5ZKM54q25oCBXHJcbiAgICAgICAgICAgIHRoaXMuaXNSdW5uaW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3Jlc3MgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKDAsICflh4blpIflkK/liqjlj5HluIPmtYHnqIsnKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCB7IGVuZ2luZVBhdGgsIHByb2plY3RQYXRoLCBjb25maWdQYXRoLCBkZWJ1ZyA9IGZhbHNlLCBleHRyYUFyZ3MgPSBbXSB9ID0gcGFyYW1zO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDmo4Dmn6Xlj4LmlbBcclxuICAgICAgICAgICAgICAgIGlmICghZW5naW5lUGF0aCB8fCAhcHJvamVjdFBhdGggfHwgIWNvbmZpZ1BhdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUZpbmlzaChGaW5pc2hNZXRob2QuRkFJTFVSRSwgJ+e8uuWwkeW/heimgeeahOWPguaVsCcpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5p6E5bu65ZG95Luk6KGM5Y+C5pWwXHJcbiAgICAgICAgICAgICAgICBjb25zdCBleGVjdXRhYmxlID0gYCR7ZW5naW5lUGF0aH0vQ29jb3NDcmVhdG9yLmV4ZWA7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBhcmdzID0gW1xyXG4gICAgICAgICAgICAgICAgICAgICctLXByb2plY3QnLCBwcm9qZWN0UGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAnLS1idWlsZCcsIGBjb25maWdQYXRoPSR7Y29uZmlnUGF0aH1gXHJcbiAgICAgICAgICAgICAgICBdO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDmt7vliqDosIPor5Xlj4LmlbBcclxuICAgICAgICAgICAgICAgIGlmIChkZWJ1Zykge1xyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3MucHVzaCgnLS1kZWJ1ZycpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyDmt7vliqDpop3lpJblj4LmlbBcclxuICAgICAgICAgICAgICAgIGlmIChleHRyYUFyZ3MubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGFyZ3MucHVzaCguLi5leHRyYUFyZ3MpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKDUsICflkK/liqjmnoTlu7rov5vnqIsnKTtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCflvIDlp4vmiafooYzmnoTlu7rlkb3ku6QuLi4nLCBleGVjdXRhYmxlLCBhcmdzKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5ZCv5Yqo5p6E5bu66L+b56iLXHJcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3MgPSBzcGF3bihleGVjdXRhYmxlLCBhcmdzKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8g5pS26ZuG5p6E5bu65pel5b+XXHJcbiAgICAgICAgICAgICAgICBsZXQgYnVpbGRPdXRwdXQgPSAnJztcclxuICAgICAgICAgICAgICAgIGxldCBidWlsZEVycm9yT3V0cHV0ID0gJyc7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5wcm9jZXNzLnN0ZG91dCB8fCAhdGhpcy5wcm9jZXNzLnN0ZGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5GQUlMVVJFLCAn5Yib5bu65a2Q6L+b56iL5aSx6LSl77yM5peg5rOV6I635Y+W6L6T5Ye65rWBJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn5p6E5bu66L+b56iL5bey5ZCv5Yqo77yM562J5b6F6L6T5Ye6Li4uJyk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIHRoaXMucHJvY2Vzcy5zdGRvdXQub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3Qgb3V0cHV0ID0gZGF0YS50b1N0cmluZygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJ1aWxkT3V0cHV0ICs9IG91dHB1dDtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDmiZPljbDluKbml7bpl7TmiLPnmoTovpPlh7rvvIzkvr/kuo7osIPor5VcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCB0aW1lc3RhbXAgPSBuZXcgRGF0ZSgpLnRvTG9jYWxlVGltZVN0cmluZygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBbJHt0aW1lc3RhbXB9XSBDb2NvcyBDcmVhdG9yIOaehOW7uui+k+WHujogJHtvdXRwdXR9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g5qC55o2u6L6T5Ye65pu05paw6L+b5bqmXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVCdWlsZFByb2dyZXNzKG91dHB1dCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzLnN0ZGVyci5vbignZGF0YScsIChkYXRhOiBCdWZmZXIpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zdCBlcnJvck91dHB1dCA9IGRhdGEudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgICAgICBidWlsZEVycm9yT3V0cHV0ICs9IGVycm9yT3V0cHV0O1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOaJk+WNsOW4puaXtumXtOaIs+eahOmUmeivr+i+k+WHulxyXG4gICAgICAgICAgICAgICAgICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9Mb2NhbGVUaW1lU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgWyR7dGltZXN0YW1wfV0gQ29jb3MgQ3JlYXRvciDmnoTlu7rplJnor686ICR7ZXJyb3JPdXRwdXR9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLy8g6ZSZ6K+v6L6T5Ye65Lmf5Y+v6IO95YyF5ZCr6L+b5bqm5L+h5oGvXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVCdWlsZFByb2dyZXNzKGVycm9yT3V0cHV0KTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB0aGlzLnByb2Nlc3Mub24oJ2Nsb3NlJywgKGNvZGU6IG51bWJlcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGBDb2NvcyBDcmVhdG9yIOaehOW7uui/m+eoi+W3sue7k+adn++8jOmAgOWHuueggTogJHtjb2RlfWApO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlQnVpbGRDb21wbGV0ZShjb2RlLCBidWlsZE91dHB1dCwgYnVpbGRFcnJvck91dHB1dCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgdGhpcy5wcm9jZXNzLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5ZCv5Yqo5p6E5bu66L+b56iL5pe25Ye66ZSZOicsIGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVGaW5pc2goRmluaXNoTWV0aG9kLkZBSUxVUkUsIGDlkK/liqjmnoTlu7rov5vnqIvml7blh7rplJk6ICR7ZXJyLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+WRveS7pOaJp+ihjOWksei0pTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUZpbmlzaChGaW5pc2hNZXRob2QuRkFJTFVSRSwgYOWRveS7pOaJp+ihjOWksei0pTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDorr7nva7lrozmiJDlm57osINcclxuICAgICAqIEBwYXJhbSBjYWxsYmFjayDlm57osIPlh73mlbBcclxuICAgICAqL1xyXG4gICAgb25GaW5pc2hlZChtZXRob2Q6IEZpbmlzaE1ldGhvZCwgbWVzc2FnZT86IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIGlmICh0aGlzLm9uRmluaXNoZWRDYWxsYmFjaykge1xyXG4gICAgICAgICAgICB0aGlzLm9uRmluaXNoZWRDYWxsYmFjayhtZXRob2QsIG1lc3NhZ2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmlzUnVubmluZyA9IGZhbHNlO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOagueaNruWujOaIkOeKtuaAgeino+aekFByb21pc2VcclxuICAgICAgICBpZiAobWV0aG9kID09PSBGaW5pc2hNZXRob2QuU1VDQ0VTUykge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5yZXNvbHZlUHJvbWlzZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXNvbHZlUHJvbWlzZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMucmVqZWN0UHJvbWlzZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZWplY3RQcm9taXNlKG5ldyBFcnJvcihtZXNzYWdlIHx8ICflj5HluIPmtYHnqIvlpLHotKUnKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5riF55CG5byV55SoXHJcbiAgICAgICAgdGhpcy5yZXNvbHZlUHJvbWlzZSA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5yZWplY3RQcm9taXNlID0gbnVsbDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDorr7nva7lrozmiJDlm57osINcclxuICAgICAqIEBwYXJhbSBjYWxsYmFjayDlm57osIPlh73mlbBcclxuICAgICAqL1xyXG4gICAgc2V0RmluaXNoZWRDYWxsYmFjayhjYWxsYmFjazogKG1ldGhvZDogRmluaXNoTWV0aG9kLCBtZXNzYWdlPzogc3RyaW5nKSA9PiB2b2lkKSB7XHJcbiAgICAgICAgdGhpcy5vbkZpbmlzaGVkQ2FsbGJhY2sgPSBjYWxsYmFjaztcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDlj5bmtojlj5HluIPmtYHnqItcclxuICAgICAqL1xyXG4gICAgY2FuY2VsKCk6IHZvaWQge1xyXG4gICAgICAgIGlmICghdGhpcy5pc1J1bm5pbmcgfHwgIXRoaXMucHJvY2Vzcykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIC8vIOWcqCBXaW5kb3dzIOS4iuW8uuWItue7iOatoui/m+eoi1xyXG4gICAgICAgICAgICB0aGlzLnByb2Nlc3Mua2lsbCgnU0lHVEVSTScpO1xyXG4gICAgICAgICAgICB0aGlzLmhhbmRsZUZpbmlzaChGaW5pc2hNZXRob2QuRkFJTFVSRSwgJ+WPkeW4g+a1geeoi+W3suWPlua2iCcpO1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+WPlua2iOWPkeW4g+a1geeoi+Wksei0pTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHRoaXMuaGFuZGxlRmluaXNoKEZpbmlzaE1ldGhvZC5GQUlMVVJFLCAn5Y+W5raI5Y+R5biD5rWB56iL5aSx6LSlJyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOWkhOeQhuaehOW7uuWujOaIkFxyXG4gICAgICogQHBhcmFtIGNvZGUg6YCA5Ye656CBXHJcbiAgICAgKiBAcGFyYW0gb3V0cHV0IOagh+WHhui+k+WHuuWGheWuuVxyXG4gICAgICogQHBhcmFtIGVycm9yT3V0cHV0IOmUmeivr+i+k+WHuuWGheWuuVxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGhhbmRsZUJ1aWxkQ29tcGxldGUoY29kZTogbnVtYmVyLCBvdXRwdXQ6IHN0cmluZywgZXJyb3JPdXRwdXQ6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIHRoaXMucHJvY2VzcyA9IG51bGw7XHJcbiAgICAgICAgXHJcbiAgICAgICAgY29uc29sZS5sb2coYOaehOW7uuWujOaIkO+8jOmAgOWHuueggTogJHtjb2RlfWApO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOagueaNrumAgOWHuueggeWIpOaWreaehOW7uue7k+aenFxyXG4gICAgICAgIHN3aXRjaCAoY29kZSkge1xyXG4gICAgICAgICAgICBjYXNlIDM2OlxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+aehOW7uui/h+eoi+aIkOWKn+WujOaIkCcpO1xyXG4gICAgICAgICAgICAgICAgLy8g5peg6K665b2T5YmN6L+b5bqm5aaC5L2V77yM5p6E5bu65oiQ5Yqf5pe26K6+5Li6MTAwJVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3Jlc3MgPSAxMDA7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUZpbmlzaChGaW5pc2hNZXRob2QuU1VDQ0VTUywgJ+aehOW7uui/h+eoi+aIkOWKn+WujOaIkCcpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMzI6XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfmnoTlu7rlpLHotKUg4oCU4oCUIOaehOW7uuWPguaVsOS4jeWQiOazlScpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVGaW5pc2goRmluaXNoTWV0aG9kLkZBSUxVUkUsICfmnoTlu7rlpLHotKUg4oCU4oCUIOaehOW7uuWPguaVsOS4jeWQiOazlScpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMzQ6XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfmnoTlu7rlpLHotKUg4oCU4oCUIOaehOW7uui/h+eoi+WHuumUmeWksei0pe+8jOivpuaDheivt+WPguiAg+aehOW7uuaXpeW/lycpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVGaW5pc2goRmluaXNoTWV0aG9kLkZBSUxVUkUsICfmnoTlu7rlpLHotKUg4oCU4oCUIOaehOW7uui/h+eoi+WHuumUmeWksei0pe+8jOivpuaDheivt+WPguiAg+aehOW7uuaXpeW/lycpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfov5vnqIvmraPluLjpgIDlh7rvvIzkvYbmnKrov5Tlm57mnoTlu7rnirbmgIEnKTtcclxuICAgICAgICAgICAgICAgIC8vIOWkp+WkmuaVsOaDheWGteS4i+mAgOWHuueggTDkuZ/ooajnpLrmiJDlip9cclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFByb2dyZXNzID0gMTAwO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVGaW5pc2goRmluaXNoTWV0aG9kLlNVQ0NFU1MsICfov5vnqIvmraPluLjpgIDlh7rvvIzmnoTlu7rmiJDlip8nKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihg5p6E5bu66L+H56iL5byC5bi477yM5pyq55+l6YCA5Ye656CBOiAke2NvZGV9YCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZUZpbmlzaChGaW5pc2hNZXRob2QuRkFJTFVSRSwgYOaehOW7uui/h+eoi+W8guW4uO+8jOacquefpemAgOWHuueggTogJHtjb2RlfWApO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOagueaNrui+k+WHuuWGheWuueabtOaWsOi/m+W6plxyXG4gICAgICogQHBhcmFtIG91dHB1dCDmnoTlu7rovpPlh7rlhoXlrrlcclxuICAgICAqL1xyXG4gICAgcHJpdmF0ZSB1cGRhdGVCdWlsZFByb2dyZXNzKG91dHB1dDogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgLy8g5LuO6L6T5Ye65Lit5p+l5om+cHJvZ3Jlc3PlrZfmrrVcclxuICAgICAgICBjb25zdCBwcm9ncmVzc1JlZ2V4ID0gL3Byb2dyZXNzOlxccyooXFxkKyklLztcclxuICAgICAgICBjb25zdCBwcm9ncmVzc01hdGNoID0gb3V0cHV0Lm1hdGNoKHByb2dyZXNzUmVnZXgpO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmIChwcm9ncmVzc01hdGNoICYmIHByb2dyZXNzTWF0Y2hbMV0pIHtcclxuICAgICAgICAgICAgY29uc3QgcGVyY2VudCA9IHBhcnNlSW50KHByb2dyZXNzTWF0Y2hbMV0sIDEwKTtcclxuICAgICAgICAgICAgaWYgKCFpc05hTihwZXJjZW50KSAmJiBwZXJjZW50ID49IDAgJiYgcGVyY2VudCA8PSAxMDApIHtcclxuICAgICAgICAgICAgICAgIC8vIOebtOaOpeS9v+eUqOaXpeW/l+S4reeahOi/m+W6pueZvuWIhuavlFxyXG4gICAgICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcyhwZXJjZW50LCBg5p6E5bu66L+b5bqmOiAke3BlcmNlbnR9JWApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOi/mOaYr+S/neeVmeS4gOS6m+WFs+mUruivjeWIpOaWre+8jOeUqOS6juaYvuekuueJueWumumYtuauteeahOa2iOaBr1xyXG4gICAgICAgIGlmIChvdXRwdXQuaW5jbHVkZXMoJ+e8luivkeiEmuacrOW8gOWniycpKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3ModGhpcy5nZXRDdXJyZW50UHJvZ3Jlc3MoKSwgJ+e8luivkeiEmuacrOW8gOWniycpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAob3V0cHV0LmluY2x1ZGVzKCfnvJbor5HohJrmnKzlrozmiJAnKSkge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKHRoaXMuZ2V0Q3VycmVudFByb2dyZXNzKCksICfnvJbor5HohJrmnKzlrozmiJAnKTtcclxuICAgICAgICB9IGVsc2UgaWYgKG91dHB1dC5pbmNsdWRlcygn5aSE55CG6LWE5rqQJykpIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcyh0aGlzLmdldEN1cnJlbnRQcm9ncmVzcygpLCAn5q2j5Zyo5aSE55CG6LWE5rqQJyk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChvdXRwdXQuaW5jbHVkZXMoJ+ato+WcqOaehOW7uicpKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3ModGhpcy5nZXRDdXJyZW50UHJvZ3Jlc3MoKSwgJ+ato+WcqOaehOW7uumhueebricpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAob3V0cHV0LmluY2x1ZGVzKCflvIDlp4vmiZPljIUnKSkge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKHRoaXMuZ2V0Q3VycmVudFByb2dyZXNzKCksICflvIDlp4vmiZPljIUnKTtcclxuICAgICAgICB9IGVsc2UgaWYgKG91dHB1dC5pbmNsdWRlcygn5q2j5Zyo5YeG5aSH5Y6f55Sf6aG555uuJykpIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcyh0aGlzLmdldEN1cnJlbnRQcm9ncmVzcygpLCAn5q2j5Zyo5YeG5aSH5Y6f55Sf6aG555uuJyk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChvdXRwdXQuaW5jbHVkZXMoJ+ato+WcqOe8luivkeWOn+eUn+mhueebricpKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3ModGhpcy5nZXRDdXJyZW50UHJvZ3Jlc3MoKSwgJ+ato+WcqOe8luivkeWOn+eUn+mhueebricpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAob3V0cHV0LmluY2x1ZGVzKCfmraPlnKjmiZPljIVBUEsnKSkge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKHRoaXMuZ2V0Q3VycmVudFByb2dyZXNzKCksICfmraPlnKjmiZPljIVBUEsnKTtcclxuICAgICAgICB9IGVsc2UgaWYgKG91dHB1dC5pbmNsdWRlcygn57yW6K+R5a6M5oiQJykpIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcyh0aGlzLmdldEN1cnJlbnRQcm9ncmVzcygpLCAn57yW6K+R5a6M5oiQJyk7XHJcbiAgICAgICAgfSBlbHNlIGlmIChvdXRwdXQuaW5jbHVkZXMoJ+aehOW7uuWujOavlScpKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3ModGhpcy5nZXRDdXJyZW50UHJvZ3Jlc3MoKSwgJ+aehOW7uuWujOavle+8jOaVtOeQhui+k+WHuuaWh+S7ticpO1xyXG4gICAgICAgIH0gZWxzZSBpZiAob3V0cHV0LmluY2x1ZGVzKCflj5HluIPlrozmiJAnKSkge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKDEwMCwgJ+WPkeW4g+WujOaIkCcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICAvLyDnibnmrorlpITnkIbkuIDkupvplJnor6/mg4XlhrVcclxuICAgICAgICBpZiAob3V0cHV0LmluY2x1ZGVzKCfplJnor68nKSB8fCBvdXRwdXQuaW5jbHVkZXMoJ0Vycm9yJykgfHwgb3V0cHV0LmluY2x1ZGVzKCdGYWlsZWQnKSkge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVByb2dyZXNzKHRoaXMuZ2V0Q3VycmVudFByb2dyZXNzKCksIGDmnoTlu7rov4fnqIvlh7rnjrDplJnor686ICR7b3V0cHV0LnN1YnN0cigwLCAxMDApfS4uLmApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDlpITnkIbmtYHnqIvlrozmiJBcclxuICAgICAqIEBwYXJhbSBtZXRob2Qg5a6M5oiQ5pa55rOVXHJcbiAgICAgKiBAcGFyYW0gbWVzc2FnZSDlrozmiJDmtojmga9cclxuICAgICAqL1xyXG4gICAgcHJvdGVjdGVkIGhhbmRsZUZpbmlzaChtZXRob2Q6IEZpbmlzaE1ldGhvZCwgbWVzc2FnZT86IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIC8vIOabtOaWsOacgOe7iOi/m+W6plxyXG4gICAgICAgIGlmIChtZXRob2QgPT09IEZpbmlzaE1ldGhvZC5TVUNDRVNTKSB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUHJvZ3Jlc3MoMTAwLCBtZXNzYWdlIHx8ICflj5HluIPmiJDlip8nKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyDlpLHotKXml7bkv53mjIHlvZPliY3ov5vluqbvvIzmt7vliqDplJnor6/mtojmga9cclxuICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcyh0aGlzLmdldEN1cnJlbnRQcm9ncmVzcygpLCBtZXNzYWdlIHx8ICflj5HluIPlpLHotKUnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g5riF55CG6LWE5rqQXHJcbiAgICAgICAgdGhpcy5wcm9jZXNzID0gbnVsbDtcclxuICAgICAgICB0aGlzLmlzUnVubmluZyA9IGZhbHNlO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOiusOW9leWujOaIkOeKtuaAgVxyXG4gICAgICAgIGNvbnNvbGUubG9nKGBDb2NvcyBDcmVhdG9yIOWPkeW4g+a1geeoiyR7bWV0aG9kID09PSBGaW5pc2hNZXRob2QuU1VDQ0VTUyA/ICfmiJDlip8nIDogJ+Wksei0pSd9OiAke21lc3NhZ2UgfHwgJyd9YCk7XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6LCD55So5a6M5oiQ5Zue6LCDXHJcbiAgICAgICAgdGhpcy5vbkZpbmlzaGVkKG1ldGhvZCwgbWVzc2FnZSk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog6I635Y+W5b2T5YmN6L+b5bqm77yM5aaC5p6c5rKh5pyJ6K6+572u5YiZ6L+U5ZueMFxyXG4gICAgICovXHJcbiAgICBwcml2YXRlIGdldEN1cnJlbnRQcm9ncmVzcygpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmN1cnJlbnRQcm9ncmVzcztcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDmm7TmlrDov5vluqZcclxuICAgICAqIEBwYXJhbSBwcm9ncmVzcyDov5vluqblgLwgKDAtMTAwKVxyXG4gICAgICogQHBhcmFtIG1lc3NhZ2Ug5Y+v6YCJ55qE5raI5oGvXHJcbiAgICAgKi9cclxuICAgIHByb3RlY3RlZCB1cGRhdGVQcm9ncmVzcyhwcm9ncmVzczogbnVtYmVyLCBtZXNzYWdlPzogc3RyaW5nKTogdm9pZCB7XHJcbiAgICAgICAgLy8g5L+d5a2Y5b2T5YmN6L+b5bqm77yM56Gu5L+d6L+b5bqm5LiN5Lya5YCS6YCAXHJcbiAgICAgICAgaWYgKHByb2dyZXNzID4gdGhpcy5jdXJyZW50UHJvZ3Jlc3MpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50UHJvZ3Jlc3MgPSBwcm9ncmVzcztcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8g6LCD55So5Z+657G755qEdXBkYXRlUHJvZ3Jlc3Pmlrnms5VcclxuICAgICAgICBzdXBlci51cGRhdGVQcm9ncmVzcyh0aGlzLmN1cnJlbnRQcm9ncmVzcywgbWVzc2FnZSk7XHJcbiAgICB9XHJcbn0gIl19
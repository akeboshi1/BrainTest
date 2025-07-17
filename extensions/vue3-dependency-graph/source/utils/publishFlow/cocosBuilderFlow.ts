import { BaseProcessFlow } from './baseFlow';
import { FinishMethod } from './interfaces';
import { spawn, ChildProcess } from 'child_process';

/**
 * Cocos Creator 发布流程参数
 */
export interface CocosBuilderParams {
    /**
     * 引擎路径
     */
    enginePath: string;
    
    /**
     * 项目路径
     */
    projectPath: string;
    
    /**
     * 配置文件路径
     */
    configPath: string;
    
    /**
     * 是否调试模式
     */
    debug?: boolean;
    
    /**
     * 额外的命令行参数
     */
    extraArgs?: string[];
}

/**
 * Cocos Creator 发布流程
 */
export class CocosBuilderFlow extends BaseProcessFlow {
    private process: ChildProcess | null = null;
    private onFinishedCallback: ((method: FinishMethod, message?: string) => void) | null = null;
    private currentProgress: number = 0;
    protected resolvePromise: ((value: void) => void) | null = null;
    protected rejectPromise: ((reason: any) => void) | null = null;
    
    constructor() {
        super('Cocos Creator 发布', '执行 Cocos Creator 构建和发布流程');
        this.currentProgress = 0;
    }
    
    /**
     * 启动发布流程
     * @param params 发布参数
     */
    async start(params: CocosBuilderParams): Promise<void> {
        // 如果已经在运行中，则不重复启动
        if (this.isRunning) {
            console.warn('发布流程已经在运行中');
            return Promise.reject(new Error('发布流程已经在运行中'));
        }
        
        // 创建新的Promise，将resolve和reject函数保存起来，在流程真正完成时调用
        return new Promise<void>((resolve, reject) => {
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
                    this.handleFinish(FinishMethod.FAILURE, '缺少必要的参数');
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
                this.process = spawn(executable, args);
                
                // 收集构建日志
                let buildOutput = '';
                let buildErrorOutput = '';
                
                if (!this.process.stdout || !this.process.stderr) {
                    this.handleFinish(FinishMethod.FAILURE, '创建子进程失败，无法获取输出流');
                    return;
                }
                
                console.log('构建进程已启动，等待输出...');
                
                this.process.stdout.on('data', (data: Buffer) => {
                    const output = data.toString();
                    buildOutput += output;
                    
                    // 打印带时间戳的输出，便于调试
                    const timestamp = new Date().toLocaleTimeString();
                    console.log(`[${timestamp}] Cocos Creator 构建输出: ${output}`);
                    
                    // 根据输出更新进度
                    this.updateBuildProgress(output);
                });
                
                this.process.stderr.on('data', (data: Buffer) => {
                    const errorOutput = data.toString();
                    buildErrorOutput += errorOutput;
                    
                    // 打印带时间戳的错误输出
                    const timestamp = new Date().toLocaleTimeString();
                    console.error(`[${timestamp}] Cocos Creator 构建错误: ${errorOutput}`);
                    
                    // 错误输出也可能包含进度信息
                    this.updateBuildProgress(errorOutput);
                });
                
                this.process.on('close', (code: number) => {
                    console.log(`Cocos Creator 构建进程已结束，退出码: ${code}`);
                    this.handleBuildComplete(code, buildOutput, buildErrorOutput);
                });
                
                this.process.on('error', (err: Error) => {
                    console.error('启动构建进程时出错:', err);
                    this.handleFinish(FinishMethod.FAILURE, `启动构建进程时出错: ${err.message}`);
                });
            } catch (error) {
                console.error('命令执行失败:', error);
                this.handleFinish(FinishMethod.FAILURE, `命令执行失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        });
    }
    
    /**
     * 设置完成回调
     * @param callback 回调函数
     */
    onFinished(method: FinishMethod, message?: string): void {
        if (this.onFinishedCallback) {
            this.onFinishedCallback(method, message);
        }
        this.isRunning = false;
        
        // 根据完成状态解析Promise
        if (method === FinishMethod.SUCCESS) {
            if (this.resolvePromise) {
                this.resolvePromise();
            }
        } else {
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
    setFinishedCallback(callback: (method: FinishMethod, message?: string) => void) {
        this.onFinishedCallback = callback;
    }
    
    /**
     * 取消发布流程
     */
    cancel(): void {
        if (!this.isRunning || !this.process) {
            return;
        }
        
        try {
            // 在 Windows 上强制终止进程
            this.process.kill('SIGTERM');
            this.handleFinish(FinishMethod.FAILURE, '发布流程已取消');
        } catch (error) {
            console.error('取消发布流程失败:', error);
            this.handleFinish(FinishMethod.FAILURE, '取消发布流程失败');
        }
    }
    
    /**
     * 处理构建完成
     * @param code 退出码
     * @param output 标准输出内容
     * @param errorOutput 错误输出内容
     */
    private handleBuildComplete(code: number, output: string, errorOutput: string): void {
        this.process = null;
        
        console.log(`构建完成，退出码: ${code}`);
        
        // 根据退出码判断构建结果
        switch (code) {
            case 36:
                console.log('构建过程成功完成');
                // 无论当前进度如何，构建成功时设为100%
                this.currentProgress = 100;
                this.handleFinish(FinishMethod.SUCCESS, '构建过程成功完成');
                break;
            case 32:
                console.error('构建失败 —— 构建参数不合法');
                this.handleFinish(FinishMethod.FAILURE, '构建失败 —— 构建参数不合法');
                break;
            case 34:
                console.error('构建失败 —— 构建过程出错失败，详情请参考构建日志');
                this.handleFinish(FinishMethod.FAILURE, '构建失败 —— 构建过程出错失败，详情请参考构建日志');
                break;
            case 0:
                console.log('进程正常退出，但未返回构建状态');
                // 大多数情况下退出码0也表示成功
                this.currentProgress = 100;
                this.handleFinish(FinishMethod.SUCCESS, '进程正常退出，构建成功');
                break;
            default:
                console.error(`构建过程异常，未知退出码: ${code}`);
                this.handleFinish(FinishMethod.FAILURE, `构建过程异常，未知退出码: ${code}`);
                break;
        }
    }
    
    /**
     * 根据输出内容更新进度
     * @param output 构建输出内容
     */
    private updateBuildProgress(output: string): void {
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
        } else if (output.includes('编译脚本完成')) {
            this.updateProgress(this.getCurrentProgress(), '编译脚本完成');
        } else if (output.includes('处理资源')) {
            this.updateProgress(this.getCurrentProgress(), '正在处理资源');
        } else if (output.includes('正在构建')) {
            this.updateProgress(this.getCurrentProgress(), '正在构建项目');
        } else if (output.includes('开始打包')) {
            this.updateProgress(this.getCurrentProgress(), '开始打包');
        } else if (output.includes('正在准备原生项目')) {
            this.updateProgress(this.getCurrentProgress(), '正在准备原生项目');
        } else if (output.includes('正在编译原生项目')) {
            this.updateProgress(this.getCurrentProgress(), '正在编译原生项目');
        } else if (output.includes('正在打包APK')) {
            this.updateProgress(this.getCurrentProgress(), '正在打包APK');
        } else if (output.includes('编译完成')) {
            this.updateProgress(this.getCurrentProgress(), '编译完成');
        } else if (output.includes('构建完毕')) {
            this.updateProgress(this.getCurrentProgress(), '构建完毕，整理输出文件');
        } else if (output.includes('发布完成')) {
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
    protected handleFinish(method: FinishMethod, message?: string): void {
        // 更新最终进度
        if (method === FinishMethod.SUCCESS) {
            this.updateProgress(100, message || '发布成功');
        } else {
            // 失败时保持当前进度，添加错误消息
            this.updateProgress(this.getCurrentProgress(), message || '发布失败');
        }
        
        // 清理资源
        this.process = null;
        this.isRunning = false;
        
        // 记录完成状态
        console.log(`Cocos Creator 发布流程${method === FinishMethod.SUCCESS ? '成功' : '失败'}: ${message || ''}`);
        
        // 调用完成回调
        this.onFinished(method, message);
    }
    
    /**
     * 获取当前进度，如果没有设置则返回0
     */
    private getCurrentProgress(): number {
        return this.currentProgress;
    }
    
    /**
     * 更新进度
     * @param progress 进度值 (0-100)
     * @param message 可选的消息
     */
    protected updateProgress(progress: number, message?: string): void {
        // 保存当前进度，确保进度不会倒退
        if (progress > this.currentProgress) {
            this.currentProgress = progress;
        }
        
        // 调用基类的updateProgress方法
        super.updateProgress(this.currentProgress, message);
    }
} 
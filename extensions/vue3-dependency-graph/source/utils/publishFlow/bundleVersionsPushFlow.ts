import { BaseProcessFlow } from './baseFlow';
import { FinishMethod } from './interfaces';
import { join } from 'path';
import { existsSync } from 'fs-extra';
import { execSync } from 'child_process';

/**
 * Bundle版本推送流程参数
 */
export interface BundleVersionsPushParams {
    /**
     * 项目路径
     */
    projectPath: string;
    
    /**
     * 提交信息
     */
    commitMessage?: string;
}

/**
 * Bundle版本推送流程 - 将 bundle_versions.json 提交并推送到Git仓库
 */
export class BundleVersionsPushFlow extends BaseProcessFlow {
    private static getVersionFilePath(projectPath: string): string {
        return join(projectPath, 'publish-remote-bundle', 'bundle_versions.json');
    }
    
    private onFinishedCallback: ((method: FinishMethod, message?: string) => void) | null = null;
    private canceled: boolean = false;
    protected resolvePromise: ((value: void) => void) | null = null;
    protected rejectPromise: ((reason: any) => void) | null = null;
    
    constructor() {
        super('Bundle版本推送', '将 bundle_versions.json 提交并推送到Git仓库');
    }
    
    /**
     * 启动流程
     * @param params 推送参数
     */
    async start(params: BundleVersionsPushParams): Promise<void> {
        if (this.isRunning) {
            console.warn('Bundle版本推送流程已在运行');
            return Promise.reject(new Error('流程已在运行中'));
        }
        
        // 创建新的Promise，将resolve和reject函数保存起来，在流程真正完成时调用
        return new Promise<void>((resolve, reject) => {
            this.resolvePromise = resolve;
            this.rejectPromise = reject;
            
            this.isRunning = true;
            this.canceled = false;
            this.updateProgress(0, '准备提交并推送Bundle版本');
            
            try {
                const { projectPath, commitMessage = 'Update bundle versions' } = params;
                
                // 检查版本文件是否存在
                const versionFilePath = BundleVersionsPushFlow.getVersionFilePath(projectPath);
                if (!existsSync(versionFilePath)) {
                    this.handleFinish(FinishMethod.FAILURE, `版本文件不存在: ${versionFilePath}`);
                    return;
                }
                
                this.updateProgress(10, '检查Git仓库状态');
                
                // 获取当前分支
                let currentBranch;
                try {
                    currentBranch = execSync('git branch --show-current', {
                        cwd: projectPath,
                        encoding: 'utf-8'
                    }).trim();
                } catch (error) {
                    this.handleFinish(FinishMethod.FAILURE, '获取Git分支失败');
                    return;
                }
                
                this.updateProgress(20, `当前分支: ${currentBranch}`);
                
                // 检查文件状态
                let gitStatus;
                try {
                    gitStatus = execSync('git status --porcelain publish-remote-bundle/bundle_versions.json', {
                        cwd: projectPath,
                        encoding: 'utf-8'
                    }).trim();
                } catch (error) {
                    this.handleFinish(FinishMethod.FAILURE, '检查文件状态失败');
                    return;
                }
                
                // 检查是否有变更
                if (!gitStatus) {
                    this.updateProgress(100, '无变更需要提交');
                    this.handleFinish(FinishMethod.SUCCESS, '版本文件无变更，无需提交');
                    return;
                }
                
                if (this.canceled) {
                    this.handleFinish(FinishMethod.FAILURE, '操作已取消');
                    return;
                }
                
                this.updateProgress(30, '添加变更到暂存区');
                
                // 添加变更到暂存区
                try {
                    execSync('git add publish-remote-bundle/bundle_versions.json', {
                        cwd: projectPath
                    });
                } catch (error) {
                    this.handleFinish(FinishMethod.FAILURE, '添加文件到暂存区失败');
                    return;
                }
                
                this.updateProgress(50, '提交变更');
                
                // 提交变更
                try {
                    execSync(`git commit -m "${commitMessage}"`, {
                        cwd: projectPath
                    });
                } catch (error) {
                    console.warn('提交失败，可能没有变更', error);
                    this.handleFinish(FinishMethod.FAILURE, '提交失败，可能没有变更');
                    return;
                }
                
                if (this.canceled) {
                    this.handleFinish(FinishMethod.FAILURE, '操作已取消');
                    return;
                }
                
                this.updateProgress(70, '推送到远程仓库');
                
                // 推送到远程仓库
                try {
                    execSync(`git push origin ${currentBranch}`, {
                        cwd: projectPath
                    });
                } catch (error) {
                    console.error('推送失败', error);
                    // 尝试使用 --force-with-lease 选项重试
                    try {
                        this.updateProgress(80, '尝试使用 --force-with-lease 选项推送');
                        execSync(`git push origin ${currentBranch} --force-with-lease`, {
                            cwd: projectPath
                        });
                    } catch (forceError) {
                        console.error('强制推送失败', forceError);
                        this.handleFinish(FinishMethod.FAILURE, `推送到远程仓库失败: ${forceError instanceof Error ? forceError.message : String(forceError)}`);
                        return;
                    }
                }
                
                this.updateProgress(100, '版本推送完成');
                this.handleFinish(FinishMethod.SUCCESS, '版本已成功推送到远程仓库');
            } catch (error) {
                if (this.canceled) {
                    this.handleFinish(FinishMethod.FAILURE, '操作已取消');
                } else {
                    console.error('推送Bundle版本失败:', error);
                    this.handleFinish(FinishMethod.FAILURE, `推送失败: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        });
    }
    
    /**
     * 设置完成回调
     */
    setFinishedCallback(callback: (method: FinishMethod, message?: string) => void): void {
        this.onFinishedCallback = callback;
    }
    
    /**
     * 完成回调
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
    cancel(): void {
        if (!this.isRunning) {
            return;
        }
        
        this.canceled = true;
        console.log('正在取消Bundle版本推送流程...');
        this.handleFinish(FinishMethod.FAILURE, '用户已取消操作');
    }
    
    /**
     * 处理流程完成
     */
    protected handleFinish(method: FinishMethod, message?: string): void {
        this.isRunning = false;
        
        // 记录完成状态
        console.log(`Bundle版本推送${method === FinishMethod.SUCCESS ? '成功' : '失败'}: ${message || ''}`);
        
        // 调用完成回调
        this.onFinished(method, message);
    }
} 
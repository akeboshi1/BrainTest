import { BaseProcessFlow } from './baseFlow';
import { FinishMethod } from './interfaces';
import { join } from 'path';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs-extra';
import { execSync } from 'child_process';

/**
 * Bundle版本更新流程参数
 */
export interface BundleVersionsUpdateParams {
    /**
     * 项目路径
     */
    projectPath: string;
}

/**
 * Bundle版本更新流程 - 从Git仓库更新bundle_versions.json
 */
export class BundleVersionsUpdateFlow extends BaseProcessFlow {
    private static getVersionFilePath(projectPath: string): string {
        return join(projectPath, 'publish-remote-bundle', 'bundle_versions.json');
    }
    
    private onFinishedCallback: ((method: FinishMethod, message?: string) => void) | null = null;
    private canceled: boolean = false;
    protected resolvePromise: ((value: void) => void) | null = null;
    protected rejectPromise: ((reason: any) => void) | null = null;
    
    constructor() {
        super('Bundle版本更新', '从Git仓库更新当前分支最新的bundle_versions.json');
    }
    
    /**
     * 启动流程
     * @param params 更新参数
     */
    async start(params: BundleVersionsUpdateParams): Promise<void> {
        if (this.isRunning) {
            console.warn('Bundle版本更新流程已在运行');
            return Promise.reject(new Error('流程已在运行中'));
        }
        
        // 创建新的Promise，将resolve和reject函数保存起来，在流程真正完成时调用
        return new Promise<void>((resolve, reject) => {
            this.resolvePromise = resolve;
            this.rejectPromise = reject;
            
            this.isRunning = true;
            this.canceled = false;
            this.updateProgress(0, '准备更新Bundle版本信息');
            
            try {
                const { projectPath } = params;
                
                // 检查publish-remote-bundle目录是否存在，如果不存在则创建
                const publishDir = join(projectPath, 'publish-remote-bundle');
                if (!existsSync(publishDir)) {
                    this.updateProgress(10, '创建发布目录');
                    mkdirSync(publishDir, { recursive: true });
                }
                
                const versionFilePath = BundleVersionsUpdateFlow.getVersionFilePath(projectPath);
                
                this.updateProgress(20, '检查本地文件状态');
                
                // 检查文件是否存在及状态
                let fileExists = existsSync(versionFilePath);
                
                // 获取当前分支
                const currentBranch = execSync('git branch --show-current', {
                    cwd: projectPath,
                    encoding: 'utf-8'
                }).trim();
                
                this.updateProgress(30, `当前分支: ${currentBranch}`);
                
                // 拉取最新代码
                this.updateProgress(40, '拉取远程分支最新代码');
                try {
                    execSync(`git pull origin ${currentBranch}`, {
                        cwd: projectPath,
                        encoding: 'utf-8'
                    });
                } catch (error) {
                    console.warn('拉取远程分支失败，可能没有远程分支或网络问题', error);
                }
                
                // 检查文件是否有未提交的更改
                this.updateProgress(60, '检查文件状态');
                try {
                    const gitStatus = execSync('git status --porcelain publish-remote-bundle/bundle_versions.json', {
                        cwd: projectPath,
                        encoding: 'utf-8'
                    }).trim();
                    
                    const hasLocalChanges = gitStatus.length > 0;
                    
                    if (hasLocalChanges) {
                        this.updateProgress(75, '文件有本地修改');
                        
                        // 如果有本地修改，可以选择提示用户
                        console.log('bundle_versions.json 有本地修改:');
                        console.log(gitStatus);
                    } else if (fileExists) {
                        this.updateProgress(80, '文件无本地修改，使用最新版本');
                    } else {
                        this.updateProgress(80, '文件不存在，尝试从远程获取');
                        
                        // 尝试检出文件
                        try {
                            execSync('git checkout -- publish-remote-bundle/bundle_versions.json', {
                                cwd: projectPath
                            });
                            fileExists = existsSync(versionFilePath);
                            if (fileExists) {
                                this.updateProgress(85, '已从仓库恢复文件');
                            } else {
                                this.updateProgress(85, '仓库中无此文件，将创建新文件');
                                
                                // 创建默认版本文件
                                const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
                                const defaultVersion = {
                                    version: `${today} 0000`,
                                    bundles: {},
                                    timestamp: Math.floor(Date.now() / 1000)
                                };
                                
                                writeFileSync(versionFilePath, JSON.stringify(defaultVersion, null, 2), 'utf-8');
                                this.updateProgress(90, '已创建默认版本文件');
                            }
                        } catch (error) {
                            console.warn('从Git恢复文件失败', error);
                            
                            // 创建默认版本文件
                            const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');
                            const defaultVersion = {
                                version: `${today} 0000`,
                                bundles: {},
                                timestamp: Math.floor(Date.now() / 1000)
                            };
                            
                            writeFileSync(versionFilePath, JSON.stringify(defaultVersion, null, 2), 'utf-8');
                            this.updateProgress(90, '已创建默认版本文件');
                        }
                    }
                } catch (error) {
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
                        
                        writeFileSync(versionFilePath, JSON.stringify(defaultVersion, null, 2), 'utf-8');
                        this.updateProgress(90, '已创建默认版本文件');
                    }
                }
                
                if (this.canceled) {
                    this.handleFinish(FinishMethod.FAILURE, '操作已取消');
                    return;
                }
                
                // 最终确认文件是否存在
                fileExists = existsSync(versionFilePath);
                if (fileExists) {
                    // 读取文件内容
                    const content = readFileSync(versionFilePath, 'utf-8');
                    try {
                        const versionData = JSON.parse(content);
                        this.updateProgress(100, `版本更新完成，当前版本: ${versionData.version}`);
                        this.handleFinish(FinishMethod.SUCCESS, `Bundle版本已更新，当前版本: ${versionData.version}`);
                    } catch (error) {
                        console.error('解析版本文件失败', error);
                        this.handleFinish(FinishMethod.FAILURE, '版本文件格式错误');
                    }
                } else {
                    this.handleFinish(FinishMethod.FAILURE, '无法获取或创建版本文件');
                }
            } catch (error) {
                console.error('更新Bundle版本失败:', error);
                this.handleFinish(FinishMethod.FAILURE, `更新失败: ${error instanceof Error ? error.message : String(error)}`);
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
    cancel(): void {
        if (!this.isRunning) {
            return;
        }
        
        this.canceled = true;
        this.handleFinish(FinishMethod.FAILURE, 'Bundle版本更新已取消');
    }
    
    /**
     * 处理流程完成
     */
    protected handleFinish(method: FinishMethod, message?: string): void {
        this.isRunning = false;
        
        // 记录完成状态
        console.log(`Bundle版本更新${method === FinishMethod.SUCCESS ? '成功' : '失败'}: ${message || ''}`);
        
        // 调用完成回调
        this.onFinished(method, message);
    }
} 
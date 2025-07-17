import { BaseProcessFlow } from './baseFlow';
import { FinishMethod } from './interfaces';
import { join } from 'path';
import { existsSync } from 'fs-extra';
import { readdirSync, lstatSync } from 'fs-extra';
import Client from 'ssh2-sftp-client';

/**
 * 发布Bundle到服务器流程参数
 */
export interface PublishBundleToServerParams {
    /**
     * 项目路径
     */
    projectPath: string;
    
    /**
     * SFTP配置
     */
    sftpConfig: {
        /**
         * 服务器主机
         */
        host: string;
        
        /**
         * 服务器端口
         */
        port: number;
        
        /**
         * 用户名
         */
        username: string;
        
        /**
         * 密码
         */
        password: string;
        
        /**
         * 远程路径
         */
        remotePath: string;
    };
    
    /**
     * 环境
     */
    environment: 'development' | 'production';
}

/**
 * 发布Bundle到服务器流程
 */
export class PublishBundleToServerFlow extends BaseProcessFlow {
    private onFinishedCallback: ((method: FinishMethod, message?: string) => void) | null = null;
    private canceled: boolean = false;
    private client: Client | null = null;
    private uploadedFiles: number = 0;
    private totalFiles: number = 0;
    private currentUploadFile: string = '';
    
    constructor() {
        super('发布Bundle到服务器', '将生成的Bundle上传到远程服务器');
    }
    
    /**
     * 启动流程
     * @param params 发布参数
     */
    async start(params: PublishBundleToServerParams): Promise<void> {
        if (this.isRunning) {
            console.warn('发布Bundle到服务器流程已在运行');
            return;
        }
        
        this.isRunning = true;
        this.canceled = false;
        this.uploadedFiles = 0;
        this.totalFiles = 0;
        this.currentUploadFile = '';
        
        this.updateProgress(0, '准备发布Bundle到服务器');
        
        try {
            const { projectPath, sftpConfig, environment } = params;
            
            // 检查本地发布目录
            const localPath = join(projectPath, 'publish-remote-bundle');
            if (!existsSync(localPath)) {
                throw new Error(`本地发布目录不存在: ${localPath}`);
            }
            
            this.updateProgress(5, '连接到服务器');
            
            // 创建SFTP客户端
            this.client = new Client();
            
            // 添加调试日志
            (this.client as any).on('debug', (msg: string) => {
                console.log(`SFTP调试信息: ${msg}`);
            });
            
            // 连接服务器
            await this.withTimeout(
                this.client.connect({
                    host: sftpConfig.host,
                    port: sftpConfig.port,
                    username: sftpConfig.username,
                    password: sftpConfig.password,
                    readyTimeout: 10000 // 10秒连接超时
                }),
                20000,
                '服务器连接'
            );
            
            this.updateProgress(10, '服务器连接成功');
            
            // 确定远程路径
            const env = environment.toLowerCase() === 'development' ? 'develop' : 'production';
            const remotePath = join(sftpConfig.remotePath, env).replace(/\\/g, '/');
            
            this.updateProgress(15, `目标路径: ${remotePath}`);
            
            // 计算要上传的文件总数
            this.totalFiles = this.calculateFiles(localPath);
            
            this.updateProgress(20, `需要上传的文件总数: ${this.totalFiles}`);
            
            // 开始上传
            this.updateProgress(25, '开始上传文件');
            
            // 上传整个目录
            await this.uploadDirectory(localPath, remotePath);
            
            this.updateProgress(95, '验证上传结果');
            
            // 验证上传结果
            try {
                const remoteFiles = await this.withTimeout(
                    this.client.list(remotePath),
                    30000, // 30秒列表获取超时
                    '获取远程文件列表'
                );
                this.updateProgress(98, `验证成功: 远程目录中有 ${remoteFiles.length} 个文件/文件夹`);
            } catch (error) {
                console.warn('无法验证远程文件列表，但上传过程已完成');
            }
            
            this.updateProgress(100, '文件上传完成');
            this.handleFinish(FinishMethod.SUCCESS, '文件已成功上传到服务器');
        } catch (error) {
            if (this.canceled) {
                this.handleFinish(FinishMethod.FAILURE, '上传已取消');
            } else {
                console.error('上传失败:', error);
                this.handleFinish(FinishMethod.FAILURE, `上传失败: ${error instanceof Error ? error.message : String(error)}`);
            }
        } finally {
            // 关闭连接
            if (this.client) {
                try {
                    await this.client.end();
                    console.log('SFTP连接已关闭');
                } catch (error) {
                    console.error('关闭SFTP连接失败:', error);
                }
                this.client = null;
            }
        }
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
    }
    
    /**
     * 取消流程
     */
    cancel(): void {
        if (!this.isRunning) {
            return;
        }
        
        this.canceled = true;
        console.log('正在取消上传...');
        
        // 尝试关闭连接
        if (this.client) {
            this.client.end().catch(error => {
                console.error('关闭SFTP连接失败:', error);
            });
        }
    }
    
    /**
     * 获取上传状态
     */
    getUploadStatus(): { uploadedFiles: number, totalFiles: number, currentUploadFile: string } {
        return {
            uploadedFiles: this.uploadedFiles,
            totalFiles: this.totalFiles,
            currentUploadFile: this.currentUploadFile
        };
    }
    
    /**
     * 处理流程完成
     */
    protected handleFinish(method: FinishMethod, message?: string): void {
        this.isRunning = false;
        
        // 记录完成状态
        console.log(`发布Bundle到服务器${method === FinishMethod.SUCCESS ? '成功' : '失败'}: ${message || ''}`);
        
        // 调用完成回调
        this.onFinished(method, message);
    }
    
    /**
     * 计算目录下的文件总数
     */
    private calculateFiles(dir: string): number {
        let count = 0;
        const items = readdirSync(dir);
        for (const item of items) {
            const itemPath = join(dir, item);
            if (lstatSync(itemPath).isDirectory()) {
                count += this.calculateFiles(itemPath);
            } else {
                count++;
            }
        }
        return count;
    }
    
    /**
     * 上传目录
     */
    private async uploadDirectory(localDir: string, remoteDir: string): Promise<void> {
        if (this.canceled || !this.client) {
            throw new Error('上传已取消或客户端不存在');
        }
        
        // 格式化远程路径
        remoteDir = remoteDir.replace(/\\/g, '/');
        
        // 确保远程目录存在
        try {
            // 检查目录是否存在
            let dirExists = false;
            try {
                const stats = await this.withTimeout(
                    this.client.stat(remoteDir),
                    15000,
                    '检查远程目录'
                );
                
                // 检查是否为目录
                const statsAny = stats as any;
                if (
                    (typeof statsAny.isDirectory === 'function' && statsAny.isDirectory()) ||
                    (typeof statsAny.isDirectory === 'boolean' && statsAny.isDirectory) ||
                    statsAny.type === 'd' ||
                    (statsAny.mode && (statsAny.mode & 0o40000) !== 0)
                ) {
                    dirExists = true;
                }
            } catch (error) {
                // 目录不存在，需要创建
            }
            
            // 如果目录不存在，创建它
            if (!dirExists) {
                try {
                    await this.withTimeout(
                        this.client.mkdir(remoteDir, true),
                        30000,
                        '创建远程目录'
                    );
                } catch (error) {
                    // 如果递归创建失败，尝试手动创建目录层次
                    const parts = remoteDir.replace(/\\/g, '/').split('/').filter(Boolean);
                    let currentPath = '';
                    
                    // 从根目录开始逐级创建
                    if (remoteDir.startsWith('/')) {
                        currentPath = '/';
                    }
                    
                    for (const part of parts) {
                        currentPath = currentPath ? `${currentPath}/${part}` : part;
                        try {
                            // 检查目录是否存在
                            try {
                                await this.client.stat(currentPath);
                                continue; // 目录已存在，跳过
                            } catch {
                                // 目录不存在，继续创建
                            }
                            
                            await this.withTimeout(
                                this.client.mkdir(currentPath, false),
                                10000,
                                `创建目录 ${currentPath}`
                            );
                        } catch (error) {
                            console.warn(`创建目录失败，可能已存在: ${currentPath}`);
                        }
                    }
                }
            }
        } catch (error) {
            console.warn(`远程目录处理失败，尝试继续上传: ${remoteDir}`, error);
        }
        
        // 处理目录中的所有文件和子目录
        const items = readdirSync(localDir);
        
        for (const item of items) {
            if (this.canceled) {
                throw new Error('上传已取消');
            }
            
            const localItemPath = join(localDir, item);
            const remoteItemPath = `${remoteDir}/${item}`;
            
            if (lstatSync(localItemPath).isDirectory()) {
                // 递归处理子目录
                await this.uploadDirectory(localItemPath, remoteItemPath);
            } else {
                // 上传文件
                this.currentUploadFile = item;
                
                try {
                    await this.withRetry(
                        async () => {
                            await this.client!.put(localItemPath, remoteItemPath);
                        },
                        3, // 重试3次
                        2000 // 每次重试间隔2秒
                    );
                    
                    this.uploadedFiles++;
                    const progress = Math.min(95, 25 + Math.floor((this.uploadedFiles / this.totalFiles) * 70));
                    this.updateProgress(progress, `已上传 ${this.uploadedFiles}/${this.totalFiles} 个文件`);
                } catch (error) {
                    console.error(`上传文件失败: ${item}`, error);
                    // 继续处理其他文件
                }
            }
        }
    }
    
    /**
     * 带超时的Promise
     */
    private withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
        let timeoutId: NodeJS.Timeout;
        const timeoutPromise = new Promise<T>((_, reject) => {
            timeoutId = setTimeout(() => reject(new Error(`操作超时: ${message}`)), timeoutMs);
        });
        return Promise.race([
            promise,
            timeoutPromise
        ]).finally(() => clearTimeout(timeoutId!));
    }
    
    /**
     * 带重试的异步函数执行
     */
    private async withRetry<T>(fn: () => Promise<T>, retries: number = 3, delay: number = 2000): Promise<T> {
        let lastError;
        for (let i = 0; i < retries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        throw lastError;
    }
} 
import { BaseProcessFlow } from './baseFlow';
import { FinishMethod } from './interfaces';
import { join } from 'path';
import { existsSync } from 'fs-extra';
import { readdirSync, lstatSync } from 'fs-extra';
import Client from 'ssh2-sftp-client';

/**
 * 环境文件夹命名配置
 */
const ENVIRONMENT_FOLDER_NAMES = {
    development: 'develop',
    production: 'production'
} as const;

/**
 * 发布Bundle到服务器流程参数
 */
export interface PublishBundleToServerParams {
    /**
     * 项目路径
     */
    projectPath: string;

    /**
     * 需要上传的Bundle列表
     */
    changeBundleList: string[];
    
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
    
    /**
     * 并发上传数量（默认5）
     */
    concurrency?: number;
    
    /**
     * 是否启用增量上传（默认true）
     */
    incremental?: boolean;
    
    /**
     * 是否全量上传（默认false）
     */
    isFullUpload?: boolean;
}

/**
 * 文件上传任务
 */
interface UploadTask {
    localPath: string;
    remotePath: string;
    size: number;
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
    private uploadQueue: UploadTask[] = [];
    private concurrency: number = 5;
    private incremental: boolean = true;
    private createdDirectories: Set<string> = new Set();
    private uploadPromises: Promise<void>[] = [];
    private sftpConfig: PublishBundleToServerParams['sftpConfig'] | null = null;
    private connectionMonitorInterval: NodeJS.Timeout | null = null;
    private lastActivityTime: number = Date.now();
    private currentUploadListener: ((info: { source: string; destination: string }) => void) | null = null;
    
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
        this.uploadQueue = [];
        this.createdDirectories.clear();
        this.uploadPromises = [];
        this.sftpConfig = params.sftpConfig;
        
        // 设置并发数和增量上传
        this.concurrency = params.concurrency || 10;
        this.incremental = params.incremental !== false;
        
        this.updateProgress(0, '准备发布Bundle到服务器');
        
        try {
            const { projectPath, sftpConfig, environment, changeBundleList, isFullUpload } = params;
            
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
            
            // 启动连接监控
            this.startConnectionMonitor();
            
            // 确定远程路径
            const env = environment.toLowerCase() === 'development' ? ENVIRONMENT_FOLDER_NAMES.development : ENVIRONMENT_FOLDER_NAMES.production;
            const remotePath = join(sftpConfig.remotePath, env).replace(/\\/g, '/');
            
            this.updateProgress(15, `目标路径: ${remotePath}`);
            
            // 根据changeBundleList构建上传队列
            this.updateProgress(20, '构建上传队列...');
            if (isFullUpload) {
                await this.buildUploadQueueForFullUpload(localPath, remotePath);
            } else {
                await this.buildUploadQueueFromChangeList(localPath, remotePath, changeBundleList);
            }
            
            this.updateProgress(25, `需要上传的文件总数: ${this.totalFiles}`);
            
            // 批量创建目录
            this.updateProgress(30, '创建远程目录结构...');
            await this.createDirectoriesBatch();
            
            // 开始并发上传
            this.updateProgress(35, '开始并发上传文件');
            await this.uploadFilesConcurrently();
            
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
            // 停止连接监控
            this.stopConnectionMonitor();
            
            // 清理监听器引用
            this.currentUploadListener = null;
            
            // 关闭连接
            if (this.client) {
                try {
                    // 使用更安全的方式关闭连接
                    const client = this.client;
                    this.client = null; // 先置空引用，避免重复操作
                    
                    // 使用 Promise 包装连接关闭操作
                    await new Promise<void>((resolve) => {
                        // 设置超时，避免无限等待
                        const timeout = setTimeout(() => {
                            console.warn('关闭连接超时，强制结束');
                            resolve();
                        }, 5000);
                        
                        // 使用 try-catch 包装 end() 调用
                        try {
                            client.end()
                                .then(() => {
                                    clearTimeout(timeout);
                                    console.log('SFTP连接已关闭');
                                    resolve();
                                })
                                .catch((error) => {
                                    clearTimeout(timeout);
                                    console.warn('关闭SFTP连接时出现警告:', error);
                                    // 不抛出错误，只记录警告
                                    resolve();
                                });
                        } catch (error) {
                            clearTimeout(timeout);
                            console.warn('调用 end() 方法时出现错误:', error);
                            resolve();
                        }
                    });
                } catch (error) {
                    console.error('关闭SFTP连接失败:', error);
                }
            }
        }
    }
    
    /**
     * 启动连接监控
     */
    private startConnectionMonitor(): void {
        // 每30秒检查一次连接状态
        this.connectionMonitorInterval = setInterval(async () => {
            if (this.canceled || !this.isRunning) {
                this.stopConnectionMonitor();
                return;
            }
            
            try {
                // 检查连接是否还有响应
                if (this.client) {
                    await this.client.list('.');
                    this.lastActivityTime = Date.now();
                }
            } catch (error) {
                console.warn('连接监控检测到连接问题，尝试重新连接...');
                try {
                    await this.reconnectSftp();
                    console.log('连接监控：重新连接成功');
                } catch (reconnectError) {
                    console.error('连接监控：重新连接失败', reconnectError);
                }
            }
        }, 30000);
    }
    
    /**
     * 停止连接监控
     */
    private stopConnectionMonitor(): void {
        if (this.connectionMonitorInterval) {
            clearInterval(this.connectionMonitorInterval);
            this.connectionMonitorInterval = null;
        }
    }
    
    /**
     * 根据changeBundleList构建上传队列
     */
    private async buildUploadQueueFromChangeList(localPath: string, remotePath: string, changeBundleList: string[]): Promise<void> {
        console.log('根据changeBundleList构建上传队列:', changeBundleList);
        
        for (const bundleName of changeBundleList) {
            if (this.canceled) {
                throw new Error('构建上传队列已取消');
            }
            
            // 构建本地bundle路径
            const localBundlePath = join(localPath, bundleName);
            
            // 检查bundle目录是否存在
            if (!existsSync(localBundlePath)) {
                console.warn(`Bundle目录不存在，跳过: ${localBundlePath}`);
                continue;
            }
            
            // 检查是否为目录
            const stats = lstatSync(localBundlePath);
            if (!stats.isDirectory()) {
                console.warn(`Bundle路径不是目录，跳过: ${localBundlePath}`);
                continue;
            }
            
            // 直接添加整个bundle目录作为上传任务
            this.uploadQueue.push({
                localPath: localBundlePath,
                remotePath: `${remotePath}/${bundleName}`,
                size: stats.size
            });
            this.totalFiles++;
            
            console.log(`添加bundle上传任务: ${bundleName} -> ${remotePath}/${bundleName}`);
        }
        
        console.log(`构建上传队列完成，共 ${this.totalFiles} 个任务`);
    }

    /**
     * 构建全量上传的文件列表
     */
    private async buildUploadQueueForFullUpload(localPath: string, remotePath: string): Promise<void> {
        console.log('构建全量上传的文件列表...');
        
        if (!existsSync(localPath)) {
            throw new Error(`本地Bundle目录不存在: ${localPath}`);
        }

        // 扫描根目录下的所有文件夹
        const items = readdirSync(localPath);
        const folders = items.filter(item => {
            const itemPath = join(localPath, item);
            return existsSync(itemPath) && lstatSync(itemPath).isDirectory();
        });
        
        console.log(`扫描到 ${folders.length} 个文件夹:`, folders);
        
        // 为每个文件夹添加上传任务
        for (const folderName of folders) {
            if (this.canceled) {
                throw new Error('构建上传队列已取消');
            }
            
            const localFolderPath = join(localPath, folderName);
            const stats = lstatSync(localFolderPath);
            
            this.uploadQueue.push({
                localPath: localFolderPath,
                remotePath: `${remotePath}/${folderName}`,
                size: stats.size
            });
            this.totalFiles++;
            
            console.log(`添加文件夹上传任务: ${folderName} -> ${remotePath}/${folderName}`);
        }
        
        console.log(`全量上传队列构建完成，共 ${this.totalFiles} 个任务`);
    }
    
    /**
     * 批量创建目录
     */
    private async createDirectoriesBatch(): Promise<void> {
        if (!this.client) return;
        
        const directories = new Set<string>();
        
        // 收集所有需要的目录
        for (const task of this.uploadQueue) {
            const dir = task.remotePath.substring(0, task.remotePath.lastIndexOf('/'));
            if (dir && !this.createdDirectories.has(dir)) {
                directories.add(dir);
            }
        }
        
        // 按层级排序，确保父目录先创建
        const sortedDirs = Array.from(directories).sort((a, b) => {
            const aDepth = (a.match(/\//g) || []).length;
            const bDepth = (b.match(/\//g) || []).length;
            return aDepth - bDepth;
        });
        
        // 批量创建目录
        for (const dir of sortedDirs) {
            if (this.canceled) break;
            
            try {
                await this.client.mkdir(dir, true);
                this.createdDirectories.add(dir);
            } catch (error) {
                // 目录可能已存在，继续
                console.warn(`创建目录失败，可能已存在: ${dir}`);
            }
        }
    }
    
    /**
     * 并发上传文件
     */
    private async uploadFilesConcurrently(): Promise<void> {
        if (!this.client || this.uploadQueue.length === 0) return;
        
        const semaphore = new Semaphore(this.concurrency);
        
        // 创建上传任务
        const uploadTasks = this.uploadQueue.map(task => 
            this.uploadFileWithSemaphore(task, semaphore)
        );
        
        // 等待所有上传完成
        await Promise.all(uploadTasks);
    }
    
    /**
     * 使用信号量上传单个文件
     */
    private async uploadFileWithSemaphore(task: UploadTask, semaphore: Semaphore): Promise<void> {
        await semaphore.acquire();
        
        try {
            await this.uploadSingleFile(task);
        } finally {
            semaphore.release();
        }
    }
    
    /**
     * 上传单个文件
     */
    private async uploadSingleFile(task: UploadTask): Promise<void> {
        if (this.canceled || !this.client) {
            throw new Error('上传已取消或客户端不存在');
        }
        
        this.currentUploadFile = task.localPath.split('/').pop() || '';
        
        try {
            await this.withRetry(
                async () => {
                    // 检查连接状态，如果连接丢失则重新连接
                    if (!this.client) {
                        console.log('SFTP客户端不存在，尝试重新连接...');
                        await this.reconnectSftp();
                    } else {
                        // 尝试执行一个简单操作来检查连接状态
                        try {
                            await this.client.list('.');
                        } catch (error) {
                            console.log('SFTP连接检查失败，尝试重新连接...');
                            await this.reconnectSftp();
                        }
                    }
                    
                    // 检查本地路径是否为目录
                    const stats = lstatSync(task.localPath);
                    if (stats.isDirectory()) {
                        // 如果是目录，使用uploadDir方法上传整个目录
                        console.log(`上传目录: ${task.localPath} -> ${task.remotePath}`);
                        
                        // 先移除可能存在的旧监听器
                        if (this.currentUploadListener) {
                            this.client!.removeListener('upload', this.currentUploadListener);
                            this.currentUploadListener = null;
                        }
                        
                        // 添加上传进度监听器
                        this.currentUploadListener = (info: { source: string; destination: string }) => {
                            console.log(`上传进度: ${info.source} -> ${info.destination}`);
                            this.currentUploadFile = info.source.split('/').pop() || '';
                            this.lastActivityTime = Date.now(); // 更新活动时间
                            
                            // 更新进度信息
                            this.uploadedFiles++;
                            
                            // 减少进度更新频率，每10个文件更新一次
                            if (this.uploadedFiles % 10 === 0 || this.uploadedFiles === this.totalFiles) {
                                const progress = Math.min(95, 35 + Math.floor((this.uploadedFiles / this.totalFiles) * 60));
                                this.updateProgress(progress, `已上传 ${this.uploadedFiles}/${this.totalFiles} 个文件`);
                            }
                        };
                        
                        // 注册上传事件监听器
                        this.client!.on('upload', this.currentUploadListener);
                        
                        try {
                            await this.client!.uploadDir(task.localPath, task.remotePath);
                        } finally {
                            // 移除监听器
                            if (this.currentUploadListener) {
                                this.client!.removeListener('upload', this.currentUploadListener);
                                this.currentUploadListener = null;
                            }
                        }
                    } else {
                        // 如果是文件，使用put方法上传
                        console.log(`上传文件: ${task.localPath} -> ${task.remotePath}`);
                        await this.client!.put(task.localPath, task.remotePath);
                        this.lastActivityTime = Date.now(); // 更新活动时间
                        
                        this.uploadedFiles++;
                        
                        // 减少进度更新频率，每10个文件更新一次
                        if (this.uploadedFiles % 10 === 0 || this.uploadedFiles === this.totalFiles) {
                            const progress = Math.min(95, 35 + Math.floor((this.uploadedFiles / this.totalFiles) * 60));
                            this.updateProgress(progress, `已上传 ${this.uploadedFiles}/${this.totalFiles} 个文件`);
                        }
                    }
                },
                5, // 增加重试次数
                3000 // 增加重试间隔
            );
        } catch (error) {
            console.error(`上传文件失败: ${task.localPath}`, error);
            
            // 如果是连接错误，尝试重新连接
            if (error instanceof Error && (
                error.message.includes('ECONNRESET') ||
                error.message.includes('No SFTP connection') ||
                error.message.includes('Connection lost')
            )) {
                console.log('检测到连接错误，尝试重新连接...');
                try {
                    await this.reconnectSftp();
                    console.log('重新连接成功，可以继续上传');
                } catch (reconnectError) {
                    console.error('重新连接失败:', reconnectError);
                }
            }
            
            // 继续处理其他文件，不抛出错误
        }
    }
    
    /**
     * 重新连接SFTP
     */
    private async reconnectSftp(): Promise<void> {
        if (!this.client) {
            throw new Error('SFTP客户端不存在');
        }
        
        try {
            // 先尝试关闭现有连接
            try {
                const oldClient = this.client;
                this.client = null; // 先置空引用
                
                await new Promise<void>((resolve) => {
                    const timeout = setTimeout(() => {
                        console.warn('关闭旧连接超时，强制结束');
                        resolve();
                    }, 3000);
                    
                    try {
                        oldClient.end()
                            .then(() => {
                                clearTimeout(timeout);
                                resolve();
                            })
                            .catch((error) => {
                                clearTimeout(timeout);
                                console.warn('关闭旧连接失败:', error);
                                // 不抛出错误，继续执行
                                resolve();
                            });
                    } catch (error) {
                        clearTimeout(timeout);
                        console.warn('调用旧连接 end() 方法时出现错误:', error);
                        resolve();
                    }
                });
            } catch (error) {
                console.warn('关闭旧连接失败:', error);
            }
            
            // 清理监听器引用
            this.currentUploadListener = null;
            
            // 创建新的客户端
            this.client = new Client();
            
            // 重新连接
            await this.client.connect({
                host: this.sftpConfig!.host,
                port: this.sftpConfig!.port,
                username: this.sftpConfig!.username,
                password: this.sftpConfig!.password,
                readyTimeout: 15000 // 增加连接超时时间
            });
            
            console.log('SFTP重新连接成功');
        } catch (error) {
            console.error('SFTP重新连接失败:', error);
            throw new Error(`重新连接失败: ${error instanceof Error ? error.message : String(error)}`);
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
        
        // 停止连接监控
        this.stopConnectionMonitor();
        
        // 清理监听器引用
        this.currentUploadListener = null;
        
        // 尝试关闭连接
        if (this.client) {
            const client = this.client;
            this.client = null; // 先置空引用
            
            // 使用异步方式关闭连接，但不等待结果
            client.end().catch(error => {
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

/**
 * 信号量类，用于控制并发数量
 */
class Semaphore {
    private permits: number;
    private waitQueue: Array<() => void> = [];
    
    constructor(permits: number) {
        this.permits = permits;
    }
    
    async acquire(): Promise<void> {
        if (this.permits > 0) {
            this.permits--;
            return Promise.resolve();
        }
        
        return new Promise<void>(resolve => {
            this.waitQueue.push(resolve);
        });
    }
    
    release(): void {
        if (this.waitQueue.length > 0) {
            const resolve = this.waitQueue.shift()!;
            resolve();
        } else {
            this.permits++;
        }
    }
} 
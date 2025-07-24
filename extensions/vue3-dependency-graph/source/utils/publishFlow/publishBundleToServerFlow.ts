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
        
        // 设置并发数和增量上传
        this.concurrency = params.concurrency || 10;
        this.incremental = params.incremental !== false;
        
        this.updateProgress(0, '准备发布Bundle到服务器');
        
        try {
            const { projectPath, sftpConfig, environment, changeBundleList } = params;
            
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
            const env = environment.toLowerCase() === 'development' ? ENVIRONMENT_FOLDER_NAMES.development : ENVIRONMENT_FOLDER_NAMES.production;
            const remotePath = join(sftpConfig.remotePath, env).replace(/\\/g, '/');
            
            this.updateProgress(15, `目标路径: ${remotePath}`);
            
            // 根据changeBundleList构建上传队列
            this.updateProgress(20, '构建上传队列...');
            await this.buildUploadQueueFromChangeList(localPath, remotePath, changeBundleList);
            
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
            
            // 直接添加整个bundle目录作为上传任务，不进行递归扫描
            const stats = lstatSync(localBundlePath);
            this.uploadQueue.push({
                localPath: localBundlePath,
                remotePath: `${remotePath}/${bundleName}`,
                size: stats.size
            });
            this.totalFiles++;
            
            console.log(`添加bundle上传任务: ${bundleName} -> ${remotePath}/${bundleName}`);
        }
        
        // 添加bundle_versions.json文件的上传任务
        const versionsFilePath = join(localPath, 'bundle_versions.json');
        if (existsSync(versionsFilePath)) {
            const stats = lstatSync(versionsFilePath);
            this.uploadQueue.push({
                localPath: versionsFilePath,
                remotePath: `${remotePath}/bundle_versions.json`,
                size: stats.size
            });
            this.totalFiles++;
            console.log(`添加bundle_versions.json上传任务: ${versionsFilePath} -> ${remotePath}/bundle_versions.json`);
        } else {
            console.warn('bundle_versions.json文件不存在，跳过上传');
        }
        
        console.log(`构建上传队列完成，共 ${this.totalFiles} 个任务`);
    }
    
    /**
     * 扫描单个bundle目录
     */
    private async scanBundleDirectory(localDir: string, remoteDir: string): Promise<void> {
        const items = readdirSync(localDir);
        
        for (const item of items) {
            if (this.canceled) {
                throw new Error('扫描已取消');
            }
            
            const localItemPath = join(localDir, item);
            const remoteItemPath = `${remoteDir}/${item}`;
            
            if (lstatSync(localItemPath).isDirectory()) {
                // 递归扫描子目录
                await this.scanBundleDirectory(localItemPath, remoteItemPath);
            } else {
                // 检查是否需要上传（增量上传）
                if (this.incremental && await this.shouldSkipFile(localItemPath, remoteItemPath)) {
                    console.log(`跳过文件（已存在且相同）: ${item}`);
                    continue;
                }
                
                const stats = lstatSync(localItemPath);
                this.uploadQueue.push({
                    localPath: localItemPath,
                    remotePath: remoteItemPath,
                    size: stats.size
                });
                this.totalFiles++;
            }
        }
    }
    
    /**
     * 检查是否应该跳过文件（增量上传）
     */
    private async shouldSkipFile(localPath: string, remotePath: string): Promise<boolean> {
        if (!this.client) return false;
        
        try {
            const remoteStats = await this.client.stat(remotePath);
            const localStats = lstatSync(localPath);
            
            // 比较文件大小
            const remoteSize = (remoteStats as any).size || 0;
            return remoteSize === localStats.size;
        } catch {
            // 远程文件不存在，需要上传
            return false;
        }
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
                    // 检查本地路径是否为目录
                    const stats = lstatSync(task.localPath);
                    if (stats.isDirectory()) {
                        // 如果是目录，使用uploadDir方法上传整个目录
                        console.log(`上传目录: ${task.localPath} -> ${task.remotePath}`);
                        await this.client!.uploadDir(task.localPath, task.remotePath);
                    } else {
                        // 如果是文件，使用put方法上传
                        console.log(`上传文件: ${task.localPath} -> ${task.remotePath}`);
                        await this.client!.put(task.localPath, task.remotePath);
                    }
                },
                2, // 减少重试次数
                1000 // 减少重试间隔
            );
            
            this.uploadedFiles++;
            
            // 减少进度更新频率，每10个文件更新一次
            if (this.uploadedFiles % 10 === 0 || this.uploadedFiles === this.totalFiles) {
                const progress = Math.min(95, 35 + Math.floor((this.uploadedFiles / this.totalFiles) * 60));
                this.updateProgress(progress, `已上传 ${this.uploadedFiles}/${this.totalFiles} 个文件`);
            }
        } catch (error) {
            console.error(`上传文件失败: ${task.localPath}`, error);
            // 继续处理其他文件，不抛出错误
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
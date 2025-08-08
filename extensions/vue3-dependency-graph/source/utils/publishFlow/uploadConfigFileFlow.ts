import { BaseProcessFlow } from './baseFlow';
import { FinishMethod } from './interfaces';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs-extra';
import Client from 'ssh2-sftp-client';
import { ENVIRONMENT_FOLDER_NAMES } from './constants';

/**
 * 上传配置文件流程参数
 */
export interface UploadConfigFileParams {
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
    
    /**
     * 配置文件类型
     */
    configType: 'prepublish' | 'production';
}

/**
 * 上传配置文件流程
 */
export class UploadConfigFileFlow extends BaseProcessFlow {
    private onFinishedCallback: ((method: FinishMethod, message?: string) => void) | null = null;
    private canceled: boolean = false;
    private client: Client | null = null;
    private sftpConfig: UploadConfigFileParams['sftpConfig'] | null = null;
    
    constructor() {
        super('上传配置文件', '将Bundle版本配置文件上传到远程服务器');
    }
    
    /**
     * 启动流程
     * @param params 上传参数
     */
    async start(params: UploadConfigFileParams): Promise<void> {
        if (this.isRunning) {
            console.warn('上传配置文件流程已在运行');
            return;
        }
        
        this.isRunning = true;
        this.canceled = false;
        this.sftpConfig = params.sftpConfig;
        
        this.updateProgress(0, '准备上传配置文件');
        
        try {
            const { projectPath, sftpConfig, environment, configType } = params;
            
            // 确定本地配置文件路径
            const fileName = configType === 'prepublish' ? 'bundle_versions_prepublish.json' : 'bundle_versions.json';
            const localConfigPath = join(projectPath, 'publish-remote-bundle', fileName);
            
            // 检查本地配置文件是否存在
            if (!existsSync(localConfigPath)) {
                throw new Error(`本地配置文件不存在: ${localConfigPath}`);
            }
            
            this.updateProgress(10, '连接到服务器');
            
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
            
            this.updateProgress(30, '服务器连接成功');
            
            // 确定远程路径
            const env = environment.toLowerCase() === 'development' ? ENVIRONMENT_FOLDER_NAMES.development : ENVIRONMENT_FOLDER_NAMES.production;
            const remotePath = join(sftpConfig.remotePath, env).replace(/\\/g, '/');
            
            this.updateProgress(50, `目标路径: ${remotePath}`);
            
            // 确保远程目录存在
            try {
                await this.client.mkdir(remotePath, true);
                console.log(`远程目录已确保存在: ${remotePath}`);
            } catch (error) {
                console.warn(`创建远程目录失败，可能已存在: ${remotePath}`);
            }
            
            // 上传配置文件
            const remoteConfigPath = `${remotePath}/${fileName}`;
            this.updateProgress(70, `上传配置文件: ${fileName}`);
            
            await this.client.put(localConfigPath, remoteConfigPath);
            
            this.updateProgress(90, '验证上传结果');
            
            // 验证上传结果
            try {
                const remoteFile = await this.client.stat(remoteConfigPath);
                if (remoteFile) {
                    const localStats = readFileSync(localConfigPath);
                    console.log(`配置文件上传成功: ${fileName}`);
                    console.log(`本地文件大小: ${localStats.length} 字节`);
                    console.log(`远程文件大小: ${remoteFile.size} 字节`);
                }
            } catch (error) {
                console.warn('无法验证远程文件，但上传过程已完成');
            }
            
            this.updateProgress(100, '配置文件上传完成');
            this.handleFinish(FinishMethod.SUCCESS, `配置文件 ${fileName} 已成功上传到服务器`);
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
                    const client = this.client;
                    this.client = null; // 先置空引用，避免重复操作
                    
                    await new Promise<void>((resolve) => {
                        const timeout = setTimeout(() => {
                            console.warn('关闭连接超时，强制结束');
                            resolve();
                        }, 5000);
                        
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
        console.log('正在取消配置文件上传...');
        
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
     * 处理流程完成
     */
    protected handleFinish(method: FinishMethod, message?: string): void {
        this.isRunning = false;
        
        // 记录完成状态
        console.log(`上传配置文件${method === FinishMethod.SUCCESS ? '成功' : '失败'}: ${message || ''}`);
        
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
} 
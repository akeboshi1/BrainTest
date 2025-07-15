import { BaseProcessFlow } from './baseFlow';
import { FinishMethod } from './interfaces';
import { readFileSync, writeFileSync, existsSync } from 'fs-extra';
import { join } from 'path';

/**
 * 发布设置流程参数
 */
export interface PublishSettingParams {
    /**
     * 项目路径
     */
    projectPath: string;
    
    /**
     * 发布类型
     */
    publishType: string;
    
    /**
     * 是否MCI
     */
    isMCI?: boolean;
    
    /**
     * 发布环境
     */
    environment?: string;
    
    /**
     * 应用版本号
     */
    appVersion?: string;
}

/**
 * 发布设置流程 - 负责修改publishSetting.json
 */
export class PublishSettingFlow extends BaseProcessFlow {
    private onFinishedCallback: ((method: FinishMethod, message?: string) => void) | null = null;
    
    constructor() {
        super('修改发布设置', '修改publishSetting.json配置文件');
    }
    
    /**
     * 启动流程
     * @param params 发布设置参数
     */
    async start(params: PublishSettingParams): Promise<void> {
        if (this.isRunning) {
            console.warn('发布设置流程已经在运行中');
            return;
        }
        
        this.isRunning = true;
        this.updateProgress(0, '开始修改发布设置');
        
        try {
            const { projectPath, publishType, isMCI, environment, appVersion } = params;
            
            // 检查参数
            if (!projectPath || !publishType) {
                throw new Error('缺少必要的参数');
            }
            
            const publishSettingPath = join(projectPath, 'assets', 'app', 'publishSetting.json');
            
            this.updateProgress(20, '读取发布设置文件');
            
            // 读取现有的设置文件
            let publishSetting: Record<string, any> = {};
            
            if (existsSync(publishSettingPath)) {
                try {
                    const content = readFileSync(publishSettingPath, 'utf-8');
                    publishSetting = JSON.parse(content);
                } catch (error) {
                    console.error('解析发布设置文件失败:', error);
                    this.updateProgress(30, '发布设置文件解析失败，将创建新文件');
                }
            } else {
                this.updateProgress(30, '发布设置文件不存在，将创建新文件');
            }
            
            this.updateProgress(40, '更新发布设置');
            
            // 根据发布类型设置isRemoteBundle
            if (publishType === 'android-apk-full-package.json') {
                publishSetting.isRemoteBundle = false;
            } else {
                publishSetting.isRemoteBundle = true;
            }
            
            // 更新其他设置
            if (isMCI !== undefined) {
                publishSetting.isMCI = isMCI;
            }
            
            if (environment) {
                publishSetting.environment = environment;
            }
            
            if (appVersion) {
                publishSetting.app_version = appVersion;
            }
            
            this.updateProgress(60, '保存发布设置文件');
            
            // 保存设置文件
            try {
                writeFileSync(publishSettingPath, JSON.stringify(publishSetting, null, 2), 'utf-8');
                this.updateProgress(90, '发布设置文件保存成功');
            } catch (error) {
                console.error('保存发布设置文件失败:', error);
                throw new Error(`保存发布设置文件失败: ${error instanceof Error ? error.message : String(error)}`);
            }
            
            this.updateProgress(100, '发布设置修改完成');
            this.handleFinish(FinishMethod.SUCCESS, '发布设置修改成功');
        } catch (error) {
            console.error('修改发布设置失败:', error);
            this.handleFinish(FinishMethod.FAILURE, `修改发布设置失败: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * 设置完成回调
     * @param callback 回调函数
     */
    setFinishedCallback(callback: (method: FinishMethod, message?: string) => void): void {
        this.onFinishedCallback = callback;
    }
    
    /**
     * 完成回调
     * @param method 完成方法
     * @param message 消息
     */
    onFinished(method: FinishMethod, message?: string): void {
        if (this.onFinishedCallback) {
            this.onFinishedCallback(method, message);
        }
        this.isRunning = false;
        console.log(`发布设置流程${method === FinishMethod.SUCCESS ? '成功' : '失败'}: ${message || ''}`);
    }
    
    /**
     * 取消流程
     */
    cancel(): void {
        if (!this.isRunning) {
            return;
        }
        
        this.isRunning = false;
        this.handleFinish(FinishMethod.FAILURE, '发布设置流程已取消');
    }
    
    /**
     * 处理流程完成
     * @param method 完成方法
     * @param message 消息
     */
    protected handleFinish(method: FinishMethod, message?: string): void {
        this.isRunning = false;
        this.onFinished(method, message);
    }
} 
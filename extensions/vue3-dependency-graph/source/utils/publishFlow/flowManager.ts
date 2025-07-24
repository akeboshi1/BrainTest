import { ProcessFlow, PublishProgress, FinishMethod } from './interfaces';
import { CocosBuilderFlow, CocosBuilderParams } from './cocosBuilderFlow';
import { PublishSettingFlow, PublishSettingParams } from './publishSettingFlow';
import { BundleVersionsUpdateFlow, BundleVersionsUpdateParams } from './bundleVersionsUpdateFlow';
import { GenerateBundleVersionFlow, GenerateBundleVersionParams } from './generateBundleVersionFlow';
import { PublishBundleToServerFlow, PublishBundleToServerParams } from './publishBundleToServerFlow';
import { BundleVersionsPushFlow, BundleVersionsPushParams } from './bundleVersionsPushFlow';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs-extra';

// 定义发布配置类型
export enum PublishConfigType {
    FULL_PACKAGE = 'android-apk-full-package.json',
    REMOTE_STARTUP = 'android-apk-remote.json',
    REMOTE_BUNDLES = 'android-bundle-remote.json'
}

/**
 * 流程管理器配置
 */
export interface FlowManagerConfig {
    /**
     * 发布引擎路径
     */
    enginePath?: string;
    
    /**
     * 项目路径
     */
    projectPath: string;
    
    /**
     * 进度回调
     */
    onProgressUpdate?: (flowName: string, progress: number, message?: string) => void;
    
    /**
     * 流程完成回调
     */
    onFlowComplete?: (flowName: string, isSuccess: boolean, message?: string) => void;
}

/**
 * 流程类型定义
 */
export enum FlowType {
    PUBLISH_SETTING = '修改发布设置',
    BUNDLE_UPDATE = '更新Bundle版本库',
    COCOS_BUILD = 'Cocos Creator 发布',
    GENERATE_BUNDLE_VERSION = '生成Bundle版本',
    PUBLISH_TO_SERVER = '发布Bundle到服务器',
    PUSH_VERSION = '提交Bundle版本'
}

/**
 * 流程与页签关系配置
 */
export const FLOW_CONFIG: Record<PublishConfigType, FlowType[]> = {
    [PublishConfigType.FULL_PACKAGE]: [
        FlowType.PUBLISH_SETTING,
        FlowType.COCOS_BUILD
    ],
    [PublishConfigType.REMOTE_STARTUP]: [
        FlowType.PUBLISH_SETTING,
        FlowType.COCOS_BUILD
    ],
    [PublishConfigType.REMOTE_BUNDLES]: [
        FlowType.PUBLISH_SETTING,
        FlowType.BUNDLE_UPDATE,
        FlowType.COCOS_BUILD,
        FlowType.GENERATE_BUNDLE_VERSION,
        FlowType.PUBLISH_TO_SERVER,
        FlowType.PUSH_VERSION
    ]
};

/**
 * 流程管理器
 */
export class FlowManager {
    private readonly flows: Map<string, ProcessFlow> = new Map();
    public readonly config: FlowManagerConfig;
    /**
     * 缓存上次生成bundle版本时变更的bundle
     */
    public lastChangedBundles: string[] = [];
    
    constructor(config: FlowManagerConfig) {
        this.config = config;
    }
    
    /**
     * 获取发布流程
     */
    getPublishFlow(configType: string): ProcessFlow {
        const flowId = `publish-${configType}`;
        
        if (!this.flows.has(flowId)) {
            // 创建新的发布流程
            const flow = new CocosBuilderFlow();
            
            // 设置进度回调
            if (this.config.onProgressUpdate) {
                flow.setProgressCallback((progress, message) => {
                    if (this.config.onProgressUpdate) {
                        this.config.onProgressUpdate(FlowType.COCOS_BUILD, progress, message);
                    }
                });
            }
            
            // 设置完成回调
            if (this.config.onFlowComplete) {
                flow.setFinishedCallback((method, message) => {
                    if (this.config.onFlowComplete) {
                        this.config.onFlowComplete(
                            FlowType.COCOS_BUILD, 
                            method === FinishMethod.SUCCESS,
                            message
                        );
                    }
                });
            }
            
            this.flows.set(flowId, flow);
        }
        
        return this.flows.get(flowId)!;
    }
    
    /**
     * 获取发布设置流程
     */
    getPublishSettingFlow(): ProcessFlow {
        const flowId = 'publish-setting';
        
        if (!this.flows.has(flowId)) {
            // 创建新的发布设置流程
            const flow = new PublishSettingFlow();
            
            // 设置进度回调
            if (this.config.onProgressUpdate) {
                flow.setProgressCallback((progress, message) => {
                    if (this.config.onProgressUpdate) {
                        this.config.onProgressUpdate(FlowType.PUBLISH_SETTING, progress, message);
                    }
                });
            }
            
            // 设置完成回调
            if (this.config.onFlowComplete) {
                flow.setFinishedCallback((method, message) => {
                    if (this.config.onFlowComplete) {
                        this.config.onFlowComplete(
                            FlowType.PUBLISH_SETTING, 
                            method === FinishMethod.SUCCESS,
                            message
                        );
                    }
                });
            }
            
            this.flows.set(flowId, flow);
        }
        
        return this.flows.get(flowId)!;
    }
    
    /**
     * 获取Bundle版本更新流程
     */
    getBundleVersionsUpdateFlow(): ProcessFlow {
        const flowId = 'bundle-versions-update';
        
        if (!this.flows.has(flowId)) {
            // 创建新的Bundle版本更新流程
            const flow = new BundleVersionsUpdateFlow();
            
            // 设置进度回调
            if (this.config.onProgressUpdate) {
                flow.setProgressCallback((progress, message) => {
                    if (this.config.onProgressUpdate) {
                        this.config.onProgressUpdate(FlowType.BUNDLE_UPDATE, progress, message);
                    }
                });
            }
            
            // 设置完成回调
            if (this.config.onFlowComplete) {
                flow.setFinishedCallback((method, message) => {
                    if (this.config.onFlowComplete) {
                        this.config.onFlowComplete(
                            FlowType.BUNDLE_UPDATE, 
                            method === FinishMethod.SUCCESS,
                            message
                        );
                    }
                });
            }
            
            this.flows.set(flowId, flow);
        }
        
        return this.flows.get(flowId)!;
    }
    
    /**
     * 获取生成Bundle版本流程
     */
    getGenerateBundleVersionFlow(): ProcessFlow {
        const flowId = 'generate-bundle-version';
        
        if (!this.flows.has(flowId)) {
            // 创建新的生成Bundle版本流程
            const flow = new GenerateBundleVersionFlow();
            
            // 设置进度回调
            if (this.config.onProgressUpdate) {
                flow.setProgressCallback((progress, message) => {
                    if (this.config.onProgressUpdate) {
                        this.config.onProgressUpdate(FlowType.GENERATE_BUNDLE_VERSION, progress, message);
                    }
                });
            }
            
            // 设置完成回调
            if (this.config.onFlowComplete) {
                flow.setFinishedCallback((method, message, changedBundles) => {
                    this.lastChangedBundles = changedBundles || [];
                    if (this.config.onFlowComplete) {
                        this.config.onFlowComplete(
                            FlowType.GENERATE_BUNDLE_VERSION, 
                            method === FinishMethod.SUCCESS,
                            message
                        );
                    }
                });
            }
            
            this.flows.set(flowId, flow);
        }
        
        return this.flows.get(flowId)!;
    }
    
    /**
     * 获取发布Bundle到服务器流程
     */
    getPublishBundleToServerFlow(): ProcessFlow {
        const flowId = 'publish-bundle-to-server';
        
        if (!this.flows.has(flowId)) {
            // 创建新的发布Bundle到服务器流程
            const flow = new PublishBundleToServerFlow();
            
            // 设置进度回调
            if (this.config.onProgressUpdate) {
                flow.setProgressCallback((progress, message) => {
                    if (this.config.onProgressUpdate) {
                        this.config.onProgressUpdate(FlowType.PUBLISH_TO_SERVER, progress, message);
                    }
                });
            }
            
            // 设置完成回调
            if (this.config.onFlowComplete) {
                flow.setFinishedCallback((method, message) => {
                    if (this.config.onFlowComplete) {
                        this.config.onFlowComplete(
                            FlowType.PUBLISH_TO_SERVER, 
                            method === FinishMethod.SUCCESS,
                            message
                        );
                    }
                });
            }
            
            this.flows.set(flowId, flow);
        }
        
        return this.flows.get(flowId)!;
    }
    
    /**
     * 获取Bundle版本推送流程
     */
    getBundleVersionsPushFlow(): ProcessFlow {
        const flowId = 'bundle-versions-push';
        
        if (!this.flows.has(flowId)) {
            // 创建新的Bundle版本推送流程
            const flow = new BundleVersionsPushFlow();
            
            // 设置进度回调
            if (this.config.onProgressUpdate) {
                flow.setProgressCallback((progress, message) => {
                    if (this.config.onProgressUpdate) {
                        this.config.onProgressUpdate(FlowType.PUSH_VERSION, progress, message);
                    }
                });
            }
            
            // 设置完成回调
            if (this.config.onFlowComplete) {
                flow.setFinishedCallback((method, message) => {
                    if (this.config.onFlowComplete) {
                        this.config.onFlowComplete(
                            FlowType.PUSH_VERSION, 
                            method === FinishMethod.SUCCESS,
                            message
                        );
                    }
                });
            }
            
            this.flows.set(flowId, flow);
        }
        
        return this.flows.get(flowId)!;
    }
    
    /**
     * 初始化流程进度列表
     * @param configType 配置类型
     */
    initializeProgressList(configType: PublishConfigType | string): void {
        if (!this.config.onProgressUpdate) return;
        
        // 确保配置类型是有效的
        const publishType = configType as PublishConfigType;
        
        // 获取对应配置类型的流程列表
        const flows = FLOW_CONFIG[publishType] || FLOW_CONFIG[PublishConfigType.FULL_PACKAGE];
        
        // 初始化每个流程的进度显示
        for (const flowType of flows) {
            this.config.onProgressUpdate(flowType, 0, '准备开始');
        }
    }
    
    /**
     * 更新发布设置
     * @param publishType 发布类型
     * @param isMCI 是否MCI
     * @param environment 环境
     * @param appVersion 应用版本号
     */
    async updatePublishSetting(
        publishType: string,
        isMCI?: boolean,
        environment?: string,
        appVersion?: string
    ): Promise<boolean> {
        try {
            const flow = this.getPublishSettingFlow() as PublishSettingFlow;
            
            // 开始更新发布设置
            const params: PublishSettingParams = {
                projectPath: this.config.projectPath,
                publishType,
                isMCI,
                environment,
                appVersion
            };
            
            await flow.start(params);
            return true;
        } catch (error) {
            console.error(`更新发布设置失败 [${publishType}]:`, error);
            return false;
        }
    }
    
    /**
     * 开始发布流程
     * @param configType 配置类型
     * @param configPath 配置文件路径
     * @param debug 是否调试模式
     * @param extraArgs 额外参数
     */
    async startPublish(
        configType: string, 
        configPath: string, 
        debug: boolean = false,
        extraArgs: string[] = []
    ): Promise<boolean> {
        try {
            const flow = this.getPublishFlow(configType) as CocosBuilderFlow;
            
            // 开始发布
            const params: CocosBuilderParams = {
                enginePath: this.config.enginePath || "C:/ProgramData/cocos/editors/Creator/3.8.3",
                projectPath: this.config.projectPath,
                configPath,
                debug,
                extraArgs
            };
            
            await flow.start(params);
            return true;
        } catch (error) {
            console.error(`启动发布流程失败 [${configType}]:`, error);
            return false;
        }
    }
    
    /**
     * 启动远程Bundle版本更新流程
     */
    async startBundleVersionsUpdate(): Promise<boolean> {
        try {
            const flow = this.getBundleVersionsUpdateFlow() as BundleVersionsUpdateFlow;
            
            const params: BundleVersionsUpdateParams = {
                projectPath: this.config.projectPath
            };
            
            await flow.start(params);
            return true;
        } catch (error) {
            console.error('启动Bundle版本更新流程失败:', error);
            return false;
        }
    }
    
    /**
     * 启动生成Bundle版本流程
     */
    async startGenerateBundleVersion(): Promise<boolean> {
        try {
            const flow = this.getGenerateBundleVersionFlow() as GenerateBundleVersionFlow;
            
            const params: GenerateBundleVersionParams = {
                projectPath: this.config.projectPath,
                targetPath: join(this.config.projectPath, 'build/android/remote')
            };
            
            await flow.start(params);
            return true;
        } catch (error) {
            console.error('启动生成Bundle版本流程失败:', error);
            return false;
        }
    }
    
    /**
     * 启动发布Bundle到服务器流程
     * @param environment 环境设置
     */
    async startPublishBundleToServer(environment: string): Promise<boolean> {
        try {
            const flow = this.getPublishBundleToServerFlow() as PublishBundleToServerFlow;
            
            // 转换环境设置为正确的类型
            const env = environment.toUpperCase() === 'PRODUCTION' ? 'production' : 'development';
            
            // 加载SFTP配置
            let sftpConfig = {
                host: '远程服务器IP',
                port: 22,
                username: '用户名',
                password: '密码',
                remotePath: '/path/to/remote/directory'
            };
            
            // 尝试从配置文件加载SFTP配置
            try {
                const configPath = join(this.config.projectPath, 'sftp-config.json');
                if (existsSync(configPath)) {
                    const configData = JSON.parse(readFileSync(configPath, 'utf-8'));
                    sftpConfig = configData;
                } else {
                    console.warn('SFTP配置文件不存在，使用默认配置');
                }
            } catch (error) {
                console.error('读取SFTP配置失败:', error);
            }
            
            const params: PublishBundleToServerParams = {
                projectPath: this.config.projectPath,
                changeBundleList: this.lastChangedBundles,
                environment: env,
                sftpConfig: sftpConfig
            };
            
            await flow.start(params);
            return true;
        } catch (error) {
            console.error('启动发布Bundle到服务器流程失败:', error);
            return false;
        }
    }
    
    /**
     * 启动Bundle版本推送流程
     * @param commitMessage 提交信息
     */
    async startBundleVersionsPush(commitMessage?: string): Promise<boolean> {
        try {
            const flow = this.getBundleVersionsPushFlow() as BundleVersionsPushFlow;
            
            const params: BundleVersionsPushParams = {
                projectPath: this.config.projectPath,
                commitMessage
            };
            
            await flow.start(params);
            return true;
        } catch (error) {
            console.error('启动Bundle版本推送流程失败:', error);
            return false;
        }
    }
    
    /**
     * 执行完整发布流程（包括更新设置和发布）
     * @param configType 配置类型
     * @param configPath 配置文件路径
     * @param isMCI 是否MCI
     * @param environment 环境
     * @param appVersion 应用版本号
     * @param debug 是否调试模式
     */
    async executeFullPublishProcess(
        configType: string,
        configPath: string,
        isMCI?: boolean,
        environment?: string,
        appVersion?: string,
        debug: boolean = false
    ): Promise<boolean> {
        const startTime = Date.now();
        console.log(`[流程耗时] 开始执行完整发布流程: ${configType}`);
        
        try {
            // 初始化进度列表，添加所需的流程
            this.initializeProgressList(configType as PublishConfigType);
            
            // 取消所有正在运行的流程，确保干净的开始
            this.cancelAllFlows();
            
            console.log(`开始执行 ${configType} 的发布流程，串行执行各子流程`);
            
            // 根据不同的发布类型执行不同的流程
            if (configType === PublishConfigType.REMOTE_BUNDLES) {
                // REMOTE_BUNDLES 需要执行完整的六步流程，必须严格串行
                
                // 1. 更新发布设置
                const step1Start = Date.now();
                console.log('步骤1: 修改发布设置');
                const settingSuccess = await this.updatePublishSetting(
                    configType,
                    isMCI,
                    environment,
                    appVersion
                );
                const step1End = Date.now();
                console.log(`[流程耗时] 步骤1(修改发布设置) 耗时: ${step1End - step1Start}ms`);
                
                if (!settingSuccess) {
                    console.error('步骤1失败: 无法更新发布设置，发布过程终止');
                    return false;
                }
                
                // 2. 从Git更新Bundle版本信息
                const step2Start = Date.now();
                console.log('步骤2: 从Git更新Bundle版本信息');
                // 临时关闭Bundle版本更新步骤
                // const updateSuccess = await this.startBundleVersionsUpdate();
                // if (!updateSuccess) {
                //     console.error('步骤2失败: 无法更新Bundle版本，发布过程终止');
                //     return false;
                // }
                console.log('步骤2: Bundle版本更新步骤已临时关闭');
                const step2End = Date.now();
                console.log(`[流程耗时] 步骤2(更新Bundle版本信息) 耗时: ${step2End - step2Start}ms`);
                
                // 3. 执行Cocos发布
                const step3Start = Date.now();
                console.log('步骤3: 执行Cocos Creator发布');
                const publishSuccess = await this.startPublish(
                    configType,
                    configPath,
                    debug
                );
                const step3End = Date.now();
                console.log(`[流程耗时] 步骤3(Cocos Creator发布) 耗时: ${step3End - step3Start}ms`);
                
                if (!publishSuccess) {
                    console.error('步骤3失败: Cocos发布失败，发布过程终止');
                    return false;
                }
                
                // 4. 生成Bundle版本文件
                const step4Start = Date.now();
                console.log('步骤4: 生成Bundle版本文件');
                const generateSuccess = await this.startGenerateBundleVersion();
                const step4End = Date.now();
                console.log(`[流程耗时] 步骤4(生成Bundle版本文件) 耗时: ${step4End - step4Start}ms`);
                if (!generateSuccess) {
                    console.error('步骤4失败: 生成Bundle版本失败，发布过程终止');
                    return false;
                }
                
                // 5. 发布Bundle到服务器
                const step5Start = Date.now();
                console.log('步骤5: 发布Bundle到服务器');
                //const publishToServerSuccess = false;
                const publishToServerSuccess = await this.startPublishBundleToServer(
                    environment || 'DEVELOPMENT'
                );
                const step5End = Date.now();
                console.log(`[流程耗时] 步骤5(发布Bundle到服务器) 耗时: ${step5End - step5Start}ms`);
                
                if (!publishToServerSuccess) {
                    console.error('步骤5失败: 发布Bundle到服务器失败，发布过程终止');
                    return false;
                }
                
                // 6. 提交Bundle版本到Git
                const step6Start = Date.now();
                console.log('步骤6: 提交Bundle版本到Git');
                // 临时关闭Bundle版本推送步骤
                // const pushSuccess = await this.startBundleVersionsPush(
                //     `更新Bundle版本 [${environment}] v${appVersion}`
                // );
                
                // if (!pushSuccess) {
                //     console.error('步骤6失败: 提交Bundle版本失败，发布过程终止');
                //     return false;
                // }
                console.log('步骤6: Bundle版本推送步骤已临时关闭');
                const step6End = Date.now();
                console.log(`[流程耗时] 步骤6(提交Bundle版本到Git) 耗时: ${step6End - step6Start}ms`);
                
                const totalEnd = Date.now();
                console.log(`[流程耗时] 所有流程执行完成，REMOTE_BUNDLES发布成功，总耗时: ${totalEnd - startTime}ms`);
                return true;
            } else {
                // 其他发布类型(FULL_PACKAGE, REMOTE_STARTUP)只执行基本流程
                
                // 1. 更新发布设置
                const step1Start = Date.now();
                console.log('步骤1: 修改发布设置');
                const settingSuccess = await this.updatePublishSetting(
                    configType,
                    isMCI,
                    environment,
                    appVersion
                );
                const step1End = Date.now();
                console.log(`[流程耗时] 步骤1(修改发布设置) 耗时: ${step1End - step1Start}ms`);
                
                if (!settingSuccess) {
                    console.error('步骤1失败: 无法更新发布设置，发布过程终止');
                    return false;
                }
                
                // 2. 执行Cocos发布
                const step2Start = Date.now();
                console.log('步骤2: 执行Cocos Creator发布');
                const publishSuccess = await this.startPublish(
                    configType,
                    configPath,
                    debug
                );
                const step2End = Date.now();
                console.log(`[流程耗时] 步骤2(Cocos Creator发布) 耗时: ${step2End - step2Start}ms`);
                
                if (!publishSuccess) {
                    console.error('步骤2失败: Cocos发布失败，发布过程终止');
                    return false;
                }
                
                const totalEnd = Date.now();
                console.log(`[流程耗时] 所有流程执行完成，${configType}发布成功，总耗时: ${totalEnd - startTime}ms`);
                return true;
            }
        } catch (error) {
            const errorEnd = Date.now();
            console.error(`[流程耗时] 执行完整发布流程失败 [${configType}]: 耗时 ${errorEnd - startTime}ms`, error);
            // 发生异常时，取消所有正在运行的流程
            this.cancelAllFlows();
            return false;
        }
    }
    
    /**
     * 取消发布流程
     * @param configType 配置类型
     */
    cancelPublish(configType: string): boolean {
        const flowId = `publish-${configType}`;
        const flow = this.flows.get(flowId);
        
        if (flow && flow.isRunning) {
            flow.cancel();
            return true;
        }
        
        return false;
    }
    
    /**
     * 获取所有活动的流程
     */
    getActiveFlows(): ProcessFlow[] {
        return Array.from(this.flows.values()).filter(flow => flow.isRunning);
    }
    
    /**
     * 取消所有活动的流程
     */
    cancelAllFlows(): void {
        const activeFlows = this.getActiveFlows();
        if (activeFlows.length > 0) {
            console.log(`正在取消 ${activeFlows.length} 个活动流程`);
            for (const flow of activeFlows) {
                try {
                    flow.cancel();
                    console.log(`已取消流程: ${flow.name}`);
                } catch (error) {
                    console.error(`取消流程 ${flow.name} 时出错:`, error);
                }
            }
        }
    }
} 
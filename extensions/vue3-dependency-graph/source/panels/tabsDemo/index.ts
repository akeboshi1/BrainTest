import { readFileSync, readdirSync, existsSync } from 'fs-extra';
import { join } from 'path';
import { createApp, type App } from 'vue';
import { PublishProgress } from '../../utils/publishFlow/interfaces';
import { FlowManager, PublishConfigType, FlowType, FLOW_CONFIG } from '../../utils/publishFlow/flowManager';

const panelDataMap = new WeakMap<any, App>();

// 发布环境枚举
enum PublishEnvironment {
    DEVELOPMENT = 'DEVELOPMENT',
    PRODUCTION = 'PRODUCTION'
}

// 发布环境标题映射
const PublishEnvironmentTitle: Record<string, string> = {
    [PublishEnvironment.DEVELOPMENT]: '开发环境',
    [PublishEnvironment.PRODUCTION]: '线上环境'
};

// 发布配置标题映射
const PublishConfigTitle: Record<string, string> = {
    [PublishConfigType.FULL_PACKAGE]: '全量发布',
    [PublishConfigType.REMOTE_STARTUP]: '远程启动包发布',
    [PublishConfigType.REMOTE_BUNDLES]: '远程bundles发布'
};

// 定义组件类型
interface MyComponent {
    activeTab: PublishConfigType;
    tabs: Array<{
        id: PublishConfigType;
        name: string;
    }>;
    configDir: string;
    currentConfigPath: string;
    publishStatus: 'idle' | 'publishing' | 'success' | 'failed' | 'canceled';
    publishStatusText: Record<string, string>;
    publishProgressList: PublishProgress[];
    configSettings: Record<PublishConfigType, Record<string, any>>;
    flowManager: FlowManager;
    publishSettingPath: string;
    publishSettings: {
        isMCI: boolean;
        environment: PublishEnvironment;
        app_version: string;
        isFullUpload: boolean;
    };
    lastChangedBundles: string[];
    switchTab(tabId: PublishConfigType): void;
    getConfigPath(configFile: string): string;
    startPublish(): Promise<void>;
    updateProgress(flowName: string, progress: number, message?: string): void;
    finishFlow(flowName: string, isSuccess: boolean, message?: string): void;
    resetPublish(): void;
    cancelPublish(): void;
    loadPublishSettings(): void;
    savePublishSettings(): Promise<boolean>;
    showSettingItem(tabId: PublishConfigType, setting: string): boolean;
    initializeProgressList(): void;
}

module.exports = Editor.Panel.define({
    listeners: {
        show: () => console.log('show'),
        hide: () => console.log('hide'),
    },
    template: readFileSync(join(__dirname, '../../../static/template/tabsDemo/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/tabsDemo/index.css'), 'utf-8'),
    $: { app: '#app' },

    ready() {
        if (this.$.app) {
            // 组件定义
            const MyComponent = {
                template: `
                    <div class="container">
                        <h2>发布流程</h2>
                        
                        <!-- 标签页导航 -->
                        <div class="tabs-nav">
                            <div v-for="tab in tabs" 
                                :key="tab.id" 
                                class="tab-item"
                                :class="{ active: activeTab === tab.id, disabled: publishStatus === 'publishing' }"
                                @click="switchTab(tab.id)">
                                {{ tab.name }}
                            </div>
                        </div>
                        
                        <!-- 标签页内容区域 -->
                        <div class="tab-content">
                            <div v-for="tab in tabs" 
                                :key="tab.id" 
                                class="tab-pane"
                                :class="{ active: activeTab === tab.id }">
                                <!-- 配置信息 -->
                                <div class="config-info">
                                    <p>当前选择的配置文件：{{ tab.id }}</p>
                                    <p>配置文件路径：{{ getConfigPath(tab.id) }}</p>
                                </div>
                                
                                <!-- 发布设置面板 -->
                                <div class="publish-settings">
                                    <h3>发布设置</h3>
                                    
                                    <div class="settings-panel">
                                        <!-- MCI开关 -->
                                        <div class="setting-item" v-if="showSettingItem(tab.id, 'isMCI')">
                                            <label>
                                                <input type="checkbox" v-model="publishSettings.isMCI">
                                                开启MCI
                                            </label>
                                        </div>
                                        
                                        <!-- 全量上传 -->
                                        <div class="setting-item" v-if="showSettingItem(tab.id, 'isFullUpload')">
                                            <label>
                                                <input type="checkbox" v-model="publishSettings.isFullUpload">
                                                全量上传
                                            </label>
                                        </div>
                                        
                                        <!-- 发布环境 -->
                                        <div class="setting-item" v-if="showSettingItem(tab.id, 'environment')">
                                            <label>发布环境：</label>
                                            <select v-model="publishSettings.environment">
                                                <option v-for="(title, env) in PublishEnvironmentTitle" :key="env" :value="env">
                                                    {{ title }}
                                                </option>
                                            </select>
                                        </div>
                                        
                                        <!-- 版本号 -->
                                        <div class="setting-item" v-if="showSettingItem(tab.id, 'app_version')">
                                            <label>应用版本号：</label>
                                            <input type="text" v-model="publishSettings.app_version">
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 发布按钮 -->
                                <div class="publish-actions">
                                    <button @click="startPublish" 
                                            :disabled="publishStatus === 'publishing'" 
                                            class="publish-btn"
                                            :class="{ 'btn-disabled': publishStatus === 'publishing' }">
                                        {{ publishStatus === 'publishing' ? '发布中...' : '开始发布' }}
                                    </button>
                                    <button @click="cancelPublish" 
                                            :disabled="publishStatus !== 'publishing'" 
                                            class="cancel-btn"
                                            :class="{ 'btn-disabled': publishStatus !== 'publishing' }">
                                        取消发布
                                    </button>
                                    <button @click="resetPublish" 
                                            :disabled="publishStatus === 'publishing' || publishStatus === 'idle'" 
                                            class="reset-btn"
                                            :class="{ 'btn-disabled': publishStatus === 'publishing' || publishStatus === 'idle' }">
                                        重置状态
                                    </button>
                                    <div class="publish-status" :class="publishStatus">
                                        {{ publishStatusText[publishStatus] }}
                                    </div>
                                </div>
                                
                                <!-- 发布进度面板 -->
                                <div class="publish-progress-panel" v-if="publishProgressList.length > 0">
                                    <h3>发布进度</h3>
                                    <div class="progress-items">
                                        <div v-for="(item, index) in publishProgressList" 
                                             :key="index" 
                                             class="progress-item"
                                             :class="item.status">
                                            <div class="progress-info">
                                                <span class="progress-name">{{ item.flowName }}</span>
                                                <span class="progress-message" v-if="item.message">{{ item.message }}</span>
                                            </div>
                                            <div class="progress-bar-container">
                                                <div class="progress-bar" :style="{ width: item.progress + '%' }"></div>
                                                <span class="progress-percent">{{ item.progress.toFixed(1) }}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- 变更Bundle信息窗口（调试日志见控制台） -->
                    <div class="changed-bundles-info" style="margin-top: 24px; padding: 12px; border: 1px solid #e0e0e0; background: #fafbfc; border-radius: 6px;">
                        <h4 style="margin: 0 0 8px 0;">本次发布变更的 Bundle：</h4>
                        <div v-if="lastChangedBundles.length > 0">
                            <ul style="margin: 0; padding-left: 20px;">
                                <li v-for="name in lastChangedBundles" :key="name">{{ name }}</li>
                            </ul>
                        </div>
                        <div v-else style="color: #888;">无变更</div>
                    </div>
                `,
                data: () => ({
                    PublishEnvironment,
                    PublishEnvironmentTitle,
                    activeTab: PublishConfigType.FULL_PACKAGE,
                    configDir: Editor.Project.path + "/buildConfigs",
                    currentConfigPath: '',
                    publishStatus: 'idle' as 'idle' | 'publishing' | 'success' | 'failed' | 'canceled',
                    publishStatusText: {
                        idle: '待发布',
                        publishing: '发布中',
                        success: '发布完成',
                        failed: '发布失败',
                        canceled: '已取消'
                    },
                    publishProgressList: [] as PublishProgress[],
                    tabs: [
                        {
                            id: PublishConfigType.FULL_PACKAGE,
                            name: PublishConfigTitle[PublishConfigType.FULL_PACKAGE]
                        },
                        {
                            id: PublishConfigType.REMOTE_STARTUP,
                            name: PublishConfigTitle[PublishConfigType.REMOTE_STARTUP]
                        },
                        {
                            id: PublishConfigType.REMOTE_BUNDLES,
                            name: PublishConfigTitle[PublishConfigType.REMOTE_BUNDLES]
                        }
                    ],
                    configSettings: {
                        [PublishConfigType.FULL_PACKAGE]: {
                            debugMode: false,
                            environment: 'development',
                            version: '1.0.0'
                        },
                        [PublishConfigType.REMOTE_STARTUP]: {
                            updateMainPackage: true,
                            environment: 'development',
                            serverPath: '/remote/startup'
                        },
                        [PublishConfigType.REMOTE_BUNDLES]: {
                            compressBundle: true,
                            generateVersionFile: true,
                            server: 'development'
                        }
                    },
                    flowManager: null as unknown as FlowManager,
                    publishSettingPath: join(Editor.Project.path, 'assets', 'app', 'publishSetting.json'),
                    publishSettings: {
                        isMCI: false,
                        environment: PublishEnvironment.DEVELOPMENT,
                        app_version: '1.0.0',
                        isFullUpload: false
                    },
                    lastChangedBundles: [] as string[]
                }),
                methods: {
                    /**
                     * 切换标签页
                     */
                    switchTab(this: MyComponent, tabId: PublishConfigType) {
                        this.activeTab = tabId;
                        this.currentConfigPath = this.getConfigPath(tabId);
                        console.log(`切换到标签页: ${tabId}, 配置文件路径: ${this.currentConfigPath}`);
                        
                        // 切换标签页时重新加载发布设置
                        this.loadPublishSettings();
                        
                        // 重置发布状态
                        this.resetPublish();
                    },
                    
                    /**
                     * 获取配置文件路径
                     */
                    getConfigPath(this: MyComponent, configFile: string): string {
                        return join(this.configDir, configFile);
                    },
                    
                    /**
                     * 加载发布设置
                     */
                    loadPublishSettings(this: MyComponent) {
                        try {
                            if (existsSync(this.publishSettingPath)) {
                                const content = readFileSync(this.publishSettingPath, 'utf-8');
                                const settings = JSON.parse(content);
                                
                                // 使用读取的设置更新当前设置，处理可能不存在的字段
                                this.publishSettings = {
                                    isMCI: settings.isMCI !== undefined ? settings.isMCI : false,
                                    environment: settings.environment || PublishEnvironment.DEVELOPMENT,
                                    app_version: settings.app_version || '1.0.0',
                                    isFullUpload: settings.isFullUpload !== undefined ? settings.isFullUpload : false
                                };
                                
                                console.log('发布设置已加载:', this.publishSettings);
                            } else {
                                console.warn('发布设置文件不存在，使用默认设置');
                            }
                        } catch (error) {
                            console.error('读取发布设置失败:', error);
                            Editor.Dialog.warn('读取发布设置失败，使用默认设置');
                        }
                    },
                    
                    /**
                     * 初始化进度列表
                     */
                    initializeProgressList(this: MyComponent) {
                        // 清空现有进度列表
                        this.publishProgressList = [];
                        
                        // 根据当前选择的页签类型，创建对应的进度列表
                        const configType = this.activeTab;
                        const flows = FLOW_CONFIG[configType];
                        
                        if (flows) {
                            for (const flowType of flows) {
                                this.publishProgressList.push({
                                    flowName: flowType,
                                    progress: 0,
                                    status: 'idle',
                                    message: '等待开始'
                                });
                            }
                            
                            // 将第一个流程设置为运行状态
                            if (this.publishProgressList.length > 0) {
                                this.publishProgressList[0].status = 'running';
                                this.publishProgressList[0].message = '准备开始';
                            }
                        }
                    },
                    
                    /**
                     * 保存发布设置
                     */
                    async savePublishSettings(this: MyComponent): Promise<boolean> {
                        return await this.flowManager.updatePublishSetting(
                            this.activeTab,
                            this.publishSettings.isMCI,
                            this.publishSettings.environment,
                            this.publishSettings.app_version,
                            this.publishSettings.isFullUpload
                        );
                    },
                    
                    /**
                     * 判断是否显示特定设置项
                     */
                    showSettingItem(this: MyComponent, tabId: PublishConfigType, setting: string): boolean {
                        if (setting === 'environment') {
                            // 所有标签页都显示环境设置
                            return true;
                        }
                        
                        if (setting === 'isFullUpload') {
                            // 只有REMOTE_BUNDLES标签页显示全量上传选项
                            return tabId === PublishConfigType.REMOTE_BUNDLES;
                        }
                        
                        if (tabId === PublishConfigType.REMOTE_BUNDLES) {
                            // REMOTE_BUNDLES只显示环境设置和全量上传
                            return setting === 'environment' || setting === 'isFullUpload';
                        }
                        
                        // FULL_PACKAGE和REMOTE_STARTUP显示所有设置（除了全量上传）
                        return setting !== 'isFullUpload';
                    },
                    
                    /**
                     * 开始发布流程
                     */
                    async startPublish(this: MyComponent) {
                        if (this.publishStatus === 'publishing') return;
                        
                        console.log(`开始发布流程: ${this.activeTab}`);
                        console.log('startPublish 前 lastChangedBundles:', this.lastChangedBundles);
                        this.publishStatus = 'publishing';
                        
                        // 初始化进度列表
                        this.initializeProgressList();
                        
                        const configPath = this.getConfigPath(this.activeTab);
                        const configSettings = this.configSettings[this.activeTab];
                        const useDebugMode = configSettings.debugMode || false;
                        
                        try {
                            // 使用流程管理器执行完整发布流程
                            const success = await this.flowManager.executeFullPublishProcess(
                                this.activeTab,
                                configPath,
                                this.publishSettings.isMCI,
                                this.publishSettings.environment,
                                this.publishSettings.app_version,
                                useDebugMode,
                                this.publishSettings.isFullUpload
                            );
                            
                            console.log('发布流程执行完毕，success:', success);
                            console.log('flowManager.lastChangedBundles:', this.flowManager.lastChangedBundles);
                            if (!success) {
                                this.publishStatus = 'failed';
                                Editor.Dialog.error('执行发布流程失败');
                                this.lastChangedBundles = this.flowManager.lastChangedBundles || [];
                                console.log('发布失败，lastChangedBundles赋值:', this.lastChangedBundles);
                            } else {
                                this.publishStatus = 'success';
                                // 发布成功后，读取变更的bundle
                                this.lastChangedBundles = this.flowManager.lastChangedBundles || [];
                                console.log('发布成功，lastChangedBundles赋值:', this.lastChangedBundles);
                            }
                        } catch (error) {
                            console.error('发布过程中发生错误:', error);
                            this.publishStatus = 'failed';
                            Editor.Dialog.error(`发布失败: ${error instanceof Error ? error.message : String(error)}`);
                            this.lastChangedBundles = this.flowManager.lastChangedBundles || [];
                            console.log('发布异常，lastChangedBundles赋值:', this.lastChangedBundles);
                        }
                        console.log('startPublish 结束 lastChangedBundles:', this.lastChangedBundles);
                    },
                    
                    /**
                     * 更新进度
                     */
                    updateProgress(this: MyComponent, flowName: string, progress: number, message?: string) {
                        const flow = this.publishProgressList.find(item => item.flowName === flowName);
                        if (flow) {
                            flow.progress = progress;
                            if (message) {
                                flow.message = message;
                            }
                            
                            // 如果进度为0且状态为idle，则更新为running
                            if (progress === 0 && flow.status === 'idle') {
                                flow.status = 'running';
                            }
                        }
                    },
                    
                    /**
                     * 完成流程
                     */
                    finishFlow(this: MyComponent, flowName: string, isSuccess: boolean, message?: string) {
                        const flow = this.publishProgressList.find(item => item.flowName === flowName);
                        if (flow) {
                            // 仅当状态不是idle时才更新(避免重置状态时的回调影响)
                            if (flow.status !== 'idle') {
                                flow.progress = 100;
                                flow.status = isSuccess ? 'success' : 'failed';
                                if (message) {
                                    flow.message = message;
                                }
                            }
                            // 日志：流程完成时的lastChangedBundles
                            console.log(`[finishFlow] flowName: ${flowName}, isSuccess: ${isSuccess}, 当前lastChangedBundles:`, this.lastChangedBundles);
                            
                            // 如果有任何流程失败，整个发布状态为失败，并且取消所有后续流程
                            if (!isSuccess && flow.status === 'failed') {
                                this.publishStatus = 'failed';
                                
                                // 将所有未完成的流程标记为已取消
                                const currentIndex = this.publishProgressList.findIndex(item => item.flowName === flowName);
                                for (let i = currentIndex + 1; i < this.publishProgressList.length; i++) {
                                    const nextFlow = this.publishProgressList[i];
                                    if (nextFlow.status === 'idle' || nextFlow.status === 'running') {
                                        nextFlow.status = 'canceled';
                                        nextFlow.message = '已取消 - 前序流程失败';
                                    }
                                }
                                
                                // 显示错误消息
                                Editor.Dialog.error(`发布失败: ${message || '流程执行异常'}`);
                                return;
                            }
                            
                            // 启动下一个流程
                            if (isSuccess) {
                                const currentIndex = this.publishProgressList.findIndex(item => item.flowName === flowName);
                                if (currentIndex >= 0 && currentIndex < this.publishProgressList.length - 1) {
                                    const nextFlow = this.publishProgressList[currentIndex + 1];
                                    if (nextFlow.status === 'idle') {
                                        nextFlow.status = 'running';
                                        nextFlow.message = '正在执行...';
                                        console.log(`开始执行下一个流程: ${nextFlow.flowName}`);
                                    }
                                } else if (currentIndex === this.publishProgressList.length - 1) {
                                    // 最后一个流程完成
                                    this.publishStatus = 'success';
                                    Editor.Dialog.info('所有发布流程已完成');
                                }
                            }
                            
                            // 判断是否所有流程都已完成
                            const allCompleted = this.publishProgressList.every(item => 
                                item.status === 'success' || item.status === 'failed' || item.status === 'canceled'
                            );
                            
                            if (allCompleted) {
                                const allSuccess = this.publishProgressList.every(item => 
                                    item.status === 'success'
                                );
                                
                                this.publishStatus = allSuccess ? 'success' : 'failed';
                            }
                        }
                    },
                    
                    /**
                     * 重置发布状态
                     */
                    resetPublish(this: MyComponent) {
                        this.publishStatus = 'idle';
                        this.publishProgressList = [];
                    },
                    
                    /**
                     * 取消发布
                     */
                    cancelPublish(this: MyComponent) {
                        if (this.publishStatus !== 'publishing') return;
                        
                        try {
                            // 使用流程管理器取消发布
                            this.flowManager.cancelAllFlows();
                            
                            this.publishStatus = 'canceled';
                            
                            // 更新进度条状态
                            this.publishProgressList.forEach(flow => {
                                if (flow.status === 'running') {
                                    flow.status = 'canceled';
                                    flow.message = '用户已取消';
                                } else if (flow.status === 'idle') {
                                    flow.status = 'canceled';
                                    flow.message = '流程已取消';
                                }
                            });
                            
                            Editor.Dialog.info('发布已取消');
                        } catch (error) {
                            console.error('取消发布失败:', error);
                            Editor.Dialog.error(`取消发布失败: ${error instanceof Error ? error.message : String(error)}`);
                        }
                    }
                },
                mounted(this: MyComponent) {
                    console.log('发布流程组件已挂载');
                    this.currentConfigPath = this.getConfigPath(this.activeTab);
                    
                    // 检查配置目录是否存在
                    try {
                        const configFiles = readdirSync(this.configDir);
                        console.log('发现配置文件：', configFiles);
                    } catch (error) {
                        console.warn('配置目录不存在或无法访问:', error);
                    }
                    
                    // 初始化流程管理器
                    this.flowManager = new FlowManager({
                        projectPath: Editor.Project.path,
                        onProgressUpdate: (flowName, progress, message) => {
                            this.updateProgress(flowName, progress, message);
                        },
                        onFlowComplete: (flowName, isSuccess, message) => {
                            this.finishFlow(flowName, isSuccess, message);
                        }
                    });
                    console.log('flowManager 初始化完成:', this.flowManager);
                    // 加载发布设置
                    this.loadPublishSettings();
                }
            };

            // 创建应用实例
            const app = createApp({
                template: `<MyComponent />`,
                components: { MyComponent }
            });

            app.config.compilerOptions.isCustomElement = tag => tag.startsWith('ui-');
            app.mount(this.$.app);
            panelDataMap.set(this, app);
        }
    },

    close() {
        const app = panelDataMap.get(this);
        if (app) {
            // 在关闭面板前，尝试取消所有正在运行的流程
            const component = app._instance?.proxy as MyComponent | undefined;
            if (component?.flowManager) {
                component.flowManager.cancelAllFlows();
            }
            app.unmount();
        }
    }
}); 
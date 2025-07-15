"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const vue_1 = require("vue");
const flowManager_1 = require("../../utils/publishFlow/flowManager");
const panelDataMap = new WeakMap();
// 发布环境枚举
var PublishEnvironment;
(function (PublishEnvironment) {
    PublishEnvironment["DEVELOPMENT"] = "DEVELOPMENT";
    PublishEnvironment["PRODUCTION"] = "PRODUCTION";
})(PublishEnvironment || (PublishEnvironment = {}));
// 发布环境标题映射
const PublishEnvironmentTitle = {
    [PublishEnvironment.DEVELOPMENT]: '开发环境',
    [PublishEnvironment.PRODUCTION]: '线上环境'
};
// 发布配置标题映射
const PublishConfigTitle = {
    [flowManager_1.PublishConfigType.FULL_PACKAGE]: '全量发布',
    [flowManager_1.PublishConfigType.REMOTE_STARTUP]: '远程启动包发布',
    [flowManager_1.PublishConfigType.REMOTE_BUNDLES]: '远程bundles发布'
};
module.exports = Editor.Panel.define({
    listeners: {
        show: () => console.log('show'),
        hide: () => console.log('hide'),
    },
    template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/tabsDemo/index.html'), 'utf-8'),
    style: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/style/tabsDemo/index.css'), 'utf-8'),
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
                `,
                data: () => ({
                    PublishEnvironment,
                    PublishEnvironmentTitle,
                    activeTab: flowManager_1.PublishConfigType.FULL_PACKAGE,
                    configDir: Editor.Project.path + "/buildConfigs",
                    currentConfigPath: '',
                    publishStatus: 'idle',
                    publishStatusText: {
                        idle: '待发布',
                        publishing: '发布中',
                        success: '发布完成',
                        failed: '发布失败',
                        canceled: '已取消'
                    },
                    publishProgressList: [],
                    tabs: [
                        {
                            id: flowManager_1.PublishConfigType.FULL_PACKAGE,
                            name: PublishConfigTitle[flowManager_1.PublishConfigType.FULL_PACKAGE]
                        },
                        {
                            id: flowManager_1.PublishConfigType.REMOTE_STARTUP,
                            name: PublishConfigTitle[flowManager_1.PublishConfigType.REMOTE_STARTUP]
                        },
                        {
                            id: flowManager_1.PublishConfigType.REMOTE_BUNDLES,
                            name: PublishConfigTitle[flowManager_1.PublishConfigType.REMOTE_BUNDLES]
                        }
                    ],
                    configSettings: {
                        [flowManager_1.PublishConfigType.FULL_PACKAGE]: {
                            debugMode: false,
                            environment: 'development',
                            version: '1.0.0'
                        },
                        [flowManager_1.PublishConfigType.REMOTE_STARTUP]: {
                            updateMainPackage: true,
                            environment: 'development',
                            serverPath: '/remote/startup'
                        },
                        [flowManager_1.PublishConfigType.REMOTE_BUNDLES]: {
                            compressBundle: true,
                            generateVersionFile: true,
                            server: 'development'
                        }
                    },
                    flowManager: null,
                    publishSettingPath: (0, path_1.join)(Editor.Project.path, 'assets', 'app', 'publishSetting.json'),
                    publishSettings: {
                        isMCI: false,
                        environment: PublishEnvironment.DEVELOPMENT,
                        app_version: '1.0.0'
                    }
                }),
                methods: {
                    /**
                     * 切换标签页
                     */
                    switchTab(tabId) {
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
                    getConfigPath(configFile) {
                        return (0, path_1.join)(this.configDir, configFile);
                    },
                    /**
                     * 加载发布设置
                     */
                    loadPublishSettings() {
                        try {
                            if ((0, fs_extra_1.existsSync)(this.publishSettingPath)) {
                                const content = (0, fs_extra_1.readFileSync)(this.publishSettingPath, 'utf-8');
                                const settings = JSON.parse(content);
                                // 使用读取的设置更新当前设置，处理可能不存在的字段
                                this.publishSettings = {
                                    isMCI: settings.isMCI !== undefined ? settings.isMCI : false,
                                    environment: settings.environment || PublishEnvironment.DEVELOPMENT,
                                    app_version: settings.app_version || '1.0.0'
                                };
                                console.log('发布设置已加载:', this.publishSettings);
                            }
                            else {
                                console.warn('发布设置文件不存在，使用默认设置');
                            }
                        }
                        catch (error) {
                            console.error('读取发布设置失败:', error);
                            Editor.Dialog.warn('读取发布设置失败，使用默认设置');
                        }
                    },
                    /**
                     * 初始化进度列表
                     */
                    initializeProgressList() {
                        // 清空现有进度列表
                        this.publishProgressList = [];
                        // 根据当前选择的页签类型，创建对应的进度列表
                        const configType = this.activeTab;
                        const flows = flowManager_1.FLOW_CONFIG[configType];
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
                    async savePublishSettings() {
                        return await this.flowManager.updatePublishSetting(this.activeTab, this.publishSettings.isMCI, this.publishSettings.environment, this.publishSettings.app_version);
                    },
                    /**
                     * 判断是否显示特定设置项
                     */
                    showSettingItem(tabId, setting) {
                        if (setting === 'environment') {
                            // 所有标签页都显示环境设置
                            return true;
                        }
                        if (tabId === flowManager_1.PublishConfigType.REMOTE_BUNDLES) {
                            // REMOTE_BUNDLES只显示环境设置
                            return setting === 'environment';
                        }
                        // FULL_PACKAGE和REMOTE_STARTUP显示所有设置
                        return true;
                    },
                    /**
                     * 开始发布流程
                     */
                    async startPublish() {
                        if (this.publishStatus === 'publishing')
                            return;
                        console.log(`开始发布流程: ${this.activeTab}`);
                        this.publishStatus = 'publishing';
                        // 初始化进度列表
                        this.initializeProgressList();
                        const configPath = this.getConfigPath(this.activeTab);
                        const configSettings = this.configSettings[this.activeTab];
                        const useDebugMode = configSettings.debugMode || false;
                        try {
                            // 使用流程管理器执行完整发布流程
                            const success = await this.flowManager.executeFullPublishProcess(this.activeTab, configPath, this.publishSettings.isMCI, this.publishSettings.environment, this.publishSettings.app_version, useDebugMode);
                            if (!success) {
                                this.publishStatus = 'failed';
                                Editor.Dialog.error('执行发布流程失败');
                            }
                            else {
                                this.publishStatus = 'success';
                            }
                        }
                        catch (error) {
                            console.error('发布过程中发生错误:', error);
                            this.publishStatus = 'failed';
                            Editor.Dialog.error(`发布失败: ${error instanceof Error ? error.message : String(error)}`);
                        }
                    },
                    /**
                     * 更新进度
                     */
                    updateProgress(flowName, progress, message) {
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
                    finishFlow(flowName, isSuccess, message) {
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
                                }
                                else if (currentIndex === this.publishProgressList.length - 1) {
                                    // 最后一个流程完成
                                    this.publishStatus = 'success';
                                    Editor.Dialog.info('所有发布流程已完成');
                                }
                            }
                            // 判断是否所有流程都已完成
                            const allCompleted = this.publishProgressList.every(item => item.status === 'success' || item.status === 'failed' || item.status === 'canceled');
                            if (allCompleted) {
                                const allSuccess = this.publishProgressList.every(item => item.status === 'success');
                                this.publishStatus = allSuccess ? 'success' : 'failed';
                            }
                        }
                    },
                    /**
                     * 重置发布状态
                     */
                    resetPublish() {
                        this.publishStatus = 'idle';
                        this.publishProgressList = [];
                    },
                    /**
                     * 取消发布
                     */
                    cancelPublish() {
                        if (this.publishStatus !== 'publishing')
                            return;
                        try {
                            // 使用流程管理器取消发布
                            this.flowManager.cancelAllFlows();
                            this.publishStatus = 'canceled';
                            // 更新进度条状态
                            this.publishProgressList.forEach(flow => {
                                if (flow.status === 'running') {
                                    flow.status = 'canceled';
                                    flow.message = '用户已取消';
                                }
                                else if (flow.status === 'idle') {
                                    flow.status = 'canceled';
                                    flow.message = '流程已取消';
                                }
                            });
                            Editor.Dialog.info('发布已取消');
                        }
                        catch (error) {
                            console.error('取消发布失败:', error);
                            Editor.Dialog.error(`取消发布失败: ${error instanceof Error ? error.message : String(error)}`);
                        }
                    }
                },
                mounted() {
                    console.log('发布流程组件已挂载');
                    this.currentConfigPath = this.getConfigPath(this.activeTab);
                    // 检查配置目录是否存在
                    try {
                        const configFiles = (0, fs_extra_1.readdirSync)(this.configDir);
                        console.log('发现配置文件：', configFiles);
                    }
                    catch (error) {
                        console.warn('配置目录不存在或无法访问:', error);
                    }
                    // 初始化流程管理器
                    this.flowManager = new flowManager_1.FlowManager({
                        projectPath: Editor.Project.path,
                        onProgressUpdate: (flowName, progress, message) => {
                            this.updateProgress(flowName, progress, message);
                        },
                        onFlowComplete: (flowName, isSuccess, message) => {
                            this.finishFlow(flowName, isSuccess, message);
                        }
                    });
                    // 加载发布设置
                    this.loadPublishSettings();
                }
            };
            // 创建应用实例
            const app = (0, vue_1.createApp)({
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
            const component = app._instance?.proxy;
            if (component?.flowManager) {
                component.flowManager.cancelAllFlows();
            }
            app.unmount();
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL3RhYnNEZW1vL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsdUNBQWlFO0FBQ2pFLCtCQUE0QjtBQUM1Qiw2QkFBMEM7QUFFMUMscUVBQTRHO0FBRTVHLE1BQU0sWUFBWSxHQUFHLElBQUksT0FBTyxFQUFZLENBQUM7QUFFN0MsU0FBUztBQUNULElBQUssa0JBR0o7QUFIRCxXQUFLLGtCQUFrQjtJQUNuQixpREFBMkIsQ0FBQTtJQUMzQiwrQ0FBeUIsQ0FBQTtBQUM3QixDQUFDLEVBSEksa0JBQWtCLEtBQWxCLGtCQUFrQixRQUd0QjtBQUVELFdBQVc7QUFDWCxNQUFNLHVCQUF1QixHQUEyQjtJQUNwRCxDQUFDLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxFQUFFLE1BQU07SUFDeEMsQ0FBQyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxNQUFNO0NBQzFDLENBQUM7QUFFRixXQUFXO0FBQ1gsTUFBTSxrQkFBa0IsR0FBMkI7SUFDL0MsQ0FBQywrQkFBaUIsQ0FBQyxZQUFZLENBQUMsRUFBRSxNQUFNO0lBQ3hDLENBQUMsK0JBQWlCLENBQUMsY0FBYyxDQUFDLEVBQUUsU0FBUztJQUM3QyxDQUFDLCtCQUFpQixDQUFDLGNBQWMsQ0FBQyxFQUFFLGFBQWE7Q0FDcEQsQ0FBQztBQW1DRixNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ2pDLFNBQVMsRUFBRTtRQUNQLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUMvQixJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7S0FDbEM7SUFDRCxRQUFRLEVBQUUsSUFBQSx1QkFBWSxFQUFDLElBQUEsV0FBSSxFQUFDLFNBQVMsRUFBRSw4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TCxDQUFDO0lBRUQsS0FBSztRQUNELE1BQU0sR0FBRyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNOLHVCQUF1QjtZQUN2QixNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQWdDLENBQUM7WUFDbEUsSUFBSSxTQUFTLEVBQUUsV0FBVyxFQUFFLENBQUM7Z0JBQ3pCLFNBQVMsQ0FBQyxXQUFXLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDM0MsQ0FBQztZQUNELEdBQUcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNsQixDQUFDO0lBQ0wsQ0FBQztDQUNKLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IHJlYWRGaWxlU3luYywgcmVhZGRpclN5bmMsIGV4aXN0c1N5bmMgfSBmcm9tICdmcy1leHRyYSc7XHJcbmltcG9ydCB7IGpvaW4gfSBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgY3JlYXRlQXBwLCB0eXBlIEFwcCB9IGZyb20gJ3Z1ZSc7XHJcbmltcG9ydCB7IFB1Ymxpc2hQcm9ncmVzcyB9IGZyb20gJy4uLy4uL3V0aWxzL3B1Ymxpc2hGbG93L2ludGVyZmFjZXMnO1xyXG5pbXBvcnQgeyBGbG93TWFuYWdlciwgUHVibGlzaENvbmZpZ1R5cGUsIEZsb3dUeXBlLCBGTE9XX0NPTkZJRyB9IGZyb20gJy4uLy4uL3V0aWxzL3B1Ymxpc2hGbG93L2Zsb3dNYW5hZ2VyJztcclxuXHJcbmNvbnN0IHBhbmVsRGF0YU1hcCA9IG5ldyBXZWFrTWFwPGFueSwgQXBwPigpO1xyXG5cclxuLy8g5Y+R5biD546v5aKD5p6a5Li+XHJcbmVudW0gUHVibGlzaEVudmlyb25tZW50IHtcclxuICAgIERFVkVMT1BNRU5UID0gJ0RFVkVMT1BNRU5UJyxcclxuICAgIFBST0RVQ1RJT04gPSAnUFJPRFVDVElPTidcclxufVxyXG5cclxuLy8g5Y+R5biD546v5aKD5qCH6aKY5pig5bCEXHJcbmNvbnN0IFB1Ymxpc2hFbnZpcm9ubWVudFRpdGxlOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xyXG4gICAgW1B1Ymxpc2hFbnZpcm9ubWVudC5ERVZFTE9QTUVOVF06ICflvIDlj5Hnjq/looMnLFxyXG4gICAgW1B1Ymxpc2hFbnZpcm9ubWVudC5QUk9EVUNUSU9OXTogJ+e6v+S4iueOr+WigydcclxufTtcclxuXHJcbi8vIOWPkeW4g+mFjee9ruagh+mimOaYoOWwhFxyXG5jb25zdCBQdWJsaXNoQ29uZmlnVGl0bGU6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XHJcbiAgICBbUHVibGlzaENvbmZpZ1R5cGUuRlVMTF9QQUNLQUdFXTogJ+WFqOmHj+WPkeW4gycsXHJcbiAgICBbUHVibGlzaENvbmZpZ1R5cGUuUkVNT1RFX1NUQVJUVVBdOiAn6L+c56iL5ZCv5Yqo5YyF5Y+R5biDJyxcclxuICAgIFtQdWJsaXNoQ29uZmlnVHlwZS5SRU1PVEVfQlVORExFU106ICfov5znqItidW5kbGVz5Y+R5biDJ1xyXG59O1xyXG5cclxuLy8g5a6a5LmJ57uE5Lu257G75Z6LXHJcbmludGVyZmFjZSBNeUNvbXBvbmVudCB7XHJcbiAgICBhY3RpdmVUYWI6IFB1Ymxpc2hDb25maWdUeXBlO1xyXG4gICAgdGFiczogQXJyYXk8e1xyXG4gICAgICAgIGlkOiBQdWJsaXNoQ29uZmlnVHlwZTtcclxuICAgICAgICBuYW1lOiBzdHJpbmc7XHJcbiAgICB9PjtcclxuICAgIGNvbmZpZ0Rpcjogc3RyaW5nO1xyXG4gICAgY3VycmVudENvbmZpZ1BhdGg6IHN0cmluZztcclxuICAgIHB1Ymxpc2hTdGF0dXM6ICdpZGxlJyB8ICdwdWJsaXNoaW5nJyB8ICdzdWNjZXNzJyB8ICdmYWlsZWQnIHwgJ2NhbmNlbGVkJztcclxuICAgIHB1Ymxpc2hTdGF0dXNUZXh0OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+O1xyXG4gICAgcHVibGlzaFByb2dyZXNzTGlzdDogUHVibGlzaFByb2dyZXNzW107XHJcbiAgICBjb25maWdTZXR0aW5nczogUmVjb3JkPFB1Ymxpc2hDb25maWdUeXBlLCBSZWNvcmQ8c3RyaW5nLCBhbnk+PjtcclxuICAgIGZsb3dNYW5hZ2VyOiBGbG93TWFuYWdlcjtcclxuICAgIHB1Ymxpc2hTZXR0aW5nUGF0aDogc3RyaW5nO1xyXG4gICAgcHVibGlzaFNldHRpbmdzOiB7XHJcbiAgICAgICAgaXNNQ0k6IGJvb2xlYW47XHJcbiAgICAgICAgZW52aXJvbm1lbnQ6IFB1Ymxpc2hFbnZpcm9ubWVudDtcclxuICAgICAgICBhcHBfdmVyc2lvbjogc3RyaW5nO1xyXG4gICAgfTtcclxuICAgIHN3aXRjaFRhYih0YWJJZDogUHVibGlzaENvbmZpZ1R5cGUpOiB2b2lkO1xyXG4gICAgZ2V0Q29uZmlnUGF0aChjb25maWdGaWxlOiBzdHJpbmcpOiBzdHJpbmc7XHJcbiAgICBzdGFydFB1Ymxpc2goKTogUHJvbWlzZTx2b2lkPjtcclxuICAgIHVwZGF0ZVByb2dyZXNzKGZsb3dOYW1lOiBzdHJpbmcsIHByb2dyZXNzOiBudW1iZXIsIG1lc3NhZ2U/OiBzdHJpbmcpOiB2b2lkO1xyXG4gICAgZmluaXNoRmxvdyhmbG93TmFtZTogc3RyaW5nLCBpc1N1Y2Nlc3M6IGJvb2xlYW4sIG1lc3NhZ2U/OiBzdHJpbmcpOiB2b2lkO1xyXG4gICAgcmVzZXRQdWJsaXNoKCk6IHZvaWQ7XHJcbiAgICBjYW5jZWxQdWJsaXNoKCk6IHZvaWQ7XHJcbiAgICBsb2FkUHVibGlzaFNldHRpbmdzKCk6IHZvaWQ7XHJcbiAgICBzYXZlUHVibGlzaFNldHRpbmdzKCk6IFByb21pc2U8Ym9vbGVhbj47XHJcbiAgICBzaG93U2V0dGluZ0l0ZW0odGFiSWQ6IFB1Ymxpc2hDb25maWdUeXBlLCBzZXR0aW5nOiBzdHJpbmcpOiBib29sZWFuO1xyXG4gICAgaW5pdGlhbGl6ZVByb2dyZXNzTGlzdCgpOiB2b2lkO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvci5QYW5lbC5kZWZpbmUoe1xyXG4gICAgbGlzdGVuZXJzOiB7XHJcbiAgICAgICAgc2hvdzogKCkgPT4gY29uc29sZS5sb2coJ3Nob3cnKSxcclxuICAgICAgICBoaWRlOiAoKSA9PiBjb25zb2xlLmxvZygnaGlkZScpLFxyXG4gICAgfSxcclxuICAgIHRlbXBsYXRlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvdGVtcGxhdGUvdGFic0RlbW8vaW5kZXguaHRtbCcpLCAndXRmLTgnKSxcclxuICAgIHN0eWxlOiByZWFkRmlsZVN5bmMoam9pbihfX2Rpcm5hbWUsICcuLi8uLi8uLi9zdGF0aWMvc3R5bGUvdGFic0RlbW8vaW5kZXguY3NzJyksICd1dGYtOCcpLFxyXG4gICAgJDogeyBhcHA6ICcjYXBwJyB9LFxyXG5cclxuICAgIHJlYWR5KCkge1xyXG4gICAgICAgIGlmICh0aGlzLiQuYXBwKSB7XHJcbiAgICAgICAgICAgIC8vIOe7hOS7tuWumuS5iVxyXG4gICAgICAgICAgICBjb25zdCBNeUNvbXBvbmVudCA9IHtcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBgXHJcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbnRhaW5lclwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8aDI+5Y+R5biD5rWB56iLPC9oMj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwhLS0g5qCH562+6aG15a+86IiqIC0tPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidGFicy1uYXZcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgdi1mb3I9XCJ0YWIgaW4gdGFic1wiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDprZXk9XCJ0YWIuaWRcIiBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cInRhYi1pdGVtXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6Y2xhc3M9XCJ7IGFjdGl2ZTogYWN0aXZlVGFiID09PSB0YWIuaWQsIGRpc2FibGVkOiBwdWJsaXNoU3RhdHVzID09PSAncHVibGlzaGluZycgfVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQGNsaWNrPVwic3dpdGNoVGFiKHRhYi5pZClcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7eyB0YWIubmFtZSB9fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSDmoIfnrb7pobXlhoXlrrnljLrln58gLS0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ0YWItY29udGVudFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiB2LWZvcj1cInRhYiBpbiB0YWJzXCIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOmtleT1cInRhYi5pZFwiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidGFiLXBhbmVcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDpjbGFzcz1cInsgYWN0aXZlOiBhY3RpdmVUYWIgPT09IHRhYi5pZCB9XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSDphY3nva7kv6Hmga8gLS0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImNvbmZpZy1pbmZvXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwPuW9k+WJjemAieaLqeeahOmFjee9ruaWh+S7tu+8mnt7IHRhYi5pZCB9fTwvcD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHA+6YWN572u5paH5Lu26Lev5b6E77yae3sgZ2V0Q29uZmlnUGF0aCh0YWIuaWQpIH19PC9wPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwhLS0g5Y+R5biD6K6+572u6Z2i5p2/IC0tPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwdWJsaXNoLXNldHRpbmdzXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxoMz7lj5HluIPorr7nva48L2gzPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInNldHRpbmdzLXBhbmVsXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8IS0tIE1DSeW8gOWFsyAtLT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzZXR0aW5nLWl0ZW1cIiB2LWlmPVwic2hvd1NldHRpbmdJdGVtKHRhYi5pZCwgJ2lzTUNJJylcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiB2LW1vZGVsPVwicHVibGlzaFNldHRpbmdzLmlzTUNJXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOW8gOWQr01DSVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvbGFiZWw+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSDlj5HluIPnjq/looMgLS0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwic2V0dGluZy1pdGVtXCIgdi1pZj1cInNob3dTZXR0aW5nSXRlbSh0YWIuaWQsICdlbnZpcm9ubWVudCcpXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGxhYmVsPuWPkeW4g+eOr+Wig++8mjwvbGFiZWw+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNlbGVjdCB2LW1vZGVsPVwicHVibGlzaFNldHRpbmdzLmVudmlyb25tZW50XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdi1mb3I9XCIodGl0bGUsIGVudikgaW4gUHVibGlzaEVudmlyb25tZW50VGl0bGVcIiA6a2V5PVwiZW52XCIgOnZhbHVlPVwiZW52XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7eyB0aXRsZSB9fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L29wdGlvbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L3NlbGVjdD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8IS0tIOeJiOacrOWPtyAtLT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJzZXR0aW5nLWl0ZW1cIiB2LWlmPVwic2hvd1NldHRpbmdJdGVtKHRhYi5pZCwgJ2FwcF92ZXJzaW9uJylcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8bGFiZWw+5bqU55So54mI5pys5Y+377yaPC9sYWJlbD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdHlwZT1cInRleHRcIiB2LW1vZGVsPVwicHVibGlzaFNldHRpbmdzLmFwcF92ZXJzaW9uXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSDlj5HluIPmjInpkq4gLS0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInB1Ymxpc2gtYWN0aW9uc1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIEBjbGljaz1cInN0YXJ0UHVibGlzaFwiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDpkaXNhYmxlZD1cInB1Ymxpc2hTdGF0dXMgPT09ICdwdWJsaXNoaW5nJ1wiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwicHVibGlzaC1idG5cIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDpjbGFzcz1cInsgJ2J0bi1kaXNhYmxlZCc6IHB1Ymxpc2hTdGF0dXMgPT09ICdwdWJsaXNoaW5nJyB9XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7eyBwdWJsaXNoU3RhdHVzID09PSAncHVibGlzaGluZycgPyAn5Y+R5biD5LitLi4uJyA6ICflvIDlp4vlj5HluIMnIH19XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIEBjbGljaz1cImNhbmNlbFB1Ymxpc2hcIiBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6ZGlzYWJsZWQ9XCJwdWJsaXNoU3RhdHVzICE9PSAncHVibGlzaGluZydcIiBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cImNhbmNlbC1idG5cIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDpjbGFzcz1cInsgJ2J0bi1kaXNhYmxlZCc6IHB1Ymxpc2hTdGF0dXMgIT09ICdwdWJsaXNoaW5nJyB9XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDlj5bmtojlj5HluINcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gQGNsaWNrPVwicmVzZXRQdWJsaXNoXCIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOmRpc2FibGVkPVwicHVibGlzaFN0YXR1cyA9PT0gJ3B1Ymxpc2hpbmcnIHx8IHB1Ymxpc2hTdGF0dXMgPT09ICdpZGxlJ1wiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwicmVzZXQtYnRuXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6Y2xhc3M9XCJ7ICdidG4tZGlzYWJsZWQnOiBwdWJsaXNoU3RhdHVzID09PSAncHVibGlzaGluZycgfHwgcHVibGlzaFN0YXR1cyA9PT0gJ2lkbGUnIH1cIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOmHjee9rueKtuaAgVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInB1Ymxpc2gtc3RhdHVzXCIgOmNsYXNzPVwicHVibGlzaFN0YXR1c1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3sgcHVibGlzaFN0YXR1c1RleHRbcHVibGlzaFN0YXR1c10gfX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSDlj5HluIPov5vluqbpnaLmnb8gLS0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInB1Ymxpc2gtcHJvZ3Jlc3MtcGFuZWxcIiB2LWlmPVwicHVibGlzaFByb2dyZXNzTGlzdC5sZW5ndGggPiAwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxoMz7lj5HluIPov5vluqY8L2gzPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3MtaXRlbXNcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgdi1mb3I9XCIoaXRlbSwgaW5kZXgpIGluIHB1Ymxpc2hQcm9ncmVzc0xpc3RcIiBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgOmtleT1cImluZGV4XCIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwicHJvZ3Jlc3MtaXRlbVwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDpjbGFzcz1cIml0ZW0uc3RhdHVzXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByb2dyZXNzLWluZm9cIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJwcm9ncmVzcy1uYW1lXCI+e3sgaXRlbS5mbG93TmFtZSB9fTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJwcm9ncmVzcy1tZXNzYWdlXCIgdi1pZj1cIml0ZW0ubWVzc2FnZVwiPnt7IGl0ZW0ubWVzc2FnZSB9fTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3MtYmFyLWNvbnRhaW5lclwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3MtYmFyXCIgOnN0eWxlPVwieyB3aWR0aDogaXRlbS5wcm9ncmVzcyArICclJyB9XCI+PC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwicHJvZ3Jlc3MtcGVyY2VudFwiPnt7IGl0ZW0ucHJvZ3Jlc3MudG9GaXhlZCgxKSB9fSU8L3NwYW4+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICBgLFxyXG4gICAgICAgICAgICAgICAgZGF0YTogKCkgPT4gKHtcclxuICAgICAgICAgICAgICAgICAgICBQdWJsaXNoRW52aXJvbm1lbnQsXHJcbiAgICAgICAgICAgICAgICAgICAgUHVibGlzaEVudmlyb25tZW50VGl0bGUsXHJcbiAgICAgICAgICAgICAgICAgICAgYWN0aXZlVGFiOiBQdWJsaXNoQ29uZmlnVHlwZS5GVUxMX1BBQ0tBR0UsXHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnRGlyOiBFZGl0b3IuUHJvamVjdC5wYXRoICsgXCIvYnVpbGRDb25maWdzXCIsXHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudENvbmZpZ1BhdGg6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgIHB1Ymxpc2hTdGF0dXM6ICdpZGxlJyBhcyAnaWRsZScgfCAncHVibGlzaGluZycgfCAnc3VjY2VzcycgfCAnZmFpbGVkJyB8ICdjYW5jZWxlZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHVibGlzaFN0YXR1c1RleHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWRsZTogJ+W+heWPkeW4gycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHB1Ymxpc2hpbmc6ICflj5HluIPkuK0nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiAn5Y+R5biD5a6M5oiQJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmFpbGVkOiAn5Y+R5biD5aSx6LSlJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FuY2VsZWQ6ICflt7Llj5bmtognXHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBwdWJsaXNoUHJvZ3Jlc3NMaXN0OiBbXSBhcyBQdWJsaXNoUHJvZ3Jlc3NbXSxcclxuICAgICAgICAgICAgICAgICAgICB0YWJzOiBbXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBQdWJsaXNoQ29uZmlnVHlwZS5GVUxMX1BBQ0tBR0UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBQdWJsaXNoQ29uZmlnVGl0bGVbUHVibGlzaENvbmZpZ1R5cGUuRlVMTF9QQUNLQUdFXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZDogUHVibGlzaENvbmZpZ1R5cGUuUkVNT1RFX1NUQVJUVVAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lOiBQdWJsaXNoQ29uZmlnVGl0bGVbUHVibGlzaENvbmZpZ1R5cGUuUkVNT1RFX1NUQVJUVVBdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlkOiBQdWJsaXNoQ29uZmlnVHlwZS5SRU1PVEVfQlVORExFUyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IFB1Ymxpc2hDb25maWdUaXRsZVtQdWJsaXNoQ29uZmlnVHlwZS5SRU1PVEVfQlVORExFU11cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIF0sXHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnU2V0dGluZ3M6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgW1B1Ymxpc2hDb25maWdUeXBlLkZVTExfUEFDS0FHRV06IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlYnVnTW9kZTogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnZpcm9ubWVudDogJ2RldmVsb3BtZW50JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb246ICcxLjAuMCdcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgW1B1Ymxpc2hDb25maWdUeXBlLlJFTU9URV9TVEFSVFVQXToge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlTWFpblBhY2thZ2U6IHRydWUsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnZpcm9ubWVudDogJ2RldmVsb3BtZW50JyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlclBhdGg6ICcvcmVtb3RlL3N0YXJ0dXAnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFtQdWJsaXNoQ29uZmlnVHlwZS5SRU1PVEVfQlVORExFU106IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbXByZXNzQnVuZGxlOiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2VuZXJhdGVWZXJzaW9uRmlsZTogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNlcnZlcjogJ2RldmVsb3BtZW50J1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBmbG93TWFuYWdlcjogbnVsbCBhcyB1bmtub3duIGFzIEZsb3dNYW5hZ2VyLFxyXG4gICAgICAgICAgICAgICAgICAgIHB1Ymxpc2hTZXR0aW5nUGF0aDogam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCAnYXNzZXRzJywgJ2FwcCcsICdwdWJsaXNoU2V0dGluZy5qc29uJyksXHJcbiAgICAgICAgICAgICAgICAgICAgcHVibGlzaFNldHRpbmdzOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzTUNJOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZW52aXJvbm1lbnQ6IFB1Ymxpc2hFbnZpcm9ubWVudC5ERVZFTE9QTUVOVCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYXBwX3ZlcnNpb246ICcxLjAuMCdcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgIG1ldGhvZHM6IHtcclxuICAgICAgICAgICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICAgICAgICAgKiDliIfmjaLmoIfnrb7pobVcclxuICAgICAgICAgICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2hUYWIodGhpczogTXlDb21wb25lbnQsIHRhYklkOiBQdWJsaXNoQ29uZmlnVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFjdGl2ZVRhYiA9IHRhYklkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDb25maWdQYXRoID0gdGhpcy5nZXRDb25maWdQYXRoKHRhYklkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOWIh+aNouWIsOagh+etvumhtTogJHt0YWJJZH0sIOmFjee9ruaWh+S7tui3r+W+hDogJHt0aGlzLmN1cnJlbnRDb25maWdQYXRofWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5YiH5o2i5qCH562+6aG15pe26YeN5paw5Yqg6L295Y+R5biD6K6+572uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFB1Ymxpc2hTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g6YeN572u5Y+R5biD54q25oCBXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVzZXRQdWJsaXNoKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICAgICAgICAgKiDojrflj5bphY3nva7mlofku7bot6/lvoRcclxuICAgICAgICAgICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgICAgICAgICBnZXRDb25maWdQYXRoKHRoaXM6IE15Q29tcG9uZW50LCBjb25maWdGaWxlOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gam9pbih0aGlzLmNvbmZpZ0RpciwgY29uZmlnRmlsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICAgICAgICAgKiDliqDovb3lj5HluIPorr7nva5cclxuICAgICAgICAgICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgICAgICAgICBsb2FkUHVibGlzaFNldHRpbmdzKHRoaXM6IE15Q29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZXhpc3RzU3luYyh0aGlzLnB1Ymxpc2hTZXR0aW5nUGF0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKHRoaXMucHVibGlzaFNldHRpbmdQYXRoLCAndXRmLTgnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzZXR0aW5ncyA9IEpTT04ucGFyc2UoY29udGVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5L2/55So6K+75Y+W55qE6K6+572u5pu05paw5b2T5YmN6K6+572u77yM5aSE55CG5Y+v6IO95LiN5a2Y5Zyo55qE5a2X5q61XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoU2V0dGluZ3MgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzTUNJOiBzZXR0aW5ncy5pc01DSSAhPT0gdW5kZWZpbmVkID8gc2V0dGluZ3MuaXNNQ0kgOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW52aXJvbm1lbnQ6IHNldHRpbmdzLmVudmlyb25tZW50IHx8IFB1Ymxpc2hFbnZpcm9ubWVudC5ERVZFTE9QTUVOVCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBwX3ZlcnNpb246IHNldHRpbmdzLmFwcF92ZXJzaW9uIHx8ICcxLjAuMCdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCflj5HluIPorr7nva7lt7LliqDovb06JywgdGhpcy5wdWJsaXNoU2V0dGluZ3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ+WPkeW4g+iuvue9ruaWh+S7tuS4jeWtmOWcqO+8jOS9v+eUqOm7mOiupOiuvue9ricpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign6K+75Y+W5Y+R5biD6K6+572u5aSx6LSlOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cud2Fybign6K+75Y+W5Y+R5biD6K6+572u5aSx6LSl77yM5L2/55So6buY6K6k6K6+572uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgICAgICAgICAqIOWIneWni+WMlui/m+W6puWIl+ihqFxyXG4gICAgICAgICAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICAgICAgICAgIGluaXRpYWxpemVQcm9ncmVzc0xpc3QodGhpczogTXlDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5riF56m6546w5pyJ6L+b5bqm5YiX6KGoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaFByb2dyZXNzTGlzdCA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qC55o2u5b2T5YmN6YCJ5oup55qE6aG1562+57G75Z6L77yM5Yib5bu65a+55bqU55qE6L+b5bqm5YiX6KGoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNvbmZpZ1R5cGUgPSB0aGlzLmFjdGl2ZVRhYjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmxvd3MgPSBGTE9XX0NPTkZJR1tjb25maWdUeXBlXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChmbG93cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBmbG93VHlwZSBvZiBmbG93cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaFByb2dyZXNzTGlzdC5wdXNoKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxvd05hbWU6IGZsb3dUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm9ncmVzczogMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RhdHVzOiAnaWRsZScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICfnrYnlvoXlvIDlp4snXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWwhuesrOS4gOS4qua1geeoi+iuvue9ruS4uui/kOihjOeKtuaAgVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucHVibGlzaFByb2dyZXNzTGlzdC5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoUHJvZ3Jlc3NMaXN0WzBdLnN0YXR1cyA9ICdydW5uaW5nJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2hQcm9ncmVzc0xpc3RbMF0ubWVzc2FnZSA9ICflh4blpIflvIDlp4snO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICAgICAgICAgKiDkv53lrZjlj5HluIPorr7nva5cclxuICAgICAgICAgICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgICAgICAgICBhc3luYyBzYXZlUHVibGlzaFNldHRpbmdzKHRoaXM6IE15Q29tcG9uZW50KTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCB0aGlzLmZsb3dNYW5hZ2VyLnVwZGF0ZVB1Ymxpc2hTZXR0aW5nKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hY3RpdmVUYWIsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2hTZXR0aW5ncy5pc01DSSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaFNldHRpbmdzLmVudmlyb25tZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoU2V0dGluZ3MuYXBwX3ZlcnNpb25cclxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgICAgICAgICAqIOWIpOaWreaYr+WQpuaYvuekuueJueWumuiuvue9rumhuVxyXG4gICAgICAgICAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICAgICAgICAgIHNob3dTZXR0aW5nSXRlbSh0aGlzOiBNeUNvbXBvbmVudCwgdGFiSWQ6IFB1Ymxpc2hDb25maWdUeXBlLCBzZXR0aW5nOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHNldHRpbmcgPT09ICdlbnZpcm9ubWVudCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOaJgOacieagh+etvumhtemDveaYvuekuueOr+Wig+iuvue9rlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YWJJZCA9PT0gUHVibGlzaENvbmZpZ1R5cGUuUkVNT1RFX0JVTkRMRVMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIFJFTU9URV9CVU5ETEVT5Y+q5pi+56S6546v5aKD6K6+572uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gc2V0dGluZyA9PT0gJ2Vudmlyb25tZW50JztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRlVMTF9QQUNLQUdF5ZKMUkVNT1RFX1NUQVJUVVDmmL7npLrmiYDmnInorr7nva5cclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICAgICAgICAgKiDlvIDlp4vlj5HluIPmtYHnqItcclxuICAgICAgICAgICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgICAgICAgICBhc3luYyBzdGFydFB1Ymxpc2godGhpczogTXlDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMucHVibGlzaFN0YXR1cyA9PT0gJ3B1Ymxpc2hpbmcnKSByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg5byA5aeL5Y+R5biD5rWB56iLOiAke3RoaXMuYWN0aXZlVGFifWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2hTdGF0dXMgPSAncHVibGlzaGluZyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDliJ3lp4vljJbov5vluqbliJfooahcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5pbml0aWFsaXplUHJvZ3Jlc3NMaXN0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb25maWdQYXRoID0gdGhpcy5nZXRDb25maWdQYXRoKHRoaXMuYWN0aXZlVGFiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29uZmlnU2V0dGluZ3MgPSB0aGlzLmNvbmZpZ1NldHRpbmdzW3RoaXMuYWN0aXZlVGFiXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdXNlRGVidWdNb2RlID0gY29uZmlnU2V0dGluZ3MuZGVidWdNb2RlIHx8IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOS9v+eUqOa1geeoi+euoeeQhuWZqOaJp+ihjOWujOaVtOWPkeW4g+a1geeoi1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3VjY2VzcyA9IGF3YWl0IHRoaXMuZmxvd01hbmFnZXIuZXhlY3V0ZUZ1bGxQdWJsaXNoUHJvY2VzcyhcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFjdGl2ZVRhYixcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25maWdQYXRoLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaFNldHRpbmdzLmlzTUNJLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaFNldHRpbmdzLmVudmlyb25tZW50LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaFNldHRpbmdzLmFwcF92ZXJzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVzZURlYnVnTW9kZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFzdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoU3RhdHVzID0gJ2ZhaWxlZCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5lcnJvcign5omn6KGM5Y+R5biD5rWB56iL5aSx6LSlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaFN0YXR1cyA9ICdzdWNjZXNzJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+WPkeW4g+i/h+eoi+S4reWPkeeUn+mUmeivrzonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2hTdGF0dXMgPSAnZmFpbGVkJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuZXJyb3IoYOWPkeW4g+Wksei0pTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgICAgICAgICAqIOabtOaWsOi/m+W6plxyXG4gICAgICAgICAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICAgICAgICAgIHVwZGF0ZVByb2dyZXNzKHRoaXM6IE15Q29tcG9uZW50LCBmbG93TmFtZTogc3RyaW5nLCBwcm9ncmVzczogbnVtYmVyLCBtZXNzYWdlPzogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZsb3cgPSB0aGlzLnB1Ymxpc2hQcm9ncmVzc0xpc3QuZmluZChpdGVtID0+IGl0ZW0uZmxvd05hbWUgPT09IGZsb3dOYW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGZsb3cpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsb3cucHJvZ3Jlc3MgPSBwcm9ncmVzcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxvdy5tZXNzYWdlID0gbWVzc2FnZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c6L+b5bqm5Li6MOS4lOeKtuaAgeS4umlkbGXvvIzliJnmm7TmlrDkuLpydW5uaW5nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAocHJvZ3Jlc3MgPT09IDAgJiYgZmxvdy5zdGF0dXMgPT09ICdpZGxlJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsb3cuc3RhdHVzID0gJ3J1bm5pbmcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICAgICAgICAgKiDlrozmiJDmtYHnqItcclxuICAgICAgICAgICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgICAgICAgICBmaW5pc2hGbG93KHRoaXM6IE15Q29tcG9uZW50LCBmbG93TmFtZTogc3RyaW5nLCBpc1N1Y2Nlc3M6IGJvb2xlYW4sIG1lc3NhZ2U/OiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZmxvdyA9IHRoaXMucHVibGlzaFByb2dyZXNzTGlzdC5maW5kKGl0ZW0gPT4gaXRlbS5mbG93TmFtZSA9PT0gZmxvd05hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmxvdykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LuF5b2T54q25oCB5LiN5pivaWRsZeaXtuaJjeabtOaWsCjpgb/lhY3ph43nva7nirbmgIHml7bnmoTlm57osIPlvbHlk40pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmxvdy5zdGF0dXMgIT09ICdpZGxlJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsb3cucHJvZ3Jlc3MgPSAxMDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmxvdy5zdGF0dXMgPSBpc1N1Y2Nlc3MgPyAnc3VjY2VzcycgOiAnZmFpbGVkJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbG93Lm1lc3NhZ2UgPSBtZXNzYWdlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5pyJ5Lu75L2V5rWB56iL5aSx6LSl77yM5pW05Liq5Y+R5biD54q25oCB5Li65aSx6LSl77yM5bm25LiU5Y+W5raI5omA5pyJ5ZCO57ut5rWB56iLXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzU3VjY2VzcyAmJiBmbG93LnN0YXR1cyA9PT0gJ2ZhaWxlZCcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2hTdGF0dXMgPSAnZmFpbGVkJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlsIbmiYDmnInmnKrlrozmiJDnmoTmtYHnqIvmoIforrDkuLrlt7Llj5bmtohcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50SW5kZXggPSB0aGlzLnB1Ymxpc2hQcm9ncmVzc0xpc3QuZmluZEluZGV4KGl0ZW0gPT4gaXRlbS5mbG93TmFtZSA9PT0gZmxvd05hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSBjdXJyZW50SW5kZXggKyAxOyBpIDwgdGhpcy5wdWJsaXNoUHJvZ3Jlc3NMaXN0Lmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG5leHRGbG93ID0gdGhpcy5wdWJsaXNoUHJvZ3Jlc3NMaXN0W2ldO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV4dEZsb3cuc3RhdHVzID09PSAnaWRsZScgfHwgbmV4dEZsb3cuc3RhdHVzID09PSAncnVubmluZycpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5leHRGbG93LnN0YXR1cyA9ICdjYW5jZWxlZCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0Rmxvdy5tZXNzYWdlID0gJ+W3suWPlua2iCAtIOWJjeW6j+a1geeoi+Wksei0pSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pi+56S66ZSZ6K+v5raI5oGvXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5lcnJvcihg5Y+R5biD5aSx6LSlOiAke21lc3NhZ2UgfHwgJ+a1geeoi+aJp+ihjOW8guW4uCd9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlkK/liqjkuIvkuIDkuKrmtYHnqItcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc1N1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjdXJyZW50SW5kZXggPSB0aGlzLnB1Ymxpc2hQcm9ncmVzc0xpc3QuZmluZEluZGV4KGl0ZW0gPT4gaXRlbS5mbG93TmFtZSA9PT0gZmxvd05hbWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjdXJyZW50SW5kZXggPj0gMCAmJiBjdXJyZW50SW5kZXggPCB0aGlzLnB1Ymxpc2hQcm9ncmVzc0xpc3QubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBuZXh0RmxvdyA9IHRoaXMucHVibGlzaFByb2dyZXNzTGlzdFtjdXJyZW50SW5kZXggKyAxXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHRGbG93LnN0YXR1cyA9PT0gJ2lkbGUnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0Rmxvdy5zdGF0dXMgPSAncnVubmluZyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXh0Rmxvdy5tZXNzYWdlID0gJ+ato+WcqOaJp+ihjC4uLic7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg5byA5aeL5omn6KGM5LiL5LiA5Liq5rWB56iLOiAke25leHRGbG93LmZsb3dOYW1lfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChjdXJyZW50SW5kZXggPT09IHRoaXMucHVibGlzaFByb2dyZXNzTGlzdC5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOacgOWQjuS4gOS4qua1geeoi+WujOaIkFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2hTdGF0dXMgPSAnc3VjY2Vzcyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuaW5mbygn5omA5pyJ5Y+R5biD5rWB56iL5bey5a6M5oiQJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDliKTmlq3mmK/lkKbmiYDmnInmtYHnqIvpg73lt7LlrozmiJBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGFsbENvbXBsZXRlZCA9IHRoaXMucHVibGlzaFByb2dyZXNzTGlzdC5ldmVyeShpdGVtID0+IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uc3RhdHVzID09PSAnc3VjY2VzcycgfHwgaXRlbS5zdGF0dXMgPT09ICdmYWlsZWQnIHx8IGl0ZW0uc3RhdHVzID09PSAnY2FuY2VsZWQnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWxsQ29tcGxldGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWxsU3VjY2VzcyA9IHRoaXMucHVibGlzaFByb2dyZXNzTGlzdC5ldmVyeShpdGVtID0+IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2hTdGF0dXMgPSBhbGxTdWNjZXNzID8gJ3N1Y2Nlc3MnIDogJ2ZhaWxlZCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgICAgICAgICAqIOmHjee9ruWPkeW4g+eKtuaAgVxyXG4gICAgICAgICAgICAgICAgICAgICAqL1xyXG4gICAgICAgICAgICAgICAgICAgIHJlc2V0UHVibGlzaCh0aGlzOiBNeUNvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2hTdGF0dXMgPSAnaWRsZSc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaFByb2dyZXNzTGlzdCA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgLyoqXHJcbiAgICAgICAgICAgICAgICAgICAgICog5Y+W5raI5Y+R5biDXHJcbiAgICAgICAgICAgICAgICAgICAgICovXHJcbiAgICAgICAgICAgICAgICAgICAgY2FuY2VsUHVibGlzaCh0aGlzOiBNeUNvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5wdWJsaXNoU3RhdHVzICE9PSAncHVibGlzaGluZycpIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDkvb/nlKjmtYHnqIvnrqHnkIblmajlj5bmtojlj5HluINcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmxvd01hbmFnZXIuY2FuY2VsQWxsRmxvd3MoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoU3RhdHVzID0gJ2NhbmNlbGVkJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5pu05paw6L+b5bqm5p2h54q25oCBXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2hQcm9ncmVzc0xpc3QuZm9yRWFjaChmbG93ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmxvdy5zdGF0dXMgPT09ICdydW5uaW5nJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbG93LnN0YXR1cyA9ICdjYW5jZWxlZCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsb3cubWVzc2FnZSA9ICfnlKjmiLflt7Llj5bmtognO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoZmxvdy5zdGF0dXMgPT09ICdpZGxlJykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbG93LnN0YXR1cyA9ICdjYW5jZWxlZCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsb3cubWVzc2FnZSA9ICfmtYHnqIvlt7Llj5bmtognO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuRGlhbG9nLmluZm8oJ+WPkeW4g+W3suWPlua2iCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5Y+W5raI5Y+R5biD5aSx6LSlOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuZXJyb3IoYOWPlua2iOWPkeW4g+Wksei0pTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcil9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgbW91bnRlZCh0aGlzOiBNeUNvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCflj5HluIPmtYHnqIvnu4Tku7blt7LmjILovb0nKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDb25maWdQYXRoID0gdGhpcy5nZXRDb25maWdQYXRoKHRoaXMuYWN0aXZlVGFiKTtcclxuICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6XphY3nva7nm67lvZXmmK/lkKblrZjlnKhcclxuICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb25maWdGaWxlcyA9IHJlYWRkaXJTeW5jKHRoaXMuY29uZmlnRGlyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+WPkeeOsOmFjee9ruaWh+S7tu+8micsIGNvbmZpZ0ZpbGVzKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ+mFjee9ruebruW9leS4jeWtmOWcqOaIluaXoOazleiuv+mXrjonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWIneWni+WMlua1geeoi+euoeeQhuWZqFxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmxvd01hbmFnZXIgPSBuZXcgRmxvd01hbmFnZXIoe1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwcm9qZWN0UGF0aDogRWRpdG9yLlByb2plY3QucGF0aCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgb25Qcm9ncmVzc1VwZGF0ZTogKGZsb3dOYW1lLCBwcm9ncmVzcywgbWVzc2FnZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVQcm9ncmVzcyhmbG93TmFtZSwgcHJvZ3Jlc3MsIG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBvbkZsb3dDb21wbGV0ZTogKGZsb3dOYW1lLCBpc1N1Y2Nlc3MsIG1lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmluaXNoRmxvdyhmbG93TmFtZSwgaXNTdWNjZXNzLCBtZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIC8vIOWKoOi9veWPkeW4g+iuvue9rlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFB1Ymxpc2hTZXR0aW5ncygpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgLy8g5Yib5bu65bqU55So5a6e5L6LXHJcbiAgICAgICAgICAgIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7XHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogYDxNeUNvbXBvbmVudCAvPmAsXHJcbiAgICAgICAgICAgICAgICBjb21wb25lbnRzOiB7IE15Q29tcG9uZW50IH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBhcHAuY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5pc0N1c3RvbUVsZW1lbnQgPSB0YWcgPT4gdGFnLnN0YXJ0c1dpdGgoJ3VpLScpO1xyXG4gICAgICAgICAgICBhcHAubW91bnQodGhpcy4kLmFwcCk7XHJcbiAgICAgICAgICAgIHBhbmVsRGF0YU1hcC5zZXQodGhpcywgYXBwKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGNsb3NlKCkge1xyXG4gICAgICAgIGNvbnN0IGFwcCA9IHBhbmVsRGF0YU1hcC5nZXQodGhpcyk7XHJcbiAgICAgICAgaWYgKGFwcCkge1xyXG4gICAgICAgICAgICAvLyDlnKjlhbPpl63pnaLmnb/liY3vvIzlsJ3or5Xlj5bmtojmiYDmnInmraPlnKjov5DooYznmoTmtYHnqItcclxuICAgICAgICAgICAgY29uc3QgY29tcG9uZW50ID0gYXBwLl9pbnN0YW5jZT8ucHJveHkgYXMgTXlDb21wb25lbnQgfCB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIGlmIChjb21wb25lbnQ/LmZsb3dNYW5hZ2VyKSB7XHJcbiAgICAgICAgICAgICAgICBjb21wb25lbnQuZmxvd01hbmFnZXIuY2FuY2VsQWxsRmxvd3MoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhcHAudW5tb3VudCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSk7ICJdfQ==
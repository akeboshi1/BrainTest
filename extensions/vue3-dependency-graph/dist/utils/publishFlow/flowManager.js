"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FlowManager = exports.FLOW_CONFIG = exports.FlowType = exports.PublishConfigType = void 0;
const interfaces_1 = require("./interfaces");
const cocosBuilderFlow_1 = require("./cocosBuilderFlow");
const publishSettingFlow_1 = require("./publishSettingFlow");
const bundleVersionsUpdateFlow_1 = require("./bundleVersionsUpdateFlow");
const generateBundleVersionFlow_1 = require("./generateBundleVersionFlow");
const publishBundleToServerFlow_1 = require("./publishBundleToServerFlow");
const bundleVersionsPushFlow_1 = require("./bundleVersionsPushFlow");
const path_1 = require("path");
const fs_extra_1 = require("fs-extra");
// 定义发布配置类型
var PublishConfigType;
(function (PublishConfigType) {
    PublishConfigType["FULL_PACKAGE"] = "android-apk-full-package.json";
    PublishConfigType["REMOTE_STARTUP"] = "android-apk-remote.json";
    PublishConfigType["REMOTE_BUNDLES"] = "android-bundle-remote.json";
})(PublishConfigType || (exports.PublishConfigType = PublishConfigType = {}));
/**
 * 流程类型定义
 */
var FlowType;
(function (FlowType) {
    FlowType["PUBLISH_SETTING"] = "\u4FEE\u6539\u53D1\u5E03\u8BBE\u7F6E";
    FlowType["BUNDLE_UPDATE"] = "\u66F4\u65B0Bundle\u7248\u672C\u5E93";
    FlowType["COCOS_BUILD"] = "Cocos Creator \u53D1\u5E03";
    FlowType["GENERATE_BUNDLE_VERSION"] = "\u751F\u6210Bundle\u7248\u672C";
    FlowType["PUBLISH_TO_SERVER"] = "\u53D1\u5E03Bundle\u5230\u670D\u52A1\u5668";
    FlowType["PUSH_VERSION"] = "\u63D0\u4EA4Bundle\u7248\u672C";
})(FlowType || (exports.FlowType = FlowType = {}));
/**
 * 流程与页签关系配置
 */
exports.FLOW_CONFIG = {
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
class FlowManager {
    constructor(config) {
        this.flows = new Map();
        this.config = config;
    }
    /**
     * 获取发布流程
     */
    getPublishFlow(configType) {
        const flowId = `publish-${configType}`;
        if (!this.flows.has(flowId)) {
            // 创建新的发布流程
            const flow = new cocosBuilderFlow_1.CocosBuilderFlow();
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
                        this.config.onFlowComplete(FlowType.COCOS_BUILD, method === interfaces_1.FinishMethod.SUCCESS, message);
                    }
                });
            }
            this.flows.set(flowId, flow);
        }
        return this.flows.get(flowId);
    }
    /**
     * 获取发布设置流程
     */
    getPublishSettingFlow() {
        const flowId = 'publish-setting';
        if (!this.flows.has(flowId)) {
            // 创建新的发布设置流程
            const flow = new publishSettingFlow_1.PublishSettingFlow();
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
                        this.config.onFlowComplete(FlowType.PUBLISH_SETTING, method === interfaces_1.FinishMethod.SUCCESS, message);
                    }
                });
            }
            this.flows.set(flowId, flow);
        }
        return this.flows.get(flowId);
    }
    /**
     * 获取Bundle版本更新流程
     */
    getBundleVersionsUpdateFlow() {
        const flowId = 'bundle-versions-update';
        if (!this.flows.has(flowId)) {
            // 创建新的Bundle版本更新流程
            const flow = new bundleVersionsUpdateFlow_1.BundleVersionsUpdateFlow();
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
                        this.config.onFlowComplete(FlowType.BUNDLE_UPDATE, method === interfaces_1.FinishMethod.SUCCESS, message);
                    }
                });
            }
            this.flows.set(flowId, flow);
        }
        return this.flows.get(flowId);
    }
    /**
     * 获取生成Bundle版本流程
     */
    getGenerateBundleVersionFlow() {
        const flowId = 'generate-bundle-version';
        if (!this.flows.has(flowId)) {
            // 创建新的生成Bundle版本流程
            const flow = new generateBundleVersionFlow_1.GenerateBundleVersionFlow();
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
                flow.setFinishedCallback((method, message) => {
                    if (this.config.onFlowComplete) {
                        this.config.onFlowComplete(FlowType.GENERATE_BUNDLE_VERSION, method === interfaces_1.FinishMethod.SUCCESS, message);
                    }
                });
            }
            this.flows.set(flowId, flow);
        }
        return this.flows.get(flowId);
    }
    /**
     * 获取发布Bundle到服务器流程
     */
    getPublishBundleToServerFlow() {
        const flowId = 'publish-bundle-to-server';
        if (!this.flows.has(flowId)) {
            // 创建新的发布Bundle到服务器流程
            const flow = new publishBundleToServerFlow_1.PublishBundleToServerFlow();
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
                        this.config.onFlowComplete(FlowType.PUBLISH_TO_SERVER, method === interfaces_1.FinishMethod.SUCCESS, message);
                    }
                });
            }
            this.flows.set(flowId, flow);
        }
        return this.flows.get(flowId);
    }
    /**
     * 获取Bundle版本推送流程
     */
    getBundleVersionsPushFlow() {
        const flowId = 'bundle-versions-push';
        if (!this.flows.has(flowId)) {
            // 创建新的Bundle版本推送流程
            const flow = new bundleVersionsPushFlow_1.BundleVersionsPushFlow();
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
                        this.config.onFlowComplete(FlowType.PUSH_VERSION, method === interfaces_1.FinishMethod.SUCCESS, message);
                    }
                });
            }
            this.flows.set(flowId, flow);
        }
        return this.flows.get(flowId);
    }
    /**
     * 初始化流程进度列表
     * @param configType 配置类型
     */
    initializeProgressList(configType) {
        if (!this.config.onProgressUpdate)
            return;
        // 确保配置类型是有效的
        const publishType = configType;
        // 获取对应配置类型的流程列表
        const flows = exports.FLOW_CONFIG[publishType] || exports.FLOW_CONFIG[PublishConfigType.FULL_PACKAGE];
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
    async updatePublishSetting(publishType, isMCI, environment, appVersion) {
        try {
            const flow = this.getPublishSettingFlow();
            // 开始更新发布设置
            const params = {
                projectPath: this.config.projectPath,
                publishType,
                isMCI,
                environment,
                appVersion
            };
            await flow.start(params);
            return true;
        }
        catch (error) {
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
    async startPublish(configType, configPath, debug = false, extraArgs = []) {
        try {
            const flow = this.getPublishFlow(configType);
            // 开始发布
            const params = {
                enginePath: this.config.enginePath || "C:/ProgramData/cocos/editors/Creator/3.8.3",
                projectPath: this.config.projectPath,
                configPath,
                debug,
                extraArgs
            };
            await flow.start(params);
            return true;
        }
        catch (error) {
            console.error(`启动发布流程失败 [${configType}]:`, error);
            return false;
        }
    }
    /**
     * 启动远程Bundle版本更新流程
     */
    async startBundleVersionsUpdate() {
        try {
            const flow = this.getBundleVersionsUpdateFlow();
            const params = {
                projectPath: this.config.projectPath
            };
            await flow.start(params);
            return true;
        }
        catch (error) {
            console.error('启动Bundle版本更新流程失败:', error);
            return false;
        }
    }
    /**
     * 启动生成Bundle版本流程
     */
    async startGenerateBundleVersion() {
        try {
            const flow = this.getGenerateBundleVersionFlow();
            const params = {
                projectPath: this.config.projectPath,
                targetPath: (0, path_1.join)(this.config.projectPath, 'build/android/remote')
            };
            await flow.start(params);
            return true;
        }
        catch (error) {
            console.error('启动生成Bundle版本流程失败:', error);
            return false;
        }
    }
    /**
     * 启动发布Bundle到服务器流程
     * @param environment 环境设置
     */
    async startPublishBundleToServer(environment) {
        try {
            const flow = this.getPublishBundleToServerFlow();
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
                const configPath = (0, path_1.join)(this.config.projectPath, 'sftp-config.json');
                if ((0, fs_extra_1.existsSync)(configPath)) {
                    const configData = JSON.parse((0, fs_extra_1.readFileSync)(configPath, 'utf-8'));
                    sftpConfig = configData;
                }
                else {
                    console.warn('SFTP配置文件不存在，使用默认配置');
                }
            }
            catch (error) {
                console.error('读取SFTP配置失败:', error);
            }
            const params = {
                projectPath: this.config.projectPath,
                environment: env,
                sftpConfig: sftpConfig
            };
            await flow.start(params);
            return true;
        }
        catch (error) {
            console.error('启动发布Bundle到服务器流程失败:', error);
            return false;
        }
    }
    /**
     * 启动Bundle版本推送流程
     * @param commitMessage 提交信息
     */
    async startBundleVersionsPush(commitMessage) {
        try {
            const flow = this.getBundleVersionsPushFlow();
            const params = {
                projectPath: this.config.projectPath,
                commitMessage
            };
            await flow.start(params);
            return true;
        }
        catch (error) {
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
    async executeFullPublishProcess(configType, configPath, isMCI, environment, appVersion, debug = false) {
        try {
            // 初始化进度列表，添加所需的流程
            this.initializeProgressList(configType);
            // 取消所有正在运行的流程，确保干净的开始
            this.cancelAllFlows();
            console.log(`开始执行 ${configType} 的发布流程，串行执行各子流程`);
            // 根据不同的发布类型执行不同的流程
            if (configType === PublishConfigType.REMOTE_BUNDLES) {
                // REMOTE_BUNDLES 需要执行完整的六步流程，必须严格串行
                // 1. 更新发布设置
                console.log('步骤1: 修改发布设置');
                const settingSuccess = await this.updatePublishSetting(configType, isMCI, environment, appVersion);
                if (!settingSuccess) {
                    console.error('步骤1失败: 无法更新发布设置，发布过程终止');
                    return false;
                }
                // 2. 从Git更新Bundle版本信息
                console.log('步骤2: 从Git更新Bundle版本信息');
                const updateSuccess = await this.startBundleVersionsUpdate();
                if (!updateSuccess) {
                    console.error('步骤2失败: 无法更新Bundle版本，发布过程终止');
                    return false;
                }
                // 3. 执行Cocos发布
                console.log('步骤3: 执行Cocos Creator发布');
                const publishSuccess = await this.startPublish(configType, configPath, debug);
                if (!publishSuccess) {
                    console.error('步骤3失败: Cocos发布失败，发布过程终止');
                    return false;
                }
                // 4. 生成Bundle版本文件
                console.log('步骤4: 生成Bundle版本文件');
                const generateSuccess = await this.startGenerateBundleVersion();
                if (!generateSuccess) {
                    console.error('步骤4失败: 生成Bundle版本失败，发布过程终止');
                    return false;
                }
                // 5. 发布Bundle到服务器
                console.log('步骤5: 发布Bundle到服务器');
                const publishToServerSuccess = await this.startPublishBundleToServer(environment || 'DEVELOPMENT');
                if (!publishToServerSuccess) {
                    console.error('步骤5失败: 发布Bundle到服务器失败，发布过程终止');
                    return false;
                }
                // 6. 提交Bundle版本到Git
                console.log('步骤6: 提交Bundle版本到Git');
                const pushSuccess = await this.startBundleVersionsPush(`更新Bundle版本 [${environment}] v${appVersion}`);
                if (!pushSuccess) {
                    console.error('步骤6失败: 提交Bundle版本失败，发布过程终止');
                    return false;
                }
                console.log('所有流程执行完成，REMOTE_BUNDLES发布成功');
                return true;
            }
            else {
                // 其他发布类型(FULL_PACKAGE, REMOTE_STARTUP)只执行基本流程
                // 1. 更新发布设置
                console.log('步骤1: 修改发布设置');
                const settingSuccess = await this.updatePublishSetting(configType, isMCI, environment, appVersion);
                if (!settingSuccess) {
                    console.error('步骤1失败: 无法更新发布设置，发布过程终止');
                    return false;
                }
                // 2. 执行Cocos发布
                console.log('步骤2: 执行Cocos Creator发布');
                const publishSuccess = await this.startPublish(configType, configPath, debug);
                if (!publishSuccess) {
                    console.error('步骤2失败: Cocos发布失败，发布过程终止');
                    return false;
                }
                console.log(`所有流程执行完成，${configType}发布成功`);
                return true;
            }
        }
        catch (error) {
            console.error(`执行完整发布流程失败 [${configType}]:`, error);
            // 发生异常时，取消所有正在运行的流程
            this.cancelAllFlows();
            return false;
        }
    }
    /**
     * 取消发布流程
     * @param configType 配置类型
     */
    cancelPublish(configType) {
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
    getActiveFlows() {
        return Array.from(this.flows.values()).filter(flow => flow.isRunning);
    }
    /**
     * 取消所有活动的流程
     */
    cancelAllFlows() {
        const activeFlows = this.getActiveFlows();
        if (activeFlows.length > 0) {
            console.log(`正在取消 ${activeFlows.length} 个活动流程`);
            for (const flow of activeFlows) {
                try {
                    flow.cancel();
                    console.log(`已取消流程: ${flow.name}`);
                }
                catch (error) {
                    console.error(`取消流程 ${flow.name} 时出错:`, error);
                }
            }
        }
    }
}
exports.FlowManager = FlowManager;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxvd01hbmFnZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvdXRpbHMvcHVibGlzaEZsb3cvZmxvd01hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNkNBQTBFO0FBQzFFLHlEQUEwRTtBQUMxRSw2REFBZ0Y7QUFDaEYseUVBQWtHO0FBQ2xHLDJFQUFxRztBQUNyRywyRUFBcUc7QUFDckcscUVBQTRGO0FBQzVGLCtCQUE0QjtBQUM1Qix1Q0FBb0Q7QUFFcEQsV0FBVztBQUNYLElBQVksaUJBSVg7QUFKRCxXQUFZLGlCQUFpQjtJQUN6QixtRUFBOEMsQ0FBQTtJQUM5QywrREFBMEMsQ0FBQTtJQUMxQyxrRUFBNkMsQ0FBQTtBQUNqRCxDQUFDLEVBSlcsaUJBQWlCLGlDQUFqQixpQkFBaUIsUUFJNUI7QUEyQkQ7O0dBRUc7QUFDSCxJQUFZLFFBT1g7QUFQRCxXQUFZLFFBQVE7SUFDaEIsb0VBQTBCLENBQUE7SUFDMUIsa0VBQTZCLENBQUE7SUFDN0Isc0RBQWdDLENBQUE7SUFDaEMsc0VBQXNDLENBQUE7SUFDdEMsNEVBQWtDLENBQUE7SUFDbEMsMkRBQTJCLENBQUE7QUFDL0IsQ0FBQyxFQVBXLFFBQVEsd0JBQVIsUUFBUSxRQU9uQjtBQUVEOztHQUVHO0FBQ1UsUUFBQSxXQUFXLEdBQTBDO0lBQzlELENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLEVBQUU7UUFDOUIsUUFBUSxDQUFDLGVBQWU7UUFDeEIsUUFBUSxDQUFDLFdBQVc7S0FDdkI7SUFDRCxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxFQUFFO1FBQ2hDLFFBQVEsQ0FBQyxlQUFlO1FBQ3hCLFFBQVEsQ0FBQyxXQUFXO0tBQ3ZCO0lBQ0QsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsRUFBRTtRQUNoQyxRQUFRLENBQUMsZUFBZTtRQUN4QixRQUFRLENBQUMsYUFBYTtRQUN0QixRQUFRLENBQUMsV0FBVztRQUNwQixRQUFRLENBQUMsdUJBQXVCO1FBQ2hDLFFBQVEsQ0FBQyxpQkFBaUI7UUFDMUIsUUFBUSxDQUFDLFlBQVk7S0FDeEI7Q0FDSixDQUFDO0FBRUY7O0dBRUc7QUFDSCxNQUFhLFdBQVc7SUFJcEIsWUFBWSxNQUF5QjtRQUhwQixVQUFLLEdBQTZCLElBQUksR0FBRyxFQUFFLENBQUM7UUFJekQsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDekIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsY0FBYyxDQUFDLFVBQWtCO1FBQzdCLE1BQU0sTUFBTSxHQUFHLFdBQVcsVUFBVSxFQUFFLENBQUM7UUFFdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDMUIsV0FBVztZQUNYLE1BQU0sSUFBSSxHQUFHLElBQUksbUNBQWdCLEVBQUUsQ0FBQztZQUVwQyxTQUFTO1lBQ1QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsRUFBRTtvQkFDM0MsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7d0JBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQzFFLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDO1lBRUQsU0FBUztZQUNULElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFO29CQUN6QyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7d0JBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUN0QixRQUFRLENBQUMsV0FBVyxFQUNwQixNQUFNLEtBQUsseUJBQVksQ0FBQyxPQUFPLEVBQy9CLE9BQU8sQ0FDVixDQUFDO29CQUNOLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDO1lBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBRSxDQUFDO0lBQ25DLENBQUM7SUFFRDs7T0FFRztJQUNILHFCQUFxQjtRQUNqQixNQUFNLE1BQU0sR0FBRyxpQkFBaUIsQ0FBQztRQUVqQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztZQUMxQixhQUFhO1lBQ2IsTUFBTSxJQUFJLEdBQUcsSUFBSSx1Q0FBa0IsRUFBRSxDQUFDO1lBRXRDLFNBQVM7WUFDVCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxFQUFFO29CQUMzQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQzt3QkFDL0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDOUUsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztZQUNQLENBQUM7WUFFRCxTQUFTO1lBQ1QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUU7b0JBQ3pDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQzt3QkFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQ3RCLFFBQVEsQ0FBQyxlQUFlLEVBQ3hCLE1BQU0sS0FBSyx5QkFBWSxDQUFDLE9BQU8sRUFDL0IsT0FBTyxDQUNWLENBQUM7b0JBQ04sQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztZQUNQLENBQUM7WUFFRCxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDakMsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFFLENBQUM7SUFDbkMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsMkJBQTJCO1FBQ3ZCLE1BQU0sTUFBTSxHQUFHLHdCQUF3QixDQUFDO1FBRXhDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzFCLG1CQUFtQjtZQUNuQixNQUFNLElBQUksR0FBRyxJQUFJLG1EQUF3QixFQUFFLENBQUM7WUFFNUMsU0FBUztZQUNULElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dCQUMvQixJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLEVBQUU7b0JBQzNDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO3dCQUMvQixJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxhQUFhLEVBQUUsUUFBUSxFQUFFLE9BQU8sQ0FBQyxDQUFDO29CQUM1RSxDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztZQUVELFNBQVM7WUFDVCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsRUFBRTtvQkFDekMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO3dCQUM3QixJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FDdEIsUUFBUSxDQUFDLGFBQWEsRUFDdEIsTUFBTSxLQUFLLHlCQUFZLENBQUMsT0FBTyxFQUMvQixPQUFPLENBQ1YsQ0FBQztvQkFDTixDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztZQUVELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCw0QkFBNEI7UUFDeEIsTUFBTSxNQUFNLEdBQUcseUJBQXlCLENBQUM7UUFFekMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDMUIsbUJBQW1CO1lBQ25CLE1BQU0sSUFBSSxHQUFHLElBQUkscURBQXlCLEVBQUUsQ0FBQztZQUU3QyxTQUFTO1lBQ1QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsRUFBRTtvQkFDM0MsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7d0JBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLHVCQUF1QixFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDdEYsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztZQUNQLENBQUM7WUFFRCxTQUFTO1lBQ1QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUU7b0JBQ3pDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQzt3QkFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQ3RCLFFBQVEsQ0FBQyx1QkFBdUIsRUFDaEMsTUFBTSxLQUFLLHlCQUFZLENBQUMsT0FBTyxFQUMvQixPQUFPLENBQ1YsQ0FBQztvQkFDTixDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztZQUVELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCw0QkFBNEI7UUFDeEIsTUFBTSxNQUFNLEdBQUcsMEJBQTBCLENBQUM7UUFFMUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDMUIscUJBQXFCO1lBQ3JCLE1BQU0sSUFBSSxHQUFHLElBQUkscURBQXlCLEVBQUUsQ0FBQztZQUU3QyxTQUFTO1lBQ1QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsRUFBRTtvQkFDM0MsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7d0JBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLFFBQVEsRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDaEYsQ0FBQztnQkFDTCxDQUFDLENBQUMsQ0FBQztZQUNQLENBQUM7WUFFRCxTQUFTO1lBQ1QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUM3QixJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLEVBQUU7b0JBQ3pDLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQzt3QkFDN0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQ3RCLFFBQVEsQ0FBQyxpQkFBaUIsRUFDMUIsTUFBTSxLQUFLLHlCQUFZLENBQUMsT0FBTyxFQUMvQixPQUFPLENBQ1YsQ0FBQztvQkFDTixDQUFDO2dCQUNMLENBQUMsQ0FBQyxDQUFDO1lBQ1AsQ0FBQztZQUVELElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqQyxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUUsQ0FBQztJQUNuQyxDQUFDO0lBRUQ7O09BRUc7SUFDSCx5QkFBeUI7UUFDckIsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUM7UUFFdEMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDMUIsbUJBQW1CO1lBQ25CLE1BQU0sSUFBSSxHQUFHLElBQUksK0NBQXNCLEVBQUUsQ0FBQztZQUUxQyxTQUFTO1lBQ1QsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQy9CLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsRUFBRTtvQkFDM0MsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixFQUFFLENBQUM7d0JBQy9CLElBQUksQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLFlBQVksRUFBRSxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7b0JBQzNFLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDO1lBRUQsU0FBUztZQUNULElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFO29CQUN6QyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUM7d0JBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUN0QixRQUFRLENBQUMsWUFBWSxFQUNyQixNQUFNLEtBQUsseUJBQVksQ0FBQyxPQUFPLEVBQy9CLE9BQU8sQ0FDVixDQUFDO29CQUNOLENBQUM7Z0JBQ0wsQ0FBQyxDQUFDLENBQUM7WUFDUCxDQUFDO1lBRUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pDLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBRSxDQUFDO0lBQ25DLENBQUM7SUFFRDs7O09BR0c7SUFDSCxzQkFBc0IsQ0FBQyxVQUFzQztRQUN6RCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0I7WUFBRSxPQUFPO1FBRTFDLGFBQWE7UUFDYixNQUFNLFdBQVcsR0FBRyxVQUErQixDQUFDO1FBRXBELGdCQUFnQjtRQUNoQixNQUFNLEtBQUssR0FBRyxtQkFBVyxDQUFDLFdBQVcsQ0FBQyxJQUFJLG1CQUFXLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLENBQUM7UUFFdEYsZUFBZTtRQUNmLEtBQUssTUFBTSxRQUFRLElBQUksS0FBSyxFQUFFLENBQUM7WUFDM0IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3RELENBQUM7SUFDTCxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsS0FBSyxDQUFDLG9CQUFvQixDQUN0QixXQUFtQixFQUNuQixLQUFlLEVBQ2YsV0FBb0IsRUFDcEIsVUFBbUI7UUFFbkIsSUFBSSxDQUFDO1lBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixFQUF3QixDQUFDO1lBRWhFLFdBQVc7WUFDWCxNQUFNLE1BQU0sR0FBeUI7Z0JBQ2pDLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVc7Z0JBQ3BDLFdBQVc7Z0JBQ1gsS0FBSztnQkFDTCxXQUFXO2dCQUNYLFVBQVU7YUFDYixDQUFDO1lBRUYsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE9BQU8sSUFBSSxDQUFDO1FBQ2hCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLFdBQVcsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ25ELE9BQU8sS0FBSyxDQUFDO1FBQ2pCLENBQUM7SUFDTCxDQUFDO0lBRUQ7Ozs7OztPQU1HO0lBQ0gsS0FBSyxDQUFDLFlBQVksQ0FDZCxVQUFrQixFQUNsQixVQUFrQixFQUNsQixRQUFpQixLQUFLLEVBQ3RCLFlBQXNCLEVBQUU7UUFFeEIsSUFBSSxDQUFDO1lBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQXFCLENBQUM7WUFFakUsT0FBTztZQUNQLE1BQU0sTUFBTSxHQUF1QjtnQkFDL0IsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsVUFBVSxJQUFJLDRDQUE0QztnQkFDbEYsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVztnQkFDcEMsVUFBVTtnQkFDVixLQUFLO2dCQUNMLFNBQVM7YUFDWixDQUFDO1lBRUYsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE9BQU8sSUFBSSxDQUFDO1FBQ2hCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyxhQUFhLFVBQVUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ2xELE9BQU8sS0FBSyxDQUFDO1FBQ2pCLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMseUJBQXlCO1FBQzNCLElBQUksQ0FBQztZQUNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQywyQkFBMkIsRUFBOEIsQ0FBQztZQUU1RSxNQUFNLE1BQU0sR0FBK0I7Z0JBQ3ZDLFdBQVcsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVc7YUFDdkMsQ0FBQztZQUVGLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6QixPQUFPLElBQUksQ0FBQztRQUNoQixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDMUMsT0FBTyxLQUFLLENBQUM7UUFDakIsQ0FBQztJQUNMLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQywwQkFBMEI7UUFDNUIsSUFBSSxDQUFDO1lBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixFQUErQixDQUFDO1lBRTlFLE1BQU0sTUFBTSxHQUFnQztnQkFDeEMsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVztnQkFDcEMsVUFBVSxFQUFFLElBQUEsV0FBSSxFQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLHNCQUFzQixDQUFDO2FBQ3BFLENBQUM7WUFFRixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDekIsT0FBTyxJQUFJLENBQUM7UUFDaEIsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDYixPQUFPLENBQUMsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQzFDLE9BQU8sS0FBSyxDQUFDO1FBQ2pCLENBQUM7SUFDTCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLDBCQUEwQixDQUFDLFdBQW1CO1FBQ2hELElBQUksQ0FBQztZQUNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyw0QkFBNEIsRUFBK0IsQ0FBQztZQUU5RSxlQUFlO1lBQ2YsTUFBTSxHQUFHLEdBQUcsV0FBVyxDQUFDLFdBQVcsRUFBRSxLQUFLLFlBQVksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUM7WUFFdEYsV0FBVztZQUNYLElBQUksVUFBVSxHQUFHO2dCQUNiLElBQUksRUFBRSxTQUFTO2dCQUNmLElBQUksRUFBRSxFQUFFO2dCQUNSLFFBQVEsRUFBRSxLQUFLO2dCQUNmLFFBQVEsRUFBRSxJQUFJO2dCQUNkLFVBQVUsRUFBRSwyQkFBMkI7YUFDMUMsQ0FBQztZQUVGLGtCQUFrQjtZQUNsQixJQUFJLENBQUM7Z0JBQ0QsTUFBTSxVQUFVLEdBQUcsSUFBQSxXQUFJLEVBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsa0JBQWtCLENBQUMsQ0FBQztnQkFDckUsSUFBSSxJQUFBLHFCQUFVLEVBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztvQkFDekIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFBLHVCQUFZLEVBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUM7b0JBQ2pFLFVBQVUsR0FBRyxVQUFVLENBQUM7Z0JBQzVCLENBQUM7cUJBQU0sQ0FBQztvQkFDSixPQUFPLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7Z0JBQ3ZDLENBQUM7WUFDTCxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDYixPQUFPLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUN4QyxDQUFDO1lBRUQsTUFBTSxNQUFNLEdBQWdDO2dCQUN4QyxXQUFXLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXO2dCQUNwQyxXQUFXLEVBQUUsR0FBRztnQkFDaEIsVUFBVSxFQUFFLFVBQVU7YUFDekIsQ0FBQztZQUVGLE1BQU0sSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6QixPQUFPLElBQUksQ0FBQztRQUNoQixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMscUJBQXFCLEVBQUUsS0FBSyxDQUFDLENBQUM7WUFDNUMsT0FBTyxLQUFLLENBQUM7UUFDakIsQ0FBQztJQUNMLENBQUM7SUFFRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsdUJBQXVCLENBQUMsYUFBc0I7UUFDaEQsSUFBSSxDQUFDO1lBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLHlCQUF5QixFQUE0QixDQUFDO1lBRXhFLE1BQU0sTUFBTSxHQUE2QjtnQkFDckMsV0FBVyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsV0FBVztnQkFDcEMsYUFBYTthQUNoQixDQUFDO1lBRUYsTUFBTSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1lBQ3pCLE9BQU8sSUFBSSxDQUFDO1FBQ2hCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUMxQyxPQUFPLEtBQUssQ0FBQztRQUNqQixDQUFDO0lBQ0wsQ0FBQztJQUVEOzs7Ozs7OztPQVFHO0lBQ0gsS0FBSyxDQUFDLHlCQUF5QixDQUMzQixVQUFrQixFQUNsQixVQUFrQixFQUNsQixLQUFlLEVBQ2YsV0FBb0IsRUFDcEIsVUFBbUIsRUFDbkIsUUFBaUIsS0FBSztRQUV0QixJQUFJLENBQUM7WUFDRCxrQkFBa0I7WUFDbEIsSUFBSSxDQUFDLHNCQUFzQixDQUFDLFVBQStCLENBQUMsQ0FBQztZQUU3RCxzQkFBc0I7WUFDdEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBRXRCLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxVQUFVLGlCQUFpQixDQUFDLENBQUM7WUFFakQsbUJBQW1CO1lBQ25CLElBQUksVUFBVSxLQUFLLGlCQUFpQixDQUFDLGNBQWMsRUFBRSxDQUFDO2dCQUNsRCxvQ0FBb0M7Z0JBRXBDLFlBQVk7Z0JBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDM0IsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQ2xELFVBQVUsRUFDVixLQUFLLEVBQ0wsV0FBVyxFQUNYLFVBQVUsQ0FDYixDQUFDO2dCQUVGLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO29CQUN4QyxPQUFPLEtBQUssQ0FBQztnQkFDakIsQ0FBQztnQkFFRCxzQkFBc0I7Z0JBQ3RCLE9BQU8sQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQztnQkFDckMsTUFBTSxhQUFhLEdBQUcsTUFBTSxJQUFJLENBQUMseUJBQXlCLEVBQUUsQ0FBQztnQkFDN0QsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUNqQixPQUFPLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUM7b0JBQzVDLE9BQU8sS0FBSyxDQUFDO2dCQUNqQixDQUFDO2dCQUVELGVBQWU7Z0JBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO2dCQUN0QyxNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQzFDLFVBQVUsRUFDVixVQUFVLEVBQ1YsS0FBSyxDQUNSLENBQUM7Z0JBRUYsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO29CQUNsQixPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUM7b0JBQ3pDLE9BQU8sS0FBSyxDQUFDO2dCQUNqQixDQUFDO2dCQUVELGtCQUFrQjtnQkFDbEIsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO2dCQUNqQyxNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFDO2dCQUNoRSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7b0JBQ25CLE9BQU8sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQztvQkFDNUMsT0FBTyxLQUFLLENBQUM7Z0JBQ2pCLENBQUM7Z0JBRUQsa0JBQWtCO2dCQUNsQixPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUM7Z0JBQ2pDLE1BQU0sc0JBQXNCLEdBQUcsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQ2hFLFdBQVcsSUFBSSxhQUFhLENBQy9CLENBQUM7Z0JBRUYsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7b0JBQzFCLE9BQU8sQ0FBQyxLQUFLLENBQUMsOEJBQThCLENBQUMsQ0FBQztvQkFDOUMsT0FBTyxLQUFLLENBQUM7Z0JBQ2pCLENBQUM7Z0JBRUQsb0JBQW9CO2dCQUNwQixPQUFPLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUM7Z0JBQ25DLE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLHVCQUF1QixDQUNsRCxlQUFlLFdBQVcsTUFBTSxVQUFVLEVBQUUsQ0FDL0MsQ0FBQztnQkFFRixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO29CQUM1QyxPQUFPLEtBQUssQ0FBQztnQkFDakIsQ0FBQztnQkFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUM7Z0JBQzNDLE9BQU8sSUFBSSxDQUFDO1lBQ2hCLENBQUM7aUJBQU0sQ0FBQztnQkFDSiw4Q0FBOEM7Z0JBRTlDLFlBQVk7Z0JBQ1osT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQztnQkFDM0IsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsb0JBQW9CLENBQ2xELFVBQVUsRUFDVixLQUFLLEVBQ0wsV0FBVyxFQUNYLFVBQVUsQ0FDYixDQUFDO2dCQUVGLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO29CQUN4QyxPQUFPLEtBQUssQ0FBQztnQkFDakIsQ0FBQztnQkFFRCxlQUFlO2dCQUNmLE9BQU8sQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQztnQkFDdEMsTUFBTSxjQUFjLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUMxQyxVQUFVLEVBQ1YsVUFBVSxFQUNWLEtBQUssQ0FDUixDQUFDO2dCQUVGLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDbEIsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO29CQUN6QyxPQUFPLEtBQUssQ0FBQztnQkFDakIsQ0FBQztnQkFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksVUFBVSxNQUFNLENBQUMsQ0FBQztnQkFDMUMsT0FBTyxJQUFJLENBQUM7WUFDaEIsQ0FBQztRQUNMLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLFVBQVUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3BELG9CQUFvQjtZQUNwQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDdEIsT0FBTyxLQUFLLENBQUM7UUFDakIsQ0FBQztJQUNMLENBQUM7SUFFRDs7O09BR0c7SUFDSCxhQUFhLENBQUMsVUFBa0I7UUFDNUIsTUFBTSxNQUFNLEdBQUcsV0FBVyxVQUFVLEVBQUUsQ0FBQztRQUN2QyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVwQyxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDekIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2QsT0FBTyxJQUFJLENBQUM7UUFDaEIsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFDO0lBQ2pCLENBQUM7SUFFRDs7T0FFRztJQUNILGNBQWM7UUFDVixPQUFPLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUMxRSxDQUFDO0lBRUQ7O09BRUc7SUFDSCxjQUFjO1FBQ1YsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1FBQzFDLElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN6QixPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsV0FBVyxDQUFDLE1BQU0sUUFBUSxDQUFDLENBQUM7WUFDaEQsS0FBSyxNQUFNLElBQUksSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDN0IsSUFBSSxDQUFDO29CQUNELElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztvQkFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7Z0JBQ3ZDLENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDYixPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsSUFBSSxDQUFDLElBQUksT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO2dCQUNuRCxDQUFDO1lBQ0wsQ0FBQztRQUNMLENBQUM7SUFDTCxDQUFDO0NBQ0o7QUE5bEJELGtDQThsQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBQcm9jZXNzRmxvdywgUHVibGlzaFByb2dyZXNzLCBGaW5pc2hNZXRob2QgfSBmcm9tICcuL2ludGVyZmFjZXMnO1xyXG5pbXBvcnQgeyBDb2Nvc0J1aWxkZXJGbG93LCBDb2Nvc0J1aWxkZXJQYXJhbXMgfSBmcm9tICcuL2NvY29zQnVpbGRlckZsb3cnO1xyXG5pbXBvcnQgeyBQdWJsaXNoU2V0dGluZ0Zsb3csIFB1Ymxpc2hTZXR0aW5nUGFyYW1zIH0gZnJvbSAnLi9wdWJsaXNoU2V0dGluZ0Zsb3cnO1xyXG5pbXBvcnQgeyBCdW5kbGVWZXJzaW9uc1VwZGF0ZUZsb3csIEJ1bmRsZVZlcnNpb25zVXBkYXRlUGFyYW1zIH0gZnJvbSAnLi9idW5kbGVWZXJzaW9uc1VwZGF0ZUZsb3cnO1xyXG5pbXBvcnQgeyBHZW5lcmF0ZUJ1bmRsZVZlcnNpb25GbG93LCBHZW5lcmF0ZUJ1bmRsZVZlcnNpb25QYXJhbXMgfSBmcm9tICcuL2dlbmVyYXRlQnVuZGxlVmVyc2lvbkZsb3cnO1xyXG5pbXBvcnQgeyBQdWJsaXNoQnVuZGxlVG9TZXJ2ZXJGbG93LCBQdWJsaXNoQnVuZGxlVG9TZXJ2ZXJQYXJhbXMgfSBmcm9tICcuL3B1Ymxpc2hCdW5kbGVUb1NlcnZlckZsb3cnO1xyXG5pbXBvcnQgeyBCdW5kbGVWZXJzaW9uc1B1c2hGbG93LCBCdW5kbGVWZXJzaW9uc1B1c2hQYXJhbXMgfSBmcm9tICcuL2J1bmRsZVZlcnNpb25zUHVzaEZsb3cnO1xyXG5pbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XHJcbmltcG9ydCB7IGV4aXN0c1N5bmMsIHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcclxuXHJcbi8vIOWumuS5ieWPkeW4g+mFjee9ruexu+Wei1xyXG5leHBvcnQgZW51bSBQdWJsaXNoQ29uZmlnVHlwZSB7XHJcbiAgICBGVUxMX1BBQ0tBR0UgPSAnYW5kcm9pZC1hcGstZnVsbC1wYWNrYWdlLmpzb24nLFxyXG4gICAgUkVNT1RFX1NUQVJUVVAgPSAnYW5kcm9pZC1hcGstcmVtb3RlLmpzb24nLFxyXG4gICAgUkVNT1RFX0JVTkRMRVMgPSAnYW5kcm9pZC1idW5kbGUtcmVtb3RlLmpzb24nXHJcbn1cclxuXHJcbi8qKlxyXG4gKiDmtYHnqIvnrqHnkIblmajphY3nva5cclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmxvd01hbmFnZXJDb25maWcge1xyXG4gICAgLyoqXHJcbiAgICAgKiDlj5HluIPlvJXmk47ot6/lvoRcclxuICAgICAqL1xyXG4gICAgZW5naW5lUGF0aD86IHN0cmluZztcclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDpobnnm67ot6/lvoRcclxuICAgICAqL1xyXG4gICAgcHJvamVjdFBhdGg6IHN0cmluZztcclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDov5vluqblm57osINcclxuICAgICAqL1xyXG4gICAgb25Qcm9ncmVzc1VwZGF0ZT86IChmbG93TmFtZTogc3RyaW5nLCBwcm9ncmVzczogbnVtYmVyLCBtZXNzYWdlPzogc3RyaW5nKSA9PiB2b2lkO1xyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOa1geeoi+WujOaIkOWbnuiwg1xyXG4gICAgICovXHJcbiAgICBvbkZsb3dDb21wbGV0ZT86IChmbG93TmFtZTogc3RyaW5nLCBpc1N1Y2Nlc3M6IGJvb2xlYW4sIG1lc3NhZ2U/OiBzdHJpbmcpID0+IHZvaWQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiDmtYHnqIvnsbvlnovlrprkuYlcclxuICovXHJcbmV4cG9ydCBlbnVtIEZsb3dUeXBlIHtcclxuICAgIFBVQkxJU0hfU0VUVElORyA9ICfkv67mlLnlj5HluIPorr7nva4nLFxyXG4gICAgQlVORExFX1VQREFURSA9ICfmm7TmlrBCdW5kbGXniYjmnKzlupMnLFxyXG4gICAgQ09DT1NfQlVJTEQgPSAnQ29jb3MgQ3JlYXRvciDlj5HluIMnLFxyXG4gICAgR0VORVJBVEVfQlVORExFX1ZFUlNJT04gPSAn55Sf5oiQQnVuZGxl54mI5pysJyxcclxuICAgIFBVQkxJU0hfVE9fU0VSVkVSID0gJ+WPkeW4g0J1bmRsZeWIsOacjeWKoeWZqCcsXHJcbiAgICBQVVNIX1ZFUlNJT04gPSAn5o+Q5LqkQnVuZGxl54mI5pysJ1xyXG59XHJcblxyXG4vKipcclxuICog5rWB56iL5LiO6aG1562+5YWz57O76YWN572uXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgRkxPV19DT05GSUc6IFJlY29yZDxQdWJsaXNoQ29uZmlnVHlwZSwgRmxvd1R5cGVbXT4gPSB7XHJcbiAgICBbUHVibGlzaENvbmZpZ1R5cGUuRlVMTF9QQUNLQUdFXTogW1xyXG4gICAgICAgIEZsb3dUeXBlLlBVQkxJU0hfU0VUVElORyxcclxuICAgICAgICBGbG93VHlwZS5DT0NPU19CVUlMRFxyXG4gICAgXSxcclxuICAgIFtQdWJsaXNoQ29uZmlnVHlwZS5SRU1PVEVfU1RBUlRVUF06IFtcclxuICAgICAgICBGbG93VHlwZS5QVUJMSVNIX1NFVFRJTkcsXHJcbiAgICAgICAgRmxvd1R5cGUuQ09DT1NfQlVJTERcclxuICAgIF0sXHJcbiAgICBbUHVibGlzaENvbmZpZ1R5cGUuUkVNT1RFX0JVTkRMRVNdOiBbXHJcbiAgICAgICAgRmxvd1R5cGUuUFVCTElTSF9TRVRUSU5HLFxyXG4gICAgICAgIEZsb3dUeXBlLkJVTkRMRV9VUERBVEUsXHJcbiAgICAgICAgRmxvd1R5cGUuQ09DT1NfQlVJTEQsXHJcbiAgICAgICAgRmxvd1R5cGUuR0VORVJBVEVfQlVORExFX1ZFUlNJT04sXHJcbiAgICAgICAgRmxvd1R5cGUuUFVCTElTSF9UT19TRVJWRVIsXHJcbiAgICAgICAgRmxvd1R5cGUuUFVTSF9WRVJTSU9OXHJcbiAgICBdXHJcbn07XHJcblxyXG4vKipcclxuICog5rWB56iL566h55CG5ZmoXHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgRmxvd01hbmFnZXIge1xyXG4gICAgcHJpdmF0ZSByZWFkb25seSBmbG93czogTWFwPHN0cmluZywgUHJvY2Vzc0Zsb3c+ID0gbmV3IE1hcCgpO1xyXG4gICAgcHVibGljIHJlYWRvbmx5IGNvbmZpZzogRmxvd01hbmFnZXJDb25maWc7XHJcbiAgICBcclxuICAgIGNvbnN0cnVjdG9yKGNvbmZpZzogRmxvd01hbmFnZXJDb25maWcpIHtcclxuICAgICAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDojrflj5blj5HluIPmtYHnqItcclxuICAgICAqL1xyXG4gICAgZ2V0UHVibGlzaEZsb3coY29uZmlnVHlwZTogc3RyaW5nKTogUHJvY2Vzc0Zsb3cge1xyXG4gICAgICAgIGNvbnN0IGZsb3dJZCA9IGBwdWJsaXNoLSR7Y29uZmlnVHlwZX1gO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICghdGhpcy5mbG93cy5oYXMoZmxvd0lkKSkge1xyXG4gICAgICAgICAgICAvLyDliJvlu7rmlrDnmoTlj5HluIPmtYHnqItcclxuICAgICAgICAgICAgY29uc3QgZmxvdyA9IG5ldyBDb2Nvc0J1aWxkZXJGbG93KCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDorr7nva7ov5vluqblm57osINcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLm9uUHJvZ3Jlc3NVcGRhdGUpIHtcclxuICAgICAgICAgICAgICAgIGZsb3cuc2V0UHJvZ3Jlc3NDYWxsYmFjaygocHJvZ3Jlc3MsIG1lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWcub25Qcm9ncmVzc1VwZGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5vblByb2dyZXNzVXBkYXRlKEZsb3dUeXBlLkNPQ09TX0JVSUxELCBwcm9ncmVzcywgbWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOiuvue9ruWujOaIkOWbnuiwg1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcub25GbG93Q29tcGxldGUpIHtcclxuICAgICAgICAgICAgICAgIGZsb3cuc2V0RmluaXNoZWRDYWxsYmFjaygobWV0aG9kLCBtZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLm9uRmxvd0NvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLm9uRmxvd0NvbXBsZXRlKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRmxvd1R5cGUuQ09DT1NfQlVJTEQsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kID09PSBGaW5pc2hNZXRob2QuU1VDQ0VTUyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy5mbG93cy5zZXQoZmxvd0lkLCBmbG93KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmxvd3MuZ2V0KGZsb3dJZCkhO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOiOt+WPluWPkeW4g+iuvue9rua1geeoi1xyXG4gICAgICovXHJcbiAgICBnZXRQdWJsaXNoU2V0dGluZ0Zsb3coKTogUHJvY2Vzc0Zsb3cge1xyXG4gICAgICAgIGNvbnN0IGZsb3dJZCA9ICdwdWJsaXNoLXNldHRpbmcnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICghdGhpcy5mbG93cy5oYXMoZmxvd0lkKSkge1xyXG4gICAgICAgICAgICAvLyDliJvlu7rmlrDnmoTlj5HluIPorr7nva7mtYHnqItcclxuICAgICAgICAgICAgY29uc3QgZmxvdyA9IG5ldyBQdWJsaXNoU2V0dGluZ0Zsb3coKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOiuvue9rui/m+W6puWbnuiwg1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcub25Qcm9ncmVzc1VwZGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgZmxvdy5zZXRQcm9ncmVzc0NhbGxiYWNrKChwcm9ncmVzcywgbWVzc2FnZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5vblByb2dyZXNzVXBkYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLm9uUHJvZ3Jlc3NVcGRhdGUoRmxvd1R5cGUuUFVCTElTSF9TRVRUSU5HLCBwcm9ncmVzcywgbWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOiuvue9ruWujOaIkOWbnuiwg1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcub25GbG93Q29tcGxldGUpIHtcclxuICAgICAgICAgICAgICAgIGZsb3cuc2V0RmluaXNoZWRDYWxsYmFjaygobWV0aG9kLCBtZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLm9uRmxvd0NvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLm9uRmxvd0NvbXBsZXRlKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRmxvd1R5cGUuUFVCTElTSF9TRVRUSU5HLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1ldGhvZCA9PT0gRmluaXNoTWV0aG9kLlNVQ0NFU1MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIHRoaXMuZmxvd3Muc2V0KGZsb3dJZCwgZmxvdyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiB0aGlzLmZsb3dzLmdldChmbG93SWQpITtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDojrflj5ZCdW5kbGXniYjmnKzmm7TmlrDmtYHnqItcclxuICAgICAqL1xyXG4gICAgZ2V0QnVuZGxlVmVyc2lvbnNVcGRhdGVGbG93KCk6IFByb2Nlc3NGbG93IHtcclxuICAgICAgICBjb25zdCBmbG93SWQgPSAnYnVuZGxlLXZlcnNpb25zLXVwZGF0ZSc7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKCF0aGlzLmZsb3dzLmhhcyhmbG93SWQpKSB7XHJcbiAgICAgICAgICAgIC8vIOWIm+W7uuaWsOeahEJ1bmRsZeeJiOacrOabtOaWsOa1geeoi1xyXG4gICAgICAgICAgICBjb25zdCBmbG93ID0gbmV3IEJ1bmRsZVZlcnNpb25zVXBkYXRlRmxvdygpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g6K6+572u6L+b5bqm5Zue6LCDXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5vblByb2dyZXNzVXBkYXRlKSB7XHJcbiAgICAgICAgICAgICAgICBmbG93LnNldFByb2dyZXNzQ2FsbGJhY2soKHByb2dyZXNzLCBtZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLm9uUHJvZ3Jlc3NVcGRhdGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcub25Qcm9ncmVzc1VwZGF0ZShGbG93VHlwZS5CVU5ETEVfVVBEQVRFLCBwcm9ncmVzcywgbWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOiuvue9ruWujOaIkOWbnuiwg1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcub25GbG93Q29tcGxldGUpIHtcclxuICAgICAgICAgICAgICAgIGZsb3cuc2V0RmluaXNoZWRDYWxsYmFjaygobWV0aG9kLCBtZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLm9uRmxvd0NvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLm9uRmxvd0NvbXBsZXRlKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRmxvd1R5cGUuQlVORExFX1VQREFURSwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2QgPT09IEZpbmlzaE1ldGhvZC5TVUNDRVNTLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB0aGlzLmZsb3dzLnNldChmbG93SWQsIGZsb3cpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gdGhpcy5mbG93cy5nZXQoZmxvd0lkKSE7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog6I635Y+W55Sf5oiQQnVuZGxl54mI5pys5rWB56iLXHJcbiAgICAgKi9cclxuICAgIGdldEdlbmVyYXRlQnVuZGxlVmVyc2lvbkZsb3coKTogUHJvY2Vzc0Zsb3cge1xyXG4gICAgICAgIGNvbnN0IGZsb3dJZCA9ICdnZW5lcmF0ZS1idW5kbGUtdmVyc2lvbic7XHJcbiAgICAgICAgXHJcbiAgICAgICAgaWYgKCF0aGlzLmZsb3dzLmhhcyhmbG93SWQpKSB7XHJcbiAgICAgICAgICAgIC8vIOWIm+W7uuaWsOeahOeUn+aIkEJ1bmRsZeeJiOacrOa1geeoi1xyXG4gICAgICAgICAgICBjb25zdCBmbG93ID0gbmV3IEdlbmVyYXRlQnVuZGxlVmVyc2lvbkZsb3coKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOiuvue9rui/m+W6puWbnuiwg1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcub25Qcm9ncmVzc1VwZGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgZmxvdy5zZXRQcm9ncmVzc0NhbGxiYWNrKChwcm9ncmVzcywgbWVzc2FnZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5vblByb2dyZXNzVXBkYXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLm9uUHJvZ3Jlc3NVcGRhdGUoRmxvd1R5cGUuR0VORVJBVEVfQlVORExFX1ZFUlNJT04sIHByb2dyZXNzLCBtZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g6K6+572u5a6M5oiQ5Zue6LCDXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5vbkZsb3dDb21wbGV0ZSkge1xyXG4gICAgICAgICAgICAgICAgZmxvdy5zZXRGaW5pc2hlZENhbGxiYWNrKChtZXRob2QsIG1lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWcub25GbG93Q29tcGxldGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWcub25GbG93Q29tcGxldGUoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBGbG93VHlwZS5HRU5FUkFURV9CVU5ETEVfVkVSU0lPTiwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2QgPT09IEZpbmlzaE1ldGhvZC5TVUNDRVNTLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB0aGlzLmZsb3dzLnNldChmbG93SWQsIGZsb3cpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gdGhpcy5mbG93cy5nZXQoZmxvd0lkKSE7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog6I635Y+W5Y+R5biDQnVuZGxl5Yiw5pyN5Yqh5Zmo5rWB56iLXHJcbiAgICAgKi9cclxuICAgIGdldFB1Ymxpc2hCdW5kbGVUb1NlcnZlckZsb3coKTogUHJvY2Vzc0Zsb3cge1xyXG4gICAgICAgIGNvbnN0IGZsb3dJZCA9ICdwdWJsaXNoLWJ1bmRsZS10by1zZXJ2ZXInO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICghdGhpcy5mbG93cy5oYXMoZmxvd0lkKSkge1xyXG4gICAgICAgICAgICAvLyDliJvlu7rmlrDnmoTlj5HluINCdW5kbGXliLDmnI3liqHlmajmtYHnqItcclxuICAgICAgICAgICAgY29uc3QgZmxvdyA9IG5ldyBQdWJsaXNoQnVuZGxlVG9TZXJ2ZXJGbG93KCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDorr7nva7ov5vluqblm57osINcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLm9uUHJvZ3Jlc3NVcGRhdGUpIHtcclxuICAgICAgICAgICAgICAgIGZsb3cuc2V0UHJvZ3Jlc3NDYWxsYmFjaygocHJvZ3Jlc3MsIG1lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWcub25Qcm9ncmVzc1VwZGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5vblByb2dyZXNzVXBkYXRlKEZsb3dUeXBlLlBVQkxJU0hfVE9fU0VSVkVSLCBwcm9ncmVzcywgbWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOiuvue9ruWujOaIkOWbnuiwg1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jb25maWcub25GbG93Q29tcGxldGUpIHtcclxuICAgICAgICAgICAgICAgIGZsb3cuc2V0RmluaXNoZWRDYWxsYmFjaygobWV0aG9kLCBtZXNzYWdlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLm9uRmxvd0NvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnLm9uRmxvd0NvbXBsZXRlKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRmxvd1R5cGUuUFVCTElTSF9UT19TRVJWRVIsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWV0aG9kID09PSBGaW5pc2hNZXRob2QuU1VDQ0VTUyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgdGhpcy5mbG93cy5zZXQoZmxvd0lkLCBmbG93KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIHRoaXMuZmxvd3MuZ2V0KGZsb3dJZCkhO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOiOt+WPlkJ1bmRsZeeJiOacrOaOqOmAgea1geeoi1xyXG4gICAgICovXHJcbiAgICBnZXRCdW5kbGVWZXJzaW9uc1B1c2hGbG93KCk6IFByb2Nlc3NGbG93IHtcclxuICAgICAgICBjb25zdCBmbG93SWQgPSAnYnVuZGxlLXZlcnNpb25zLXB1c2gnO1xyXG4gICAgICAgIFxyXG4gICAgICAgIGlmICghdGhpcy5mbG93cy5oYXMoZmxvd0lkKSkge1xyXG4gICAgICAgICAgICAvLyDliJvlu7rmlrDnmoRCdW5kbGXniYjmnKzmjqjpgIHmtYHnqItcclxuICAgICAgICAgICAgY29uc3QgZmxvdyA9IG5ldyBCdW5kbGVWZXJzaW9uc1B1c2hGbG93KCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDorr7nva7ov5vluqblm57osINcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLm9uUHJvZ3Jlc3NVcGRhdGUpIHtcclxuICAgICAgICAgICAgICAgIGZsb3cuc2V0UHJvZ3Jlc3NDYWxsYmFjaygocHJvZ3Jlc3MsIG1lc3NhZ2UpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb25maWcub25Qcm9ncmVzc1VwZGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5vblByb2dyZXNzVXBkYXRlKEZsb3dUeXBlLlBVU0hfVkVSU0lPTiwgcHJvZ3Jlc3MsIG1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDorr7nva7lrozmiJDlm57osINcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29uZmlnLm9uRmxvd0NvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgICAgICBmbG93LnNldEZpbmlzaGVkQ2FsbGJhY2soKG1ldGhvZCwgbWVzc2FnZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbmZpZy5vbkZsb3dDb21wbGV0ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZy5vbkZsb3dDb21wbGV0ZShcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEZsb3dUeXBlLlBVU0hfVkVSU0lPTiwgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXRob2QgPT09IEZpbmlzaE1ldGhvZC5TVUNDRVNTLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB0aGlzLmZsb3dzLnNldChmbG93SWQsIGZsb3cpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBcclxuICAgICAgICByZXR1cm4gdGhpcy5mbG93cy5nZXQoZmxvd0lkKSE7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5Yid5aeL5YyW5rWB56iL6L+b5bqm5YiX6KGoXHJcbiAgICAgKiBAcGFyYW0gY29uZmlnVHlwZSDphY3nva7nsbvlnotcclxuICAgICAqL1xyXG4gICAgaW5pdGlhbGl6ZVByb2dyZXNzTGlzdChjb25maWdUeXBlOiBQdWJsaXNoQ29uZmlnVHlwZSB8IHN0cmluZyk6IHZvaWQge1xyXG4gICAgICAgIGlmICghdGhpcy5jb25maWcub25Qcm9ncmVzc1VwZGF0ZSkgcmV0dXJuO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOehruS/nemFjee9ruexu+Wei+aYr+acieaViOeahFxyXG4gICAgICAgIGNvbnN0IHB1Ymxpc2hUeXBlID0gY29uZmlnVHlwZSBhcyBQdWJsaXNoQ29uZmlnVHlwZTtcclxuICAgICAgICBcclxuICAgICAgICAvLyDojrflj5blr7nlupTphY3nva7nsbvlnovnmoTmtYHnqIvliJfooahcclxuICAgICAgICBjb25zdCBmbG93cyA9IEZMT1dfQ09ORklHW3B1Ymxpc2hUeXBlXSB8fCBGTE9XX0NPTkZJR1tQdWJsaXNoQ29uZmlnVHlwZS5GVUxMX1BBQ0tBR0VdO1xyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIOWIneWni+WMluavj+S4qua1geeoi+eahOi/m+W6puaYvuekulxyXG4gICAgICAgIGZvciAoY29uc3QgZmxvd1R5cGUgb2YgZmxvd3MpIHtcclxuICAgICAgICAgICAgdGhpcy5jb25maWcub25Qcm9ncmVzc1VwZGF0ZShmbG93VHlwZSwgMCwgJ+WHhuWkh+W8gOWniycpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDmm7TmlrDlj5HluIPorr7nva5cclxuICAgICAqIEBwYXJhbSBwdWJsaXNoVHlwZSDlj5HluIPnsbvlnotcclxuICAgICAqIEBwYXJhbSBpc01DSSDmmK/lkKZNQ0lcclxuICAgICAqIEBwYXJhbSBlbnZpcm9ubWVudCDnjq/looNcclxuICAgICAqIEBwYXJhbSBhcHBWZXJzaW9uIOW6lOeUqOeJiOacrOWPt1xyXG4gICAgICovXHJcbiAgICBhc3luYyB1cGRhdGVQdWJsaXNoU2V0dGluZyhcclxuICAgICAgICBwdWJsaXNoVHlwZTogc3RyaW5nLFxyXG4gICAgICAgIGlzTUNJPzogYm9vbGVhbixcclxuICAgICAgICBlbnZpcm9ubWVudD86IHN0cmluZyxcclxuICAgICAgICBhcHBWZXJzaW9uPzogc3RyaW5nXHJcbiAgICApOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBmbG93ID0gdGhpcy5nZXRQdWJsaXNoU2V0dGluZ0Zsb3coKSBhcyBQdWJsaXNoU2V0dGluZ0Zsb3c7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDlvIDlp4vmm7TmlrDlj5HluIPorr7nva5cclxuICAgICAgICAgICAgY29uc3QgcGFyYW1zOiBQdWJsaXNoU2V0dGluZ1BhcmFtcyA9IHtcclxuICAgICAgICAgICAgICAgIHByb2plY3RQYXRoOiB0aGlzLmNvbmZpZy5wcm9qZWN0UGF0aCxcclxuICAgICAgICAgICAgICAgIHB1Ymxpc2hUeXBlLFxyXG4gICAgICAgICAgICAgICAgaXNNQ0ksXHJcbiAgICAgICAgICAgICAgICBlbnZpcm9ubWVudCxcclxuICAgICAgICAgICAgICAgIGFwcFZlcnNpb25cclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGF3YWl0IGZsb3cuc3RhcnQocGFyYW1zKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihg5pu05paw5Y+R5biD6K6+572u5aSx6LSlIFske3B1Ymxpc2hUeXBlfV06YCwgZXJyb3IpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOW8gOWni+WPkeW4g+a1geeoi1xyXG4gICAgICogQHBhcmFtIGNvbmZpZ1R5cGUg6YWN572u57G75Z6LXHJcbiAgICAgKiBAcGFyYW0gY29uZmlnUGF0aCDphY3nva7mlofku7bot6/lvoRcclxuICAgICAqIEBwYXJhbSBkZWJ1ZyDmmK/lkKbosIPor5XmqKHlvI9cclxuICAgICAqIEBwYXJhbSBleHRyYUFyZ3Mg6aKd5aSW5Y+C5pWwXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIHN0YXJ0UHVibGlzaChcclxuICAgICAgICBjb25maWdUeXBlOiBzdHJpbmcsIFxyXG4gICAgICAgIGNvbmZpZ1BhdGg6IHN0cmluZywgXHJcbiAgICAgICAgZGVidWc6IGJvb2xlYW4gPSBmYWxzZSxcclxuICAgICAgICBleHRyYUFyZ3M6IHN0cmluZ1tdID0gW11cclxuICAgICk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZsb3cgPSB0aGlzLmdldFB1Ymxpc2hGbG93KGNvbmZpZ1R5cGUpIGFzIENvY29zQnVpbGRlckZsb3c7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDlvIDlp4vlj5HluINcclxuICAgICAgICAgICAgY29uc3QgcGFyYW1zOiBDb2Nvc0J1aWxkZXJQYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgICBlbmdpbmVQYXRoOiB0aGlzLmNvbmZpZy5lbmdpbmVQYXRoIHx8IFwiQzovUHJvZ3JhbURhdGEvY29jb3MvZWRpdG9ycy9DcmVhdG9yLzMuOC4zXCIsXHJcbiAgICAgICAgICAgICAgICBwcm9qZWN0UGF0aDogdGhpcy5jb25maWcucHJvamVjdFBhdGgsXHJcbiAgICAgICAgICAgICAgICBjb25maWdQYXRoLFxyXG4gICAgICAgICAgICAgICAgZGVidWcsXHJcbiAgICAgICAgICAgICAgICBleHRyYUFyZ3NcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGF3YWl0IGZsb3cuc3RhcnQocGFyYW1zKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihg5ZCv5Yqo5Y+R5biD5rWB56iL5aSx6LSlIFske2NvbmZpZ1R5cGV9XTpgLCBlcnJvcik7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5ZCv5Yqo6L+c56iLQnVuZGxl54mI5pys5pu05paw5rWB56iLXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIHN0YXJ0QnVuZGxlVmVyc2lvbnNVcGRhdGUoKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgY29uc3QgZmxvdyA9IHRoaXMuZ2V0QnVuZGxlVmVyc2lvbnNVcGRhdGVGbG93KCkgYXMgQnVuZGxlVmVyc2lvbnNVcGRhdGVGbG93O1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY29uc3QgcGFyYW1zOiBCdW5kbGVWZXJzaW9uc1VwZGF0ZVBhcmFtcyA9IHtcclxuICAgICAgICAgICAgICAgIHByb2plY3RQYXRoOiB0aGlzLmNvbmZpZy5wcm9qZWN0UGF0aFxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgYXdhaXQgZmxvdy5zdGFydChwYXJhbXMpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCflkK/liqhCdW5kbGXniYjmnKzmm7TmlrDmtYHnqIvlpLHotKU6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOWQr+WKqOeUn+aIkEJ1bmRsZeeJiOacrOa1geeoi1xyXG4gICAgICovXHJcbiAgICBhc3luYyBzdGFydEdlbmVyYXRlQnVuZGxlVmVyc2lvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBmbG93ID0gdGhpcy5nZXRHZW5lcmF0ZUJ1bmRsZVZlcnNpb25GbG93KCkgYXMgR2VuZXJhdGVCdW5kbGVWZXJzaW9uRmxvdztcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtczogR2VuZXJhdGVCdW5kbGVWZXJzaW9uUGFyYW1zID0ge1xyXG4gICAgICAgICAgICAgICAgcHJvamVjdFBhdGg6IHRoaXMuY29uZmlnLnByb2plY3RQYXRoLFxyXG4gICAgICAgICAgICAgICAgdGFyZ2V0UGF0aDogam9pbih0aGlzLmNvbmZpZy5wcm9qZWN0UGF0aCwgJ2J1aWxkL2FuZHJvaWQvcmVtb3RlJylcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGF3YWl0IGZsb3cuc3RhcnQocGFyYW1zKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcign5ZCv5Yqo55Sf5oiQQnVuZGxl54mI5pys5rWB56iL5aSx6LSlOicsIGVycm9yKTtcclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIFxyXG4gICAgLyoqXHJcbiAgICAgKiDlkK/liqjlj5HluINCdW5kbGXliLDmnI3liqHlmajmtYHnqItcclxuICAgICAqIEBwYXJhbSBlbnZpcm9ubWVudCDnjq/looPorr7nva5cclxuICAgICAqL1xyXG4gICAgYXN5bmMgc3RhcnRQdWJsaXNoQnVuZGxlVG9TZXJ2ZXIoZW52aXJvbm1lbnQ6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIGNvbnN0IGZsb3cgPSB0aGlzLmdldFB1Ymxpc2hCdW5kbGVUb1NlcnZlckZsb3coKSBhcyBQdWJsaXNoQnVuZGxlVG9TZXJ2ZXJGbG93O1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgLy8g6L2s5o2i546v5aKD6K6+572u5Li65q2j56Gu55qE57G75Z6LXHJcbiAgICAgICAgICAgIGNvbnN0IGVudiA9IGVudmlyb25tZW50LnRvVXBwZXJDYXNlKCkgPT09ICdQUk9EVUNUSU9OJyA/ICdwcm9kdWN0aW9uJyA6ICdkZXZlbG9wbWVudCc7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDliqDovb1TRlRQ6YWN572uXHJcbiAgICAgICAgICAgIGxldCBzZnRwQ29uZmlnID0ge1xyXG4gICAgICAgICAgICAgICAgaG9zdDogJ+i/nOeoi+acjeWKoeWZqElQJyxcclxuICAgICAgICAgICAgICAgIHBvcnQ6IDIyLFxyXG4gICAgICAgICAgICAgICAgdXNlcm5hbWU6ICfnlKjmiLflkI0nLFxyXG4gICAgICAgICAgICAgICAgcGFzc3dvcmQ6ICflr4bnoIEnLFxyXG4gICAgICAgICAgICAgICAgcmVtb3RlUGF0aDogJy9wYXRoL3RvL3JlbW90ZS9kaXJlY3RvcnknXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDlsJ3or5Xku47phY3nva7mlofku7bliqDovb1TRlRQ6YWN572uXHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBjb25maWdQYXRoID0gam9pbih0aGlzLmNvbmZpZy5wcm9qZWN0UGF0aCwgJ3NmdHAtY29uZmlnLmpzb24nKTtcclxuICAgICAgICAgICAgICAgIGlmIChleGlzdHNTeW5jKGNvbmZpZ1BhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgY29uZmlnRGF0YSA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKGNvbmZpZ1BhdGgsICd1dGYtOCcpKTtcclxuICAgICAgICAgICAgICAgICAgICBzZnRwQ29uZmlnID0gY29uZmlnRGF0YTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdTRlRQ6YWN572u5paH5Lu25LiN5a2Y5Zyo77yM5L2/55So6buY6K6k6YWN572uJyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfor7vlj5ZTRlRQ6YWN572u5aSx6LSlOicsIGVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgY29uc3QgcGFyYW1zOiBQdWJsaXNoQnVuZGxlVG9TZXJ2ZXJQYXJhbXMgPSB7XHJcbiAgICAgICAgICAgICAgICBwcm9qZWN0UGF0aDogdGhpcy5jb25maWcucHJvamVjdFBhdGgsXHJcbiAgICAgICAgICAgICAgICBlbnZpcm9ubWVudDogZW52LFxyXG4gICAgICAgICAgICAgICAgc2Z0cENvbmZpZzogc2Z0cENvbmZpZ1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgYXdhaXQgZmxvdy5zdGFydChwYXJhbXMpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCflkK/liqjlj5HluINCdW5kbGXliLDmnI3liqHlmajmtYHnqIvlpLHotKU6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOWQr+WKqEJ1bmRsZeeJiOacrOaOqOmAgea1geeoi1xyXG4gICAgICogQHBhcmFtIGNvbW1pdE1lc3NhZ2Ug5o+Q5Lqk5L+h5oGvXHJcbiAgICAgKi9cclxuICAgIGFzeW5jIHN0YXJ0QnVuZGxlVmVyc2lvbnNQdXNoKGNvbW1pdE1lc3NhZ2U/OiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICBjb25zdCBmbG93ID0gdGhpcy5nZXRCdW5kbGVWZXJzaW9uc1B1c2hGbG93KCkgYXMgQnVuZGxlVmVyc2lvbnNQdXNoRmxvdztcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtczogQnVuZGxlVmVyc2lvbnNQdXNoUGFyYW1zID0ge1xyXG4gICAgICAgICAgICAgICAgcHJvamVjdFBhdGg6IHRoaXMuY29uZmlnLnByb2plY3RQYXRoLFxyXG4gICAgICAgICAgICAgICAgY29tbWl0TWVzc2FnZVxyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgYXdhaXQgZmxvdy5zdGFydChwYXJhbXMpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKCflkK/liqhCdW5kbGXniYjmnKzmjqjpgIHmtYHnqIvlpLHotKU6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOaJp+ihjOWujOaVtOWPkeW4g+a1geeoi++8iOWMheaLrOabtOaWsOiuvue9ruWSjOWPkeW4g++8iVxyXG4gICAgICogQHBhcmFtIGNvbmZpZ1R5cGUg6YWN572u57G75Z6LXHJcbiAgICAgKiBAcGFyYW0gY29uZmlnUGF0aCDphY3nva7mlofku7bot6/lvoRcclxuICAgICAqIEBwYXJhbSBpc01DSSDmmK/lkKZNQ0lcclxuICAgICAqIEBwYXJhbSBlbnZpcm9ubWVudCDnjq/looNcclxuICAgICAqIEBwYXJhbSBhcHBWZXJzaW9uIOW6lOeUqOeJiOacrOWPt1xyXG4gICAgICogQHBhcmFtIGRlYnVnIOaYr+WQpuiwg+ivleaooeW8j1xyXG4gICAgICovXHJcbiAgICBhc3luYyBleGVjdXRlRnVsbFB1Ymxpc2hQcm9jZXNzKFxyXG4gICAgICAgIGNvbmZpZ1R5cGU6IHN0cmluZyxcclxuICAgICAgICBjb25maWdQYXRoOiBzdHJpbmcsXHJcbiAgICAgICAgaXNNQ0k/OiBib29sZWFuLFxyXG4gICAgICAgIGVudmlyb25tZW50Pzogc3RyaW5nLFxyXG4gICAgICAgIGFwcFZlcnNpb24/OiBzdHJpbmcsXHJcbiAgICAgICAgZGVidWc6IGJvb2xlYW4gPSBmYWxzZVxyXG4gICAgKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgLy8g5Yid5aeL5YyW6L+b5bqm5YiX6KGo77yM5re75Yqg5omA6ZyA55qE5rWB56iLXHJcbiAgICAgICAgICAgIHRoaXMuaW5pdGlhbGl6ZVByb2dyZXNzTGlzdChjb25maWdUeXBlIGFzIFB1Ymxpc2hDb25maWdUeXBlKTtcclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIC8vIOWPlua2iOaJgOacieato+WcqOi/kOihjOeahOa1geeoi++8jOehruS/neW5suWHgOeahOW8gOWni1xyXG4gICAgICAgICAgICB0aGlzLmNhbmNlbEFsbEZsb3dzKCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhg5byA5aeL5omn6KGMICR7Y29uZmlnVHlwZX0g55qE5Y+R5biD5rWB56iL77yM5Liy6KGM5omn6KGM5ZCE5a2Q5rWB56iLYCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAvLyDmoLnmja7kuI3lkIznmoTlj5HluIPnsbvlnovmiafooYzkuI3lkIznmoTmtYHnqItcclxuICAgICAgICAgICAgaWYgKGNvbmZpZ1R5cGUgPT09IFB1Ymxpc2hDb25maWdUeXBlLlJFTU9URV9CVU5ETEVTKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBSRU1PVEVfQlVORExFUyDpnIDopoHmiafooYzlrozmlbTnmoTlha3mraXmtYHnqIvvvIzlv4XpobvkuKXmoLzkuLLooYxcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gMS4g5pu05paw5Y+R5biD6K6+572uXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn5q2l6aqkMTog5L+u5pS55Y+R5biD6K6+572uJyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBzZXR0aW5nU3VjY2VzcyA9IGF3YWl0IHRoaXMudXBkYXRlUHVibGlzaFNldHRpbmcoXHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnVHlwZSxcclxuICAgICAgICAgICAgICAgICAgICBpc01DSSxcclxuICAgICAgICAgICAgICAgICAgICBlbnZpcm9ubWVudCxcclxuICAgICAgICAgICAgICAgICAgICBhcHBWZXJzaW9uXHJcbiAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAoIXNldHRpbmdTdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5q2l6aqkMeWksei0pTog5peg5rOV5pu05paw5Y+R5biD6K6+572u77yM5Y+R5biD6L+H56iL57uI5q2iJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyAyLiDku45HaXTmm7TmlrBCdW5kbGXniYjmnKzkv6Hmga9cclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmraXpqqQyOiDku45HaXTmm7TmlrBCdW5kbGXniYjmnKzkv6Hmga8nKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHVwZGF0ZVN1Y2Nlc3MgPSBhd2FpdCB0aGlzLnN0YXJ0QnVuZGxlVmVyc2lvbnNVcGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIGlmICghdXBkYXRlU3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+atpemqpDLlpLHotKU6IOaXoOazleabtOaWsEJ1bmRsZeeJiOacrO+8jOWPkeW4g+i/h+eoi+e7iOatoicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gMy4g5omn6KGMQ29jb3Plj5HluINcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmraXpqqQzOiDmiafooYxDb2NvcyBDcmVhdG9y5Y+R5biDJyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwdWJsaXNoU3VjY2VzcyA9IGF3YWl0IHRoaXMuc3RhcnRQdWJsaXNoKFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ1R5cGUsXHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnUGF0aCxcclxuICAgICAgICAgICAgICAgICAgICBkZWJ1Z1xyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKCFwdWJsaXNoU3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+atpemqpDPlpLHotKU6IENvY29z5Y+R5biD5aSx6LSl77yM5Y+R5biD6L+H56iL57uI5q2iJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyA0LiDnlJ/miJBCdW5kbGXniYjmnKzmlofku7ZcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmraXpqqQ0OiDnlJ/miJBCdW5kbGXniYjmnKzmlofku7YnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IGdlbmVyYXRlU3VjY2VzcyA9IGF3YWl0IHRoaXMuc3RhcnRHZW5lcmF0ZUJ1bmRsZVZlcnNpb24oKTtcclxuICAgICAgICAgICAgICAgIGlmICghZ2VuZXJhdGVTdWNjZXNzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5q2l6aqkNOWksei0pTog55Sf5oiQQnVuZGxl54mI5pys5aSx6LSl77yM5Y+R5biD6L+H56iL57uI5q2iJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyA1LiDlj5HluINCdW5kbGXliLDmnI3liqHlmahcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmraXpqqQ1OiDlj5HluINCdW5kbGXliLDmnI3liqHlmagnKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHB1Ymxpc2hUb1NlcnZlclN1Y2Nlc3MgPSBhd2FpdCB0aGlzLnN0YXJ0UHVibGlzaEJ1bmRsZVRvU2VydmVyKFxyXG4gICAgICAgICAgICAgICAgICAgIGVudmlyb25tZW50IHx8ICdERVZFTE9QTUVOVCdcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmICghcHVibGlzaFRvU2VydmVyU3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+atpemqpDXlpLHotKU6IOWPkeW4g0J1bmRsZeWIsOacjeWKoeWZqOWksei0pe+8jOWPkeW4g+i/h+eoi+e7iOatoicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgLy8gNi4g5o+Q5LqkQnVuZGxl54mI5pys5YiwR2l0XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn5q2l6aqkNjog5o+Q5LqkQnVuZGxl54mI5pys5YiwR2l0Jyk7XHJcbiAgICAgICAgICAgICAgICBjb25zdCBwdXNoU3VjY2VzcyA9IGF3YWl0IHRoaXMuc3RhcnRCdW5kbGVWZXJzaW9uc1B1c2goXHJcbiAgICAgICAgICAgICAgICAgICAgYOabtOaWsEJ1bmRsZeeJiOacrCBbJHtlbnZpcm9ubWVudH1dIHYke2FwcFZlcnNpb259YFxyXG4gICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKCFwdXNoU3VjY2Vzcykge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+atpemqpDblpLHotKU6IOaPkOS6pEJ1bmRsZeeJiOacrOWksei0pe+8jOWPkeW4g+i/h+eoi+e7iOatoicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+aJgOaciea1geeoi+aJp+ihjOWujOaIkO+8jFJFTU9URV9CVU5ETEVT5Y+R5biD5oiQ5YqfJyk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vIOWFtuS7luWPkeW4g+exu+WeiyhGVUxMX1BBQ0tBR0UsIFJFTU9URV9TVEFSVFVQKeWPquaJp+ihjOWfuuacrOa1geeoi1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAvLyAxLiDmm7TmlrDlj5HluIPorr7nva5cclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmraXpqqQxOiDkv67mlLnlj5HluIPorr7nva4nKTtcclxuICAgICAgICAgICAgICAgIGNvbnN0IHNldHRpbmdTdWNjZXNzID0gYXdhaXQgdGhpcy51cGRhdGVQdWJsaXNoU2V0dGluZyhcclxuICAgICAgICAgICAgICAgICAgICBjb25maWdUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIGlzTUNJLFxyXG4gICAgICAgICAgICAgICAgICAgIGVudmlyb25tZW50LFxyXG4gICAgICAgICAgICAgICAgICAgIGFwcFZlcnNpb25cclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmICghc2V0dGluZ1N1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfmraXpqqQx5aSx6LSlOiDml6Dms5Xmm7TmlrDlj5HluIPorr7nva7vvIzlj5HluIPov4fnqIvnu4jmraInKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIC8vIDIuIOaJp+ihjENvY29z5Y+R5biDXHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn5q2l6aqkMjog5omn6KGMQ29jb3MgQ3JlYXRvcuWPkeW4gycpO1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcHVibGlzaFN1Y2Nlc3MgPSBhd2FpdCB0aGlzLnN0YXJ0UHVibGlzaChcclxuICAgICAgICAgICAgICAgICAgICBjb25maWdUeXBlLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ1BhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgZGVidWdcclxuICAgICAgICAgICAgICAgICk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIGlmICghcHVibGlzaFN1Y2Nlc3MpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfmraXpqqQy5aSx6LSlOiBDb2Nvc+WPkeW4g+Wksei0pe+8jOWPkeW4g+i/h+eoi+e7iOatoicpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOaJgOaciea1geeoi+aJp+ihjOWujOaIkO+8jCR7Y29uZmlnVHlwZX3lj5HluIPmiJDlip9gKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihg5omn6KGM5a6M5pW05Y+R5biD5rWB56iL5aSx6LSlIFske2NvbmZpZ1R5cGV9XTpgLCBlcnJvcik7XHJcbiAgICAgICAgICAgIC8vIOWPkeeUn+W8guW4uOaXtu+8jOWPlua2iOaJgOacieato+WcqOi/kOihjOeahOa1geeoi1xyXG4gICAgICAgICAgICB0aGlzLmNhbmNlbEFsbEZsb3dzKCk7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5Y+W5raI5Y+R5biD5rWB56iLXHJcbiAgICAgKiBAcGFyYW0gY29uZmlnVHlwZSDphY3nva7nsbvlnotcclxuICAgICAqL1xyXG4gICAgY2FuY2VsUHVibGlzaChjb25maWdUeXBlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgICAgICBjb25zdCBmbG93SWQgPSBgcHVibGlzaC0ke2NvbmZpZ1R5cGV9YDtcclxuICAgICAgICBjb25zdCBmbG93ID0gdGhpcy5mbG93cy5nZXQoZmxvd0lkKTtcclxuICAgICAgICBcclxuICAgICAgICBpZiAoZmxvdyAmJiBmbG93LmlzUnVubmluZykge1xyXG4gICAgICAgICAgICBmbG93LmNhbmNlbCgpO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvKipcclxuICAgICAqIOiOt+WPluaJgOaciea0u+WKqOeahOa1geeoi1xyXG4gICAgICovXHJcbiAgICBnZXRBY3RpdmVGbG93cygpOiBQcm9jZXNzRmxvd1tdIHtcclxuICAgICAgICByZXR1cm4gQXJyYXkuZnJvbSh0aGlzLmZsb3dzLnZhbHVlcygpKS5maWx0ZXIoZmxvdyA9PiBmbG93LmlzUnVubmluZyk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC8qKlxyXG4gICAgICog5Y+W5raI5omA5pyJ5rS75Yqo55qE5rWB56iLXHJcbiAgICAgKi9cclxuICAgIGNhbmNlbEFsbEZsb3dzKCk6IHZvaWQge1xyXG4gICAgICAgIGNvbnN0IGFjdGl2ZUZsb3dzID0gdGhpcy5nZXRBY3RpdmVGbG93cygpO1xyXG4gICAgICAgIGlmIChhY3RpdmVGbG93cy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKGDmraPlnKjlj5bmtoggJHthY3RpdmVGbG93cy5sZW5ndGh9IOS4qua0u+WKqOa1geeoi2ApO1xyXG4gICAgICAgICAgICBmb3IgKGNvbnN0IGZsb3cgb2YgYWN0aXZlRmxvd3MpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZmxvdy5jYW5jZWwoKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg5bey5Y+W5raI5rWB56iLOiAke2Zsb3cubmFtZX1gKTtcclxuICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihg5Y+W5raI5rWB56iLICR7Zmxvdy5uYW1lfSDml7blh7rplJk6YCwgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59ICJdfQ==
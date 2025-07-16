"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const vue_1 = require("vue");
const bundle_version_manager_1 = require("../../utils/bundle-version-manager");
const generate_bundle_versions_1 = require("../../utils/generate-bundle-versions");
const ssh2_sftp_client_1 = __importDefault(require("ssh2-sftp-client"));
// 添加配置文件缓存
const configPathCache = new WeakMap();
const panelDataMap = new WeakMap();
// 从配置文件读取 SFTP 配置
async function loadSftpConfig() {
    try {
        const configPath = (0, path_1.join)(Editor.Project.path, 'sftp-config.json');
        const config = JSON.parse((0, fs_extra_1.readFileSync)(configPath, 'utf-8'));
        return config;
    }
    catch (error) {
        console.error('读取 SFTP 配置失败:', error);
        return null;
    }
}
module.exports = Editor.Panel.define({
    listeners: {
        show: () => console.log('show'),
        hide: () => console.log('hide'),
    },
    template: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/template/publishProcess/index.html'), 'utf-8'),
    style: (0, fs_extra_1.readFileSync)((0, path_1.join)(__dirname, '../../../static/style/publishProcess/index.css'), 'utf-8') + `
    .upload-progress-container {
        margin: 20px 0;
        padding: 15px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: #f5f5f5;
    }
    
    .progress-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        font-weight: bold;
    }
    
    .progress-bar-container {
        width: 100%;
        height: 24px;
        background: #e0e0e0;
        border-radius: 12px;
        overflow: hidden;
        margin-bottom: 8px;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
    }
    
    .progress-bar {
        height: 100%;
        background: linear-gradient(to right, #4CAF50, #8BC34A);
        transition: width 0.3s ease;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .progress-text {
        position: absolute;
        width: 100%;
        text-align: center;
        color: #fff;
        font-weight: bold;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        z-index: 2;
    }
    
    .progress-percentage {
        text-align: center;
        font-weight: bold;
        font-size: 16px;
        color: #4caf50;
    }
    
    .file-count {
        margin-top: 8px;
        text-align: center;
        font-weight: bold;
    }
    
    .upload-btn-container {
        margin-top: 15px;
        display: flex;
        justify-content: center;
    }
    
    .upload-btn {
        padding: 8px 16px;
        border-radius: 4px;
        background-color: #4caf50;
        color: white;
        font-weight: bold;
        cursor: pointer;
        border: none;
    }
    
    .upload-btn:hover {
        background-color: #45a049;
    }
    
    .upload-btn:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
    `,
    $: { app: '#app' },
    ready() {
        if (this.$.app) {
            // 新增配置文件扫描逻辑
            const configDir = Editor.Project.path + "/buildConfigs";
            const configFiles = (0, fs_extra_1.readdirSync)(configDir)
                .filter(file => file.endsWith('.json'))
                .reduce((acc, file) => {
                acc[file] = (0, path_1.join)(configDir, file);
                return acc;
            }, {});
            // 存储配置文件路径
            configPathCache.set(this, configFiles);
            // 组件定义（修改数据部分）
            const MyComponent = {
                template: `
                    <div class="toolbar">
                        <div class="input-group">
                            <select v-model="selectedOption" @change="handleChange" class="package-select">
                                <option v-for="(path, name) in configList" :value="path">{{ name }}</option>
                            </select>
                        </div>
                        <div class="button-group">
                            <button @click="handleClick" :disabled="!selectedOption || publishStatus === 'publishing'" class="publish-btn">
                                {{ publishStatus === 'publishing' ? '发布中...' : '执行发布' }}
                            </button>
                            <div class="publish-status" :class="publishStatus">
                                <span class="status-icon"></span>
                                <span class="status-text">
                                    {{ publishStatusText[publishStatus] }}
                                </span>
                            </div>
                            <button @click="generateBundleVersion" class="bundle-version-btn">生成Bundle版本</button>
                        </div>
                    </div>
                    
                    <!-- 添加Bundle版本管理区域 -->
                    <div class="bundle-version-manager">
                        <div class="version-header">
                            <h3>Bundle 版本管理</h3>
                            <span class="last-check">最后检查: {{ bundleVersionInfo.lastCheckTime }}</span>
                        </div>
                        
                        <!-- 修改版本信息展示部分 -->
                        <div class="version-info">
                            <div class="main-version">
                                <span class="version-label">主版本号:</span>
                                <input 
                                    type="text" 
                                    v-model="bundleVersionInfo.mainVersion"
                                    class="version-value" 
                                    :class="{ diff: bundleVersionInfo.diffVersions.includes('main') }"
                                    @input="onVersionChange"
                                >
                            </div>
                            
                            <div class="bundle-versions">
                                <h4>Bundle 版本列表:</h4>
                                <div class="bundle-list">
                                    <div v-for="bundle in bundleVersionInfo.bundleVersions" 
                                         :key="bundle.name" 
                                         class="bundle-item"
                                         :class="{ diff: bundleVersionInfo.diffVersions.includes(bundle.name) }">
                                        <span class="bundle-name">{{ bundle.name }}:</span>
                                        <input 
                                            type="text" 
                                            v-model="bundle.version"
                                            class="bundle-version"
                                            @input="onVersionChange"
                                        >
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="version-status">
                            <div class="status-item" :class="{ 'status-warning': bundleVersionInfo.hasLocalChanges }">
                                <span class="status-label">本地更改:</span>
                                <span class="status-value">
                                    {{ bundleVersionInfo.hasLocalChanges ? '有未提交的更改' : '无更改' }}
                                </span>
                                <button v-if="bundleVersionInfo.hasLocalChanges" 
                                        @click="syncBundleVersion" 
                                        class="action-btn sync-btn">
                                    提交更改
                                </button>
                            </div>
                            
                            <div class="version-actions">
                                <button @click="restoreVersion" class="action-btn restore-btn">
                                    从备份恢复
                                </button>
                                <button @click="revertVersion" class="action-btn revert-btn">
                                    回退到上一版本
                                </button>
                                <button @click="uploadToServer" 
                                        class="action-btn upload-btn"
                                        :disabled="uploadStatus === 'uploading'"
                                        :style="{ backgroundColor: uploadStatus === 'uploading' ? '#cccccc' : 
                                                                  uploadStatus === 'success' ? '#4caf50' : 
                                                                  uploadStatus === 'failed' ? '#f44336' : '#2196F3' }">
                                    {{ uploadStatus === 'uploading' ? '上传中...' : 
                                       uploadStatus === 'success' ? '上传成功' :
                                       uploadStatus === 'failed' ? '上传失败' : '上传到服务器' }}
                                </button>
                                <button 
                                    v-if="hasVersionChanges" 
                                    @click="saveVersionChanges" 
                                    class="action-btn save-version-btn"
                                >
                                    保存版本修改
                                </button>
                                <button @click="openVersionFileLocation" class="action-btn open-location-btn">
                                    打开文件位置
                                </button>
                            </div>
                            
                            <button @click="checkBundleVersion" class="refresh-btn">
                                刷新状态
                            </button>
                        </div>
                    </div>
                    
                    <div class="config-editor">
                        <div class="config-header">
                            <h3>发布设置文件</h3>
                            <p class="file-path">{{ publishSettingPath }}</p>
                            <button @click="toggleJsonView" class="toggle-btn">
                                {{ showRawJson ? '切换到表单视图' : '切换到JSON视图' }}
                            </button>
                        </div>
                        
                        <div v-if="showRawJson" class="json-view">
                            <textarea v-model="configContent" @input="trackChanges" class="json-editor"></textarea>
                        </div>
                        
                        <div v-else class="form-view">
                            <div v-for="(value, key) in configObject" :key="key" class="form-item">
                                <label :for="key" class="form-label">{{ key }}</label>
                                
                                <!-- 环境设置下拉框 -->
                                <select v-if="key === 'environment'" v-model="configObject[key]" 
                                        :id="key" class="form-select" @change="trackChanges">
                                    <option value="DEVELOPMENT">DEVELOPMENT</option>
                                    <option value="PRODUCTION">PRODUCTION</option>
                                </select>
                                
                                <!-- 布尔值勾选框 -->
                                <input v-else-if="typeof value === 'boolean'" type="checkbox" 
                                    v-model="configObject[key]" :id="key" class="form-checkbox" @change="trackChanges">
                                
                                <!-- 数字输入框 -->
                                <input v-else-if="typeof value === 'number'" type="number" 
                                    v-model.number="configObject[key]" :id="key" class="form-input" @input="trackChanges">
                                
                                <!-- 字符串输入框 -->
                                <input v-else type="text" v-model="configObject[key]" :id="key" 
                                        class="form-input" @input="trackChanges">
                            </div>
                        </div>
                        
                        <div class="editor-buttons">
                            <button @click="saveConfig" :disabled="!hasChanges" class="save-btn" 
                                    :class="{ 'button-disabled': !hasChanges }">应用修改</button>
                            <button @click="resetConfig" :disabled="!canReset" class="reset-btn"
                                    :class="{ 'button-disabled': !canReset }">回退修改</button>
                        </div>
                    </div>
                    
                    <!-- 改进上传进度条 -->
                    <div class="upload-progress-container" v-if="uploadStatus !== 'idle'">
                        <h3>文件上传进度</h3>
                        <div class="progress-info">
                            <span>当前文件: {{ currentUploadFile || '准备中...' }}</span>
                            <span>{{ uploadStatusText[uploadStatus] }}</span>
                        </div>
                        <div class="progress-bar-container">
                            <div class="progress-text">{{ uploadedFiles }}/{{ totalFiles }}</div>
                            <div class="progress-bar" :style="{ width: uploadProgress + '%' }"></div>
                        </div>
                        <div class="progress-percentage">{{ uploadProgress.toFixed(1) }}%</div>
                        <div class="file-count">已上传 {{ uploadedFiles }} 个文件，共 {{ totalFiles }} 个</div>
                        <div class="upload-btn-container" v-if="uploadStatus === 'uploading'">
                            <button @click="cancelUpload" class="action-btn cancel-btn">
                                中断上传
                            </button>
                        </div>
                    </div>
                `,
                data: () => ({
                    selectedOption: '',
                    configContent: '',
                    originalContent: '',
                    publishSettingPath: (0, path_1.join)(Editor.Project.path, 'assets', 'app', 'publishSetting.json'),
                    configObject: {},
                    showRawJson: false,
                    hasChanges: false,
                    canReset: false,
                    configList: Object.keys(configFiles).length > 0
                        ? configFiles
                        : { '默认配置': '' },
                    bundleVersionInfo: {
                        isLatest: true,
                        hasLocalChanges: false,
                        lastCheckTime: '未检查',
                        mainVersion: '',
                        bundleVersions: [],
                        diffVersions: []
                    },
                    hasVersionChanges: false,
                    publishStatus: 'idle',
                    publishStatusText: {
                        idle: '待发布',
                        publishing: '发布中',
                        success: '发布完成',
                        failed: '发布失败'
                    },
                    sftpConfig: {
                        host: '远程服务器IP',
                        port: 22,
                        username: '用户名',
                        password: '密码',
                        remotePath: '/path/to/remote/directory'
                    },
                    uploadStatus: 'idle',
                    uploadStatusText: {
                        idle: '待上传',
                        uploading: '上传中',
                        success: '上传完成',
                        failed: '上传失败'
                    },
                    currentSftp: null,
                    uploadProgress: 0,
                    uploadedFiles: 0,
                    totalFiles: 0,
                    currentUploadFile: '',
                }),
                mounted() {
                    // 组件挂载时加载发布设置
                    this.loadPublishSetting();
                    this.checkBundleVersion(); // 初始检查版本状态
                    loadSftpConfig().then(config => {
                        if (config) {
                            this.sftpConfig = config;
                        }
                    });
                },
                methods: {
                    trackChanges() {
                        if (this.showRawJson) {
                            // JSON视图中跟踪变化
                            this.hasChanges = this.configContent !== this.originalContent;
                        }
                        else {
                            // 表单视图中跟踪变化
                            const currentJson = JSON.stringify(this.configObject);
                            try {
                                const originalObj = JSON.parse(this.originalContent);
                                this.hasChanges = JSON.stringify(originalObj) !== currentJson;
                            }
                            catch (e) {
                                this.hasChanges = true;
                            }
                        }
                        // 检查是否可以回退
                        this.canReset = this.hasChanges && this.originalContent !== '';
                    },
                    loadPublishSetting() {
                        try {
                            const content = (0, fs_extra_1.readFileSync)(this.publishSettingPath, 'utf-8');
                            this.configContent = content;
                            this.originalContent = content; // 保存原始内容用于回退
                            try {
                                this.configObject = JSON.parse(content);
                            }
                            catch (e) {
                                this.configObject = {};
                                console.error('JSON解析失败:', e);
                                Editor.Dialog.warn('JSON格式无效，使用空对象！');
                            }
                            // 初始化时没有变更
                            this.hasChanges = false;
                            this.canReset = false;
                            console.log('发布设置文件已加载:', this.publishSettingPath);
                        }
                        catch (error) {
                            console.error('读取发布设置文件失败:', error);
                            this.configContent = '{}'; // 默认空JSON对象
                            this.originalContent = '{}';
                            this.configObject = {};
                            // 如果文件不存在，可以创建一个默认的
                            try {
                                const { writeFileSync, ensureDirSync } = require('fs-extra');
                                const dirPath = (0, path_1.join)(Editor.Project.path, 'assets', 'app');
                                ensureDirSync(dirPath); // 确保目录存在
                                writeFileSync(this.publishSettingPath, '{}', 'utf-8');
                                console.log('创建了默认的发布设置文件');
                            }
                            catch (err) {
                                console.error('创建默认发布设置文件失败:', err);
                            }
                        }
                    },
                    updateJsonFromForm() {
                        // 将表单数据转换回JSON字符串
                        this.configContent = JSON.stringify(this.configObject, null, 2);
                        // 更新变更状态
                        this.trackChanges();
                    },
                    toggleJsonView() {
                        if (!this.showRawJson) {
                            // 切换到JSON视图时，更新JSON字符串
                            this.updateJsonFromForm();
                        }
                        else {
                            // 切换到表单视图时，解析JSON字符串
                            try {
                                this.configObject = JSON.parse(this.configContent);
                            }
                            catch (e) {
                                console.error('JSON解析失败:', e);
                                Editor.Dialog.warn('JSON格式无效，无法切换到表单视图！');
                                return; // 解析失败时不切换视图
                            }
                        }
                        this.showRawJson = !this.showRawJson;
                        // 视图切换后更新变更状态
                        this.trackChanges();
                    },
                    handleChange() {
                        console.log('Selected:', this.selectedOption);
                        // 注意：这里依然保留从buildConfigs读取配置的功能
                        if (this.selectedOption) {
                            try {
                                const content = (0, fs_extra_1.readFileSync)(this.selectedOption, 'utf-8');
                                console.log('构建配置文件已加载');
                            }
                            catch (error) {
                                console.error('读取构建配置文件失败:', error);
                            }
                        }
                    },
                    saveConfig() {
                        // 保存修改后的发布设置文件
                        try {
                            if (!this.showRawJson) {
                                // 如果在表单视图，先更新JSON字符串
                                this.updateJsonFromForm();
                            }
                            const { writeFileSync } = require('fs-extra');
                            // 验证JSON格式是否有效
                            try {
                                JSON.parse(this.configContent);
                            }
                            catch (e) {
                                console.error('无效的JSON格式:', e);
                                Editor.Dialog.warn('JSON格式无效，无法保存！');
                                return;
                            }
                            writeFileSync(this.publishSettingPath, this.configContent, 'utf-8');
                            // 保存后更新原始内容并重置变更状态
                            this.originalContent = this.configContent;
                            this.hasChanges = false;
                            this.canReset = false;
                            console.log('发布设置文件已保存');
                            Editor.Dialog.info('发布设置已成功应用！');
                        }
                        catch (error) {
                            console.error('保存发布设置文件失败:', error);
                            Editor.Dialog.error('保存发布设置失败: ' + error.message);
                        }
                    },
                    resetConfig() {
                        // 回退到原始配置
                        if (this.originalContent) {
                            this.configContent = this.originalContent;
                            try {
                                this.configObject = JSON.parse(this.originalContent);
                            }
                            catch (e) {
                                this.configObject = {};
                            }
                            // 重置后更新变更状态
                            this.hasChanges = false;
                            this.canReset = false;
                            console.log('发布设置已重置为原始状态');
                            Editor.Dialog.info('发布设置已回退到初始状态！');
                        }
                    },
                    handleClick() {
                        this.publishStatus = 'publishing';
                        try {
                            const enginePath = "C:/ProgramData/cocos/editors/Creator/3.8.3";
                            const projectPath = Editor.Project.path;
                            const configPath = this.selectedOption;
                            const { spawn } = require('child_process');
                            const executable = `${enginePath}/CocosCreator.exe`;
                            const args = [
                                '--project', projectPath,
                                '--build', `configPath=${configPath}`
                            ];
                            console.log('开始执行构建命令...');
                            const buildProcess = spawn(executable, args);
                            buildProcess.stdout.on('data', (data) => {
                                const output = data.toString();
                                console.log(`构建输出: ${output}`);
                            });
                            buildProcess.stderr.on('data', (data) => {
                                const errorOutput = data.toString();
                                console.error(`构建错误: ${errorOutput}`);
                            });
                            buildProcess.on('close', (code) => {
                                switch (code) {
                                    case 36:
                                        console.log('构建过程成功完成');
                                        this.publishStatus = 'success';
                                        break;
                                    case 32:
                                        console.error('构建失败 —— 构建参数不合法');
                                        this.publishStatus = 'failed';
                                        break;
                                    case 34:
                                        console.error('构建失败 —— 构建过程出错失败，详情请参考构建日志');
                                        this.publishStatus = 'failed';
                                        break;
                                    case 0:
                                        console.log('进程正常退出，但未返回构建状态');
                                        this.publishStatus = 'success';
                                        break;
                                    default:
                                        console.error(`构建过程异常，未知退出码: ${code}`);
                                        this.publishStatus = 'failed';
                                        break;
                                }
                            });
                            buildProcess.on('error', (err) => {
                                console.error('启动构建进程时出错:', err);
                                this.publishStatus = 'failed';
                            });
                        }
                        catch (error) {
                            console.error('命令执行失败:', error);
                            this.publishStatus = 'failed';
                        }
                    },
                    async checkBundleVersion() {
                        try {
                            // 获取文件状态
                            const result = await bundle_version_manager_1.BundleVersionManager.checkVersion();
                            // 读取版本文件内容
                            const versionFilePath = (0, path_1.join)(Editor.Project.path, 'publish-remote-bundle', 'bundle_versions.json');
                            const versionData = JSON.parse((0, fs_extra_1.readFileSync)(versionFilePath, 'utf-8'));
                            // 转换 bundles 对象为数组格式
                            const bundleVersions = Object.entries(versionData.bundles).map(([name, data]) => ({
                                name,
                                version: data.version
                            }));
                            this.bundleVersionInfo = {
                                isLatest: result.isLatest,
                                hasLocalChanges: result.hasLocalChanges,
                                lastCheckTime: new Date().toLocaleString(),
                                mainVersion: versionData.version,
                                bundleVersions,
                                diffVersions: result.diffVersions || []
                            };
                        }
                        catch (error) {
                            console.error('检查Bundle版本状态失败:', error);
                            Editor.Dialog.warn('检查Bundle版本状态失败，请重试');
                            // 发生错误时重置为默认状态
                            this.bundleVersionInfo = {
                                isLatest: true,
                                hasLocalChanges: false,
                                lastCheckTime: new Date().toLocaleString(),
                                mainVersion: '',
                                bundleVersions: [],
                                diffVersions: []
                            };
                        }
                    },
                    async fetchLatestVersion() {
                        try {
                            await bundle_version_manager_1.BundleVersionManager.fetchLatest();
                            await this.checkBundleVersion(); // 刷新状态
                            Editor.Dialog.info('已获取最新版本');
                        }
                        catch (error) {
                            console.error('获取最新版本失败:', error);
                            Editor.Dialog.error('获取最新版本失败，请重试');
                        }
                    },
                    async syncBundleVersion() {
                        try {
                            await bundle_version_manager_1.BundleVersionManager.syncToGit();
                            await this.checkBundleVersion(); // 刷新状态
                            Editor.Dialog.info('版本已同步到分支');
                        }
                        catch (error) {
                            console.error('同步版本失败:', error);
                            Editor.Dialog.error('同步版本失败，请重试');
                        }
                    },
                    async generateBundleVersion() {
                        console.log('正在生成Bundle版本...');
                        const projectRoot = Editor.Project.path;
                        const targetPath = (0, path_1.join)(projectRoot, '/build/android/remote');
                        try {
                            if (await (0, generate_bundle_versions_1.generateBundleVersions)(targetPath)) {
                                console.log('✅ 版本文件生成成功');
                                // 生成完成后检查版本状态
                                await this.checkBundleVersion();
                            }
                            else {
                                console.warn('❌ 版本文件生成失败');
                                Editor.Dialog.warn('版本文件生成失败');
                            }
                        }
                        catch (error) {
                            console.error('生成Bundle版本失败:', error);
                            Editor.Dialog.error('生成Bundle版本失败: ' + error.message);
                        }
                    },
                    async restoreVersion() {
                        try {
                            await bundle_version_manager_1.BundleVersionManager.restoreFromBackup();
                            await this.checkBundleVersion(); // 刷新状态
                            Editor.Dialog.info('已从备份文件恢复');
                        }
                        catch (error) {
                            console.error('恢复版本失败:', error);
                            Editor.Dialog.error('恢复版本失败: ' + error.message);
                        }
                    },
                    async revertVersion() {
                        try {
                            await bundle_version_manager_1.BundleVersionManager.revertToLastCommit();
                            await this.checkBundleVersion(); // 刷新状态
                            Editor.Dialog.info('已回退到上一版本');
                        }
                        catch (error) {
                            console.error('回退版本失败:', error);
                            Editor.Dialog.error('回退版本失败: ' + error.message);
                        }
                    },
                    onVersionChange() {
                        this.hasVersionChanges = true;
                    },
                    async saveVersionChanges() {
                        try {
                            const versionFilePath = (0, path_1.join)(Editor.Project.path, 'publish-remote-bundle', 'bundle_versions.json');
                            // 构建要保存的版本数据
                            const versionData = {
                                version: this.bundleVersionInfo.mainVersion,
                                bundles: this.bundleVersionInfo.bundleVersions.reduce((acc, bundle) => {
                                    acc[bundle.name] = {
                                        version: bundle.version
                                    };
                                    return acc;
                                }, {})
                            };
                            // 写入文件
                            const { writeFileSync } = require('fs-extra');
                            writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2), 'utf-8');
                            this.hasVersionChanges = false;
                            await this.checkBundleVersion(); // 刷新状态
                            Editor.Dialog.info('版本修改已保存');
                        }
                        catch (error) {
                            console.error('保存版本修改失败:', error);
                            Editor.Dialog.error('保存版本修改失败: ' + error.message);
                        }
                    },
                    async openVersionFileLocation() {
                        try {
                            const versionFilePath = (0, path_1.join)(Editor.Project.path, 'publish-remote-bundle');
                            const { shell } = require('electron');
                            shell.openPath(versionFilePath);
                        }
                        catch (error) {
                            console.error('打开文件位置失败:', error);
                            Editor.Dialog.error('打开文件位置失败: ' + error.message);
                        }
                    },
                    async uploadToServer() {
                        if (this.uploadStatus === 'uploading') {
                            return;
                        }
                        this.uploadStatus = 'uploading';
                        // 创建SFTP客户端并添加调试功能
                        this.currentSftp = new ssh2_sftp_client_1.default();
                        // 启用调试日志
                        this.currentSftp.on('debug', (msg) => {
                            console.log(`SFTP调试信息: ${msg}`);
                        });
                        const localPath = (0, path_1.join)(Editor.Project.path, 'publish-remote-bundle');
                        // 重置上传进度
                        this.uploadProgress = 0;
                        this.uploadedFiles = 0;
                        this.totalFiles = 0;
                        this.currentUploadFile = '';
                        // 添加超时处理的辅助函数
                        const withTimeout = (promise, timeoutMs, message) => {
                            let timeoutId;
                            const timeoutPromise = new Promise((_, reject) => {
                                timeoutId = setTimeout(() => reject(new Error(`操作超时: ${message}`)), timeoutMs);
                            });
                            return Promise.race([
                                promise,
                                timeoutPromise
                            ]).finally(() => clearTimeout(timeoutId));
                        };
                        // 添加队列控制
                        const createQueue = (concurrency) => {
                            const queue = [];
                            let activeCount = 0;
                            const runTask = async () => {
                                if (activeCount >= concurrency || queue.length === 0) {
                                    return;
                                }
                                activeCount++;
                                const task = queue.shift();
                                try {
                                    if (task) {
                                        await task();
                                    }
                                }
                                catch (error) {
                                    console.error('任务执行失败:', error);
                                }
                                finally {
                                    activeCount--;
                                    runTask(); // 尝试执行下一个任务
                                }
                            };
                            const addTask = (task) => {
                                queue.push(task);
                                runTask(); // 尝试立即执行任务
                            };
                            const waitComplete = () => {
                                if (activeCount === 0 && queue.length === 0) {
                                    return Promise.resolve();
                                }
                                return new Promise(resolve => {
                                    const checkInterval = setInterval(() => {
                                        if (activeCount === 0 && queue.length === 0) {
                                            clearInterval(checkInterval);
                                            resolve();
                                        }
                                    }, 100);
                                });
                            };
                            return { addTask, waitComplete };
                        };
                        // 监控连接状态
                        let isConnected = true;
                        let connectionCheckInterval;
                        // 检查SFTP连接状态并在需要时重新连接
                        const checkAndReconnect = async () => {
                            try {
                                if (!this.currentSftp) {
                                    console.warn('SFTP客户端不存在，创建新的连接');
                                    this.currentSftp = new ssh2_sftp_client_1.default();
                                    await this.currentSftp.connect({
                                        host: this.sftpConfig.host,
                                        port: this.sftpConfig.port,
                                        username: this.sftpConfig.username,
                                        password: this.sftpConfig.password,
                                        readyTimeout: 10000
                                    });
                                    return true;
                                }
                                // 尝试执行一个简单操作来检查连接状态
                                await this.currentSftp.list('.');
                                return true;
                            }
                            catch (error) {
                                console.warn('连接检查失败，尝试重新连接', error);
                                try {
                                    // 先关闭任何可能存在的连接
                                    if (this.currentSftp) {
                                        try {
                                            await this.currentSftp.end();
                                        }
                                        catch (e) {
                                            console.error('关闭旧连接失败', e);
                                        }
                                    }
                                    // 创建新连接
                                    this.currentSftp = new ssh2_sftp_client_1.default();
                                    await this.currentSftp.connect({
                                        host: this.sftpConfig.host,
                                        port: this.sftpConfig.port,
                                        username: this.sftpConfig.username,
                                        password: this.sftpConfig.password,
                                        readyTimeout: 10000
                                    });
                                    console.log('重新连接成功');
                                    return true;
                                }
                                catch (reconnectError) {
                                    console.error('重新连接失败', reconnectError);
                                    return false;
                                }
                            }
                        };
                        // 启动连接状态监控
                        const startConnectionMonitor = () => {
                            // 每60秒检查一次连接
                            connectionCheckInterval = setInterval(async () => {
                                console.log('执行定期连接检查...');
                                isConnected = await checkAndReconnect();
                                if (!isConnected) {
                                    console.error('连接已断开且无法重新连接');
                                }
                            }, 60000);
                        };
                        // 停止连接监控
                        const stopConnectionMonitor = () => {
                            if (connectionCheckInterval) {
                                clearInterval(connectionCheckInterval);
                            }
                        };
                        try {
                            console.log('开始连接服务器...');
                            // 使用超时控制初始连接
                            await withTimeout(this.currentSftp.connect({
                                host: this.sftpConfig.host,
                                port: this.sftpConfig.port,
                                username: this.sftpConfig.username,
                                password: this.sftpConfig.password,
                                readyTimeout: 10000, // 10秒连接超时
                            }), 20000, '服务器连接');
                            console.log('服务器连接成功！');
                            // 获取环境配置并转换为小写
                            const environment = this.configObject.environment?.toLowerCase() == 'development' ? 'develop' : 'production';
                            const remotePath = (0, path_1.join)(this.sftpConfig.remotePath, environment);
                            console.log(`目标路径: ${remotePath}`);
                            // 检查本地目录是否存在
                            const { existsSync, lstatSync, readdirSync } = require('fs-extra');
                            if (!existsSync(localPath)) {
                                throw new Error(`本地目录不存在: ${localPath}`);
                            }
                            console.log(`本地目录检查通过: ${localPath}`);
                            // 计算要上传的文件总数
                            const calculateFiles = (dir) => {
                                let count = 0;
                                const items = readdirSync(dir);
                                for (const item of items) {
                                    const itemPath = (0, path_1.join)(dir, item);
                                    if (lstatSync(itemPath).isDirectory()) {
                                        count += calculateFiles(itemPath);
                                    }
                                    else {
                                        count++;
                                    }
                                }
                                return count;
                            };
                            this.totalFiles = calculateFiles(localPath);
                            console.log(`需要上传的文件总数: ${this.totalFiles}`);
                            // 路径格式化函数，确保使用正确的分隔符
                            const formatRemotePath = (path) => {
                                // 转换为正斜杠格式（适用于大多数SFTP服务器）
                                return path.replace(/\\/g, '/');
                            };
                            // 手动实现上传目录的功能，以便跟踪进度
                            const uploadQueue = createQueue(5); // 最多5个并发上传
                            const failedUploads = [];
                            const uploadDirectory = async (localDir, remoteDir) => {
                                // 格式化远程路径
                                remoteDir = formatRemotePath(remoteDir);
                                // 仅在顶层目录输出日志
                                if (localDir === localPath) {
                                    console.log(`格式化后的远程路径: ${remoteDir}`);
                                }
                                // 确保远程目录存在
                                try {
                                    // 仅在顶层目录输出日志
                                    if (localDir === localPath) {
                                        console.log(`准备处理远程目录: ${remoteDir}`);
                                    }
                                    // 先检查目录是否已存在
                                    let dirExists = false;
                                    try {
                                        // 移除过多的日志
                                        const stats = await withTimeout(this.currentSftp.stat(remoteDir), 15000, '检查远程目录');
                                        // 简化判断逻辑，使用类型断言
                                        const statsAny = stats;
                                        let isDir = false;
                                        // 尝试使用不同方式判断是否为目录
                                        if (typeof statsAny.isDirectory === 'function') {
                                            isDir = statsAny.isDirectory();
                                        }
                                        else if (typeof statsAny.isDirectory === 'boolean') {
                                            isDir = statsAny.isDirectory;
                                        }
                                        else if (statsAny.type === 'd') {
                                            isDir = true;
                                        }
                                        else if (statsAny.mode && (statsAny.mode & 0o40000) !== 0) {
                                            isDir = true;
                                        }
                                        if (isDir) {
                                            // 移除过多的日志
                                            dirExists = true;
                                        }
                                        else {
                                            console.warn(`目标路径存在但不是目录: ${remoteDir}`);
                                        }
                                    }
                                    catch (statError) {
                                        // 仅在顶层目录输出日志
                                        if (localDir === localPath) {
                                            console.log(`远程目录不存在，需要创建: ${remoteDir}`);
                                        }
                                    }
                                    // 如果目录不存在，才创建
                                    if (!dirExists) {
                                        // 仅在顶层目录输出详细日志
                                        if (localDir === localPath) {
                                            console.log(`尝试创建远程目录: ${remoteDir}`);
                                        }
                                        // 为mkdir添加超时控制
                                        await withTimeout(this.currentSftp.mkdir(remoteDir, true), 30000, // 30秒超时
                                        '创建远程目录').catch(async (error) => {
                                            console.warn(`使用递归方式创建目录失败，尝试手动创建: ${remoteDir}`, error);
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
                                                    // 精简日志输出
                                                    // 检查目录是否存在
                                                    try {
                                                        const stats = await this.currentSftp.stat(currentPath);
                                                        if (stats) {
                                                            continue; // 目录已存在，跳过
                                                        }
                                                    }
                                                    catch (statError) {
                                                        // 目录不存在，继续创建
                                                    }
                                                    // 创建目录
                                                    await withTimeout(this.currentSftp.mkdir(currentPath, false), // 不使用递归
                                                    10000, `创建目录 ${currentPath}`);
                                                }
                                                catch (mkdirError) {
                                                    // 如果创建失败但目录可能已存在，继续处理
                                                    console.warn(`创建目录失败，可能已存在: ${currentPath}`);
                                                }
                                            }
                                        });
                                    }
                                    // 仅在顶层目录输出日志
                                    if (localDir === localPath) {
                                        console.log(`远程目录处理完成: ${remoteDir}`);
                                    }
                                }
                                catch (err) {
                                    console.warn(`远程目录处理失败，尝试继续上传: ${remoteDir}`);
                                    // 即使目录创建遇到问题，也尝试继续上传
                                }
                                // 获取目录下的所有文件
                                const items = readdirSync(localDir);
                                // 仅在顶层目录输出日志
                                if (localDir === localPath) {
                                    console.log(`目录 ${localDir} 中有 ${items.length} 个文件/文件夹`);
                                }
                                // 重试函数
                                const withRetry = async (fn, retries = 3, delay = 2000) => {
                                    let lastError;
                                    for (let i = 0; i < retries; i++) {
                                        try {
                                            return await fn();
                                        }
                                        catch (err) {
                                            console.warn(`操作失败，第 ${i + 1}/${retries} 次重试`);
                                            lastError = err;
                                            // 最后一次重试前等待
                                            if (i < retries - 1) {
                                                await new Promise(resolve => setTimeout(resolve, delay));
                                            }
                                        }
                                    }
                                    throw lastError;
                                };
                                // 处理每个文件/文件夹
                                for (const item of items) {
                                    const localItemPath = (0, path_1.join)(localDir, item);
                                    const remoteItemPath = formatRemotePath((0, path_1.join)(remoteDir, item));
                                    if (lstatSync(localItemPath).isDirectory()) {
                                        // 递归上传子目录
                                        if (localDir === localPath) {
                                            console.log(`处理子目录: ${item}`);
                                        }
                                        await uploadDirectory(localItemPath, remoteItemPath);
                                    }
                                    else {
                                        // 上传文件 - 添加到队列
                                        uploadQueue.addTask(async () => {
                                            this.currentUploadFile = item;
                                            // 简化日志输出
                                            try {
                                                await withRetry(async () => {
                                                    // 精简日志
                                                    await this.currentSftp.put(localItemPath, remoteItemPath);
                                                });
                                                this.uploadedFiles++;
                                                this.uploadProgress = (this.uploadedFiles / this.totalFiles) * 100;
                                                // 每10个文件输出一次进度日志
                                                if (this.uploadedFiles % 10 === 0 || this.uploadedFiles === this.totalFiles) {
                                                    console.log(`进度: ${this.uploadProgress.toFixed(2)}% (${this.uploadedFiles}/${this.totalFiles})`);
                                                }
                                            }
                                            catch (error) {
                                                console.error(`上传文件失败 (跳过继续): ${item}`);
                                                failedUploads.push({ local: localItemPath, remote: remoteItemPath });
                                            }
                                        });
                                    }
                                }
                            };
                            console.log('开始上传文件...');
                            console.log(`本地路径: ${localPath}`);
                            console.log(`远程路径: ${remotePath}`);
                            // 启动连接监控
                            startConnectionMonitor();
                            // 上传整个目录
                            console.log('正在执行上传目录操作...');
                            try {
                                await withTimeout((async () => {
                                    // 先尝试直接创建远程目标目录
                                    console.log(`正在准备目标目录: ${remotePath}`);
                                    try {
                                        await withTimeout(this.currentSftp.mkdir(formatRemotePath(remotePath), true), 30000, '创建主远程目录');
                                        console.log(`目标目录准备完成: ${remotePath}`);
                                    }
                                    catch (mkdirError) {
                                        console.warn(`创建主远程目录失败，将在上传过程中逐级创建`);
                                    }
                                    await uploadDirectory(localPath, remotePath);
                                    console.log('等待所有上传任务完成...');
                                    await uploadQueue.waitComplete();
                                    console.log('所有上传任务已处理完成');
                                    // 报告失败的上传
                                    if (failedUploads.length > 0) {
                                        console.warn(`有 ${failedUploads.length} 个文件上传失败`);
                                        console.warn('失败的文件列表:');
                                        failedUploads.forEach(({ local, remote }, index) => {
                                            console.warn(`${index + 1}. ${local} -> ${remote}`);
                                        });
                                    }
                                })(), 1800000, // 增加到30分钟超时
                                '文件上传');
                                console.log('目录上传操作完成');
                            }
                            catch (uploadError) {
                                console.error('目录上传操作失败:', uploadError);
                                throw new Error(`文件上传失败: ${uploadError.message}`);
                            }
                            console.log('文件上传完成！');
                            // 验证上传结果
                            console.log('上传完成，正在验证结果...');
                            try {
                                const remoteFiles = await withTimeout(this.currentSftp.list(remotePath), 30000, // 30秒列表获取超时
                                '获取远程文件列表');
                                console.log(`验证成功: 远程目录中有 ${remoteFiles.length} 个文件/文件夹`);
                            }
                            catch (error) {
                                console.warn('无法验证远程文件列表，但上传过程已完成');
                            }
                            console.log('文件上传流程已完成');
                            this.uploadStatus = 'success';
                            Editor.Dialog.info('文件已成功上传到服务器！');
                        }
                        catch (error) {
                            console.error('上传失败:', error instanceof Error ? error.message : String(error));
                            this.uploadStatus = 'failed';
                            Editor.Dialog.error('上传失败: ' + (error instanceof Error ? error.message : String(error)));
                        }
                        finally {
                            // 停止连接监控
                            stopConnectionMonitor();
                            if (this.currentSftp) {
                                try {
                                    await this.currentSftp.end();
                                    console.log('SFTP连接已关闭');
                                }
                                catch (closeError) {
                                    console.error('关闭连接时发生错误');
                                }
                            }
                        }
                    },
                    async cancelUpload() {
                        if (this.currentSftp) {
                            console.log('正在中断上传...');
                            try {
                                await this.currentSftp.end();
                                this.uploadStatus = 'idle';
                                console.log('上传已中断');
                                Editor.Dialog.info('上传已中断');
                            }
                            catch (error) {
                                console.error('中断上传失败:', error);
                                Editor.Dialog.error('中断上传失败: ' + error.message);
                            }
                        }
                    },
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
        app?.unmount();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9zb3VyY2UvcGFuZWxzL3B1Ymxpc2hQcm9jZXNzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7O0FBQUEsdUNBQXFEO0FBQ3JELCtCQUE0QjtBQUM1Qiw2QkFBMEM7QUFDMUMsK0VBQTBFO0FBQzFFLG1GQUE4RTtBQUM5RSx3RUFBc0M7QUFFdEMsV0FBVztBQUNYLE1BQU0sZUFBZSxHQUFHLElBQUksT0FBTyxFQUErQixDQUFDO0FBRW5FLE1BQU0sWUFBWSxHQUFHLElBQUksT0FBTyxFQUFZLENBQUM7QUFxRTdDLGtCQUFrQjtBQUNsQixLQUFLLFVBQVUsY0FBYztJQUN6QixJQUFJLENBQUM7UUFDRCxNQUFNLFVBQVUsR0FBRyxJQUFBLFdBQUksRUFBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQyxDQUFDO1FBQ2pFLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBQSx1QkFBWSxFQUFDLFVBQVUsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBQzdELE9BQU8sTUFBTSxDQUFDO0lBQ2xCLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEMsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztBQUNMLENBQUM7QUFFRCxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0lBQ2pDLFNBQVMsRUFBRTtRQUNQLElBQUksRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQztRQUMvQixJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7S0FDbEM7SUFDRCxRQUFRLEVBQUUsSUFBQSx1QkFBWSxF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QUFVLEdBQUksS0FBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDOzRCQUMvRCxDQUFDO3dCQUNMLENBQUM7b0JBQ0wsQ0FBQztpQkFDSjthQUNKLENBQUM7WUFFRixTQUFTO1lBQ1QsTUFBTSxHQUFHLEdBQUcsSUFBQSxlQUFTLEVBQUM7Z0JBQ2xCLFFBQVEsRUFBRSxpQkFBaUI7Z0JBQzNCLFVBQVUsRUFBRSxFQUFFLFdBQVcsRUFBRTthQUM5QixDQUFDLENBQUM7WUFFSCxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxlQUFlLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQzFFLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN0QixZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNoQyxDQUFDO0lBQ0wsQ0FBQztJQUVELEtBQUs7UUFDRCxNQUFNLEdBQUcsR0FBRyxZQUFZLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLEdBQUcsRUFBRSxPQUFPLEVBQUUsQ0FBQztJQUNuQixDQUFDO0NBQ0osQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgcmVhZEZpbGVTeW5jLCByZWFkZGlyU3luYyB9IGZyb20gJ2ZzLWV4dHJhJztcclxuaW1wb3J0IHsgam9pbiB9IGZyb20gJ3BhdGgnO1xyXG5pbXBvcnQgeyBjcmVhdGVBcHAsIHR5cGUgQXBwIH0gZnJvbSAndnVlJztcclxuaW1wb3J0IHsgQnVuZGxlVmVyc2lvbk1hbmFnZXIgfSBmcm9tICcuLi8uLi91dGlscy9idW5kbGUtdmVyc2lvbi1tYW5hZ2VyJztcclxuaW1wb3J0IHsgZ2VuZXJhdGVCdW5kbGVWZXJzaW9ucyB9IGZyb20gJy4uLy4uL3V0aWxzL2dlbmVyYXRlLWJ1bmRsZS12ZXJzaW9ucyc7XHJcbmltcG9ydCBDbGllbnQgZnJvbSAnc3NoMi1zZnRwLWNsaWVudCc7XHJcblxyXG4vLyDmt7vliqDphY3nva7mlofku7bnvJPlrZhcclxuY29uc3QgY29uZmlnUGF0aENhY2hlID0gbmV3IFdlYWtNYXA8YW55LCBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+PigpO1xyXG5cclxuY29uc3QgcGFuZWxEYXRhTWFwID0gbmV3IFdlYWtNYXA8YW55LCBBcHA+KCk7XHJcblxyXG4vLyDlrprkuYnnu4Tku7bnsbvlnotcclxuaW50ZXJmYWNlIEJ1bmRsZVZlcnNpb25JbmZvIHtcclxuICAgIGlzTGF0ZXN0OiBib29sZWFuO1xyXG4gICAgaGFzTG9jYWxDaGFuZ2VzOiBib29sZWFuO1xyXG4gICAgbGFzdENoZWNrVGltZTogc3RyaW5nO1xyXG4gICAgbWFpblZlcnNpb246IHN0cmluZztcclxuICAgIGJ1bmRsZVZlcnNpb25zOiBBcnJheTx7XHJcbiAgICAgICAgbmFtZTogc3RyaW5nO1xyXG4gICAgICAgIHZlcnNpb246IHN0cmluZztcclxuICAgIH0+O1xyXG4gICAgZGlmZlZlcnNpb25zOiBzdHJpbmdbXTtcclxufVxyXG5cclxuaW50ZXJmYWNlIEJ1bmRsZVZlcnNpb25TdGF0dXMge1xyXG4gICAgaXNMYXRlc3Q6IGJvb2xlYW47XHJcbiAgICBoYXNMb2NhbENoYW5nZXM6IGJvb2xlYW47XHJcbiAgICBkaWZmVmVyc2lvbnM6IHN0cmluZ1tdO1xyXG59XHJcblxyXG5pbnRlcmZhY2UgTXlDb21wb25lbnQge1xyXG4gICAgc2VsZWN0ZWRPcHRpb246IHN0cmluZztcclxuICAgIGNvbmZpZ0NvbnRlbnQ6IHN0cmluZztcclxuICAgIG9yaWdpbmFsQ29udGVudDogc3RyaW5nO1xyXG4gICAgcHVibGlzaFNldHRpbmdQYXRoOiBzdHJpbmc7XHJcbiAgICBjb25maWdPYmplY3Q6IFJlY29yZDxzdHJpbmcsIGFueT47XHJcbiAgICBzaG93UmF3SnNvbjogYm9vbGVhbjtcclxuICAgIGhhc0NoYW5nZXM6IGJvb2xlYW47XHJcbiAgICBjYW5SZXNldDogYm9vbGVhbjtcclxuICAgIGJ1bmRsZVZlcnNpb25JbmZvOiBCdW5kbGVWZXJzaW9uSW5mbztcclxuICAgIGhhbmRsZUNoYW5nZShldmVudDogRXZlbnQpOiB2b2lkO1xyXG4gICAgaGFuZGxlQ2xpY2soKTogdm9pZDtcclxuICAgIHNhdmVDb25maWcoKTogdm9pZDtcclxuICAgIHJlc2V0Q29uZmlnKCk6IHZvaWQ7XHJcbiAgICBsb2FkUHVibGlzaFNldHRpbmcoKTogdm9pZDtcclxuICAgIHVwZGF0ZUpzb25Gcm9tRm9ybSgpOiB2b2lkO1xyXG4gICAgdG9nZ2xlSnNvblZpZXcoKTogdm9pZDtcclxuICAgIHRyYWNrQ2hhbmdlcygpOiB2b2lkO1xyXG4gICAgZ2VuZXJhdGVCdW5kbGVWZXJzaW9uKCk6IHZvaWQ7XHJcbiAgICBjaGVja0J1bmRsZVZlcnNpb24oKTogUHJvbWlzZTx2b2lkPjtcclxuICAgIGZldGNoTGF0ZXN0VmVyc2lvbigpOiBQcm9taXNlPHZvaWQ+O1xyXG4gICAgc3luY0J1bmRsZVZlcnNpb24oKTogUHJvbWlzZTx2b2lkPjtcclxuICAgIHJlc3RvcmVWZXJzaW9uKCk6IHZvaWQ7XHJcbiAgICByZXZlcnRWZXJzaW9uKCk6IHZvaWQ7XHJcbiAgICBvblZlcnNpb25DaGFuZ2UoKTogdm9pZDtcclxuICAgIHNhdmVWZXJzaW9uQ2hhbmdlcygpOiBQcm9taXNlPHZvaWQ+O1xyXG4gICAgaGFzVmVyc2lvbkNoYW5nZXM6IGJvb2xlYW47XHJcbiAgICBwdWJsaXNoU3RhdHVzOiBzdHJpbmc7XHJcbiAgICBwdWJsaXNoU3RhdHVzVGV4dDogUmVjb3JkPHN0cmluZywgc3RyaW5nPjtcclxuICAgIG9wZW5WZXJzaW9uRmlsZUxvY2F0aW9uKCk6IFByb21pc2U8dm9pZD47XHJcbiAgICB1cGxvYWRUb1NlcnZlcigpOiBQcm9taXNlPHZvaWQ+O1xyXG4gICAgY2FuY2VsVXBsb2FkKCk6IFByb21pc2U8dm9pZD47XHJcbiAgICBzZnRwQ29uZmlnOiB7XHJcbiAgICAgICAgaG9zdDogc3RyaW5nO1xyXG4gICAgICAgIHBvcnQ6IG51bWJlcjtcclxuICAgICAgICB1c2VybmFtZTogc3RyaW5nO1xyXG4gICAgICAgIHBhc3N3b3JkOiBzdHJpbmc7XHJcbiAgICAgICAgcmVtb3RlUGF0aDogc3RyaW5nO1xyXG4gICAgfTtcclxuICAgIHVwbG9hZFN0YXR1czogJ2lkbGUnIHwgJ3VwbG9hZGluZycgfCAnc3VjY2VzcycgfCAnZmFpbGVkJztcclxuICAgIHVwbG9hZFN0YXR1c1RleHQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XHJcbiAgICBjdXJyZW50U2Z0cDogQ2xpZW50O1xyXG4gICAgdXBsb2FkUHJvZ3Jlc3M6IG51bWJlcjtcclxuICAgIHVwbG9hZGVkRmlsZXM6IG51bWJlcjtcclxuICAgIHRvdGFsRmlsZXM6IG51bWJlcjtcclxuICAgIGN1cnJlbnRVcGxvYWRGaWxlOiBzdHJpbmc7XHJcbn1cclxuXHJcbi8vIOS7jumFjee9ruaWh+S7tuivu+WPliBTRlRQIOmFjee9rlxyXG5hc3luYyBmdW5jdGlvbiBsb2FkU2Z0cENvbmZpZygpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgY29uc3QgY29uZmlnUGF0aCA9IGpvaW4oRWRpdG9yLlByb2plY3QucGF0aCwgJ3NmdHAtY29uZmlnLmpzb24nKTtcclxuICAgICAgICBjb25zdCBjb25maWcgPSBKU09OLnBhcnNlKHJlYWRGaWxlU3luYyhjb25maWdQYXRoLCAndXRmLTgnKSk7XHJcbiAgICAgICAgcmV0dXJuIGNvbmZpZztcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcign6K+75Y+WIFNGVFAg6YWN572u5aSx6LSlOicsIGVycm9yKTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxufVxyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3IuUGFuZWwuZGVmaW5lKHtcclxuICAgIGxpc3RlbmVyczoge1xyXG4gICAgICAgIHNob3c6ICgpID0+IGNvbnNvbGUubG9nKCdzaG93JyksXHJcbiAgICAgICAgaGlkZTogKCkgPT4gY29uc29sZS5sb2coJ2hpZGUnKSxcclxuICAgIH0sXHJcbiAgICB0ZW1wbGF0ZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3RlbXBsYXRlL3B1Ymxpc2hQcm9jZXNzL2luZGV4Lmh0bWwnKSwgJ3V0Zi04JyksXHJcbiAgICBzdHlsZTogcmVhZEZpbGVTeW5jKGpvaW4oX19kaXJuYW1lLCAnLi4vLi4vLi4vc3RhdGljL3N0eWxlL3B1Ymxpc2hQcm9jZXNzL2luZGV4LmNzcycpLCAndXRmLTgnKSArIGBcclxuICAgIC51cGxvYWQtcHJvZ3Jlc3MtY29udGFpbmVyIHtcclxuICAgICAgICBtYXJnaW46IDIwcHggMDtcclxuICAgICAgICBwYWRkaW5nOiAxNXB4O1xyXG4gICAgICAgIGJvcmRlcjogMXB4IHNvbGlkICNjY2M7XHJcbiAgICAgICAgYm9yZGVyLXJhZGl1czogNHB4O1xyXG4gICAgICAgIGJhY2tncm91bmQ6ICNmNWY1ZjU7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC5wcm9ncmVzcy1pbmZvIHtcclxuICAgICAgICBkaXNwbGF5OiBmbGV4O1xyXG4gICAgICAgIGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjtcclxuICAgICAgICBtYXJnaW4tYm90dG9tOiAxMHB4O1xyXG4gICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAucHJvZ3Jlc3MtYmFyLWNvbnRhaW5lciB7XHJcbiAgICAgICAgd2lkdGg6IDEwMCU7XHJcbiAgICAgICAgaGVpZ2h0OiAyNHB4O1xyXG4gICAgICAgIGJhY2tncm91bmQ6ICNlMGUwZTA7XHJcbiAgICAgICAgYm9yZGVyLXJhZGl1czogMTJweDtcclxuICAgICAgICBvdmVyZmxvdzogaGlkZGVuO1xyXG4gICAgICAgIG1hcmdpbi1ib3R0b206IDhweDtcclxuICAgICAgICBib3gtc2hhZG93OiBpbnNldCAwIDFweCAzcHggcmdiYSgwLDAsMCwwLjIpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAucHJvZ3Jlc3MtYmFyIHtcclxuICAgICAgICBoZWlnaHQ6IDEwMCU7XHJcbiAgICAgICAgYmFja2dyb3VuZDogbGluZWFyLWdyYWRpZW50KHRvIHJpZ2h0LCAjNENBRjUwLCAjOEJDMzRBKTtcclxuICAgICAgICB0cmFuc2l0aW9uOiB3aWR0aCAwLjNzIGVhc2U7XHJcbiAgICAgICAgcG9zaXRpb246IHJlbGF0aXZlO1xyXG4gICAgICAgIGRpc3BsYXk6IGZsZXg7XHJcbiAgICAgICAgYWxpZ24taXRlbXM6IGNlbnRlcjtcclxuICAgICAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLnByb2dyZXNzLXRleHQge1xyXG4gICAgICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcclxuICAgICAgICB3aWR0aDogMTAwJTtcclxuICAgICAgICB0ZXh0LWFsaWduOiBjZW50ZXI7XHJcbiAgICAgICAgY29sb3I6ICNmZmY7XHJcbiAgICAgICAgZm9udC13ZWlnaHQ6IGJvbGQ7XHJcbiAgICAgICAgdGV4dC1zaGFkb3c6IDAgMXB4IDJweCByZ2JhKDAsMCwwLDAuMyk7XHJcbiAgICAgICAgei1pbmRleDogMjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLnByb2dyZXNzLXBlcmNlbnRhZ2Uge1xyXG4gICAgICAgIHRleHQtYWxpZ246IGNlbnRlcjtcclxuICAgICAgICBmb250LXdlaWdodDogYm9sZDtcclxuICAgICAgICBmb250LXNpemU6IDE2cHg7XHJcbiAgICAgICAgY29sb3I6ICM0Y2FmNTA7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIC5maWxlLWNvdW50IHtcclxuICAgICAgICBtYXJnaW4tdG9wOiA4cHg7XHJcbiAgICAgICAgdGV4dC1hbGlnbjogY2VudGVyO1xyXG4gICAgICAgIGZvbnQtd2VpZ2h0OiBib2xkO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAudXBsb2FkLWJ0bi1jb250YWluZXIge1xyXG4gICAgICAgIG1hcmdpbi10b3A6IDE1cHg7XHJcbiAgICAgICAgZGlzcGxheTogZmxleDtcclxuICAgICAgICBqdXN0aWZ5LWNvbnRlbnQ6IGNlbnRlcjtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLnVwbG9hZC1idG4ge1xyXG4gICAgICAgIHBhZGRpbmc6IDhweCAxNnB4O1xyXG4gICAgICAgIGJvcmRlci1yYWRpdXM6IDRweDtcclxuICAgICAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjNGNhZjUwO1xyXG4gICAgICAgIGNvbG9yOiB3aGl0ZTtcclxuICAgICAgICBmb250LXdlaWdodDogYm9sZDtcclxuICAgICAgICBjdXJzb3I6IHBvaW50ZXI7XHJcbiAgICAgICAgYm9yZGVyOiBub25lO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAudXBsb2FkLWJ0bjpob3ZlciB7XHJcbiAgICAgICAgYmFja2dyb3VuZC1jb2xvcjogIzQ1YTA0OTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgLnVwbG9hZC1idG46ZGlzYWJsZWQge1xyXG4gICAgICAgIGJhY2tncm91bmQtY29sb3I6ICNjY2NjY2M7XHJcbiAgICAgICAgY3Vyc29yOiBub3QtYWxsb3dlZDtcclxuICAgIH1cclxuICAgIGAsXHJcbiAgICAkOiB7IGFwcDogJyNhcHAnIH0sXHJcblxyXG4gICAgcmVhZHkoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuJC5hcHApIHtcclxuICAgICAgICAgICAgLy8g5paw5aKe6YWN572u5paH5Lu25omr5o+P6YC76L6RXHJcbiAgICAgICAgICAgIGNvbnN0IGNvbmZpZ0RpciA9IEVkaXRvci5Qcm9qZWN0LnBhdGggKyBcIi9idWlsZENvbmZpZ3NcIjtcclxuICAgICAgICAgICAgY29uc3QgY29uZmlnRmlsZXMgPSByZWFkZGlyU3luYyhjb25maWdEaXIpXHJcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGZpbGUgPT4gZmlsZS5lbmRzV2l0aCgnLmpzb24nKSlcclxuICAgICAgICAgICAgICAgIC5yZWR1Y2UoKGFjYywgZmlsZSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGFjY1tmaWxlXSA9IGpvaW4oY29uZmlnRGlyLCBmaWxlKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gYWNjO1xyXG4gICAgICAgICAgICAgICAgfSwge30gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPik7XHJcblxyXG4gICAgICAgICAgICAvLyDlrZjlgqjphY3nva7mlofku7bot6/lvoRcclxuICAgICAgICAgICAgY29uZmlnUGF0aENhY2hlLnNldCh0aGlzLCBjb25maWdGaWxlcyk7XHJcbiAgICAgICAgICAgIC8vIOe7hOS7tuWumuS5ie+8iOS/ruaUueaVsOaNrumDqOWIhu+8iVxyXG4gICAgICAgICAgICBjb25zdCBNeUNvbXBvbmVudCA9IHtcclxuICAgICAgICAgICAgICAgIHRlbXBsYXRlOiBgXHJcbiAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInRvb2xiYXJcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImlucHV0LWdyb3VwXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c2VsZWN0IHYtbW9kZWw9XCJzZWxlY3RlZE9wdGlvblwiIEBjaGFuZ2U9XCJoYW5kbGVDaGFuZ2VcIiBjbGFzcz1cInBhY2thZ2Utc2VsZWN0XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPG9wdGlvbiB2LWZvcj1cIihwYXRoLCBuYW1lKSBpbiBjb25maWdMaXN0XCIgOnZhbHVlPVwicGF0aFwiPnt7IG5hbWUgfX08L29wdGlvbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImJ1dHRvbi1ncm91cFwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBAY2xpY2s9XCJoYW5kbGVDbGlja1wiIDpkaXNhYmxlZD1cIiFzZWxlY3RlZE9wdGlvbiB8fCBwdWJsaXNoU3RhdHVzID09PSAncHVibGlzaGluZydcIiBjbGFzcz1cInB1Ymxpc2gtYnRuXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAge3sgcHVibGlzaFN0YXR1cyA9PT0gJ3B1Ymxpc2hpbmcnID8gJ+WPkeW4g+S4rS4uLicgOiAn5omn6KGM5Y+R5biDJyB9fVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHVibGlzaC1zdGF0dXNcIiA6Y2xhc3M9XCJwdWJsaXNoU3RhdHVzXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJzdGF0dXMtaWNvblwiPjwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInN0YXR1cy10ZXh0XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt7IHB1Ymxpc2hTdGF0dXNUZXh0W3B1Ymxpc2hTdGF0dXNdIH19XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIEBjbGljaz1cImdlbmVyYXRlQnVuZGxlVmVyc2lvblwiIGNsYXNzPVwiYnVuZGxlLXZlcnNpb24tYnRuXCI+55Sf5oiQQnVuZGxl54mI5pysPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIDwhLS0g5re75YqgQnVuZGxl54mI5pys566h55CG5Yy65Z+fIC0tPlxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJidW5kbGUtdmVyc2lvbi1tYW5hZ2VyXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ2ZXJzaW9uLWhlYWRlclwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGgzPkJ1bmRsZSDniYjmnKznrqHnkIY8L2gzPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJsYXN0LWNoZWNrXCI+5pyA5ZCO5qOA5p+lOiB7eyBidW5kbGVWZXJzaW9uSW5mby5sYXN0Q2hlY2tUaW1lIH19PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwhLS0g5L+u5pS554mI5pys5L+h5oGv5bGV56S66YOo5YiGIC0tPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidmVyc2lvbi1pbmZvXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwibWFpbi12ZXJzaW9uXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4gY2xhc3M9XCJ2ZXJzaW9uLWxhYmVsXCI+5Li754mI5pys5Y+3Ojwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHYtbW9kZWw9XCJidW5kbGVWZXJzaW9uSW5mby5tYWluVmVyc2lvblwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwidmVyc2lvbi12YWx1ZVwiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6Y2xhc3M9XCJ7IGRpZmY6IGJ1bmRsZVZlcnNpb25JbmZvLmRpZmZWZXJzaW9ucy5pbmNsdWRlcygnbWFpbicpIH1cIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBAaW5wdXQ9XCJvblZlcnNpb25DaGFuZ2VcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgID5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYnVuZGxlLXZlcnNpb25zXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGg0PkJ1bmRsZSDniYjmnKzliJfooag6PC9oND5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiYnVuZGxlLWxpc3RcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiB2LWZvcj1cImJ1bmRsZSBpbiBidW5kbGVWZXJzaW9uSW5mby5idW5kbGVWZXJzaW9uc1wiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDprZXk9XCJidW5kbGUubmFtZVwiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwiYnVuZGxlLWl0ZW1cIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDpjbGFzcz1cInsgZGlmZjogYnVuZGxlVmVyc2lvbkluZm8uZGlmZlZlcnNpb25zLmluY2x1ZGVzKGJ1bmRsZS5uYW1lKSB9XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cImJ1bmRsZS1uYW1lXCI+e3sgYnVuZGxlLm5hbWUgfX06PC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHR5cGU9XCJ0ZXh0XCIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdi1tb2RlbD1cImJ1bmRsZS52ZXJzaW9uXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cImJ1bmRsZS12ZXJzaW9uXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBAaW5wdXQ9XCJvblZlcnNpb25DaGFuZ2VcIlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ2ZXJzaW9uLXN0YXR1c1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInN0YXR1cy1pdGVtXCIgOmNsYXNzPVwieyAnc3RhdHVzLXdhcm5pbmcnOiBidW5kbGVWZXJzaW9uSW5mby5oYXNMb2NhbENoYW5nZXMgfVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwic3RhdHVzLWxhYmVsXCI+5pys5Zyw5pu05pS5Ojwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cInN0YXR1cy12YWx1ZVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7eyBidW5kbGVWZXJzaW9uSW5mby5oYXNMb2NhbENoYW5nZXMgPyAn5pyJ5pyq5o+Q5Lqk55qE5pu05pS5JyA6ICfml6Dmm7TmlLknIH19XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9zcGFuPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gdi1pZj1cImJ1bmRsZVZlcnNpb25JbmZvLmhhc0xvY2FsQ2hhbmdlc1wiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgQGNsaWNrPVwic3luY0J1bmRsZVZlcnNpb25cIiBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwiYWN0aW9uLWJ0biBzeW5jLWJ0blwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDmj5DkuqTmm7TmlLlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwidmVyc2lvbi1hY3Rpb25zXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBAY2xpY2s9XCJyZXN0b3JlVmVyc2lvblwiIGNsYXNzPVwiYWN0aW9uLWJ0biByZXN0b3JlLWJ0blwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDku47lpIfku73mgaLlpI1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIEBjbGljaz1cInJldmVydFZlcnNpb25cIiBjbGFzcz1cImFjdGlvbi1idG4gcmV2ZXJ0LWJ0blwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDlm57pgIDliLDkuIrkuIDniYjmnKxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIEBjbGljaz1cInVwbG9hZFRvU2VydmVyXCIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cImFjdGlvbi1idG4gdXBsb2FkLWJ0blwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6ZGlzYWJsZWQ9XCJ1cGxvYWRTdGF0dXMgPT09ICd1cGxvYWRpbmcnXCJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDpzdHlsZT1cInsgYmFja2dyb3VuZENvbG9yOiB1cGxvYWRTdGF0dXMgPT09ICd1cGxvYWRpbmcnID8gJyNjY2NjY2MnIDogXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZFN0YXR1cyA9PT0gJ3N1Y2Nlc3MnID8gJyM0Y2FmNTAnIDogXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZFN0YXR1cyA9PT0gJ2ZhaWxlZCcgPyAnI2Y0NDMzNicgOiAnIzIxOTZGMycgfVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB7eyB1cGxvYWRTdGF0dXMgPT09ICd1cGxvYWRpbmcnID8gJ+S4iuS8oOS4rS4uLicgOiBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXBsb2FkU3RhdHVzID09PSAnc3VjY2VzcycgPyAn5LiK5Lyg5oiQ5YqfJyA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHVwbG9hZFN0YXR1cyA9PT0gJ2ZhaWxlZCcgPyAn5LiK5Lyg5aSx6LSlJyA6ICfkuIrkvKDliLDmnI3liqHlmagnIH19XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdi1pZj1cImhhc1ZlcnNpb25DaGFuZ2VzXCIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEBjbGljaz1cInNhdmVWZXJzaW9uQ2hhbmdlc1wiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cImFjdGlvbi1idG4gc2F2ZS12ZXJzaW9uLWJ0blwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDkv53lrZjniYjmnKzkv67mlLlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8YnV0dG9uIEBjbGljaz1cIm9wZW5WZXJzaW9uRmlsZUxvY2F0aW9uXCIgY2xhc3M9XCJhY3Rpb24tYnRuIG9wZW4tbG9jYXRpb24tYnRuXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOaJk+W8gOaWh+S7tuS9jee9rlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gQGNsaWNrPVwiY2hlY2tCdW5kbGVWZXJzaW9uXCIgY2xhc3M9XCJyZWZyZXNoLWJ0blwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIOWIt+aWsOeKtuaAgVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPC9idXR0b24+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb25maWctZWRpdG9yXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJjb25maWctaGVhZGVyXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aDM+5Y+R5biD6K6+572u5paH5Lu2PC9oMz5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxwIGNsYXNzPVwiZmlsZS1wYXRoXCI+e3sgcHVibGlzaFNldHRpbmdQYXRoIH19PC9wPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBAY2xpY2s9XCJ0b2dnbGVKc29uVmlld1wiIGNsYXNzPVwidG9nZ2xlLWJ0blwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHt7IHNob3dSYXdKc29uID8gJ+WIh+aNouWIsOihqOWNleinhuWbvicgOiAn5YiH5o2i5YiwSlNPTuinhuWbvicgfX1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgdi1pZj1cInNob3dSYXdKc29uXCIgY2xhc3M9XCJqc29uLXZpZXdcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDx0ZXh0YXJlYSB2LW1vZGVsPVwiY29uZmlnQ29udGVudFwiIEBpbnB1dD1cInRyYWNrQ2hhbmdlc1wiIGNsYXNzPVwianNvbi1lZGl0b3JcIj48L3RleHRhcmVhPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgdi1lbHNlIGNsYXNzPVwiZm9ybS12aWV3XCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IHYtZm9yPVwiKHZhbHVlLCBrZXkpIGluIGNvbmZpZ09iamVjdFwiIDprZXk9XCJrZXlcIiBjbGFzcz1cImZvcm0taXRlbVwiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxsYWJlbCA6Zm9yPVwia2V5XCIgY2xhc3M9XCJmb3JtLWxhYmVsXCI+e3sga2V5IH19PC9sYWJlbD5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8IS0tIOeOr+Wig+iuvue9ruS4i+aLieahhiAtLT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8c2VsZWN0IHYtaWY9XCJrZXkgPT09ICdlbnZpcm9ubWVudCdcIiB2LW1vZGVsPVwiY29uZmlnT2JqZWN0W2tleV1cIiBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDppZD1cImtleVwiIGNsYXNzPVwiZm9ybS1zZWxlY3RcIiBAY2hhbmdlPVwidHJhY2tDaGFuZ2VzXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJERVZFTE9QTUVOVFwiPkRFVkVMT1BNRU5UPC9vcHRpb24+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxvcHRpb24gdmFsdWU9XCJQUk9EVUNUSU9OXCI+UFJPRFVDVElPTjwvb3B0aW9uPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvc2VsZWN0PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwhLS0g5biD5bCU5YC85Yu+6YCJ5qGGIC0tPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxpbnB1dCB2LWVsc2UtaWY9XCJ0eXBlb2YgdmFsdWUgPT09ICdib29sZWFuJ1wiIHR5cGU9XCJjaGVja2JveFwiIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2LW1vZGVsPVwiY29uZmlnT2JqZWN0W2tleV1cIiA6aWQ9XCJrZXlcIiBjbGFzcz1cImZvcm0tY2hlY2tib3hcIiBAY2hhbmdlPVwidHJhY2tDaGFuZ2VzXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPCEtLSDmlbDlrZfovpPlhaXmoYYgLS0+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPGlucHV0IHYtZWxzZS1pZj1cInR5cGVvZiB2YWx1ZSA9PT0gJ251bWJlcidcIiB0eXBlPVwibnVtYmVyXCIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHYtbW9kZWwubnVtYmVyPVwiY29uZmlnT2JqZWN0W2tleV1cIiA6aWQ9XCJrZXlcIiBjbGFzcz1cImZvcm0taW5wdXRcIiBAaW5wdXQ9XCJ0cmFja0NoYW5nZXNcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8IS0tIOWtl+espuS4sui+k+WFpeahhiAtLT5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA8aW5wdXQgdi1lbHNlIHR5cGU9XCJ0ZXh0XCIgdi1tb2RlbD1cImNvbmZpZ09iamVjdFtrZXldXCIgOmlkPVwia2V5XCIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGFzcz1cImZvcm0taW5wdXRcIiBAaW5wdXQ9XCJ0cmFja0NoYW5nZXNcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJlZGl0b3ItYnV0dG9uc1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGJ1dHRvbiBAY2xpY2s9XCJzYXZlQ29uZmlnXCIgOmRpc2FibGVkPVwiIWhhc0NoYW5nZXNcIiBjbGFzcz1cInNhdmUtYnRuXCIgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDpjbGFzcz1cInsgJ2J1dHRvbi1kaXNhYmxlZCc6ICFoYXNDaGFuZ2VzIH1cIj7lupTnlKjkv67mlLk8L2J1dHRvbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gQGNsaWNrPVwicmVzZXRDb25maWdcIiA6ZGlzYWJsZWQ9XCIhY2FuUmVzZXRcIiBjbGFzcz1cInJlc2V0LWJ0blwiXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDpjbGFzcz1cInsgJ2J1dHRvbi1kaXNhYmxlZCc6ICFjYW5SZXNldCB9XCI+5Zue6YCA5L+u5pS5PC9idXR0b24+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgIDwhLS0g5pS56L+b5LiK5Lyg6L+b5bqm5p2hIC0tPlxyXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJ1cGxvYWQtcHJvZ3Jlc3MtY29udGFpbmVyXCIgdi1pZj1cInVwbG9hZFN0YXR1cyAhPT0gJ2lkbGUnXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxoMz7mlofku7bkuIrkvKDov5vluqY8L2gzPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3MtaW5mb1wiPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPHNwYW4+5b2T5YmN5paH5Lu2OiB7eyBjdXJyZW50VXBsb2FkRmlsZSB8fCAn5YeG5aSH5LitLi4uJyB9fTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxzcGFuPnt7IHVwbG9hZFN0YXR1c1RleHRbdXBsb2FkU3RhdHVzXSB9fTwvc3Bhbj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzcy1iYXItY29udGFpbmVyXCI+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicHJvZ3Jlc3MtdGV4dFwiPnt7IHVwbG9hZGVkRmlsZXMgfX0ve3sgdG90YWxGaWxlcyB9fTwvZGl2PlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInByb2dyZXNzLWJhclwiIDpzdHlsZT1cInsgd2lkdGg6IHVwbG9hZFByb2dyZXNzICsgJyUnIH1cIj48L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPC9kaXY+XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJwcm9ncmVzcy1wZXJjZW50YWdlXCI+e3sgdXBsb2FkUHJvZ3Jlc3MudG9GaXhlZCgxKSB9fSU8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cImZpbGUtY291bnRcIj7lt7LkuIrkvKAge3sgdXBsb2FkZWRGaWxlcyB9fSDkuKrmlofku7bvvIzlhbEge3sgdG90YWxGaWxlcyB9fSDkuKo8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cInVwbG9hZC1idG4tY29udGFpbmVyXCIgdi1pZj1cInVwbG9hZFN0YXR1cyA9PT0gJ3VwbG9hZGluZydcIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDxidXR0b24gQGNsaWNrPVwiY2FuY2VsVXBsb2FkXCIgY2xhc3M9XCJhY3Rpb24tYnRuIGNhbmNlbC1idG5cIj5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICDkuK3mlq3kuIrkvKBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIDwvYnV0dG9uPlxyXG4gICAgICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgICAgICAgIGAsXHJcbiAgICAgICAgICAgICAgICBkYXRhOiAoKSA9PiAoe1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGVjdGVkT3B0aW9uOiAnJyxcclxuICAgICAgICAgICAgICAgICAgICBjb25maWdDb250ZW50OiAnJyxcclxuICAgICAgICAgICAgICAgICAgICBvcmlnaW5hbENvbnRlbnQ6ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgIHB1Ymxpc2hTZXR0aW5nUGF0aDogam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCAnYXNzZXRzJywgJ2FwcCcsICdwdWJsaXNoU2V0dGluZy5qc29uJyksXHJcbiAgICAgICAgICAgICAgICAgICAgY29uZmlnT2JqZWN0OiB7fSxcclxuICAgICAgICAgICAgICAgICAgICBzaG93UmF3SnNvbjogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgaGFzQ2hhbmdlczogZmFsc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgY2FuUmVzZXQ6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgIGNvbmZpZ0xpc3Q6IE9iamVjdC5rZXlzKGNvbmZpZ0ZpbGVzKS5sZW5ndGggPiAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgID8gY29uZmlnRmlsZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgOiB7ICfpu5jorqTphY3nva4nOiAnJyB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGJ1bmRsZVZlcnNpb25JbmZvOiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlzTGF0ZXN0OiB0cnVlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBoYXNMb2NhbENoYW5nZXM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsYXN0Q2hlY2tUaW1lOiAn5pyq5qOA5p+lJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFpblZlcnNpb246ICcnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBidW5kbGVWZXJzaW9uczogW10sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZWZXJzaW9uczogW11cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGhhc1ZlcnNpb25DaGFuZ2VzOiBmYWxzZSxcclxuICAgICAgICAgICAgICAgICAgICBwdWJsaXNoU3RhdHVzOiAnaWRsZScgYXMgJ2lkbGUnIHwgJ3B1Ymxpc2hpbmcnIHwgJ3N1Y2Nlc3MnIHwgJ2ZhaWxlZCcsXHJcbiAgICAgICAgICAgICAgICAgICAgcHVibGlzaFN0YXR1c1RleHQ6IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWRsZTogJ+W+heWPkeW4gycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHB1Ymxpc2hpbmc6ICflj5HluIPkuK0nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiAn5Y+R5biD5a6M5oiQJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmFpbGVkOiAn5Y+R5biD5aSx6LSlJ1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgc2Z0cENvbmZpZzoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBob3N0OiAn6L+c56iL5pyN5Yqh5ZmoSVAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiAyMixcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6ICfnlKjmiLflkI0nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXNzd29yZDogJ+WvhueggScsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlbW90ZVBhdGg6ICcvcGF0aC90by9yZW1vdGUvZGlyZWN0b3J5J1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdXBsb2FkU3RhdHVzOiAnaWRsZScgYXMgJ2lkbGUnIHwgJ3VwbG9hZGluZycgfCAnc3VjY2VzcycgfCAnZmFpbGVkJyxcclxuICAgICAgICAgICAgICAgICAgICB1cGxvYWRTdGF0dXNUZXh0OiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlkbGU6ICflvoXkuIrkvKAnLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICB1cGxvYWRpbmc6ICfkuIrkvKDkuK0nLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBzdWNjZXNzOiAn5LiK5Lyg5a6M5oiQJyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgZmFpbGVkOiAn5LiK5Lyg5aSx6LSlJ1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFNmdHA6IG51bGwsXHJcbiAgICAgICAgICAgICAgICAgICAgdXBsb2FkUHJvZ3Jlc3M6IDAsXHJcbiAgICAgICAgICAgICAgICAgICAgdXBsb2FkZWRGaWxlczogMCxcclxuICAgICAgICAgICAgICAgICAgICB0b3RhbEZpbGVzOiAwLFxyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRVcGxvYWRGaWxlOiAnJyxcclxuICAgICAgICAgICAgICAgIH0pLFxyXG4gICAgICAgICAgICAgICAgbW91bnRlZCh0aGlzOiBNeUNvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIOe7hOS7tuaMgui9veaXtuWKoOi9veWPkeW4g+iuvue9rlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFB1Ymxpc2hTZXR0aW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGVja0J1bmRsZVZlcnNpb24oKTsgLy8g5Yid5aeL5qOA5p+l54mI5pys54q25oCBXHJcbiAgICAgICAgICAgICAgICAgICAgbG9hZFNmdHBDb25maWcoKS50aGVuKGNvbmZpZyA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjb25maWcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2Z0cENvbmZpZyA9IGNvbmZpZztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgIG1ldGhvZHM6IHtcclxuICAgICAgICAgICAgICAgICAgICB0cmFja0NoYW5nZXModGhpczogTXlDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc2hvd1Jhd0pzb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEpTT07op4blm77kuK3ot5/ouKrlj5jljJZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzQ2hhbmdlcyA9IHRoaXMuY29uZmlnQ29udGVudCAhPT0gdGhpcy5vcmlnaW5hbENvbnRlbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDooajljZXop4blm77kuK3ot5/ouKrlj5jljJZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGN1cnJlbnRKc29uID0gSlNPTi5zdHJpbmdpZnkodGhpcy5jb25maWdPYmplY3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBvcmlnaW5hbE9iaiA9IEpTT04ucGFyc2UodGhpcy5vcmlnaW5hbENvbnRlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzQ2hhbmdlcyA9IEpTT04uc3RyaW5naWZ5KG9yaWdpbmFsT2JqKSAhPT0gY3VycmVudEpzb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNDaGFuZ2VzID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5piv5ZCm5Y+v5Lul5Zue6YCAXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuUmVzZXQgPSB0aGlzLmhhc0NoYW5nZXMgJiYgdGhpcy5vcmlnaW5hbENvbnRlbnQgIT09ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgbG9hZFB1Ymxpc2hTZXR0aW5nKHRoaXM6IE15Q29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGVTeW5jKHRoaXMucHVibGlzaFNldHRpbmdQYXRoLCAndXRmLTgnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnQ29udGVudCA9IGNvbnRlbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9yaWdpbmFsQ29udGVudCA9IGNvbnRlbnQ7IC8vIOS/neWtmOWOn+Wni+WGheWuueeUqOS6juWbnumAgFxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWdPYmplY3QgPSBKU09OLnBhcnNlKGNvbnRlbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnT2JqZWN0ID0ge307XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignSlNPTuino+aekOWksei0pTonLCBlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuRGlhbG9nLndhcm4oJ0pTT07moLzlvI/ml6DmlYjvvIzkvb/nlKjnqbrlr7nosaHvvIEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDliJ3lp4vljJbml7bmsqHmnInlj5jmm7RcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzQ2hhbmdlcyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5SZXNldCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCflj5HluIPorr7nva7mlofku7blt7LliqDovb06JywgdGhpcy5wdWJsaXNoU2V0dGluZ1BhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign6K+75Y+W5Y+R5biD6K6+572u5paH5Lu25aSx6LSlOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnQ29udGVudCA9ICd7fSc7IC8vIOm7mOiupOepukpTT07lr7nosaFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub3JpZ2luYWxDb250ZW50ID0gJ3t9JztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnT2JqZWN0ID0ge307XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c5paH5Lu25LiN5a2Y5Zyo77yM5Y+v5Lul5Yib5bu65LiA5Liq6buY6K6k55qEXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgd3JpdGVGaWxlU3luYywgZW5zdXJlRGlyU3luYyB9ID0gcmVxdWlyZSgnZnMtZXh0cmEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXJQYXRoID0gam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCAnYXNzZXRzJywgJ2FwcCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuc3VyZURpclN5bmMoZGlyUGF0aCk7IC8vIOehruS/neebruW9leWtmOWcqFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlRmlsZVN5bmModGhpcy5wdWJsaXNoU2V0dGluZ1BhdGgsICd7fScsICd1dGYtOCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfliJvlu7rkuobpu5jorqTnmoTlj5HluIPorr7nva7mlofku7YnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+WIm+W7uum7mOiupOWPkeW4g+iuvue9ruaWh+S7tuWksei0pTonLCBlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICB1cGRhdGVKc29uRnJvbUZvcm0odGhpczogTXlDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5bCG6KGo5Y2V5pWw5o2u6L2s5o2i5ZueSlNPTuWtl+espuS4slxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbmZpZ0NvbnRlbnQgPSBKU09OLnN0cmluZ2lmeSh0aGlzLmNvbmZpZ09iamVjdCwgbnVsbCwgMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOabtOaWsOWPmOabtOeKtuaAgVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRyYWNrQ2hhbmdlcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgdG9nZ2xlSnNvblZpZXcodGhpczogTXlDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnNob3dSYXdKc29uKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDliIfmjaLliLBKU09O6KeG5Zu+5pe277yM5pu05pawSlNPTuWtl+espuS4slxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVKc29uRnJvbUZvcm0oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWIh+aNouWIsOihqOWNleinhuWbvuaXtu+8jOino+aekEpTT07lrZfnrKbkuLJcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWdPYmplY3QgPSBKU09OLnBhcnNlKHRoaXMuY29uZmlnQ29udGVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignSlNPTuino+aekOWksei0pTonLCBlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuRGlhbG9nLndhcm4oJ0pTT07moLzlvI/ml6DmlYjvvIzml6Dms5XliIfmjaLliLDooajljZXop4blm77vvIEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47IC8vIOino+aekOWksei0peaXtuS4jeWIh+aNouinhuWbvlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvd1Jhd0pzb24gPSAhdGhpcy5zaG93UmF3SnNvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g6KeG5Zu+5YiH5o2i5ZCO5pu05paw5Y+Y5pu054q25oCBXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudHJhY2tDaGFuZ2VzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBoYW5kbGVDaGFuZ2UodGhpczogTXlDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1NlbGVjdGVkOicsIHRoaXMuc2VsZWN0ZWRPcHRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDms6jmhI/vvJrov5nph4zkvp3nhLbkv53nlZnku45idWlsZENvbmZpZ3Por7vlj5bphY3nva7nmoTlip/og71cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc2VsZWN0ZWRPcHRpb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlU3luYyh0aGlzLnNlbGVjdGVkT3B0aW9uLCAndXRmLTgnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn5p6E5bu66YWN572u5paH5Lu25bey5Yqg6L29Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+ivu+WPluaehOW7uumFjee9ruaWh+S7tuWksei0pTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIHNhdmVDb25maWcodGhpczogTXlDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5L+d5a2Y5L+u5pS55ZCO55qE5Y+R5biD6K6+572u5paH5Lu2XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuc2hvd1Jhd0pzb24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzlnKjooajljZXop4blm77vvIzlhYjmm7TmlrBKU09O5a2X56ym5LiyXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGRhdGVKc29uRnJvbUZvcm0oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHdyaXRlRmlsZVN5bmMgfSA9IHJlcXVpcmUoJ2ZzLWV4dHJhJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDpqozor4FKU09O5qC85byP5piv5ZCm5pyJ5pWIXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEpTT04ucGFyc2UodGhpcy5jb25maWdDb250ZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfml6DmlYjnmoRKU09O5qC85byPOicsIGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cud2FybignSlNPTuagvOW8j+aXoOaViO+8jOaXoOazleS/neWtmO+8gScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB3cml0ZUZpbGVTeW5jKHRoaXMucHVibGlzaFNldHRpbmdQYXRoLCB0aGlzLmNvbmZpZ0NvbnRlbnQsICd1dGYtOCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5L+d5a2Y5ZCO5pu05paw5Y6f5aeL5YaF5a655bm26YeN572u5Y+Y5pu054q25oCBXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9yaWdpbmFsQ29udGVudCA9IHRoaXMuY29uZmlnQ29udGVudDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzQ2hhbmdlcyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5SZXNldCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCflj5HluIPorr7nva7mlofku7blt7Lkv53lrZgnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuaW5mbygn5Y+R5biD6K6+572u5bey5oiQ5Yqf5bqU55So77yBJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfkv53lrZjlj5HluIPorr7nva7mlofku7blpLHotKU6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5lcnJvcign5L+d5a2Y5Y+R5biD6K6+572u5aSx6LSlOiAnICsgKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgcmVzZXRDb25maWcodGhpczogTXlDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Zue6YCA5Yiw5Y6f5aeL6YWN572uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm9yaWdpbmFsQ29udGVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWdDb250ZW50ID0gdGhpcy5vcmlnaW5hbENvbnRlbnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29uZmlnT2JqZWN0ID0gSlNPTi5wYXJzZSh0aGlzLm9yaWdpbmFsQ29udGVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb25maWdPYmplY3QgPSB7fTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOmHjee9ruWQjuabtOaWsOWPmOabtOeKtuaAgVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5oYXNDaGFuZ2VzID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhblJlc2V0ID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+WPkeW4g+iuvue9ruW3sumHjee9ruS4uuWOn+Wni+eKtuaAgScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5pbmZvKCflj5HluIPorr7nva7lt7Llm57pgIDliLDliJ3lp4vnirbmgIHvvIEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlQ2xpY2sodGhpczogTXlDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoU3RhdHVzID0gJ3B1Ymxpc2hpbmcnO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVuZ2luZVBhdGggPSBcIkM6L1Byb2dyYW1EYXRhL2NvY29zL2VkaXRvcnMvQ3JlYXRvci8zLjguM1wiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcHJvamVjdFBhdGggPSBFZGl0b3IuUHJvamVjdC5wYXRoO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY29uZmlnUGF0aCA9IHRoaXMuc2VsZWN0ZWRPcHRpb247XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgeyBzcGF3biB9ID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXhlY3V0YWJsZSA9IGAke2VuZ2luZVBhdGh9L0NvY29zQ3JlYXRvci5leGVgO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXJncyA9IFtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnLS1wcm9qZWN0JywgcHJvamVjdFBhdGgsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJy0tYnVpbGQnLCBgY29uZmlnUGF0aD0ke2NvbmZpZ1BhdGh9YFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn5byA5aeL5omn6KGM5p6E5bu65ZG95LukLi4uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBidWlsZFByb2Nlc3MgPSBzcGF3bihleGVjdXRhYmxlLCBhcmdzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWlsZFByb2Nlc3Muc3Rkb3V0Lm9uKCdkYXRhJywgKGRhdGE6IEJ1ZmZlcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IG91dHB1dCA9IGRhdGEudG9TdHJpbmcoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg5p6E5bu66L6T5Ye6OiAke291dHB1dH1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1aWxkUHJvY2Vzcy5zdGRlcnIub24oJ2RhdGEnLCAoZGF0YTogQnVmZmVyKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JPdXRwdXQgPSBkYXRhLnRvU3RyaW5nKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihg5p6E5bu66ZSZ6K+vOiAke2Vycm9yT3V0cHV0fWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVpbGRQcm9jZXNzLm9uKCdjbG9zZScsIChjb2RlOiBudW1iZXIpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGNvZGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAzNjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmnoTlu7rov4fnqIvmiJDlip/lrozmiJAnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaFN0YXR1cyA9ICdzdWNjZXNzJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIDMyOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5p6E5bu65aSx6LSlIOKAlOKAlCDmnoTlu7rlj4LmlbDkuI3lkIjms5UnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaFN0YXR1cyA9ICdmYWlsZWQnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgMzQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfmnoTlu7rlpLHotKUg4oCU4oCUIOaehOW7uui/h+eoi+WHuumUmeWksei0pe+8jOivpuaDheivt+WPguiAg+aehOW7uuaXpeW/lycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoU3RhdHVzID0gJ2ZhaWxlZCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+i/m+eoi+ato+W4uOmAgOWHuu+8jOS9huacqui/lOWbnuaehOW7uueKtuaAgScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoU3RhdHVzID0gJ3N1Y2Nlc3MnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGDmnoTlu7rov4fnqIvlvILluLjvvIzmnKrnn6XpgIDlh7rnoIE6ICR7Y29kZX1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucHVibGlzaFN0YXR1cyA9ICdmYWlsZWQnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVpbGRQcm9jZXNzLm9uKCdlcnJvcicsIChlcnI6IEVycm9yKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5ZCv5Yqo5p6E5bu66L+b56iL5pe25Ye66ZSZOicsIGVycik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wdWJsaXNoU3RhdHVzID0gJ2ZhaWxlZCc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+WRveS7pOaJp+ihjOWksei0pTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnB1Ymxpc2hTdGF0dXMgPSAnZmFpbGVkJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMgY2hlY2tCdW5kbGVWZXJzaW9uKHRoaXM6IE15Q29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDojrflj5bmlofku7bnirbmgIFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IEJ1bmRsZVZlcnNpb25NYW5hZ2VyLmNoZWNrVmVyc2lvbigpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOivu+WPlueJiOacrOaWh+S7tuWGheWuuVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVyc2lvbkZpbGVQYXRoID0gam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCAncHVibGlzaC1yZW1vdGUtYnVuZGxlJywgJ2J1bmRsZV92ZXJzaW9ucy5qc29uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2ZXJzaW9uRGF0YSA9IEpTT04ucGFyc2UocmVhZEZpbGVTeW5jKHZlcnNpb25GaWxlUGF0aCwgJ3V0Zi04JykpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOi9rOaNoiBidW5kbGVzIOWvueixoeS4uuaVsOe7hOagvOW8j1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYnVuZGxlVmVyc2lvbnMgPSBPYmplY3QuZW50cmllcyh2ZXJzaW9uRGF0YS5idW5kbGVzKS5tYXAoKFtuYW1lLCBkYXRhXTogW3N0cmluZywgYW55XSkgPT4gKHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb246IGRhdGEudmVyc2lvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYnVuZGxlVmVyc2lvbkluZm8gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNMYXRlc3Q6IHJlc3VsdC5pc0xhdGVzdCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNMb2NhbENoYW5nZXM6IHJlc3VsdC5oYXNMb2NhbENoYW5nZXMsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGFzdENoZWNrVGltZTogbmV3IERhdGUoKS50b0xvY2FsZVN0cmluZygpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1haW5WZXJzaW9uOiB2ZXJzaW9uRGF0YS52ZXJzaW9uLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bmRsZVZlcnNpb25zLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZWZXJzaW9uczogcmVzdWx0LmRpZmZWZXJzaW9ucyB8fCBbXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+ajgOafpUJ1bmRsZeeJiOacrOeKtuaAgeWksei0pTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuRGlhbG9nLndhcm4oJ+ajgOafpUJ1bmRsZeeJiOacrOeKtuaAgeWksei0pe+8jOivt+mHjeivlScpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWPkeeUn+mUmeivr+aXtumHjee9ruS4uum7mOiupOeKtuaAgVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5idW5kbGVWZXJzaW9uSW5mbyA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0xhdGVzdDogdHJ1ZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNMb2NhbENoYW5nZXM6IGZhbHNlLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RDaGVja1RpbWU6IG5ldyBEYXRlKCkudG9Mb2NhbGVTdHJpbmcoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtYWluVmVyc2lvbjogJycsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVuZGxlVmVyc2lvbnM6IFtdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpZmZWZXJzaW9uczogW11cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jIGZldGNoTGF0ZXN0VmVyc2lvbih0aGlzOiBNeUNvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgQnVuZGxlVmVyc2lvbk1hbmFnZXIuZmV0Y2hMYXRlc3QoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuY2hlY2tCdW5kbGVWZXJzaW9uKCk7IC8vIOWIt+aWsOeKtuaAgVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5pbmZvKCflt7Lojrflj5bmnIDmlrDniYjmnKwnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+iOt+WPluacgOaWsOeJiOacrOWksei0pTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuRGlhbG9nLmVycm9yKCfojrflj5bmnIDmlrDniYjmnKzlpLHotKXvvIzor7fph43or5UnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMgc3luY0J1bmRsZVZlcnNpb24odGhpczogTXlDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IEJ1bmRsZVZlcnNpb25NYW5hZ2VyLnN5bmNUb0dpdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5jaGVja0J1bmRsZVZlcnNpb24oKTsgLy8g5Yi35paw54q25oCBXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuRGlhbG9nLmluZm8oJ+eJiOacrOW3suWQjOatpeWIsOWIhuaUrycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign5ZCM5q2l54mI5pys5aSx6LSlOicsIGVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuZXJyb3IoJ+WQjOatpeeJiOacrOWksei0pe+8jOivt+mHjeivlScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBhc3luYyBnZW5lcmF0ZUJ1bmRsZVZlcnNpb24odGhpczogTXlDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+ato+WcqOeUn+aIkEJ1bmRsZeeJiOacrC4uLicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBwcm9qZWN0Um9vdCA9IEVkaXRvci5Qcm9qZWN0LnBhdGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhcmdldFBhdGggPSBqb2luKHByb2plY3RSb290LCAnL2J1aWxkL2FuZHJvaWQvcmVtb3RlJyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGF3YWl0IGdlbmVyYXRlQnVuZGxlVmVyc2lvbnModGFyZ2V0UGF0aCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn4pyFIOeJiOacrOaWh+S7tueUn+aIkOaIkOWKnycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOeUn+aIkOWujOaIkOWQjuajgOafpeeJiOacrOeKtuaAgVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuY2hlY2tCdW5kbGVWZXJzaW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybign4p2MIOeJiOacrOaWh+S7tueUn+aIkOWksei0pScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cud2Fybign54mI5pys5paH5Lu255Sf5oiQ5aSx6LSlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfnlJ/miJBCdW5kbGXniYjmnKzlpLHotKU6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5lcnJvcign55Sf5oiQQnVuZGxl54mI5pys5aSx6LSlOiAnICsgKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMgcmVzdG9yZVZlcnNpb24odGhpczogTXlDb21wb25lbnQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IEJ1bmRsZVZlcnNpb25NYW5hZ2VyLnJlc3RvcmVGcm9tQmFja3VwKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmNoZWNrQnVuZGxlVmVyc2lvbigpOyAvLyDliLfmlrDnirbmgIFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuaW5mbygn5bey5LuO5aSH5Lu95paH5Lu25oGi5aSNJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfmgaLlpI3niYjmnKzlpLHotKU6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5lcnJvcign5oGi5aSN54mI5pys5aSx6LSlOiAnICsgKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMgcmV2ZXJ0VmVyc2lvbih0aGlzOiBNeUNvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgQnVuZGxlVmVyc2lvbk1hbmFnZXIucmV2ZXJ0VG9MYXN0Q29tbWl0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmNoZWNrQnVuZGxlVmVyc2lvbigpOyAvLyDliLfmlrDnirbmgIFcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuaW5mbygn5bey5Zue6YCA5Yiw5LiK5LiA54mI5pysJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCflm57pgIDniYjmnKzlpLHotKU6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5lcnJvcign5Zue6YCA54mI5pys5aSx6LSlOiAnICsgKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgb25WZXJzaW9uQ2hhbmdlKHRoaXM6IE15Q29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzVmVyc2lvbkNoYW5nZXMgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMgc2F2ZVZlcnNpb25DaGFuZ2VzKHRoaXM6IE15Q29tcG9uZW50KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB2ZXJzaW9uRmlsZVBhdGggPSBqb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsICdwdWJsaXNoLXJlbW90ZS1idW5kbGUnLCAnYnVuZGxlX3ZlcnNpb25zLmpzb24nKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmnoTlu7ropoHkv53lrZjnmoTniYjmnKzmlbDmja5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHZlcnNpb25EYXRhID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHZlcnNpb246IHRoaXMuYnVuZGxlVmVyc2lvbkluZm8ubWFpblZlcnNpb24sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVuZGxlczogdGhpcy5idW5kbGVWZXJzaW9uSW5mby5idW5kbGVWZXJzaW9ucy5yZWR1Y2UoKGFjYywgYnVuZGxlKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjY1tidW5kbGUubmFtZV0gPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB2ZXJzaW9uOiBidW5kbGUudmVyc2lvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYWNjO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIHt9IGFzIFJlY29yZDxzdHJpbmcsIHsgdmVyc2lvbjogc3RyaW5nIH0+KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlhpnlhaXmlofku7ZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHsgd3JpdGVGaWxlU3luYyB9ID0gcmVxdWlyZSgnZnMtZXh0cmEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHdyaXRlRmlsZVN5bmModmVyc2lvbkZpbGVQYXRoLCBKU09OLnN0cmluZ2lmeSh2ZXJzaW9uRGF0YSwgbnVsbCwgMiksICd1dGYtOCcpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaGFzVmVyc2lvbkNoYW5nZXMgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuY2hlY2tCdW5kbGVWZXJzaW9uKCk7IC8vIOWIt+aWsOeKtuaAgVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5pbmZvKCfniYjmnKzkv67mlLnlt7Lkv53lrZgnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+S/neWtmOeJiOacrOS/ruaUueWksei0pTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuRGlhbG9nLmVycm9yKCfkv53lrZjniYjmnKzkv67mlLnlpLHotKU6ICcgKyAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBhc3luYyBvcGVuVmVyc2lvbkZpbGVMb2NhdGlvbih0aGlzOiBNeUNvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdmVyc2lvbkZpbGVQYXRoID0gam9pbihFZGl0b3IuUHJvamVjdC5wYXRoLCAncHVibGlzaC1yZW1vdGUtYnVuZGxlJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IHNoZWxsIH0gPSByZXF1aXJlKCdlbGVjdHJvbicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc2hlbGwub3BlblBhdGgodmVyc2lvbkZpbGVQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+aJk+W8gOaWh+S7tuS9jee9ruWksei0pTonLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuRGlhbG9nLmVycm9yKCfmiZPlvIDmlofku7bkvY3nva7lpLHotKU6ICcgKyAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICBhc3luYyB1cGxvYWRUb1NlcnZlcih0aGlzOiBNeUNvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy51cGxvYWRTdGF0dXMgPT09ICd1cGxvYWRpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXBsb2FkU3RhdHVzID0gJ3VwbG9hZGluZyc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWIm+W7ulNGVFDlrqLmiLfnq6/lubbmt7vliqDosIPor5Xlip/og71cclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U2Z0cCA9IG5ldyBDbGllbnQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5ZCv55So6LCD6K+V5pel5b+XXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICh0aGlzLmN1cnJlbnRTZnRwIGFzIGFueSkub24oJ2RlYnVnJywgKG1zZzogc3RyaW5nKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhgU0ZUUOiwg+ivleS/oeaBrzogJHttc2d9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBsb2NhbFBhdGggPSBqb2luKEVkaXRvci5Qcm9qZWN0LnBhdGgsICdwdWJsaXNoLXJlbW90ZS1idW5kbGUnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOmHjee9ruS4iuS8oOi/m+W6plxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnVwbG9hZFByb2dyZXNzID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGxvYWRlZEZpbGVzID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b3RhbEZpbGVzID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VXBsb2FkRmlsZSA9ICcnO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5re75Yqg6LaF5pe25aSE55CG55qE6L6F5Yqp5Ye95pWwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHdpdGhUaW1lb3V0ID0gPFQ+KHByb21pc2U6IFByb21pc2U8VD4sIHRpbWVvdXRNczogbnVtYmVyLCBtZXNzYWdlOiBzdHJpbmcpOiBQcm9taXNlPFQ+ID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0aW1lb3V0SWQ6IE5vZGVKUy5UaW1lb3V0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGltZW91dFByb21pc2UgPSBuZXcgUHJvbWlzZTxUPigoXywgcmVqZWN0KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKGDmk43kvZzotoXml7Y6ICR7bWVzc2FnZX1gKSksIHRpbWVvdXRNcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJhY2UoW1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb21pc2UsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGltZW91dFByb21pc2VcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF0pLmZpbmFsbHkoKCkgPT4gY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5re75Yqg6Zif5YiX5o6n5Yi2XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNyZWF0ZVF1ZXVlID0gKGNvbmN1cnJlbmN5OiBudW1iZXIpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHF1ZXVlOiBBcnJheTwoKSA9PiBQcm9taXNlPGFueT4+ID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYWN0aXZlQ291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBydW5UYXNrID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3RpdmVDb3VudCA+PSBjb25jdXJyZW5jeSB8fCBxdWV1ZS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhY3RpdmVDb3VudCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRhc2sgPSBxdWV1ZS5zaGlmdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0YXNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0YXNrKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfku7vliqHmiafooYzlpLHotKU6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZmluYWxseSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFjdGl2ZUNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJ1blRhc2soKTsgLy8g5bCd6K+V5omn6KGM5LiL5LiA5Liq5Lu75YqhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYWRkVGFzayA9ICh0YXNrOiAoKSA9PiBQcm9taXNlPGFueT4pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBxdWV1ZS5wdXNoKHRhc2spO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJ1blRhc2soKTsgLy8g5bCd6K+V56uL5Y2z5omn6KGM5Lu75YqhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB3YWl0Q29tcGxldGUgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFjdGl2ZUNvdW50ID09PSAwICYmIHF1ZXVlLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTx2b2lkPihyZXNvbHZlID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgY2hlY2tJbnRlcnZhbCA9IHNldEludGVydmFsKCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhY3RpdmVDb3VudCA9PT0gMCAmJiBxdWV1ZS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGNoZWNrSW50ZXJ2YWwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSwgMTAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiB7IGFkZFRhc2ssIHdhaXRDb21wbGV0ZSB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g55uR5o6n6L+e5o6l54q25oCBXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpc0Nvbm5lY3RlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb25uZWN0aW9uQ2hlY2tJbnRlcnZhbDogTm9kZUpTLlRpbWVvdXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyDmo4Dmn6VTRlRQ6L+e5o6l54q25oCB5bm25Zyo6ZyA6KaB5pe26YeN5paw6L+e5o6lXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNoZWNrQW5kUmVjb25uZWN0ID0gYXN5bmMgKCk6IFByb21pc2U8Ym9vbGVhbj4gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuY3VycmVudFNmdHApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCdTRlRQ5a6i5oi356uv5LiN5a2Y5Zyo77yM5Yib5bu65paw55qE6L+e5o6lJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFNmdHAgPSBuZXcgQ2xpZW50KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuY3VycmVudFNmdHAuY29ubmVjdCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBob3N0OiB0aGlzLnNmdHBDb25maWcuaG9zdCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcnQ6IHRoaXMuc2Z0cENvbmZpZy5wb3J0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IHRoaXMuc2Z0cENvbmZpZy51c2VybmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhc3N3b3JkOiB0aGlzLnNmdHBDb25maWcucGFzc3dvcmQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFkeVRpbWVvdXQ6IDEwMDAwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5bCd6K+V5omn6KGM5LiA5Liq566A5Y2V5pON5L2c5p2l5qOA5p+l6L+e5o6l54q25oCBXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5jdXJyZW50U2Z0cC5saXN0KCcuJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybign6L+e5o6l5qOA5p+l5aSx6LSl77yM5bCd6K+V6YeN5paw6L+e5o6lJywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWFiOWFs+mXreS7u+S9leWPr+iDveWtmOWcqOeahOi/nuaOpVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50U2Z0cCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmN1cnJlbnRTZnRwLmVuZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+WFs+mXreaXp+i/nuaOpeWksei0pScsIGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDliJvlu7rmlrDov57mjqVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U2Z0cCA9IG5ldyBDbGllbnQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdGhpcy5jdXJyZW50U2Z0cC5jb25uZWN0KHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3Q6IHRoaXMuc2Z0cENvbmZpZy5ob3N0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9ydDogdGhpcy5zZnRwQ29uZmlnLnBvcnQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1c2VybmFtZTogdGhpcy5zZnRwQ29uZmlnLnVzZXJuYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFzc3dvcmQ6IHRoaXMuc2Z0cENvbmZpZy5wYXNzd29yZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlYWR5VGltZW91dDogMTAwMDBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfph43mlrDov57mjqXmiJDlip8nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAocmVjb25uZWN0RXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign6YeN5paw6L+e5o6l5aSx6LSlJywgcmVjb25uZWN0RXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8g5ZCv5Yqo6L+e5o6l54q25oCB55uR5o6nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHN0YXJ0Q29ubmVjdGlvbk1vbml0b3IgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmr482MOenkuajgOafpeS4gOasoei/nuaOpVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29ubmVjdGlvbkNoZWNrSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbChhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+aJp+ihjOWumuacn+i/nuaOpeajgOafpS4uLicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlzQ29ubmVjdGVkID0gYXdhaXQgY2hlY2tBbmRSZWNvbm5lY3QoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWlzQ29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+i/nuaOpeW3suaWreW8gOS4lOaXoOazlemHjeaWsOi/nuaOpScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0sIDYwMDAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWBnOatoui/nuaOpeebkeaOp1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdG9wQ29ubmVjdGlvbk1vbml0b3IgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY29ubmVjdGlvbkNoZWNrSW50ZXJ2YWwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGVhckludGVydmFsKGNvbm5lY3Rpb25DaGVja0ludGVydmFsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn5byA5aeL6L+e5o6l5pyN5Yqh5ZmoLi4uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDkvb/nlKjotoXml7bmjqfliLbliJ3lp4vov57mjqVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHdpdGhUaW1lb3V0KFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFNmdHAuY29ubmVjdCh7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGhvc3Q6IHRoaXMuc2Z0cENvbmZpZy5ob3N0LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3J0OiB0aGlzLnNmdHBDb25maWcucG9ydCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdXNlcm5hbWU6IHRoaXMuc2Z0cENvbmZpZy51c2VybmFtZSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFzc3dvcmQ6IHRoaXMuc2Z0cENvbmZpZy5wYXNzd29yZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVhZHlUaW1lb3V0OiAxMDAwMCwgLy8gMTDnp5Lov57mjqXotoXml7ZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAyMDAwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn5pyN5Yqh5Zmo6L+e5o6lJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmnI3liqHlmajov57mjqXmiJDlip/vvIEnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDojrflj5bnjq/looPphY3nva7lubbovazmjaLkuLrlsI/lhplcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGVudmlyb25tZW50ID0gdGhpcy5jb25maWdPYmplY3QuZW52aXJvbm1lbnQ/LnRvTG93ZXJDYXNlKCkgPT0gJ2RldmVsb3BtZW50JyA/ICdkZXZlbG9wJyA6ICdwcm9kdWN0aW9uJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlbW90ZVBhdGggPSBqb2luKHRoaXMuc2Z0cENvbmZpZy5yZW1vdGVQYXRoLCBlbnZpcm9ubWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg55uu5qCH6Lev5b6EOiAke3JlbW90ZVBhdGh9YCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5qOA5p+l5pys5Zyw55uu5b2V5piv5ZCm5a2Y5ZyoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB7IGV4aXN0c1N5bmMsIGxzdGF0U3luYywgcmVhZGRpclN5bmMgfSA9IHJlcXVpcmUoJ2ZzLWV4dHJhJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWV4aXN0c1N5bmMobG9jYWxQYXRoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihg5pys5Zyw55uu5b2V5LiN5a2Y5ZyoOiAke2xvY2FsUGF0aH1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDmnKzlnLDnm67lvZXmo4Dmn6XpgJrov4c6ICR7bG9jYWxQYXRofWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDorqHnrpfopoHkuIrkvKDnmoTmlofku7bmgLvmlbBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGNhbGN1bGF0ZUZpbGVzID0gKGRpcjogc3RyaW5nKTogbnVtYmVyID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgY291bnQgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGl0ZW1zID0gcmVhZGRpclN5bmMoZGlyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgaXRlbXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbVBhdGggPSBqb2luKGRpciwgaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsc3RhdFN5bmMoaXRlbVBhdGgpLmlzRGlyZWN0b3J5KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50ICs9IGNhbGN1bGF0ZUZpbGVzKGl0ZW1QYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvdW50Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNvdW50O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50b3RhbEZpbGVzID0gY2FsY3VsYXRlRmlsZXMobG9jYWxQYXRoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDpnIDopoHkuIrkvKDnmoTmlofku7bmgLvmlbA6ICR7dGhpcy50b3RhbEZpbGVzfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDot6/lvoTmoLzlvI/ljJblh73mlbDvvIznoa7kv53kvb/nlKjmraPnoa7nmoTliIbpmpTnrKZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGZvcm1hdFJlbW90ZVBhdGggPSAocGF0aDogc3RyaW5nKTogc3RyaW5nID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDovazmjaLkuLrmraPmlpzmnaDmoLzlvI/vvIjpgILnlKjkuo7lpKflpJrmlbBTRlRQ5pyN5Yqh5Zmo77yJXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhdGgucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5omL5Yqo5a6e546w5LiK5Lyg55uu5b2V55qE5Yqf6IO977yM5Lul5L6/6Lef6Liq6L+b5bqmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cGxvYWRRdWV1ZSA9IGNyZWF0ZVF1ZXVlKDUpOyAvLyDmnIDlpJo15Liq5bm25Y+R5LiK5LygXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBmYWlsZWRVcGxvYWRzOiBBcnJheTx7IGxvY2FsOiBzdHJpbmcsIHJlbW90ZTogc3RyaW5nIH0+ID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHVwbG9hZERpcmVjdG9yeSA9IGFzeW5jIChsb2NhbERpcjogc3RyaW5nLCByZW1vdGVEaXI6IHN0cmluZyk6IFByb21pc2U8dm9pZD4gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOagvOW8j+WMlui/nOeoi+i3r+W+hFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlbW90ZURpciA9IGZvcm1hdFJlbW90ZVBhdGgocmVtb3RlRGlyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDku4XlnKjpobblsYLnm67lvZXovpPlh7rml6Xlv5dcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobG9jYWxEaXIgPT09IGxvY2FsUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg5qC85byP5YyW5ZCO55qE6L+c56iL6Lev5b6EOiAke3JlbW90ZURpcn1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g56Gu5L+d6L+c56iL55uu5b2V5a2Y5ZyoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LuF5Zyo6aG25bGC55uu5b2V6L6T5Ye65pel5b+XXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsb2NhbERpciA9PT0gbG9jYWxQYXRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg5YeG5aSH5aSE55CG6L+c56iL55uu5b2VOiAke3JlbW90ZURpcn1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5YWI5qOA5p+l55uu5b2V5piv5ZCm5bey5a2Y5ZyoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkaXJFeGlzdHMgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOenu+mZpOi/h+WkmueahOaXpeW/l1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgc3RhdHMgPSBhd2FpdCB3aXRoVGltZW91dChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTZnRwLnN0YXQocmVtb3RlRGlyKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAxNTAwMCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAn5qOA5p+l6L+c56iL55uu5b2VJ1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g566A5YyW5Yik5pat6YC76L6R77yM5L2/55So57G75Z6L5pat6KiAXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0c0FueSA9IHN0YXRzIGFzIGFueTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpc0RpciA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlsJ3or5Xkvb/nlKjkuI3lkIzmlrnlvI/liKTmlq3mmK/lkKbkuLrnm67lvZVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0eXBlb2Ygc3RhdHNBbnkuaXNEaXJlY3RvcnkgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0RpciA9IHN0YXRzQW55LmlzRGlyZWN0b3J5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiBzdGF0c0FueS5pc0RpcmVjdG9yeSA9PT0gJ2Jvb2xlYW4nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNEaXIgPSBzdGF0c0FueS5pc0RpcmVjdG9yeTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc3RhdHNBbnkudHlwZSA9PT0gJ2QnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXNEaXIgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzdGF0c0FueS5tb2RlICYmIChzdGF0c0FueS5tb2RlICYgMG80MDAwMCkgIT09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpc0RpciA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpc0Rpcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOenu+mZpOi/h+WkmueahOaXpeW/l1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRpckV4aXN0cyA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybihg55uu5qCH6Lev5b6E5a2Y5Zyo5L2G5LiN5piv55uu5b2VOiAke3JlbW90ZURpcn1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoc3RhdEVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDku4XlnKjpobblsYLnm67lvZXovpPlh7rml6Xlv5dcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChsb2NhbERpciA9PT0gbG9jYWxQYXRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOi/nOeoi+ebruW9leS4jeWtmOWcqO+8jOmcgOimgeWIm+W7ujogJHtyZW1vdGVEaXJ9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWmguaenOebruW9leS4jeWtmOWcqO+8jOaJjeWIm+W7ulxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWRpckV4aXN0cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LuF5Zyo6aG25bGC55uu5b2V6L6T5Ye66K+m57uG5pel5b+XXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobG9jYWxEaXIgPT09IGxvY2FsUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDlsJ3or5XliJvlu7rov5znqIvnm67lvZU6ICR7cmVtb3RlRGlyfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDkuLpta2Rpcua3u+WKoOi2heaXtuaOp+WItlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgd2l0aFRpbWVvdXQoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U2Z0cC5ta2RpcihyZW1vdGVEaXIsIHRydWUpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDMwMDAwLCAvLyAzMOenkui2heaXtlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfliJvlu7rov5znqIvnm67lvZUnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApLmNhdGNoKGFzeW5jIChlcnJvcikgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybihg5L2/55So6YCS5b2S5pa55byP5Yib5bu655uu5b2V5aSx6LSl77yM5bCd6K+V5omL5Yqo5Yib5bu6OiAke3JlbW90ZURpcn1gLCBlcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5aaC5p6c6YCS5b2S5Yib5bu65aSx6LSl77yM5bCd6K+V5omL5Yqo5Yib5bu655uu5b2V5bGC5qyhXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcGFydHMgPSByZW1vdGVEaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpLnNwbGl0KCcvJykuZmlsdGVyKEJvb2xlYW4pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjdXJyZW50UGF0aCA9ICcnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOS7juagueebruW9leW8gOWni+mAkOe6p+WIm+W7ulxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyZW1vdGVEaXIuc3RhcnRzV2l0aCgnLycpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGN1cnJlbnRQYXRoID0gJy8nO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IHBhcnQgb2YgcGFydHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY3VycmVudFBhdGggPSBjdXJyZW50UGF0aCA/IGAke2N1cnJlbnRQYXRofS8ke3BhcnR9YCA6IHBhcnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDnsr7nroDml6Xlv5fovpPlh7pcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOajgOafpeebruW9leaYr+WQpuWtmOWcqFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBzdGF0cyA9IGF3YWl0IHRoaXMuY3VycmVudFNmdHAuc3RhdChjdXJyZW50UGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHN0YXRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnRpbnVlOyAvLyDnm67lvZXlt7LlrZjlnKjvvIzot7Pov4dcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChzdGF0RXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDnm67lvZXkuI3lrZjlnKjvvIznu6fnu63liJvlu7pcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5Yib5bu655uu5b2VXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB3aXRoVGltZW91dChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRTZnRwLm1rZGlyKGN1cnJlbnRQYXRoLCBmYWxzZSksIC8vIOS4jeS9v+eUqOmAkuW9klxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIDEwMDAwLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGDliJvlu7rnm67lvZUgJHtjdXJyZW50UGF0aH1gXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChta2RpckVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpoLmnpzliJvlu7rlpLHotKXkvYbnm67lvZXlj6/og73lt7LlrZjlnKjvvIznu6fnu63lpITnkIZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybihg5Yib5bu655uu5b2V5aSx6LSl77yM5Y+v6IO95bey5a2Y5ZyoOiAke2N1cnJlbnRQYXRofWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOS7heWcqOmhtuWxguebruW9lei+k+WHuuaXpeW/l1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobG9jYWxEaXIgPT09IGxvY2FsUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOi/nOeoi+ebruW9leWkhOeQhuWujOaIkDogJHtyZW1vdGVEaXJ9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGDov5znqIvnm67lvZXlpITnkIblpLHotKXvvIzlsJ3or5Xnu6fnu63kuIrkvKA6ICR7cmVtb3RlRGlyfWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDljbPkvb/nm67lvZXliJvlu7rpgYfliLDpl67popjvvIzkuZ/lsJ3or5Xnu6fnu63kuIrkvKBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6I635Y+W55uu5b2V5LiL55qE5omA5pyJ5paH5Lu2XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaXRlbXMgPSByZWFkZGlyU3luYyhsb2NhbERpcik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LuF5Zyo6aG25bGC55uu5b2V6L6T5Ye65pel5b+XXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxvY2FsRGlyID09PSBsb2NhbFBhdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOebruW9lSAke2xvY2FsRGlyfSDkuK3mnIkgJHtpdGVtcy5sZW5ndGh9IOS4quaWh+S7ti/mlofku7blpLlgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g6YeN6K+V5Ye95pWwXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3Qgd2l0aFJldHJ5ID0gYXN5bmMgKGZuOiAoKSA9PiBQcm9taXNlPGFueT4sIHJldHJpZXMgPSAzLCBkZWxheSA9IDIwMDApOiBQcm9taXNlPGFueT4gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbGFzdEVycm9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJldHJpZXM7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXdhaXQgZm4oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybihg5pON5L2c5aSx6LSl77yM56ysICR7aSsxfS8ke3JldHJpZXN9IOasoemHjeivlWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxhc3RFcnJvciA9IGVycjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDmnIDlkI7kuIDmrKHph43or5XliY3nrYnlvoVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaSA8IHJldHJpZXMgLSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCBkZWxheSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBsYXN0RXJyb3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDlpITnkIbmr4/kuKrmlofku7Yv5paH5Lu25aS5XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBpdGVtIG9mIGl0ZW1zKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IGxvY2FsSXRlbVBhdGggPSBqb2luKGxvY2FsRGlyLCBpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtb3RlSXRlbVBhdGggPSBmb3JtYXRSZW1vdGVQYXRoKGpvaW4ocmVtb3RlRGlyLCBpdGVtKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAobHN0YXRTeW5jKGxvY2FsSXRlbVBhdGgpLmlzRGlyZWN0b3J5KCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOmAkuW9kuS4iuS8oOWtkOebruW9lVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGxvY2FsRGlyID09PSBsb2NhbFBhdGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg5aSE55CG5a2Q55uu5b2VOiAke2l0ZW19YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB1cGxvYWREaXJlY3RvcnkobG9jYWxJdGVtUGF0aCwgcmVtb3RlSXRlbVBhdGgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5LiK5Lyg5paH5Lu2IC0g5re75Yqg5Yiw6Zif5YiXXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB1cGxvYWRRdWV1ZS5hZGRUYXNrKGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRVcGxvYWRGaWxlID0gaXRlbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDnroDljJbml6Xlv5fovpPlh7pcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB3aXRoUmV0cnkoYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g57K+566A5pel5b+XXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmN1cnJlbnRTZnRwLnB1dChsb2NhbEl0ZW1QYXRoLCByZW1vdGVJdGVtUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGxvYWRlZEZpbGVzKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXBsb2FkUHJvZ3Jlc3MgPSAodGhpcy51cGxvYWRlZEZpbGVzIC8gdGhpcy50b3RhbEZpbGVzKSAqIDEwMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5q+PMTDkuKrmlofku7bovpPlh7rkuIDmrKHov5vluqbml6Xlv5dcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudXBsb2FkZWRGaWxlcyAlIDEwID09PSAwIHx8IHRoaXMudXBsb2FkZWRGaWxlcyA9PT0gdGhpcy50b3RhbEZpbGVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg6L+b5bqmOiAke3RoaXMudXBsb2FkUHJvZ3Jlc3MudG9GaXhlZCgyKX0lICgke3RoaXMudXBsb2FkZWRGaWxlc30vJHt0aGlzLnRvdGFsRmlsZXN9KWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihg5LiK5Lyg5paH5Lu25aSx6LSlICjot7Pov4fnu6fnu60pOiAke2l0ZW19YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZhaWxlZFVwbG9hZHMucHVzaCh7IGxvY2FsOiBsb2NhbEl0ZW1QYXRoLCByZW1vdGU6IHJlbW90ZUl0ZW1QYXRoIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn5byA5aeL5LiK5Lyg5paH5Lu2Li4uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg5pys5Zyw6Lev5b6EOiAke2xvY2FsUGF0aH1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDov5znqIvot6/lvoQ6ICR7cmVtb3RlUGF0aH1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5ZCv5Yqo6L+e5o6l55uR5o6nXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzdGFydENvbm5lY3Rpb25Nb25pdG9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOS4iuS8oOaVtOS4quebruW9lVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+ato+WcqOaJp+ihjOS4iuS8oOebruW9leaTjeS9nC4uLicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB3aXRoVGltZW91dChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKGFzeW5jICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWFiOWwneivleebtOaOpeWIm+W7uui/nOeoi+ebruagh+ebruW9lVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coYOato+WcqOWHhuWkh+ebruagh+ebruW9lTogJHtyZW1vdGVQYXRofWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB3aXRoVGltZW91dChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U2Z0cC5ta2Rpcihmb3JtYXRSZW1vdGVQYXRoKHJlbW90ZVBhdGgpLCB0cnVlKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMzAwMDAsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICfliJvlu7rkuLvov5znqIvnm67lvZUnXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhg55uu5qCH55uu5b2V5YeG5aSH5a6M5oiQOiAke3JlbW90ZVBhdGh9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGNhdGNoIChta2RpckVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGDliJvlu7rkuLvov5znqIvnm67lvZXlpLHotKXvvIzlsIblnKjkuIrkvKDov4fnqIvkuK3pgJDnuqfliJvlu7pgKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXdhaXQgdXBsb2FkRGlyZWN0b3J5KGxvY2FsUGF0aCwgcmVtb3RlUGF0aCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygn562J5b6F5omA5pyJ5LiK5Lyg5Lu75Yqh5a6M5oiQLi4uJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB1cGxvYWRRdWV1ZS53YWl0Q29tcGxldGUoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmiYDmnInkuIrkvKDku7vliqHlt7LlpITnkIblrozmiJAnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8g5oql5ZGK5aSx6LSl55qE5LiK5LygXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZmFpbGVkVXBsb2Fkcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKGDmnIkgJHtmYWlsZWRVcGxvYWRzLmxlbmd0aH0g5Liq5paH5Lu25LiK5Lyg5aSx6LSlYCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCflpLHotKXnmoTmlofku7bliJfooag6Jyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZmFpbGVkVXBsb2Fkcy5mb3JFYWNoKCh7bG9jYWwsIHJlbW90ZX0sIGluZGV4KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihgJHtpbmRleCArIDF9LiAke2xvY2FsfSAtPiAke3JlbW90ZX1gKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgMTgwMDAwMCwgLy8g5aKe5Yqg5YiwMzDliIbpkp/otoXml7ZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+aWh+S7tuS4iuS8oCdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfnm67lvZXkuIrkvKDmk43kvZzlrozmiJAnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKHVwbG9hZEVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcign55uu5b2V5LiK5Lyg5pON5L2c5aSx6LSlOicsIHVwbG9hZEVycm9yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYOaWh+S7tuS4iuS8oOWksei0pTogJHsodXBsb2FkRXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2V9YCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmlofku7bkuIrkvKDlrozmiJDvvIEnKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyDpqozor4HkuIrkvKDnu5PmnpxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfkuIrkvKDlrozmiJDvvIzmraPlnKjpqozor4Hnu5PmnpwuLi4nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVtb3RlRmlsZXMgPSBhd2FpdCB3aXRoVGltZW91dChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U2Z0cC5saXN0KHJlbW90ZVBhdGgpLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAzMDAwMCwgLy8gMzDnp5LliJfooajojrflj5botoXml7ZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ+iOt+WPlui/nOeoi+aWh+S7tuWIl+ihqCdcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKGDpqozor4HmiJDlip86IOi/nOeoi+ebruW9leS4reaciSAke3JlbW90ZUZpbGVzLmxlbmd0aH0g5Liq5paH5Lu2L+aWh+S7tuWkuWApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oJ+aXoOazlemqjOivgei/nOeoi+aWh+S7tuWIl+ihqO+8jOS9huS4iuS8oOi/h+eoi+W3suWujOaIkCcpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfmlofku7bkuIrkvKDmtYHnqIvlt7LlrozmiJAnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXBsb2FkU3RhdHVzID0gJ3N1Y2Nlc3MnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRWRpdG9yLkRpYWxvZy5pbmZvKCfmlofku7blt7LmiJDlip/kuIrkvKDliLDmnI3liqHlmajvvIEnKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ+S4iuS8oOWksei0pTonLCBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcikpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy51cGxvYWRTdGF0dXMgPSAnZmFpbGVkJztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuZXJyb3IoJ+S4iuS8oOWksei0pTogJyArIChlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IFN0cmluZyhlcnJvcikpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBmaW5hbGx5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIOWBnOatoui/nuaOpeebkeaOp1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RvcENvbm5lY3Rpb25Nb25pdG9yKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50U2Z0cCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF3YWl0IHRoaXMuY3VycmVudFNmdHAuZW5kKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdTRlRQ6L+e5o6l5bey5YWz6ZetJyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoY2xvc2VFcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCflhbPpl63ov57mjqXml7blj5HnlJ/plJnor68nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jIGNhbmNlbFVwbG9hZCh0aGlzOiBNeUNvbXBvbmVudCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50U2Z0cCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ+ato+WcqOS4reaWreS4iuS8oC4uLicpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhd2FpdCB0aGlzLmN1cnJlbnRTZnRwLmVuZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudXBsb2FkU3RhdHVzID0gJ2lkbGUnO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCfkuIrkvKDlt7LkuK3mlq0nKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFZGl0b3IuRGlhbG9nLmluZm8oJ+S4iuS8oOW3suS4reaWrScpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKCfkuK3mlq3kuIrkvKDlpLHotKU6JywgZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVkaXRvci5EaWFsb2cuZXJyb3IoJ+S4reaWreS4iuS8oOWksei0pTogJyArIChlcnJvciBhcyBFcnJvcikubWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgLy8g5Yib5bu65bqU55So5a6e5L6LXHJcbiAgICAgICAgICAgIGNvbnN0IGFwcCA9IGNyZWF0ZUFwcCh7XHJcbiAgICAgICAgICAgICAgICB0ZW1wbGF0ZTogYDxNeUNvbXBvbmVudCAvPmAsXHJcbiAgICAgICAgICAgICAgICBjb21wb25lbnRzOiB7IE15Q29tcG9uZW50IH1cclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBhcHAuY29uZmlnLmNvbXBpbGVyT3B0aW9ucy5pc0N1c3RvbUVsZW1lbnQgPSB0YWcgPT4gdGFnLnN0YXJ0c1dpdGgoJ3VpLScpO1xyXG4gICAgICAgICAgICBhcHAubW91bnQodGhpcy4kLmFwcCk7XHJcbiAgICAgICAgICAgIHBhbmVsRGF0YU1hcC5zZXQodGhpcywgYXBwKTtcclxuICAgICAgICB9XHJcbiAgICB9LFxyXG5cclxuICAgIGNsb3NlKCkge1xyXG4gICAgICAgIGNvbnN0IGFwcCA9IHBhbmVsRGF0YU1hcC5nZXQodGhpcyk7XHJcbiAgICAgICAgYXBwPy51bm1vdW50KCk7XHJcbiAgICB9XHJcbn0pO1xyXG4iXX0=
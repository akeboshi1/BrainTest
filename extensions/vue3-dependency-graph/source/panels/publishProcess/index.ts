import { readFileSync, readdirSync } from 'fs-extra';
import { join } from 'path';
import { createApp, type App } from 'vue';
import { BundleVersionManager } from '../../utils/bundle-version-manager';
import { generateBundleVersions } from '../../utils/generate-bundle-versions';
import Client from 'ssh2-sftp-client';

// 添加配置文件缓存
const configPathCache = new WeakMap<any, Record<string, string>>();

const panelDataMap = new WeakMap<any, App>();

// 定义组件类型
interface BundleVersionInfo {
    isLatest: boolean;
    hasLocalChanges: boolean;
    lastCheckTime: string;
    mainVersion: string;
    bundleVersions: Array<{
        name: string;
        version: string;
    }>;
    diffVersions: string[];
}

interface BundleVersionStatus {
    isLatest: boolean;
    hasLocalChanges: boolean;
    diffVersions: string[];
}

interface MyComponent {
    selectedOption: string;
    configContent: string;
    originalContent: string;
    publishSettingPath: string;
    configObject: Record<string, any>;
    showRawJson: boolean;
    hasChanges: boolean;
    canReset: boolean;
    bundleVersionInfo: BundleVersionInfo;
    handleChange(event: Event): void;
    handleClick(): void;
    saveConfig(): void;
    resetConfig(): void;
    loadPublishSetting(): void;
    updateJsonFromForm(): void;
    toggleJsonView(): void;
    trackChanges(): void;
    generateBundleVersion(): void;
    checkBundleVersion(): Promise<void>;
    fetchLatestVersion(): Promise<void>;
    syncBundleVersion(): Promise<void>;
    restoreVersion(): void;
    revertVersion(): void;
    onVersionChange(): void;
    saveVersionChanges(): Promise<void>;
    hasVersionChanges: boolean;
    publishStatus: string;
    publishStatusText: Record<string, string>;
    openVersionFileLocation(): Promise<void>;
    uploadToServer(): Promise<void>;
    cancelUpload(): Promise<void>;
    uploadFolderWithProgress(localFolderPath: string, remoteFolderPath: string): Promise<void>;
    sftpConfig: {
        host: string;
        port: number;
        username: string;
        password: string;
        remotePath: string;
    };
    uploadStatus: 'idle' | 'uploading' | 'success' | 'failed';
    uploadStatusText: Record<string, string>;
    currentSftp: Client | null;
    uploadProgress: number;
    uploadedFiles: number;
    totalFiles: number;
    currentUploadFile: string;
}

// 从配置文件读取 SFTP 配置
async function loadSftpConfig(environment?: string) {
    try {
        const configPath = join(Editor.Project.path, 'sftp-config.json');
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
        
        // 根据环境选择正确的 remotePath
        if (environment && typeof config.remotePath === 'object' && config.remotePath !== null) {
            // 新格式：remotePath 是一个对象，包含 development 和 production
            const env = environment.toLowerCase() === 'production' ? 'production' : 'development';
            const envPath = config.remotePath[env];
            if (envPath) {
                config.remotePath = envPath;
                console.log(`使用 ${env} 环境的远程路径: ${envPath}`);
            } else {
                console.warn(`未找到 ${env} 环境的远程路径配置，使用默认路径`);
            }
        }
        
        return config;
    } catch (error) {
        console.error('读取 SFTP 配置失败:', error);
        return null;
    }
}

module.exports = Editor.Panel.define({
    listeners: {
        show: () => console.log('show'),
        hide: () => console.log('hide'),
    },
    template: readFileSync(join(__dirname, '../../../static/template/publishProcess/index.html'), 'utf-8'),
    style: readFileSync(join(__dirname, '../../../static/style/publishProcess/index.css'), 'utf-8') + `
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
            const configFiles = readdirSync(configDir)
                .filter(file => file.endsWith('.json'))
                .reduce((acc, file) => {
                    acc[file] = join(configDir, file);
                    return acc;
                }, {} as Record<string, string>);

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
                    publishSettingPath: join(Editor.Project.path, 'assets', 'app', 'publishSetting.json'),
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
                    publishStatus: 'idle' as 'idle' | 'publishing' | 'success' | 'failed',
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
                    uploadStatus: 'idle' as 'idle' | 'uploading' | 'success' | 'failed',
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
                mounted(this: MyComponent) {
                    // 组件挂载时加载发布设置
                    this.loadPublishSetting();
                    this.checkBundleVersion(); // 初始检查版本状态
                    
                    // 加载SFTP配置，使用默认的开发环境
                    loadSftpConfig('development').then(config => {
                        if (config) {
                            this.sftpConfig = config;
                        }
                    });
                },
                methods: {
                    trackChanges(this: MyComponent) {
                        if (this.showRawJson) {
                            // JSON视图中跟踪变化
                            this.hasChanges = this.configContent !== this.originalContent;
                        } else {
                            // 表单视图中跟踪变化
                            const currentJson = JSON.stringify(this.configObject);
                            try {
                                const originalObj = JSON.parse(this.originalContent);
                                this.hasChanges = JSON.stringify(originalObj) !== currentJson;
                            } catch (e) {
                                this.hasChanges = true;
                            }
                        }

                        // 检查是否可以回退
                        this.canReset = this.hasChanges && this.originalContent !== '';
                    },
                    loadPublishSetting(this: MyComponent) {
                        try {
                            const content = readFileSync(this.publishSettingPath, 'utf-8');
                            this.configContent = content;
                            this.originalContent = content; // 保存原始内容用于回退

                            try {
                                this.configObject = JSON.parse(content);
                            } catch (e) {
                                this.configObject = {};
                                console.error('JSON解析失败:', e);
                                Editor.Dialog.warn('JSON格式无效，使用空对象！');
                            }

                            // 初始化时没有变更
                            this.hasChanges = false;
                            this.canReset = false;

                            console.log('发布设置文件已加载:', this.publishSettingPath);
                        } catch (error) {
                            console.error('读取发布设置文件失败:', error);
                            this.configContent = '{}'; // 默认空JSON对象
                            this.originalContent = '{}';
                            this.configObject = {};

                            // 如果文件不存在，可以创建一个默认的
                            try {
                                const { writeFileSync, ensureDirSync } = require('fs-extra');
                                const dirPath = join(Editor.Project.path, 'assets', 'app');
                                ensureDirSync(dirPath); // 确保目录存在
                                writeFileSync(this.publishSettingPath, '{}', 'utf-8');
                                console.log('创建了默认的发布设置文件');
                            } catch (err) {
                                console.error('创建默认发布设置文件失败:', err);
                            }
                        }
                    },
                    updateJsonFromForm(this: MyComponent) {
                        // 将表单数据转换回JSON字符串
                        this.configContent = JSON.stringify(this.configObject, null, 2);
                        // 更新变更状态
                        this.trackChanges();
                    },
                    toggleJsonView(this: MyComponent) {
                        if (!this.showRawJson) {
                            // 切换到JSON视图时，更新JSON字符串
                            this.updateJsonFromForm();
                        } else {
                            // 切换到表单视图时，解析JSON字符串
                            try {
                                this.configObject = JSON.parse(this.configContent);
                            } catch (e) {
                                console.error('JSON解析失败:', e);
                                Editor.Dialog.warn('JSON格式无效，无法切换到表单视图！');
                                return; // 解析失败时不切换视图
                            }
                        }
                        this.showRawJson = !this.showRawJson;
                        // 视图切换后更新变更状态
                        this.trackChanges();
                    },
                    handleChange(this: MyComponent) {
                        console.log('Selected:', this.selectedOption);
                        // 注意：这里依然保留从buildConfigs读取配置的功能
                        if (this.selectedOption) {
                            try {
                                const content = readFileSync(this.selectedOption, 'utf-8');
                                console.log('构建配置文件已加载');
                            } catch (error) {
                                console.error('读取构建配置文件失败:', error);
                            }
                        }
                    },
                    saveConfig(this: MyComponent) {
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
                            } catch (e) {
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
                        } catch (error) {
                            console.error('保存发布设置文件失败:', error);
                            Editor.Dialog.error('保存发布设置失败: ' + (error as Error).message);
                        }
                    },
                    resetConfig(this: MyComponent) {
                        // 回退到原始配置
                        if (this.originalContent) {
                            this.configContent = this.originalContent;
                            try {
                                this.configObject = JSON.parse(this.originalContent);
                            } catch (e) {
                                this.configObject = {};
                            }
                            // 重置后更新变更状态
                            this.hasChanges = false;
                            this.canReset = false;

                            console.log('发布设置已重置为原始状态');
                            Editor.Dialog.info('发布设置已回退到初始状态！');
                        }
                    },
                    handleClick(this: MyComponent) {
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

                            buildProcess.stdout.on('data', (data: Buffer) => {
                                const output = data.toString();
                                console.log(`构建输出: ${output}`);
                            });

                            buildProcess.stderr.on('data', (data: Buffer) => {
                                const errorOutput = data.toString();
                                console.error(`构建错误: ${errorOutput}`);
                            });

                            buildProcess.on('close', (code: number) => {
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

                            buildProcess.on('error', (err: Error) => {
                                console.error('启动构建进程时出错:', err);
                                this.publishStatus = 'failed';
                            });
                        } catch (error) {
                            console.error('命令执行失败:', error);
                            this.publishStatus = 'failed';
                        }
                    },
                    async checkBundleVersion(this: MyComponent) {
                        try {
                            // 获取文件状态
                            const result = await BundleVersionManager.checkVersion();

                            // 读取版本文件内容
                            const versionFilePath = join(Editor.Project.path, 'publish-remote-bundle', 'bundle_versions.json');
                            const versionData = JSON.parse(readFileSync(versionFilePath, 'utf-8'));

                            // 转换 bundles 对象为数组格式
                            const bundleVersions = Object.entries(versionData.bundles).map(([name, data]: [string, any]) => ({
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
                        } catch (error) {
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
                    async fetchLatestVersion(this: MyComponent) {
                        try {
                            await BundleVersionManager.fetchLatest();
                            await this.checkBundleVersion(); // 刷新状态
                            Editor.Dialog.info('已获取最新版本');
                        } catch (error) {
                            console.error('获取最新版本失败:', error);
                            Editor.Dialog.error('获取最新版本失败，请重试');
                        }
                    },
                    async syncBundleVersion(this: MyComponent) {
                        try {
                            await BundleVersionManager.syncToGit();
                            await this.checkBundleVersion(); // 刷新状态
                            Editor.Dialog.info('版本已同步到分支');
                        } catch (error) {
                            console.error('同步版本失败:', error);
                            Editor.Dialog.error('同步版本失败，请重试');
                        }
                    },
                    async generateBundleVersion(this: MyComponent) {
                        console.log('正在生成Bundle版本...');
                        const projectRoot = Editor.Project.path;
                        const targetPath = join(projectRoot, '/build/android/remote');

                        try {
                            if (await generateBundleVersions(targetPath)) {
                                console.log('✅ 版本文件生成成功');
                                // 生成完成后检查版本状态
                                await this.checkBundleVersion();
                            } else {
                                console.warn('❌ 版本文件生成失败');
                                Editor.Dialog.warn('版本文件生成失败');
                            }
                        } catch (error) {
                            console.error('生成Bundle版本失败:', error);
                            Editor.Dialog.error('生成Bundle版本失败: ' + (error as Error).message);
                        }
                    },
                    async restoreVersion(this: MyComponent) {
                        try {
                            await BundleVersionManager.restoreFromBackup();
                            await this.checkBundleVersion(); // 刷新状态
                            Editor.Dialog.info('已从备份文件恢复');
                        } catch (error) {
                            console.error('恢复版本失败:', error);
                            Editor.Dialog.error('恢复版本失败: ' + (error as Error).message);
                        }
                    },
                    async revertVersion(this: MyComponent) {
                        try {
                            await BundleVersionManager.revertToLastCommit();
                            await this.checkBundleVersion(); // 刷新状态
                            Editor.Dialog.info('已回退到上一版本');
                        } catch (error) {
                            console.error('回退版本失败:', error);
                            Editor.Dialog.error('回退版本失败: ' + (error as Error).message);
                        }
                    },
                    onVersionChange(this: MyComponent) {
                        this.hasVersionChanges = true;
                    },
                    async saveVersionChanges(this: MyComponent) {
                        try {
                            const versionFilePath = join(Editor.Project.path, 'publish-remote-bundle', 'bundle_versions.json');

                            // 构建要保存的版本数据
                            const versionData = {
                                version: this.bundleVersionInfo.mainVersion,
                                bundles: this.bundleVersionInfo.bundleVersions.reduce((acc, bundle) => {
                                    acc[bundle.name] = {
                                        version: bundle.version
                                    };
                                    return acc;
                                }, {} as Record<string, { version: string }>)
                            };

                            // 写入文件
                            const { writeFileSync } = require('fs-extra');
                            writeFileSync(versionFilePath, JSON.stringify(versionData, null, 2), 'utf-8');

                            this.hasVersionChanges = false;
                            await this.checkBundleVersion(); // 刷新状态
                            Editor.Dialog.info('版本修改已保存');
                        } catch (error) {
                            console.error('保存版本修改失败:', error);
                            Editor.Dialog.error('保存版本修改失败: ' + (error as Error).message);
                        }
                    },
                    async openVersionFileLocation(this: MyComponent) {
                        try {
                            const versionFilePath = join(Editor.Project.path, 'publish-remote-bundle');
                            const { shell } = require('electron');
                            shell.openPath(versionFilePath);
                        } catch (error) {
                            console.error('打开文件位置失败:', error);
                            Editor.Dialog.error('打开文件位置失败: ' + (error as Error).message);
                        }
                    },
                    async uploadToServer(this: MyComponent) {
                        if (this.uploadStatus === 'uploading') {
                            return;
                        }

                        this.uploadStatus = 'uploading';
                        
                        // 获取环境配置并转换为小写
                        const environment = this.configObject.environment?.toLowerCase() == 'development' ? 'development' : 'production';
                        
                        // 根据环境重新加载SFTP配置
                        const sftpConfig = await loadSftpConfig(environment);
                        if (!sftpConfig) {
                            this.uploadStatus = 'failed';
                            Editor.Dialog.error('无法加载SFTP配置');
                            return;
                        }
                        
                        // 创建SFTP客户端并添加调试功能
                        this.currentSftp = new Client();
                        // 启用调试日志
                        (this.currentSftp as any).on('debug', (msg: string) => {
                            console.log(`SFTP调试信息: ${msg}`);
                        });
                        const localPath = join(Editor.Project.path, 'publish-remote-bundle');
                        
                        // 重置上传进度
                        this.uploadProgress = 0;
                        this.uploadedFiles = 0;
                        this.totalFiles = 0;
                        this.currentUploadFile = '';

                        // 添加超时处理的辅助函数
                        const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
                            let timeoutId: NodeJS.Timeout;
                            const timeoutPromise = new Promise<T>((_, reject) => {
                                timeoutId = setTimeout(() => reject(new Error(`操作超时: ${message}`)), timeoutMs);
                            });
                            return Promise.race([
                                promise,
                                timeoutPromise
                            ]).finally(() => clearTimeout(timeoutId));
                        };

                        try {
                            console.log('开始连接服务器...');
                            // 使用超时控制初始连接
                            await withTimeout(
                                this.currentSftp.connect({
                                    host: sftpConfig.host,
                                    port: sftpConfig.port,
                                    username: sftpConfig.username,
                                    password: sftpConfig.password,
                                    readyTimeout: 10000, // 10秒连接超时
                                }),
                                20000,
                                '服务器连接'
                            );
                            console.log('服务器连接成功！');

                            // 确定远程路径（不再需要拼接环境路径，因为配置中已经包含了）
                            const remotePath = sftpConfig.remotePath;
                            console.log(`目标路径: ${remotePath}`);

                            // 检查本地目录是否存在
                            const { existsSync, lstatSync, readdirSync } = require('fs-extra');
                            if (!existsSync(localPath)) {
                                throw new Error(`本地目录不存在: ${localPath}`);
                            }
                            console.log(`本地目录检查通过: ${localPath}`);
                            
                            // 路径格式化函数，确保使用正确的分隔符
                            const formatRemotePath = (path: string): string => {
                                return path.replace(/\\/g, '/');
                            };

                            // 确定要上传的文件夹列表
                            let foldersToUpload: string[] = [];
                            const isFullUpload = this.configObject.isFullUpload === true;
                            
                            if (isFullUpload) {
                                // 全量上传：扫描根目录下的所有文件夹
                                console.log('执行全量上传，扫描所有文件夹...');
                                const items = readdirSync(localPath);
                                foldersToUpload = items.filter((item: string) => {
                                    const itemPath = join(localPath, item);
                                    return lstatSync(itemPath).isDirectory();
                                });
                                console.log(`扫描到 ${foldersToUpload.length} 个文件夹:`, foldersToUpload);
                            } else {
                                // 增量上传：使用 changeBundleList 中的文件夹
                                const changeBundleList = this.configObject.changeBundleList || [];
                                if (changeBundleList.length === 0) {
                                    console.warn('changeBundleList 为空，没有需要上传的文件夹');
                                    this.uploadStatus = 'success';
                                    Editor.Dialog.info('没有需要上传的文件');
                                    return;
                                }
                                foldersToUpload = changeBundleList;
                                console.log(`增量上传，需要上传 ${foldersToUpload.length} 个文件夹:`, foldersToUpload);
                            }
                            
                            this.totalFiles = foldersToUpload.length;
                            console.log(`需要上传的文件夹总数: ${this.totalFiles}`);

                            // 创建远程目标目录
                            console.log(`正在准备目标目录: ${remotePath}`);
                            try {
                                await withTimeout(
                                    this.currentSftp.mkdir(formatRemotePath(remotePath), true),
                                    30000,
                                    '创建主远程目录'
                                );
                                console.log(`目标目录准备完成: ${remotePath}`);
                            } catch (mkdirError) {
                                console.warn(`创建主远程目录失败，将在上传过程中逐级创建`);
                            }

                            // 上传每个文件夹
                            console.log('开始上传文件夹...');
                            for (const folderName of foldersToUpload) {
                                if (this.uploadStatus !== 'uploading') {
                                    console.log('上传已中断');
                                    break;
                                }

                                const localFolderPath = join(localPath, folderName);
                                const remoteFolderPath = formatRemotePath(join(remotePath, folderName));
                                
                                // 检查本地文件夹是否存在
                                if (!existsSync(localFolderPath)) {
                                    console.warn(`本地文件夹不存在，跳过: ${localFolderPath}`);
                                    continue;
                                }
                                
                                console.log(`正在上传文件夹: ${folderName} -> ${remoteFolderPath}`);
                                
                                try {
                                    // 使用 uploadDir 方法上传文件夹
                                    await this.uploadFolderWithProgress(localFolderPath, remoteFolderPath);
                                    
                                    this.uploadedFiles++;
                                    this.uploadProgress = (this.uploadedFiles / this.totalFiles) * 100;
                                    
                                    console.log(`文件夹上传完成: ${folderName} (${this.uploadedFiles}/${this.totalFiles})`);
                                } catch (error) {
                                    console.error(`上传文件夹失败: ${folderName}`, error);
                                    // 继续上传其他文件夹，不中断整个流程
                                }
                            }
                            
                            console.log('所有文件夹上传完成！');

                            // 验证上传结果
                            console.log('上传完成，正在验证结果...');
                            try {
                                const remoteFiles = await withTimeout(
                                    this.currentSftp.list(remotePath),
                                    30000, // 30秒列表获取超时
                                    '获取远程文件列表'
                                );
                                console.log(`验证成功: 远程目录中有 ${remoteFiles.length} 个文件/文件夹`);
                            } catch (error) {
                                console.warn('无法验证远程文件列表，但上传过程已完成');
                            }

                            console.log('文件上传流程已完成');
                            this.uploadStatus = 'success';
                            Editor.Dialog.info('文件已成功上传到服务器！');
                        } catch (error) {
                            console.error('上传失败:', error instanceof Error ? error.message : String(error));
                            this.uploadStatus = 'failed';
                            Editor.Dialog.error('上传失败: ' + (error instanceof Error ? error.message : String(error)));
                        } finally {
                            if (this.currentSftp) {
                                try {
                                    // 使用更安全的方式关闭连接
                                    const sftp = this.currentSftp;
                                    this.currentSftp = null; // 先置空引用
                                    
                                    // 使用 Promise 包装连接关闭操作
                                    await new Promise<void>((resolve) => {
                                        const timeout = setTimeout(() => {
                                            console.warn('关闭连接超时，强制结束');
                                            resolve();
                                        }, 5000);
                                        
                                        try {
                                            sftp.end()
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
                                } catch (closeError) {
                                    console.error('关闭连接时发生错误:', closeError);
                                }
                            }
                        }
                    },
                    
                    // 新增：带进度输出的文件夹上传方法
                    async uploadFolderWithProgress(this: MyComponent, localFolderPath: string, remoteFolderPath: string): Promise<void> {
                        console.log(`使用 uploadDir 方法上传文件夹: ${localFolderPath} -> ${remoteFolderPath}`);
                        
                        if (!this.currentSftp) {
                            throw new Error('SFTP客户端不存在');
                        }
                        
                        // 添加上传进度监听器
                        const uploadListener = (info: { source: string; destination: string }) => {
                            console.log(`上传进度: ${info.source} -> ${info.destination}`);
                            this.currentUploadFile = info.source.split('/').pop() || '';
                        };
                        
                        // 注册上传事件监听器
                        this.currentSftp.on('upload', uploadListener);
                        
                        try {
                            await this.currentSftp.uploadDir(localFolderPath, remoteFolderPath);
                        } finally {
                            // 移除监听器
                            this.currentSftp.removeListener('upload', uploadListener);
                        }
                    },
                    async cancelUpload(this: MyComponent) {
                        if (this.currentSftp) {
                            console.log('正在中断上传...');
                            try {
                                await this.currentSftp.end();
                                this.uploadStatus = 'idle';
                                console.log('上传已中断');
                                Editor.Dialog.info('上传已中断');
                            } catch (error) {
                                console.error('中断上传失败:', error);
                                Editor.Dialog.error('中断上传失败: ' + (error as Error).message);
                            }
                        }
                    },
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
        app?.unmount();
    }
});

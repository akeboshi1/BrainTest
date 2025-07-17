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
    sftpConfig: {
        host: string;
        port: number;
        username: string;
        password: string;
        remotePath: string;
    };
    uploadStatus: 'idle' | 'uploading' | 'success' | 'failed';
    uploadStatusText: Record<string, string>;
    currentSftp: Client;
    uploadProgress: number;
    uploadedFiles: number;
    totalFiles: number;
    currentUploadFile: string;
}

// 从配置文件读取 SFTP 配置
async function loadSftpConfig() {
    try {
        const configPath = join(Editor.Project.path, 'sftp-config.json');
        const config = JSON.parse(readFileSync(configPath, 'utf-8'));
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
                    loadSftpConfig().then(config => {
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

                        // 添加队列控制
                        const createQueue = (concurrency: number) => {
                            const queue: Array<() => Promise<any>> = [];
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
                                } catch (error) {
                                    console.error('任务执行失败:', error);
                                } finally {
                                    activeCount--;
                                    runTask(); // 尝试执行下一个任务
                                }
                            };
                            
                            const addTask = (task: () => Promise<any>) => {
                                queue.push(task);
                                runTask(); // 尝试立即执行任务
                            };
                            
                            const waitComplete = () => {
                                if (activeCount === 0 && queue.length === 0) {
                                    return Promise.resolve();
                                }
                                
                                return new Promise<void>(resolve => {
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
                        let connectionCheckInterval: NodeJS.Timeout;
                        
                        // 检查SFTP连接状态并在需要时重新连接
                        const checkAndReconnect = async (): Promise<boolean> => {
                            try {
                                if (!this.currentSftp) {
                                    console.warn('SFTP客户端不存在，创建新的连接');
                                    this.currentSftp = new Client();
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
                            } catch (error) {
                                console.warn('连接检查失败，尝试重新连接', error);
                                
                                try {
                                    // 先关闭任何可能存在的连接
                                    if (this.currentSftp) {
                                        try {
                                            await this.currentSftp.end();
                                        } catch (e) {
                                            console.error('关闭旧连接失败', e);
                                        }
                                    }
                                    
                                    // 创建新连接
                                    this.currentSftp = new Client();
                                    await this.currentSftp.connect({
                                        host: this.sftpConfig.host,
                                        port: this.sftpConfig.port,
                                        username: this.sftpConfig.username,
                                        password: this.sftpConfig.password,
                                        readyTimeout: 10000
                                    });
                                    console.log('重新连接成功');
                                    return true;
                                } catch (reconnectError) {
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
                            await withTimeout(
                                this.currentSftp.connect({
                                    host: this.sftpConfig.host,
                                    port: this.sftpConfig.port,
                                    username: this.sftpConfig.username,
                                    password: this.sftpConfig.password,
                                    readyTimeout: 10000, // 10秒连接超时
                                }),
                                20000,
                                '服务器连接'
                            );
                            console.log('服务器连接成功！');

                            // 获取环境配置并转换为小写
                            const environment = this.configObject.environment?.toLowerCase() == 'development' ? 'develop' : 'production';
                            const remotePath = join(this.sftpConfig.remotePath, environment);
                            console.log(`目标路径: ${remotePath}`);

                            // 检查本地目录是否存在
                            const { existsSync, lstatSync, readdirSync } = require('fs-extra');
                            if (!existsSync(localPath)) {
                                throw new Error(`本地目录不存在: ${localPath}`);
                            }
                            console.log(`本地目录检查通过: ${localPath}`);
                            
                            // 计算要上传的文件总数
                            const calculateFiles = (dir: string): number => {
                                let count = 0;
                                const items = readdirSync(dir);
                                for (const item of items) {
                                    const itemPath = join(dir, item);
                                    if (lstatSync(itemPath).isDirectory()) {
                                        count += calculateFiles(itemPath);
                                    } else {
                                        count++;
                                    }
                                }
                                return count;
                            };
                            
                            this.totalFiles = calculateFiles(localPath);
                            console.log(`需要上传的文件总数: ${this.totalFiles}`);
                            
                            // 路径格式化函数，确保使用正确的分隔符
                            const formatRemotePath = (path: string): string => {
                                // 转换为正斜杠格式（适用于大多数SFTP服务器）
                                return path.replace(/\\/g, '/');
                            };
                            
                            // 手动实现上传目录的功能，以便跟踪进度
                            const uploadQueue = createQueue(5); // 最多5个并发上传
                            const failedUploads: Array<{ local: string, remote: string }> = [];
                            
                            const uploadDirectory = async (localDir: string, remoteDir: string): Promise<void> => {
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
                                        const stats = await withTimeout(
                                            this.currentSftp.stat(remoteDir),
                                            15000,
                                            '检查远程目录'
                                        );
                                        
                                        // 简化判断逻辑，使用类型断言
                                        const statsAny = stats as any;
                                        let isDir = false;
                                        
                                        // 尝试使用不同方式判断是否为目录
                                        if (typeof statsAny.isDirectory === 'function') {
                                            isDir = statsAny.isDirectory();
                                        } else if (typeof statsAny.isDirectory === 'boolean') {
                                            isDir = statsAny.isDirectory;
                                        } else if (statsAny.type === 'd') {
                                            isDir = true;
                                        } else if (statsAny.mode && (statsAny.mode & 0o40000) !== 0) {
                                            isDir = true;
                                        }
                                        
                                        if (isDir) {
                                            // 移除过多的日志
                                            dirExists = true;
                                        } else {
                                            console.warn(`目标路径存在但不是目录: ${remoteDir}`);
                                        }
                                    } catch (statError) {
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
                                        await withTimeout(
                                            this.currentSftp.mkdir(remoteDir, true),
                                            30000, // 30秒超时
                                            '创建远程目录'
                                        ).catch(async (error) => {
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
                                                    } catch (statError) {
                                                        // 目录不存在，继续创建
                                                    }
                                                    
                                                    // 创建目录
                                                    await withTimeout(
                                                        this.currentSftp.mkdir(currentPath, false), // 不使用递归
                                                        10000,
                                                        `创建目录 ${currentPath}`
                                                    );
                                                } catch (mkdirError) {
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
                                } catch (err) {
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
                                const withRetry = async (fn: () => Promise<any>, retries = 3, delay = 2000): Promise<any> => {
                                    let lastError;
                                    for (let i = 0; i < retries; i++) {
                                        try {
                                            return await fn();
                                        } catch (err) {
                                            console.warn(`操作失败，第 ${i+1}/${retries} 次重试`);
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
                                    const localItemPath = join(localDir, item);
                                    const remoteItemPath = formatRemotePath(join(remoteDir, item));
                                    
                                    if (lstatSync(localItemPath).isDirectory()) {
                                        // 递归上传子目录
                                        if (localDir === localPath) {
                                            console.log(`处理子目录: ${item}`);
                                        }
                                        await uploadDirectory(localItemPath, remoteItemPath);
                                    } else {
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
                                            } catch (error) {
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
                                await withTimeout(
                                    (async () => {
                                        // 先尝试直接创建远程目标目录
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
                                        
                                        await uploadDirectory(localPath, remotePath);
                                        console.log('等待所有上传任务完成...');
                                        await uploadQueue.waitComplete();
                                        console.log('所有上传任务已处理完成');
                                        
                                        // 报告失败的上传
                                        if (failedUploads.length > 0) {
                                            console.warn(`有 ${failedUploads.length} 个文件上传失败`);
                                            console.warn('失败的文件列表:');
                                            failedUploads.forEach(({local, remote}, index) => {
                                                console.warn(`${index + 1}. ${local} -> ${remote}`);
                                            });
                                        }
                                    })(),
                                    1800000, // 增加到30分钟超时
                                    '文件上传'
                                );
                                console.log('目录上传操作完成');
                            } catch (uploadError) {
                                console.error('目录上传操作失败:', uploadError);
                                throw new Error(`文件上传失败: ${(uploadError as Error).message}`);
                            }
                            
                            console.log('文件上传完成！');

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
                            // 停止连接监控
                            stopConnectionMonitor();
                            if (this.currentSftp) {
                                try {
                                    await this.currentSftp.end();
                                    console.log('SFTP连接已关闭');
                                } catch (closeError) {
                                    console.error('关闭连接时发生错误');
                                }
                            }
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

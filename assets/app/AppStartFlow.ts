import { _decorator, assetManager, Component, JsonAsset, Enum, Label, director, sys, Node, UITransform } from 'cc';
import { BundleManager, BundleVersionsConfig } from './BundleManager';
const { ccclass, property } = _decorator;

// 应用启动状态机
enum StartStatus {
    CONNECTING_SOCKET,    // 正在连接服务器
    DOWNLOADING_VERSION,  // 下载版本配置
    DOWNLOADING_RESOURCES,// 下载资源包
    COMPLETE              // 启动完成
}



export enum Environment {
    DEVELOPMENT,
    PRODUCTION
}

@ccclass('AppStartFlow')
export class AppStartFlow extends Component {
    // 核心状态管理
    private state: StartStatus = StartStatus.CONNECTING_SOCKET;
    private socket: WebSocket | null = null;     // 服务器连接实例
    private bundleVersions!: BundleVersionsConfig; // 版本配置缓存

    @property(String)
    dev_remote_url: String = "https://kele.paipai.xinjiaxianglao.com/develop/";

    @property(String)
    pro_remote_url: String = "https://kele.paipai.xinjiaxianglao.com/production/";

    @property(String)
    dev_api_url: String = "wss://test.paipai2.xinjiaxianglao.com/api/home";

    @property(String)
    pro_api_url: String = "wss://kele.paipai.xinjiaxianglao.com/api/home";

    @property({
        type: Enum(Environment),
        tooltip: '请选择环境'
    })
    currentEnvironment: Environment = Environment.DEVELOPMENT;

    @property(Label)
    messageLabel: Label = null;

    @property(Label)
    versionLabel: Label = null;

    @property(String)
    version: String = "";

    @property(Node)
    buttonListContainer: Node = null;

    // 添加组件销毁时的清理逻辑
    onDestroy() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log('关闭WebSocket连接');
            this.socket.close();
        }
    }
    // 主流程入口
    start() {
        this.updateVersionLabel(); // 初始显示应用版本
        this.connectToSocket();
    }

    private updateProgressText(message: string) {
        if (this.messageLabel) {
            this.messageLabel.string = message;
        }
    }

    private updateVersionLabel() {
        if (!this.versionLabel) return;

        // 基础应用版本
        let versionInfo = `应用版本: ${this.version}`;

        // 添加配置版本（如果已加载）
        if (this.bundleVersions) {
            versionInfo += `\n配置版本: ${this.bundleVersions.version}`;

            // 添加resources包版本
            const resourcesBundle = this.bundleVersions.bundles['resources'];
            if (resourcesBundle) {
                versionInfo += `\n资源版本: ${resourcesBundle.version}`;
            }
        }

        this.versionLabel.string = versionInfo;
    }

    // 网络连接管理 --------------------------------------------------
    private connectToSocket() {
        this.updateProgressText('正在连接服务器...');
        this.socket = new WebSocket(this.currentEnvironment == Environment.DEVELOPMENT ? this.dev_api_url.valueOf() : this.pro_api_url.valueOf());

        // 连接成功回调
        this.socket.onopen = () => {
            this.updateProgressText('连接成功\n开始下载版本配置...');
            this.state = StartStatus.DOWNLOADING_VERSION;
            this.onNextStep(); // 进入版本下载阶段
        };

        // 错误处理
        this.socket.onerror = (error) => {
            this.updateProgressText('连接服务器失败\n正在重试...');
            console.error('网络连接异常:', error);
        };
    }

    // 状态机推进器 -------------------------------------------------
    private onNextStep() {
        switch (this.state) {
            case StartStatus.DOWNLOADING_VERSION:
                let remoteurl = this.currentEnvironment == Environment.DEVELOPMENT ? this.dev_remote_url.valueOf() : this.pro_remote_url.valueOf();
                this.loadBundleVersionsConfig(remoteurl + 'bundle_versions.json');
                break;
            case StartStatus.DOWNLOADING_RESOURCES:
                // 直接下载指定资源包
                const targetBundle = 'resources'; // 固定下载resources包
                if (!this.bundleVersions?.bundles[targetBundle]) {
                    console.error('配置中缺少resources资源包');
                    return;
                }

                this.downloadBundle(targetBundle, this.bundleVersions.bundles[targetBundle])
                    .then(() => {
                        this.state = StartStatus.COMPLETE;
                        this.onNextStep();
                    })
                    .catch(error => {
                        this.reportBundleLoad({
                            bundle: targetBundle,
                            result: 0,
                            error: 1,
                            message: `resources资源包下载失败: ${error}`
                        });
                        console.error('resources资源包下载失败:', error);
                    });

                break;
            case StartStatus.COMPLETE:
                console.log('所有资源下载完成');
                this.updateProgressText('资源加载完成，进入游戏...');

                this.reportBundleLoad({
                    bundle: 'resources',
                    result: 1
                });

                director.loadScene('start', (err) => {
                    if (err) console.error('场景跳转失败:', err);
                });

                break;
        }
    }

    // 版本配置加载器 ------------------------------------------------
    // 在loadRemoteConfig调用处添加异常上报
    public async loadBundleVersionsConfig(remoteUrl: string) {
        try {
            this.updateProgressText('正在下载版本配置...');
            try {
                if (sys.isNative) {
                    // 清除旧缓存保证获取最新配置
                    assetManager.cacheManager.removeCache(remoteUrl);
                }

                // 异步加载远程配置
                const response = await this.loadRemoteConfig(remoteUrl);
                this.bundleVersions = response;

                // 新增缓存逻辑
                let remoteBaseUrl = this.currentEnvironment == Environment.DEVELOPMENT ? this.dev_remote_url.valueOf() : this.pro_remote_url.valueOf();
                BundleManager.getInstance().cacheBundleConfig(response, remoteBaseUrl);
                this.updateVersionLabel();

                // 状态推进到资源下载
                this.state = StartStatus.DOWNLOADING_RESOURCES;

                //this.createDebugButton(); // 创建调试按钮
                this.onNextStep();
            } catch (error) {
                this.reportBundleLoad({
                    bundle: 'config',
                    result: 0,
                    error: 1,
                    message: `版本配置加载失败: ${error}`
                });
                console.error('启动流程中断:', error);
            }
        } catch (error) {
            console.error('启动流程中断:', error);
        }
    }
    // 远程配置加载核心逻辑
    private async loadRemoteConfig(url: string): Promise<BundleVersionsConfig> {
        return new Promise((resolve, reject) => {
            assetManager.loadRemote(url, (err, data: JsonAsset) => {
                // 错误处理
                if (err || !data?.json) return reject(err || '无效JSON数据');

                // 结构校验与转换
                const raw = data.json as BundleVersionsConfig;
                if (!raw.version || !raw.bundles) {
                    return reject('配置文件格式错误');
                }

                // 返回强类型配置
                resolve({
                    version: raw.version,
                    bundles: raw.bundles,
                    timestamp: raw.timestamp
                });
            });
        });
    }
    private async downloadBundle(bundleName: string, info: {
        md5: string,
        md5backup: string,
        version: string,
        versionbackup: string
    }) {
        return new Promise<void>((resolve, reject) => {
            let remoteurl = this.currentEnvironment == Environment.DEVELOPMENT ? this.dev_remote_url.valueOf() : this.pro_remote_url.valueOf();
            // 修改路径格式为：远程URL/资源包_版本/资源包
            const primaryBundleUrl = BundleManager.getInstance().getBundleRemoteUrl(bundleName);
            const fallbackBundleUrl = BundleManager.getInstance().getBundleRemoteUrl(bundleName, true);
            const needRetry = info.md5backup != null && info.md5backup != '';

            const progressHandler = (loaded: number, total: number) => {
                const percent = Math.round(loaded / total * 100);
                this.updateProgressText(`正在下载资源包... ${percent}%\n${loaded.toLocaleString()}/${total.toLocaleString()}字节`);
            };

            const loadWithRetry = (url: string, md5: string, isRetry = false) => {
                console.log(`下载资源包: ${url}, MD5: ${md5}`);
                assetManager.loadBundle(url, {
                    version: md5,
                    onFileProgress: progressHandler
                }, (err, bundle) => {
                    if (!err && bundle) {
                        console.log('资源包下载成功:', bundleName);
                        this.updateProgressText('资源包验证通过');
                        resolve();
                    } else if (!isRetry && needRetry) {
                        this.updateProgressText('主资源下载失败\n尝试备用资源...');
                        console.error('资源包下载失败:', err);
                        loadWithRetry(fallbackBundleUrl, info.md5backup, true);
                    } else {
                        this.updateProgressText('资源下载失败，请检查网络');
                        console.error('资源包下载失败:', err);
                        reject(err || '资源加载失败');
                    }
                });
            };

            loadWithRetry(primaryBundleUrl, info.md5);
        }).then(() => {
            this.updateProgressText('资源包加载完成');
            this.updateVersionLabel(); // 资源加载完成后再次更新
        });
    }

    private reportBundleLoad(params: {
        bundle: string;
        result: number;
        error?: number;
        message?: string;
    }) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

        const reportData = {
            action: 'bundle.report_bundle_load',
            data: {
                device_id: "EMPTY",//this.getDeviceId(), // 需要实现设备ID获取
                app_version: this.version,
                bundle: params.bundle,
                old_ver: '',    // 需要从本地存储获取旧版本
                new_ver: this.bundleVersions?.bundles[params.bundle]?.version || '',
                start_times: new Date().toISOString().replace('T', ' ').slice(0, 19),
                duration: 0,    // 需要实际计算持续时间
                result: params.result,
                error: params.error,
                message: params.message
            }
        };

        this.socket.send(JSON.stringify(reportData));
    }

    private createDebugButton() {
        if (!this.buttonListContainer || !this.bundleVersions?.bundles) return;
        // 清空现有按钮
        this.buttonListContainer.removeAllChildren();
        // 为每个bundle创建按钮
        Object.keys(this.bundleVersions.bundles).forEach(bundleName => {
            const buttonNode = new Node();
            // 设置节点尺寸
            buttonNode.addComponent(UITransform);
            buttonNode.getComponent(UITransform).setContentSize(150, 75);
            
            const label = buttonNode.addComponent(Label);
            label.string = bundleName;
            label.fontSize = 24;
            // 设置文本居中
            label.horizontalAlign = Label.HorizontalAlign.CENTER;
            label.verticalAlign = Label.VerticalAlign.CENTER;

            // 添加按钮点击事件
            buttonNode.on(Node.EventType.TOUCH_END, async () => {
                try {
                    this.updateProgressText(`开始下载 ${bundleName}...`);
                    await this.downloadBundle(bundleName, this.bundleVersions.bundles[bundleName]);
                    this.updateProgressText(`${bundleName} 下载成功`);
                } catch (error) {
                    console.error(`${bundleName} 下载失败:`, error);
                    this.updateProgressText(`${bundleName} 下载失败: ${error.message}`);
                }
            });
            // 添加到容器
            this.buttonListContainer.addChild(buttonNode);
        });
    }
}
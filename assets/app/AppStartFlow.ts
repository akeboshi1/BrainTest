import { _decorator, assetManager, Component, JsonAsset, Enum, Label } from 'cc';
const { ccclass, property } = _decorator;

// 应用启动状态机
enum StartStatus {
    CONNECTING_SOCKET,    // 正在连接服务器
    DOWNLOADING_VERSION,  // 下载版本配置
    DOWNLOADING_RESOURCES,// 下载资源包
    COMPLETE              // 启动完成
}

// 版本配置数据结构（与JSON文件严格对应）
export class BundleVersionsConfig {
    version!: string;     // 全局版本号（注意JSON字段拼写）
    bundles!: Record<string, { // 资源包配置
        version: string;  // 资源包独立版本
        md5: string;      // 主校验码
        md5backup: string;// 备用校验码
        versionbackup: string; // 备用版本备份
    }>;
    timestamp!: number;   // 配置发布时间戳
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
            
            // 添加resource包版本
            const resourceBundle = this.bundleVersions.bundles['resource'];
            if (resourceBundle) {
                versionInfo += `\n资源版本: ${resourceBundle.version}`;
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
                const targetBundle = 'resource'; // 固定下载resource包
                if (!this.bundleVersions?.bundles[targetBundle]) {
                    console.error('配置中缺少resource资源包');
                    return;
                }

                this.downloadBundle(targetBundle, this.bundleVersions.bundles[targetBundle])
                    .then(() => {
                        this.state = StartStatus.COMPLETE;
                        this.onNextStep();
                    })
                    .catch(error => console.error('resource包下载失败:', error));
                break;
            case StartStatus.COMPLETE:
                console.log('所有资源下载完成');
                this.updateProgressText('资源加载完成，进入游戏...');
                break;
        }
    }

    // 版本配置加载器 ------------------------------------------------
    public async loadBundleVersionsConfig(remoteUrl: string) {
        this.updateProgressText('正在下载版本配置...');
        try {
            // 清除旧缓存保证获取最新配置
            assetManager.cacheManager.removeCache(remoteUrl);

            // 异步加载远程配置
            const response = await this.loadRemoteConfig(remoteUrl);
            this.bundleVersions = response;
            this.updateVersionLabel(); // 配置加载完成后更新版本信息

            // 状态推进到资源下载
            this.state = StartStatus.DOWNLOADING_RESOURCES;
            this.onNextStep();
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

    private async downloadBundle(bundleName: string, info: { md5: string, md5backup: string }) {
        return new Promise<void>((resolve, reject) => {
            let remoteurl = this.currentEnvironment == Environment.DEVELOPMENT ? this.dev_remote_url.valueOf() : this.pro_remote_url.valueOf();
            const primaryBundleUrl = `${remoteurl}${bundleName}/${info.md5}`;
            const fallbackBundleUrl = `${remoteurl}${bundleName}/${info.md5backup}`;

            const progressHandler = (loaded: number, total: number) => {
                const percent = Math.round(loaded / total * 100);
                this.updateProgressText(`正在下载资源包... ${percent}%\n${loaded.toLocaleString()}/${total.toLocaleString()}字节`);
            };

            const loadWithRetry = (url: string, md5: string, isRetry = false) => {
                assetManager.loadBundle(url, {
                    version: md5,
                    onFileProgress: progressHandler
                }, (err, bundle) => {
                    if (!err && bundle) {
                        this.updateProgressText('资源包验证通过');
                        resolve();
                    } else if (!isRetry) {
                        this.updateProgressText('主资源下载失败\n尝试备用资源...');
                        loadWithRetry(fallbackBundleUrl, info.md5backup, true);
                    } else {
                        this.updateProgressText('资源下载失败，请检查网络');
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
}
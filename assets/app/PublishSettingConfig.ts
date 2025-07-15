import { assetManager, JsonAsset } from 'cc';

// 环境枚举
export enum Environment {
    DEVELOPMENT,
    PRODUCTION
}

// 定义配置接口
interface IPublishSetting {
    app_version: string;
    dev_remote_url: string;
    pro_remote_url: string;
    dev_api_url: string;
    pro_api_url: string;
    environment: string;  // JSON中是字符串
    isMCI: boolean;
    isRemoteBundle: boolean;
    [key: string]: any;   // 允许其他可能的字段
}

/**
 * 发布设置配置管理类 - 单例
 */
export class PublishSettingConfig {
    private static instance: PublishSettingConfig | null = null;
    private initialized: boolean = false;
    private configData: IPublishSetting | null = null;

    /**
     * 私有构造函数防止外部实例化
     */
    private constructor() { }

    /**
     * 获取单例实例
     */
    public static getInstance(): PublishSettingConfig {
        if (!this.instance) {
            this.instance = new PublishSettingConfig();
        }
        return this.instance;
    }

    /**
     * 初始化配置
     * @param jsonPath 配置文件路径，可选（默认为 'app/publishSetting'）
     * @returns Promise 初始化的Promise
     */
    public async init(data: JsonAsset): Promise<boolean> {
        // 防止重复初始化
        if (this.initialized) {
            console.log('PublishSettingConfig 已经初始化过，跳过重复初始化');
            return true;
        }

        // 从JsonAsset中获取数据
        this.configData = data.json as IPublishSetting;
        this.initialized = true;
        console.log('PublishSettingConfig 初始化成功');
    }

    /**
     * 获取当前环境
     * @returns Environment 枚举值
     */
    public getEnvironment(): Environment {
        this.checkInitialized();
        const envStr = this.configData?.environment || 'DEVELOPMENT';
        return envStr === 'PRODUCTION' ? Environment.PRODUCTION : Environment.DEVELOPMENT;
    }

    /**
     * 获取当前版本号
     */
    public getAppVersion(): string {
        this.checkInitialized();
        return this.configData?.app_version || '1.0';
    }

    /**
     * 获取当前环境的远程URL
     */
    public getRemoteUrl(): string {
        this.checkInitialized();
        return this.getEnvironment() === Environment.PRODUCTION
            ? this.configData?.pro_remote_url || ''
            : this.configData?.dev_remote_url || '';
    }

    /**
     * 获取当前环境的API URL
     */
    public getApiUrl(): string {
        this.checkInitialized();
        return this.getEnvironment() === Environment.PRODUCTION
            ? this.configData?.pro_api_url || ''
            : this.configData?.dev_api_url || '';
    }

    /**
     * 是否使用MCI
     */
    public getIsMCI(): boolean {
        this.checkInitialized();
        return this.configData?.isMCI || false;
    }

    /**
     * 是否使用远程Bundle
     */
    public getIsRemoteBundle(): boolean {
        this.checkInitialized();
        return this.configData?.isRemoteBundle || false;
    }

    /**
     * 获取任意配置项
     * @param key 配置键
     * @param defaultValue 默认值
     */
    public getValue<T>(key: string, defaultValue: T): T {
        this.checkInitialized();
        return (this.configData && key in this.configData)
            ? (this.configData[key] as T)
            : defaultValue;
    }

    /**
     * 检查是否已初始化
     */
    private checkInitialized(): void {
        if (!this.initialized) {
            console.warn('PublishSettingConfig 尚未初始化，将使用默认值');
        }
    }

    /**
     * 获取完整的配置数据对象
     */
    public getAllSettings(): IPublishSetting | null {
        this.checkInitialized();
        return this.configData;
    }
}

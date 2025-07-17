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

export class BundleManager {
    private static instance: BundleManager;
    
    public bundleConfig: BundleVersionsConfig | null = null;
    public remoteUrl = ''; // 新增远程URL存储

    public cacheBundleConfig(config: BundleVersionsConfig, url: string) {
        this.bundleConfig = config;
        this.remoteUrl = url; // 存储URL
        console.log(`从[${url}]缓存配置版本:`, config.version);
    }

    public static getInstance(): BundleManager {
        if (!BundleManager.instance) {
            BundleManager.instance = new BundleManager();
        }
        return BundleManager.instance;
    }

    // 获取指定bundle的版本信息
    public getBundleVersion(bundleName: string): string {
        return this.bundleConfig?.bundles[bundleName]?.version || '';
    }
    public getBundleRemoteUrl(bundleName: string, isBackup = false): string {
        if (!this.bundleConfig || !this.bundleConfig.bundles[bundleName]) {
            return '';
        }

        const bundleInfo = this.bundleConfig.bundles[bundleName];
        const version = isBackup ? bundleInfo.versionbackup : bundleInfo.version;
        if(!version || version === ''){
            return ''; 
        }
        
        const ver = version.split(' ')[1];
        return `${this.remoteUrl}${bundleName}_${ver}/${bundleName}`;
    }
    public getBundleMD5(bundleName: string, isBackup = false): string {
        if (!this.bundleConfig?.bundles[bundleName]) {
            return '';
        }
        const bundleInfo = this.bundleConfig.bundles[bundleName];
        return isBackup ? bundleInfo.md5backup : bundleInfo.md5;
    }
}

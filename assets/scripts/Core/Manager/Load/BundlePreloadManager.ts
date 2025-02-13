import { BaseManager } from "../BaseManager";
import { DebugLog } from "../../Util/DebugLog";
import { BundlePreloadConfig } from "../../../Config/BundlePreloadConfig";
import { EventManager } from "../Event/EventManager";
import { assetManager, AssetManager, JsonAsset, sys } from "cc";
import { BundleName } from "./BundleName";
import { UIManager } from "../UI/UIManager";
import { LoadPanel } from "../../../Game/UI/Load/LoadPanel";
import { Global } from "../Config/Global";
// BundlePreloadManager类用于管理资源包的预加载和释放操作，通过配置文件获取预加载信息，并触发相应事件通知外部相关进度和状态 

export class BundlePreloadManager extends BaseManager {
    private bInit: boolean = false; // 是否加载完毕，用于标记配置文件是否已经加载完成
    private static _instance: BundlePreloadManager = null;

    // 配置对象，用于读取和解析资源包预加载相关的配置信息
    private config: BundlePreloadConfig = new BundlePreloadConfig();

    private bundleVersions: Record<string, string> = {}; // 新增版本存储

    // 单例模式获取实例的静态方法，确保整个项目中只有一个BundlePreloadManager实例在运行
    public static getInstance(): BundlePreloadManager {
        if (!this._instance) {
            this._instance = new BundlePreloadManager();
        }
        return this._instance;
    }

    private loadedBundle: BundleName[] = [];

    // 初始化方法，加载资源包预加载的配置文件，如果尚未加载则进行加载操作，并标记为已初始化
    init() {
        if (!this.bInit) {
            this.config.loadConfig();
            this.bInit = true;

            UIManager.getInstance().registerPanel(LoadPanel.NAME, BundleName.RESOURCES, 'prefab/LoadPanel', LoadPanel);
        }
    }

    // 新增初始化方法
    public async initBundleVersions(remoteUrl: string) {
        try {
            if(sys.isNative) {
                assetManager.cacheManager.removeCache(remoteUrl);
            }
            const response = await new Promise<Record<string, string>>((resolve, reject) => {
                assetManager.loadRemote(remoteUrl, (err, data: JsonAsset) => {
                    if (err) return reject(err);
                    try {
                        const versions = data.json;
                        resolve(versions);
                    } catch (parseErr) {
                        reject(parseErr);
                    }
                });
            });
            
            this.bundleVersions = response;
            DebugLog.instance.log('Bundle版本信息加载完成', this.bundleVersions);
        } catch (error) {
            DebugLog.instance.error('加载Bundle版本文件失败:', error);
            throw error; // 抛出错误供上层处理
        }
    }

    // 预加载指定资源包的方法，根据配置文件中的信息，加载对应资源包下的场景和其他资源，并触发相应的事件通知外部加载进度等情况
    async preload(bundleName: BundleName) {
        if (!this.bInit) {
            DebugLog.instance.error("BundlePreloadManager尚未初始化，请先调用init方法");
            return;
        }

        const version = this.bundleVersions[bundleName];
        if (!version) {
            DebugLog.instance.warn(`未找到${bundleName}的版本号，使用默认加载方式`);
        }

        let isBundleConfigExist: boolean = this.config.getGameModuleNames().indexOf(bundleName) >= 0;

        let preloadScene = bundleName.valueOf();
        let preloadAssets = [];

        if (isBundleConfigExist) {
            preloadScene = this.config.getPreloadScene(bundleName);
            preloadAssets = this.config.getPreloadAssets(bundleName);
        }

        // 触发预加载开始事件，通知外部预加载操作即将开始
        EventManager.getInstance().emit(BundlePreloadEvent.START, { bundleName });

        let bundle: AssetManager.Bundle = null;
        
        try {
            bundle = assetManager.getBundle(bundleName);
            if (!bundle) {
                bundle = await new Promise<AssetManager.Bundle>((resolve, reject) => {
                    const bundleUrl = Global.remote_bundle ? Global.remote_url + bundleName : bundleName;
                    assetManager.loadBundle(bundleUrl, { version }, (err, bundle) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(bundle);
                        }
                    });
                });
            }
            else {
                DebugLog.instance.log(`资源包 ${bundleName} 已加载`);
            }

        } catch (err) {
            DebugLog.instance.error(`加载资源包 ${bundleName} 出错: ${err}`);
            EventManager.getInstance().emit(BundlePreloadEvent.FAILED, { bundleName });
            return;
        }

        DebugLog.instance.log(`加载资源包 ${bundleName} 完成！`);
        EventManager.getInstance().emit(BundlePreloadEvent.START, { bundleName });
        let loadedAssets = 0;
        let totalAssets = 0;

        await UIManager.getInstance().showPanel(LoadPanel.NAME);

        // 预加载场景
        try {
            await new Promise((resolve, reject) => {

                bundle.preloadScene(preloadScene, (finished, total, item) => {
                    totalAssets = preloadAssets.length + total;
                    loadedAssets = finished;
                    const progress = Math.round(loadedAssets / totalAssets * 100);
                    // 触发预加载进度事件，通知外部当前的加载进度
                    DebugLog.instance.log(`加载场景中 ${progress}`);
                    EventManager.getInstance().emit(BundlePreloadEvent.PROGRESS, { bundleName, progress });
                }, (err: Error | null) => {
                    if (err) {
                        reject(err);
                    }
                    else {
                        resolve({});
                    }
                });
            });
        } catch (err) {
            DebugLog.instance.error(`加载场景 ${bundleName} 出错: ${err}`);
            EventManager.getInstance().emit(BundlePreloadEvent.FAILED, { bundleName });
            return;
        }

        // 预加载其他资源
        for (const assetConfig of preloadAssets) {
            const assetPath = assetConfig.path;
            const assetTypeStr = assetConfig.type;
            const type = this.config.stringToAssetType(assetTypeStr);
            if (type) {
                try {
                    await new Promise((res, rej) => {
                        bundle.preload(assetPath, type, (err, data) => {
                            if (err) {
                                rej(err);
                            } else {
                                res(data);
                            }
                        });
                    });

                    loadedAssets++;
                    const progress = Math.round(loadedAssets / totalAssets * 100);
                    // 触发预加载进度事件，通知外部当前的加载进度
                    DebugLog.instance.log(`加载资源中 ${progress}`);
                    EventManager.getInstance().emit(BundlePreloadEvent.PROGRESS, { bundleName, progress });
                } catch (err) {
                    DebugLog.instance.error(`加载资源 ${assetPath} 出错: ${err}`);
                    EventManager.getInstance().emit(BundlePreloadEvent.FAILED, { bundleName });
                    return;
                }
            }
        }

        DebugLog.instance.log(`全部加载完成！`);
        if (this.loadedBundle.indexOf(bundleName) < 0) {
            this.loadedBundle.push(bundleName);
        }
        // 触发预加载完成事件，通知外部预加载操作已成功完成
        EventManager.getInstance().emit(BundlePreloadEvent.FINISH, { bundleName });
    }

    // 释放指定资源包及其相关资源的方法，释放资源包中的所有资源，并从相关缓存等机制中移除对应的资源记录
    public release(bundleName: BundleName) {
        if (!this.bInit) {
            DebugLog.instance.error("BundlePreloadManager尚未初始化，请先调用init方法");
            return;
        }

        let bundle: AssetManager.Bundle = assetManager.getBundle(bundleName);
        if (bundle) {
            bundle.releaseAll();
            assetManager.removeBundle(bundle);

            if (this.loadedBundle.indexOf(bundleName) >= 0) {
                this.loadedBundle.splice(this.loadedBundle.indexOf(bundleName), 1);
            }
        }
    }

    public isBundleLoaded(bundleName: BundleName) {
        return assetManager.getBundle(bundleName) != null;
    }
}

// 定义预加载相关的事件枚举，方便外部统一监听和处理不同阶段的预加载事件
export enum BundlePreloadEvent {
    START = "BundlePreloadEvent.start",
    BUNDLELOADED = "BundlePreloadEvent.bundleLoaded",
    FINISH = "BundlePreloadEvent.finish",
    PROGRESS = "BundlePreloadEvent.progress",
    FAILED = "BundlePreloadEvent.failed",
}
import { BaseManager } from "../BaseManager";
import { DebugLog } from "../../Util/DebugLog";
import { BundlePreloadConfig } from "../../../Config/BundlePreloadConfig";
import { EventManager } from "../Event/EventManager";
import { assetManager, AssetManager, debug, JsonAsset, sys } from "cc";
import { BundleName } from "./BundleName";
import { UIManager } from "../UI/UIManager";
import { LoadPanel } from "../../../Game/UI/Load/LoadPanel";
import { BundleManager } from "db://assets/app/BundleManager";
import { SceneManager } from "../Scene/SceneManager";
import { PublishSettingConfig } from "db://assets/app/PublishSettingConfig";
// BundlePreloadManager类用于管理资源包的预加载和释放操作，通过配置文件获取预加载信息，并触发相应事件通知外部相关进度和状态 

export class BundlePreloadManager extends BaseManager {
    private bInit: boolean = false; // 是否加载完毕，用于标记配置文件是否已经加载完成
    private static _instance: BundlePreloadManager = null;

    // 配置对象，用于读取和解析资源包预加载相关的配置信息
    private config: BundlePreloadConfig = new BundlePreloadConfig();

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
            SceneManager.getInstance().eventTarget.on(SceneManager.SCENE_CHANGED, this.onSceneChanged, this);
        }
    }

    private onSceneChanged(sceneName: string, lastSceneName: string) {
        DebugLog.instance.log(`场景切换 ${sceneName}, ${lastSceneName}`);
        if (lastSceneName != sceneName && (lastSceneName != BundleName.RESOURCES && lastSceneName != BundleName.MAIN)) {
            this.release(lastSceneName as BundleName);
        }
    }

    // 预加载指定资源包的方法，根据配置文件中的信息，加载对应资源包下的场景和其他资源，并触发相应的事件通知外部加载进度等情况
    async preload(bundleName: BundleName) {
        if (!this.bInit) {
            DebugLog.instance.error("BundlePreloadManager尚未初始化，请先调用init方法");
            return;
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
                    const isRemoteConfigEnabled = PublishSettingConfig.getInstance().getIsRemoteBundle();
                    const bundleUrl = isRemoteConfigEnabled ?  BundleManager.getInstance().getBundleRemoteUrl(bundleName) : bundleName;
                    const options = isRemoteConfigEnabled ? { version : BundleManager.getInstance().getBundleMD5(bundleName) } : undefined;
                    DebugLog.instance.log(`开始加载资源包 ${bundleUrl}, version: ${options?.version}`);

                    assetManager.loadBundle(bundleUrl, options, (err, bundle) => {
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
        
        // 显示倒计时动画，等倒计时完成后再派发FINISH事件
        // 当切入的场景是fingerGame时，不显示倒计时，直接派发finish事件
        if (bundleName === BundleName.FINGERGAME) {
            EventManager.getInstance().emit(BundlePreloadEvent.FINISH, { bundleName });
        } else {
            const loadPanelInfo = UIManager.getInstance().getActivePanel(LoadPanel.NAME);
            if (loadPanelInfo && loadPanelInfo.comp) {
                const loadPanel = loadPanelInfo.comp as LoadPanel;
                
                // 监听倒计时完成事件
                EventManager.getInstance().on(BundlePreloadEvent.COUNTDOWN_FINISH, () => {
                    // 倒计时完成后派发FINISH事件
                    EventManager.getInstance().emit(BundlePreloadEvent.FINISH, { bundleName });
                }, this, true); // 使用once确保只监听一次
                
                // 开始倒计时动画
                loadPanel.showTimeNode();
            } else {
                // 如果没有LoadPanel，直接派发FINISH事件
                EventManager.getInstance().emit(BundlePreloadEvent.FINISH, { bundleName });
            }
        }
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
    COUNTDOWN_FINISH = "BundlePreloadEvent.countdownFinish",
}
import { BaseManager } from "../BaseManager";
import { BasePanel } from "../../UI/BasePanel";
import { DebugLog } from "../../Util/DebugLog";
import { SceneManager } from "../Scene/SceneManager";
import { Constructor, Label, Node, Prefab, assetManager, debug, instantiate, resources, UITransform } from "cc";
import { BundleName } from "../Load/BundleName";
import { BundlePreloadManager } from "../Load/BundlePreloadManager";
import { LayerUtil } from "../../Util/LayerUtil";
import { EventManager } from "../Event/EventManager";
import { ScreenAdapter } from "../../../Adapter/ScreenAdapter";
import { ScreenSizeUtil } from "../../../Adapter/ScreenSizeUtil";

export interface PanelInfo {
    bundleName: BundleName;
    prefabUrl: string;
    comp: Constructor<BasePanel>;
    compPath: string;
    exclusive: boolean; //是否排斥其他Panel，如果为true，其他panel打开时会关闭当前panel
}

export class UIManager extends BaseManager {
    private static _instance: UIManager;
    public static getInstance(): UIManager {
        if (!UIManager._instance) {
            UIManager._instance = new UIManager();
        }
        return UIManager._instance;
    }

    public static SCREEN_LOCKER_PREFAB_PATH: string = "prefab/Common/ScreenLocker";
    private panelRegisterConfig: Map<string, PanelInfo> = new Map();
    private activePanelMap: Map<string, { rootNode: Node, comp: BasePanel }> = new Map();
    private loadingPanelSet: Set<string> = new Set(); // 正在加载中的面板集合
    private panelHistory: [] = [];
    private screenLockerNode: Node = null;
    private screenLockerNum: number = 0;
    private screenLockerPrefab: Prefab = null;
    private screenLockerTimer = null;

    // 预加载相关属性
    private preloadedPanels: Map<string, Prefab> = new Map(); // 已预加载的面板预制体
    private preloadingPanels: Set<string> = new Set(); // 正在预加载中的面板集合

    async init() {
        this.maps = {};
        SceneManager.getInstance().eventTarget.on(SceneManager.SCENE_CHANGED, this.onSceneChanged, this);

        this.screenLockerPrefab = await new Promise<Prefab>((resolve, reject) => {
            resources.load(UIManager.SCREEN_LOCKER_PREFAB_PATH, Prefab, null, (err: Error, data: Prefab) => {
                if (err) {
                    DebugLog.instance.error('Prefab load error , url:' + UIManager.SCREEN_LOCKER_PREFAB_PATH);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });
    }

    /**
    * 注册面板的方法。用于将特定面板的相关信息注册到某个管理配置中。
    * @param name - 面板的名称，用于唯一标识该面板。
    * @param bundleName - 资源包的名称。
    * @param prefabUrl - 预制体的路径字符串。
    * @param comp - 面板对应的组件构造函数，必须是BasePanel的子类
    * @param exclusive - 一个布尔值，用于指示该面板是否具有排他性，默认为`true`。如果是排他性面板，在显示时会关闭其他具有排他性的面板。
    * @param compPath - 组件路径字符串，默认为空字符串，定位Comp挂载节点位置。
    */
    registerPanel(name: string, bundleName: BundleName, prefabUrl: string, comp: Constructor<BasePanel>, exclusive: boolean = true, compPath: string = "") {
        let panelInfo = { bundleName, prefabUrl, comp, compPath, exclusive };
        this.panelRegisterConfig.set(name, panelInfo);
    }

    getPanel(name: string): PanelInfo {
        return this.panelRegisterConfig.get(name);
    }

    /**
     * 预加载指定面板的预制体
     * @param name 面板名称
     * @returns Promise<boolean> 预加载是否成功
     */
    async preloadPanel(name: string): Promise<boolean> {
        const panelInfo = this.panelRegisterConfig.get(name);
        if (!panelInfo) {
            DebugLog.instance.error(`Panel did not register into UIManager === name : ${name}`);
            return false;
        }

        // 检查是否已经预加载过
        if (this.preloadedPanels.has(name)) {
            DebugLog.instance.log(`Panel already preloaded: ${name}`);
            return true;
        }

        // 检查是否正在预加载中
        if (this.preloadingPanels.has(name)) {
            DebugLog.instance.log(`Panel is already preloading: ${name}`);
            return true;
        }

        // 检查资源包是否已加载
        const isBundleLoaded = BundlePreloadManager.getInstance().isBundleLoaded(panelInfo.bundleName);
        if (!isBundleLoaded) {
            DebugLog.instance.error(`Bundle is not Loaded === bundleName : ${panelInfo.bundleName}`);
            return false;
        }

        // 标记为正在预加载
        this.preloadingPanels.add(name);

        try {
            let bundle = resources;
            if (panelInfo.bundleName != BundleName.RESOURCES) {
                bundle = assetManager.getBundle(panelInfo.bundleName);
            }

            if (!bundle) {
                DebugLog.instance.error(`Cannot get bundle: ${panelInfo.bundleName}`);
                this.preloadingPanels.delete(name);
                return false;
            }

            // 预加载预制体
            const prefab = await new Promise<Prefab>((resolve, reject) => {
                bundle.preload(panelInfo.prefabUrl, Prefab, null, (err: Error, data: any) => {
                    if (err) {
                        DebugLog.instance.error(`Prefab preload error, url: ${panelInfo.prefabUrl}`, err);
                        reject(err);
                    } else {
                        // preload返回的是RequestItem[]，我们需要重新加载获取Prefab
                        bundle.load(panelInfo.prefabUrl, Prefab, null, (loadErr: Error, prefabData: Prefab) => {
                            if (loadErr) {
                                DebugLog.instance.error(`Prefab load error after preload, url: ${panelInfo.prefabUrl}`, loadErr);
                                reject(loadErr);
                            } else {
                                resolve(prefabData);
                            }
                        });
                    }
                });
            });

            if (prefab) {
                this.preloadedPanels.set(name, prefab);
                DebugLog.instance.log(`Panel preloaded successfully: ${name}`);
                return true;
            } else {
                DebugLog.instance.error(`Prefab preload failed: ${name}`);
                return false;
            }
        } catch (error) {
            DebugLog.instance.error(`Panel preload error for ${name}:`, error);
            return false;
        } finally {
            // 清理预加载状态
            this.preloadingPanels.delete(name);
        }
    }

    /**
     * 批量预加载多个面板
     * @param panelNames 面板名称数组
     * @returns Promise<{success: string[], failed: string[]}> 预加载结果
     */
    async preloadPanels(panelNames: string[]): Promise<{success: string[], failed: string[]}> {
        const success: string[] = [];
        const failed: string[] = [];

        DebugLog.instance.log(`开始批量预加载面板: ${panelNames.join(', ')}`);

        // 并行预加载所有面板
        const preloadPromises = panelNames.map(async (name) => {
            const result = await this.preloadPanel(name);
            if (result) {
                success.push(name);
            } else {
                failed.push(name);
            }
        });

        await Promise.all(preloadPromises);

        DebugLog.instance.log(`批量预加载完成 - 成功: ${success.length}, 失败: ${failed.length}`);
        if (success.length > 0) {
            DebugLog.instance.log(`成功预加载的面板: ${success.join(', ')}`);
        }
        if (failed.length > 0) {
            DebugLog.instance.log(`预加载失败的面板: ${failed.join(', ')}`);
        }

        return { success, failed };
    }

    /**
     * 检查面板是否已预加载
     * @param name 面板名称
     * @returns boolean
     */
    isPanelPreloaded(name: string): boolean {
        return this.preloadedPanels.has(name);
    }

    /**
     * 检查面板是否正在预加载中
     * @param name 面板名称
     * @returns boolean
     */
    isPanelPreloading(name: string): boolean {
        return this.preloadingPanels.has(name);
    }

    /**
     * 获取预加载状态信息
     * @returns {preloadedCount: number, preloadingCount: number, totalRegistered: number}
     */
    getPreloadStatus(): {preloadedCount: number, preloadingCount: number, totalRegistered: number} {
        return {
            preloadedCount: this.preloadedPanels.size,
            preloadingCount: this.preloadingPanels.size,
            totalRegistered: this.panelRegisterConfig.size
        };
    }

    /**
    * 异步显示指定名称的面板。
    * @param name - 要显示的面板的名称，此名称需与之前通过`registerPanel`方法注册的面板名称一致，用于从已注册的面板配置中查找对应的面板信息。
    * @param rdata - 传递给面板组件的恢复数据，类型为`any`，默认值是`null`。该数据可用于在显示面板时恢复面板的某些状态或填充初始内容。
    * @param needPreload - 一个布尔值，指示是否需要预加载面板预制体，默认值为`false`。如果设置为`true`，会在正式加载预制体之前先进行预加载操作，常用于优化加载性能。
    * @param parentNode - 面板要挂载的父节点，类型为`Node | null`，默认值是`null`。如果传入`null`，会使用`LayerUtil.getPanelLayer()`获取默认的面板挂载层作为父节点。指定父节点可以灵活控制面板在场景中的层级关系。
    * @param showTouchMask - 是否显示触摸遮罩，默认值为`true`。
    * @param skipTween - 是否跳过tween动画直接显示，默认值为`false`。如果设置为`true`，面板将直接显示而不播放进入动画。
    * @returns - 返回一个`Promise<boolean>`，`true`表示面板成功显示，`false`表示在显示过程中出现错误，例如面板未注册、资源包未加载、预制体加载失败等情况。
    */
    async showPanel(name: string, rdata: any = null, needPreload: boolean = false, parentNode: Node | null = null, showTouchMask: boolean = true, skipTween: boolean = false): Promise<boolean> {
        let panelInfo = this.panelRegisterConfig.get(name);
        if (!panelInfo) {
            DebugLog.instance.error('Panel did not register into UIManager === name : ' + name);
            return false;
        }

        let isBundleLoaded = BundlePreloadManager.getInstance().isBundleLoaded(panelInfo.bundleName);
        if (!isBundleLoaded) {
            DebugLog.instance.error('Bundle is not Loaded === bundleName : ' + panelInfo.bundleName);
            return false;
        }

        // 检查面板是否已经激活
        if (this.activePanelMap.has(name)) {
            DebugLog.instance.warn('Panel is already actived : ' + name);
            return false;
        }

        // 检查面板是否正在加载中
        if (this.loadingPanelSet.has(name)) {
            DebugLog.instance.warn('Panel is already loading : ' + name);
            return false;
        }

                // 标记面板正在加载中
        this.loadingPanelSet.add(name);
        this.activePanelMap.set(name, null);

        try {
            let bundle = resources;
            if (panelInfo.bundleName != BundleName.RESOURCES) {
                bundle = assetManager.getBundle(panelInfo.bundleName);
            }

            if (showTouchMask) {
                this.openScreenLocker();
            }

            let prefab: Prefab = null;

            // 优先使用预加载的预制体
            if (this.preloadedPanels.has(name)) {
                prefab = this.preloadedPanels.get(name);
                DebugLog.instance.log(`Using preloaded prefab for panel: ${name}`);
            } else {
                // 如果没有预加载，则正常加载
                if (needPreload) {
                    await new Promise((resolve, reject) => {
                        bundle.preload(panelInfo.prefabUrl, Prefab, null, (err: Error, data) => {
                            if (err) {
                                DebugLog.instance.error('Prefab preload error , url:' + panelInfo.prefabUrl);
                                reject(err);
                            } else {
                                resolve(data);
                            }
                        });
                    });
                }

                prefab = await new Promise<Prefab>((resolve, reject) => {
                    bundle.load(panelInfo.prefabUrl, Prefab, null, (err: Error, data: Prefab) => {
                        if (err) {
                            DebugLog.instance.error('Prefab load error , url:' + panelInfo.prefabUrl);
                            reject(err);
                        } else {
                            resolve(data);
                        }
                    });
                });
            }

            if (!prefab) {
                this.closeSceenLocker();
                this.activePanelMap.delete(name);
                this.loadingPanelSet.delete(name);
                return false;
            }
            let panel = instantiate(prefab);

            let parent = parentNode ? parentNode : LayerUtil.getPanelLayer();
            if (!parent) {
                DebugLog.instance.warn('Panel Parent node empty :' + panelInfo.prefabUrl);
                this.closeSceenLocker();
                this.activePanelMap.delete(name);
                this.loadingPanelSet.delete(name);
                return false;
            }

            // 执行UI适配
            this.adaptPanelUI(panel);

            parent.addChild(panel);

            let compNode = panel;
            let compPathArr = panelInfo.compPath.split('/');

            for (let i = 0; i < compPathArr.length; i++) {
                const nodeName = compPathArr[i];
                if (nodeName == "") {
                    continue;
                }
                compNode = compNode.getChildByName(nodeName);
                if (!compNode) {
                    DebugLog.instance.error('Can not find children : compPath ' + panelInfo.compPath);
                    this.closeSceenLocker();
                    this.activePanelMap.delete(name);
                    this.loadingPanelSet.delete(name);
                    return false;
                }
            }

            let comp = compNode.getComponent(panelInfo.comp);
            comp.restore(rdata);
            await comp.showPanel(skipTween);

            this.closeSceenLocker();

            this.activePanelMap.set(name, { rootNode: panel, comp: comp });
            this.loadingPanelSet.delete(name); // 清理加载状态

            return true;
        } catch (error) {
            // 发生异常时清理状态
            DebugLog.instance.error(`ShowPanel error for ${name}:`, error);
            this.closeSceenLocker();
            this.activePanelMap.delete(name);
            this.loadingPanelSet.delete(name);
            return false;
        }
    }

    async hidePanel(name: string) {
        let panelCache = this.activePanelMap.get(name);
        if (panelCache) {
            this.activePanelMap.delete(name);
            await panelCache.comp.hidePanel();
            panelCache.rootNode.removeFromParent();
        }
    }

    getActivePanel(name: string) {
        return this.activePanelMap.get(name);
    }

    openScreenLocker() {
        this.screenLockerNum++;
        if (this.screenLockerNode != null) {
            this.setScreenLockerNum(this.screenLockerNum);
            return;
        }

        if (!this.screenLockerPrefab) {
            DebugLog.instance.warn("screenLocker.prefab 没有正确加载");
            return;
        }

        let sl = instantiate(this.screenLockerPrefab);

        // 设置屏幕适配尺寸
        const screenSize = ScreenSizeUtil.getUISize();
        const slTransform = sl.getComponent(UITransform);
        if (slTransform && screenSize) {
            slTransform.setContentSize(screenSize.width, screenSize.height);
        }

        let parent = LayerUtil.getLoaderLayer();
        if (!parent) {
            DebugLog.instance.error('get LoaderLayer failed');
            return;
        } else {
            parent.addChild(sl);
        }

        this.screenLockerNode = sl;

        this.screenLockerTimer = setTimeout(() => {
            this.screenLockerNum = 0;
            if (this.screenLockerNode) {
                this.screenLockerNode.removeFromParent();
                this.screenLockerNode = null;
            }
        }, 60 * 1000);

        this.setScreenLockerNum(this.screenLockerNum);
    }

    private setScreenLockerNum(num: number) {
        if (this.screenLockerNode != null) {
            let str = "";
            for (let i = 0; i < num; i++) {
                str += ".";
            }
            this.screenLockerNode.getChildByName("Label").getComponent(Label).string = str;
        }
    }

    closeSceenLocker() {
        this.screenLockerNum--;

        //防止场景切换后调用导致计数器异常
        if (this.screenLockerNum < 0) {
            this.screenLockerNum = 0;
        }

        if (this.screenLockerNode && this.screenLockerNum <= 0) {
            this.screenLockerNode.removeFromParent();
            this.screenLockerNode = null;

            if (this.screenLockerTimer != null) {
                clearTimeout(this.screenLockerTimer);
                this.screenLockerTimer = null;
            }
        }
    }

    private onSceneChanged(sceneName: string, lastSceneName: string) {
        this.screenLockerNum = 0;

        if (this.screenLockerNode) {
            this.screenLockerNode.removeFromParent();
            this.screenLockerNode = null;
        }

        if (this.screenLockerTimer != null) {
            clearTimeout(this.screenLockerTimer);
            this.screenLockerTimer = null;
        }

        this.activePanelMap.clear();
        this.loadingPanelSet.clear(); // 清理所有正在加载的面板状态
        
        // 清理预加载状态
        this.preloadedPanels.clear();
        this.preloadingPanels.clear();
    }

    isPanelActive(name: string): boolean {
        return this.activePanelMap.has(name);
    }

    isPanelLoading(name: string): boolean {
        return this.loadingPanelSet.has(name);
    }

    /**
     * 强制清理面板的加载状态（用于调试或异常情况）
     * @param name 面板名称
     */
    forceClearPanelLoading(name: string): void {
        this.loadingPanelSet.delete(name);
        DebugLog.instance.warn(`Force cleared loading state for panel: ${name}`);
    }

    /**
     * 对面板进行UI适配
     * @param panel 面板根节点
     */
    private adaptPanelUI(panel: Node) {
        try {
            // 调用ScreenAdapter进行UI适配
            ScreenAdapter.getInstance().adaptPanelUI(panel);
        } catch (error) {
            DebugLog.instance.error(`[UIManager] Panel UI adaptation failed: ${error}`);
        }
    }

    destroy() {
        this.maps = {};
    }
}
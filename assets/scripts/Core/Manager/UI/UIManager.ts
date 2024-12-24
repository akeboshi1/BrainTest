import { BaseManager } from "../BaseManager";
import { BasePanel } from "../../UI/BasePanel";
import { DebugLog } from "../../Util/DebugLog";
import { SceneManager } from "../Scene/SceneManager";
import { Constructor, Node, Prefab, assetManager, instantiate, resources } from "cc";
import { BundleName } from "../Load/BundleName";
import { BundlePreloadManager } from "../Load/BundlePreloadManager";
import { LayerUtil } from "../../Util/LayerUtil";
import { EventManager } from "../Event/EventManager";

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

    public static LOAD_PANEL = "LoadPanel";
    public static BACK_TO_PARENT: string = "BACK_TO_PARENT";

    public static SCREEN_LOCKER_PREFAB_PATH: string = "prefab/Common/ScreenLocker";
    private panelRegisterConfig: Map<string, PanelInfo> = new Map();
    private activePanelMap: Map<string, { rootNode: Node, comp: BasePanel }> = new Map();
    private panelHistory: [] = [];
    private screenLockerNode: Node = null;

    init() {
        this.maps = {};
        EventManager.getInstance().on(SceneManager.SCENE_CHANGED, this.onSceneChanged, this);
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

    /**
    * 异步显示指定名称的面板。
    * @param name - 要显示的面板的名称，此名称需与之前通过`registerPanel`方法注册的面板名称一致，用于从已注册的面板配置中查找对应的面板信息。
    * @param rdata - 传递给面板组件的恢复数据，类型为`any`，默认值是`null`。该数据可用于在显示面板时恢复面板的某些状态或填充初始内容。
    * @param needPreload - 一个布尔值，指示是否需要预加载面板预制体，默认值为`false`。如果设置为`true`，会在正式加载预制体之前先进行预加载操作，常用于优化加载性能。
    * @param parentNode - 面板要挂载的父节点，类型为`Node | null`，默认值是`null`。如果传入`null`，会使用`LayerUtil.getPanelLayer()`获取默认的面板挂载层作为父节点。指定父节点可以灵活控制面板在场景中的层级关系。
    * @returns - 返回一个`Promise<boolean>`，`true`表示面板成功显示，`false`表示在显示过程中出现错误，例如面板未注册、资源包未加载、预制体加载失败等情况。
    */
    async showPanel(name: string, rdata: any = null, needPreload: boolean = false, parentNode: Node | null = null): Promise<boolean> {
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

        let bundle = resources;
        if (panelInfo.bundleName != BundleName.RESOURCES) {
            bundle = assetManager.getBundle(panelInfo.bundleName);
        }

        await this.openScreenLocker();

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

        let prefab = await new Promise<Prefab>((resolve, reject) => {
            bundle.load(panelInfo.prefabUrl, Prefab, null, (err: Error, data: Prefab) => {
                if (err) {
                    DebugLog.instance.error('Prefab load error , url:' + panelInfo.prefabUrl);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

        if (!prefab) {
            this.closeSceenLocker();
            return false;
        }
        let panel = instantiate(prefab);

        let parent = parentNode ? parentNode : LayerUtil.getPanelLayer();
        if (!parent) {
            DebugLog.instance.error('Panel Parent node empty :' + panelInfo.prefabUrl);
            this.closeSceenLocker();
            return false;
        }

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
                return false;
            }
        }

        let comp = compNode.getComponent(panelInfo.comp);
        comp.restore(rdata);
        await comp.showPanel();

        this.closeSceenLocker();

        this.activePanelMap.set(name, { rootNode: panel, comp: comp });

        return true;
    }

    async hidePanel(name: string) {
        let panelCache = this.activePanelMap.get(name);
        if (panelCache) {
            await panelCache.comp.hidePanel();
            panelCache.rootNode.removeFromParent();
            this.activePanelMap.delete(name);
        }
    }

    async openScreenLocker() {
        let prefab = await new Promise<Prefab>((resolve, reject) => {
            resources.load(UIManager.SCREEN_LOCKER_PREFAB_PATH, Prefab, null, (err: Error, data: Prefab) => {
                if (err) {
                    DebugLog.instance.error('Prefab load error , url:' + UIManager.SCREEN_LOCKER_PREFAB_PATH);
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        });

        if (!prefab) {
            return;
        }

        let sl = instantiate(prefab);

        let parent = LayerUtil.getLoaderLayer();
        if (!parent) {
            DebugLog.instance.error('get LoaderLayer failed');
            return;
        } else {
            parent.addChild(sl);
        }

        this.screenLockerNode = sl;
    }

    closeSceenLocker() {
        if (this.screenLockerNode) {
            this.screenLockerNode.removeFromParent();
            this.screenLockerNode = null;
        }
    }

    private onSceneChanged() {
        this.closeSceenLocker();
        this.activePanelMap.clear();
    }

    destroy() {
        this.maps = {};
    }
}
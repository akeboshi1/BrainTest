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
    private screenLockerNode:Node = null;

    init() {
        this.maps = {};
        EventManager.getInstance().on(SceneManager.SCENE_CHANGED,this.onSceneChanged,this);
    }

    registerPanel(name: string, bundleName: BundleName, prefabUrl: string, comp: Constructor<BasePanel>, exclusive: boolean = true, compPath: string = "") {
        let panelInfo = { bundleName, prefabUrl, comp, compPath, exclusive };
        this.panelRegisterConfig.set(name, panelInfo);
    }

    async showPanel(name: string, rdata:any = null, needPreload: boolean = false, parentNode: Node | null = null): Promise<boolean> {
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
        await comp.showPanel();
        comp.restore(rdata);

        this.closeSceenLocker();

        this.activePanelMap.set(name, { rootNode: panel, comp: comp });

        return true;
    }

    async hidePanel(name: string) {
        let panelCache = this.activePanelMap.get(name);
        if(panelCache){
            await panelCache.comp.hidePanel();
            panelCache.rootNode.removeFromParent();
            this.activePanelMap.delete(name);
        }
    }

    async openScreenLocker(){
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
        }else{
            parent.addChild(sl);
        }

        this.screenLockerNode = sl;
    }

    closeSceenLocker(){
        if(this.screenLockerNode){
            this.screenLockerNode.removeFromParent();
            this.screenLockerNode = null;
        }
    }

    private onSceneChanged(){
        this.closeSceenLocker();
        this.activePanelMap.clear();
    }

    destroy() {
        this.maps = {};
    }
}
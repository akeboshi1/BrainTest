import {BaseManager} from "../BaseManager";
import {BasePanel, PanelState} from "../../UI/BasePanel";
import {EventManager} from "../Event/EventManager";
import { DebugLog } from "../../Util/DebugLog";
import {LoaderManager} from "../Load/LoaderManager";
import {PoolManager} from "../Pool/PoolManager";
import {SceneManager} from "../Scene/SceneManager";
import {Node,instantiate} from "cc";


export class UIManager extends BaseManager {
    private static _instance: UIManager;
    public static getInstance(): UIManager {
        if(!UIManager._instance){
            UIManager._instance = new UIManager();
        }
        return UIManager._instance;
    }

    public static LOAD_PANEL= "LoadPanel";


    public static BACK_TO_PARENT:string = "BACK_TO_PARENT";

    private preActionMaps:{[key:string]:[BasePanel,PanelState]};

    init(){
        this.maps= {};
        this.preActionMaps = {};
    }

    async perloadRes():Promise<void>{
        return new Promise((resolve, reject)=>{
            this.addLoadRes().then(()=>{
                resolve();
                DebugLog.instance.log("preloadRes");
            }).catch((error)=>{
                    reject(error);
                });
        });

    }



    registerView(name:string,view:Node){
        if(this.has(name)){
            DebugLog.instance.error(`${name}已经存在`);
            return;
        }
        this.set(name, view);
    }

    showView(name:string,parentNode?:any){
        if(!this.checkPanel(name)){
            return;
        }
        if(name != UIManager.LOAD_PANEL){
            UIManager.getInstance().hideView(UIManager.LOAD_PANEL);
        }
        const view:Node = this.get(name)as Node;
        if(!view){
            DebugLog.instance.error(`${name} not exists`);
            return;
        }
        if(parentNode){
            parentNode.addChild(view);
        }else{
            const canvas = SceneManager.getInstance().getCurrentScene().getChildByName("Canvas");
            canvas.addChild(view);
        }

        // if(view.state == PanelState.INIT){
        //     EventManager.getInstance().on(name,this.loadPanelComplete,this);
        //     this.preActionMaps[name]=[view,PanelState.SHOW];
        //     return;
        // }
        // if(view.state == PanelState.LOADED || view.state == PanelState.HIDE){
        //     view.showPanel();
        // }
    }



    hideView(name:string){
        if(!this.checkPanel(name)){
            return;
        }
        const view:any = this.get(name);
        if(!view){
           DebugLog.instance.error(`${name} not exists`);
           return;
        }
        view.removeFromParent(false);
    }

    getView(name:string):BasePanel{
        if(!this.checkPanel(name)){
            return null;
        }
        const view:any = this.get(name);
        if(!view){
            DebugLog.instance.error(`${name} not exists`);
            return null;
        }

        return view.getComponent(name);
    }

    public async addLoadRes():Promise<void>{
        const url = 'prefab/LoadPanel';
        return new Promise((resolve,reject)=>{
            LoaderManager.getInstance().resourcesLoadPrefab(url).then((prefab)=>{
                const node = instantiate(prefab)
                UIManager.getInstance().registerView(UIManager.LOAD_PANEL,node);
                resolve();
                // UIManager.getInstance().showLoadingPanel(parentNode);
            }).catch((error) => {
                // 处理失败的错误
                reject(error);
            });
        });
    }

    public showLoadingPanel(parentNode = null){


        UIManager.getInstance().showView(UIManager.LOAD_PANEL,parentNode);
    }

    update(){

    }

    destroy(){
        this.maps = {};
    }

    private checkPanel(name:string):boolean {
        if(!this.has(name)){
            DebugLog.instance.error(`${name}不存在`);
            return false;
        }
        const view = this.get(name) as BasePanel;
        if(view.state == PanelState.NONE){
            DebugLog.instance.error(`${name}没有被初始化`)
            return false;
        }
        return true;
    }

    // private loadPanelComplete(name:string){
    //    if(!(name in this.preActionMaps)){
    //        DebugLog.instance.error(`不存在${name}界面`);
    //        return;
    //    }
    //    const dataArr = this.preActionMaps[name];
    //    const panel = dataArr[0];
    //    const state = dataArr[1];
    //    if(state == PanelState.SHOW){
    //        this.showView(name);
    //    }else{
    //        this.hideView(name);
    //    }
    //    delete this.preActionMaps[name];
    // }
}
import {BaseManager} from "../BaseManager";
import {BasePanel, PanelState} from "../../UI/BasePanel";
import {EventManager} from "../Event/EventManager";
import { DebugLog } from "../../Util/DebugLog";


export class UIManager extends BaseManager {
    private static _instance: UIManager;
    public static getInstance(): UIManager {
        if(!UIManager._instance){
            UIManager._instance = new UIManager();
        }
        return UIManager._instance;
    }

    private preActionMaps:{[key:string]:[BasePanel,PanelState]};

    init(){
        this.maps= {};
        this.preActionMaps = {};

    }

    setView(name:string,view:Node){
        if(this.has(name)){
            DebugLog.instance.error(`${name}已经存在`);
            return;
        }
        this.set(name, view);
    }

    showView(name:string,parentNode:any){
        if(!this.checkPanel(name)){
            return;
        }
        const view = this.get(name);
        if(!view){
            this.setView(name, parentNode);
        }
        parentNode.addChild(view);

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
        // if(view.state == PanelState.INIT){
        //     EventManager.getInstance().on(name,this.loadPanelComplete,this);
        //     this.preActionMaps[name]=[view,PanelState.HIDE];
        //     return;
        // }
        // if(view.state == PanelState.SHOW){
        view.removeFromParent(false);
        // }
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
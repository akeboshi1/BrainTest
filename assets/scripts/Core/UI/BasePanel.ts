import { _decorator, Component, Node,tween,Vec3 } from 'cc';
import {BaseObejct} from "../../../scripts/Core/Object/BaseObject";
import {UIManager} from "../../../scripts/Core/Manager/UI/UIManager";
import {DebugLog} from "db://assets/scripts/Core/Util/DebugLog";
const { ccclass, property } = _decorator;

export enum PanelState {
    NONE,
    INIT,
    LOADED,
    SHOW,
    HIDE,
    ENABLE,
    ONDISABLE,
    DESTROY,
}

export class BasePanel extends BaseObejct{
    @property(Node)
    node: Node = null;

    public state:PanelState = PanelState.NONE;

    public static NAME = '';

    constructor() {
        super();
        this.state = PanelState.INIT;
    }


    onLoad(){
        this.state = PanelState.LOADED;
    }

    start() {
        // 隐藏面板
        // this.node.active = false;
    }

    onEnable(){
        this.state = PanelState.ENABLE;
    }

    onDisable(){
        this.state = PanelState.ONDISABLE;
    }

    onDestroy(){
        this.state = PanelState.DESTROY;
        DebugLog.instance.log(`${this.name} onDestroy`);
    }


    // 显示面板
    async showPanel() {
        await new Promise<null>((resolve,reject)=>{
            setTimeout(() => {
                resolve(null);
            }, 500);
        });
    }

    restore(data:any){
        
    }

    // 隐藏面板
    async hidePanel() {
        await new Promise<null>((resolve,reject)=>{
            setTimeout(() => {
                resolve(null);
            }, 1);
        });
    }

}
import { _decorator, Component, Node,tween,Vec3 } from 'cc';
import {BaseObejct} from "db://assets/scripts/Core/Object/BaseObject";
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

    state:PanelState = PanelState.NONE;
    constructor() {
        super();
        this.state = PanelState.INIT;
    }
    get name():string{
        return "";
    }


    onLoad(){
        this.state = PanelState.LOADED;
    }

    start() {
        // 隐藏面板
        this.node.active = false;
    }

    onEnable(){
        this.state = PanelState.ENABLE;
    }

    onDisable(){
        this.state = PanelState.ONDISABLE;
    }

    onDestroy(){
        this.onDisable();
        this.state = PanelState.DESTROY;
    }


    // 显示面板
    showPanel() {
        this.node.active = true;
        this.state = PanelState.SHOW;
    }

    // 隐藏面板
    hidePanel() {
        this.node.active = false;
        this.state = PanelState.HIDE;
    }

}
import { _decorator, Node, tween, UITransform, Vec3 } from 'cc';
import { BaseObejct } from "../../../scripts/Core/Object/BaseObject";
import { DebugLog } from "db://assets/scripts/Core/Util/DebugLog";
import { LayerUtil } from '../Util/LayerUtil';
const { property } = _decorator;

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

export class BasePanel extends BaseObejct {

    public state: PanelState = PanelState.NONE;

    public static NAME = '';

    constructor() {
        super();
        this.state = PanelState.INIT;
    }


    onLoad() {
        this.state = PanelState.LOADED;
    }

    start() {

    }

    onEnable() {
        this.state = PanelState.ENABLE;
    }

    onDisable() {
        this.state = PanelState.ONDISABLE;
    }

    onDestroy() {
        if(!this.isValid)return;
        this.state = PanelState.DESTROY;
        DebugLog.instance.log(`${this.name} onDestroy`);
    }

    // 恢复函数，接收一个任意类型的参数data
    restore(data: any) {

    }

    // 显示面板
    async showPanel() {
        if (!this.isValidNode()) {
            DebugLog.instance.warn('节点已销毁，终止显示动画');
            return;
        }
        await new Promise<void>((resolve, reject) => {
            const screenWidth = LayerUtil.getPanelLayer().getComponent(UITransform).width;
            const startPos = new Vec3(screenWidth, 0, 0);
            this.node.setPosition(startPos);
            tween(this.node)
                .to(0.3, { position: new Vec3(0, 0, 0) }, { easing: 'quartOut' })
                .call(() => {
                    this.state = PanelState.SHOW;
                    resolve();
                })
                .start();
        });
    }

    // 隐藏面板
    async hidePanel() {
        if (!this.isValidNode()) {
            DebugLog.instance.warn('节点已销毁，终止隐藏动画');
            return;
        }
        await new Promise<void>((resolve, reject) => {
            const screenWidth = LayerUtil.getPanelLayer().getComponent(UITransform).width;
            tween(this.node)
                .to(0.3, { position: new Vec3(screenWidth, 0, 0) }, { easing: 'quartIn' })
                .call(() => {
                    this.state = PanelState.HIDE;
                    resolve();
                })
                .start();
        });
    }

    private isValidNode(): boolean {
        return this.node != null && this.node.isValid && this.node.parent != null;
    }

}
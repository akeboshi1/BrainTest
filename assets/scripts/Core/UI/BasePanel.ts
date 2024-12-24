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
    @property(Node)
    node: Node = null;

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
        this.state = PanelState.DESTROY;
        DebugLog.instance.log(`${this.name} onDestroy`);
    }

    restore(data: any) {

    }

    // 显示面板
    async showPanel() {
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

}
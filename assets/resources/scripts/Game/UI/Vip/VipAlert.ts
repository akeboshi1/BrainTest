import {Node,Label,_decorator} from "cc";
import {BasePanel} from "db://assets/resources/scripts/Core/UI/BasePanel";
import { UIManager } from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import { VipPanel } from "./VipPanel";
const { ccclass, property } = _decorator;

@ccclass("VipAlert")
export class VipAlert extends BasePanel {
    public static NAME = "VipAlert";

    /**
     * 重写showPanel方法，直接显示，不做缓动特效
     */
    async showPanel(skipTween: boolean = true) {
        // 始终跳过缓动动画，直接显示
        await super.showPanel(true);
    }

    onBuyHandler(){
        // 打开vipPanel
        UIManager.getInstance().showPanel(VipPanel.NAME);
        // 关闭vipAlert
        UIManager.getInstance().hidePanel(VipAlert.NAME);
    }

    onClose() {
        UIManager.getInstance().hidePanel(VipAlert.NAME);
    }
}
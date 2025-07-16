import {Node,Label,_decorator} from "cc";
import {BasePanel} from "db://assets/resources/scripts/Core/UI/BasePanel";
import { UIManager } from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import { VipPanel } from "./VipPanel";
const { ccclass, property } = _decorator;

@ccclass("VipAlert")
export class VipAlert extends BasePanel {
    public static NAME = "VipAlert";

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
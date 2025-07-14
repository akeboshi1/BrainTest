import { Component,Node,profiler} from 'cc';
import {ScreenAdapter} from "db://assets/resources/scripts/Adapter/ScreenAdapter";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";

export class AdaptComponent extends Component {

    protected viewNode:Node=null;
    public scaleFactor:number = 1;
    constructor() {
        super();
    }

    onLoad(){
       // 将调试信息隐藏
       profiler.hideStats();
    }

    start() {
        this.viewNode = this.node.getChildByName('viewNode');
        // 执行屏幕适配
        this.performScreenAdaptation();
        this.scaleFactor = ScreenAdapter.getInstance().scaleFactor;
    }

    // ========== 屏幕适配 ==========
    /**
     * 执行屏幕适配
     * 在场景启动时统一进行UI适配
     */
    protected performScreenAdaptation() {
        try {
            // 对当前节点进行屏幕适配
            ScreenAdapter.getInstance().adaptPanelUI(this.node);

            // 如果有viewNode，也对其进行适配
            if (this.viewNode) {
                ScreenAdapter.getInstance().adaptPanelUI(this.viewNode);
            }

            DebugLog.instance.log(`[BaseScene] 屏幕适配完成: ${this.node.name}`);
        } catch (error) {
            DebugLog.instance.error(`[BaseScene] 屏幕适配失败: ${error}`);
        }
    }

}
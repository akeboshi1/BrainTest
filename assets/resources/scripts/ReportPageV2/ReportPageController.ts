import { _decorator, Component, Node } from 'cc';
import { TopNavBarController } from './TopNavBarController';
const { ccclass, property } = _decorator;

@ccclass('ReportPageController')
export class ReportPageController extends Component {
    @property(Node)
    parentNode_top: Node = null;
    @property(Node)
    parentNode_bottom: Node = null;
    @property(TopNavBarController)
    topNavBarController: TopNavBarController = null;
    onLoad(): void {
        // 使用 scheduleOnce 确保组件完全加载
        this.scheduleOnce(() => {
            if (this.topNavBarController) {
                this.topNavBarController.init(this.parentNode_top, this.parentNode_bottom);
                this.topNavBarController.loadSumReport();
            }
        }, 0);
    }
    start() {
        // this.topNavBarController.init(this.parentNode_top,this.parentNode_bottom);
        // this.topNavBarController.loadSumReport();
    }

    update(deltaTime: number) {
        
    }

}


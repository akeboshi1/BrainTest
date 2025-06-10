import { _decorator, Component, Node } from 'cc';
import { TopNavBarController } from './TopNavBarController';
const { ccclass, property } = _decorator;

@ccclass('ReportPageController')
export class ReportPageController extends Component {
    @property(TopNavBarController)
    topNavBarController: TopNavBarController = null;
    onLoad(): void {
    }
    start() {
        this.topNavBarController.loadSumReport();
    }

    update(deltaTime: number) {
        
    }

}


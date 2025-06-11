import { _decorator, Component, Node } from 'cc';
import { ReportManager } from '../ManagerV2/ReportManager';
const { ccclass, property } = _decorator;

@ccclass('OtherChartView')
export class OtherChartView extends Component {
    getCogAbilityBriefCallback(data: any) {
        let cogAbilityBriefData = ReportManager.getInstance().cogAbilityBriefData;
        console.log(cogAbilityBriefData);
  
    }
    start() {

    }

    update(deltaTime: number) {
        
    }
}



import { _decorator, Component, Label, Node } from 'cc';
import { ReportData, ReportManager } from '../ManagerV2/ReportManager';
import {RadiaGraph} from "db://assets/resources/scripts/indexPageV2/RadiaGraph";
const { ccclass, property } = _decorator;

@ccclass('SumReportView')
export class SumReportView extends Component {
    @property(Label)
    dataLable:Label = null;
    @property(RadiaGraph)
    radarMap:RadiaGraph = null;
    start() {
        this.showTwoWeekGraph();
    }
    showTwoWeekGraph(){
        let reportDataList: ReportData[] = ReportManager.getInstance().reportDataList;
        const lastValues=reportDataList.map(item => item.last_tier);
        this.radarMap.getComponent(RadiaGraph).setSecondValues(lastValues);
        const values = reportDataList.map(item => item.tier);
        this.radarMap.getComponent(RadiaGraph).setValues(values);
    }

    update(deltaTime: number) {
        
    }
}



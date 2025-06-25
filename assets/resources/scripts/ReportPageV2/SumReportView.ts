import { _decorator, Component, Label, Node } from 'cc';
import { ReportData, ReportManager } from '../ManagerV2/ReportManager';
import { RadiaGraph } from '../indexPageV2/RadiaGraph';
import { EventManager } from '../Core/Manager/Event/EventManager';
    

const { ccclass, property } = _decorator;

@ccclass('SumReportView')
export class SumReportView extends Component {
    @property(Label)
    dataLable:Label = null;
    @property(RadiaGraph)
    radarMap:RadiaGraph = null;
    onEnable(){
        EventManager.getInstance().on(ReportManager.getBrainTrainingInitialTiersCallback, this.requestInitialReportCallback, this);
    }
    onDisable(){
        EventManager.getInstance().off(ReportManager.getBrainTrainingInitialTiersCallback, this);
    }
    start() {
        this.showTwoWeekGraph();
        ReportManager.getInstance().getPersonalInitialReport();
        
    }
    showTwoWeekGraph(){
        let reportDataList: ReportData[] = ReportManager.getInstance().reportDataList;
        // const lastValues=reportDataList.map(item => item.last_tier);
        // this.radarMap.getComponent(RadiaGraph).setSecondValues(lastValues);
        const values = reportDataList.map(item => item.tier);
        this.radarMap.getComponent(RadiaGraph).setValues(values);
    }
    requestInitialReportCallback(){
        let reportDataListInitial: ReportData[] = ReportManager.getInstance().reportDataListInitial;
        const valuesInitial = reportDataListInitial.map(item => item.tier);
        this.radarMap.getComponent(RadiaGraph).setSecondValues(valuesInitial);
    }

    update(deltaTime: number) {
        
    }
}



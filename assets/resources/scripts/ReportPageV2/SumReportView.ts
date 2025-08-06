import { _decorator, Component, instantiate, Label, Node, Prefab } from 'cc';
import { ReportData, ReportManager, WeekStatisticsData } from '../ManagerV2/ReportManager';
import { RadiaGraph } from '../indexPageV2/RadiaGraph';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';


const { ccclass, property } = _decorator;

@ccclass('SumReportView')
export class SumReportView extends Component {
    @property(RadiaGraph)
    radarMap: RadiaGraph = null;

    @property(Label)
    weekStatistics: Label = null;
    
    start() {   
        ReportManager.getInstance().weekStatistics.addListener(this.onWeekStatisticsChange.bind(this));
        ReportManager.getInstance().reportDataList.addListener(this.onReportDataListChange.bind(this));
        ReportManager.getInstance().reportDataListInitial.addListener(this.onReportDataListInitialChange.bind(this));
    }
    
    protected onDestroy(): void {
        ReportManager.getInstance().weekStatistics.removeListener(this.onWeekStatisticsChange.bind(this));
        ReportManager.getInstance().reportDataList.removeListener(this.onReportDataListChange.bind(this));
        ReportManager.getInstance().reportDataListInitial.removeListener(this.onReportDataListInitialChange.bind(this));
    }
    
    
    onWeekStatisticsChange(data: WeekStatisticsData){
        this.weekStatistics.string = `统计周期${data.start_date?data.start_date:'——'}至${data.end_date?data.end_date:'——'}`;
    }

    onReportDataListChange(data: ReportData[]) {
        const values = data.map(item => item.tier);
        this.radarMap.getComponent(RadiaGraph).setValues(values);
        this.radarMap.getComponent(RadiaGraph).updateView(data);
    }
    
    onReportDataListInitialChange(data: ReportData[]) {
        const valuesInitial = data.map(item => item.tier);
        this.radarMap.getComponent(RadiaGraph).setSecondValues(valuesInitial);
        this.radarMap.getComponent(RadiaGraph).updateView(data);
    }
   
    clickNavBar(event, data) {
        let userData = PersonalCenterManager.getInstance().userInfoData;
        if (!userData.has_initial_tier) {
            return;
        }
        EventManager.getInstance().emit('onTopNavBarClick', data);
    }
    
}



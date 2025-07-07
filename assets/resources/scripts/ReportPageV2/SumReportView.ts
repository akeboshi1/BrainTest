import { _decorator, Component, Label, Node } from 'cc';
import { ReportData, ReportManager } from '../ManagerV2/ReportManager';
import { RadiaGraph } from '../indexPageV2/RadiaGraph';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';


const { ccclass, property } = _decorator;

@ccclass('SumReportView')
export class SumReportView extends Component {
    @property(Label)
    dataLable: Label = null;
    @property(RadiaGraph)
    radarMap: RadiaGraph = null;
    @property(Label)
    weekStatistics: Label = null;

    start() {
        this.showWeekStatistics();
        this.showInitialWeekGraph();
        this.showCurrentWeekGraph();
    }
    showWeekStatistics(){
        let weekStatistics = ReportManager.getInstance().weekStatistics;
        this.weekStatistics.string = `统计周期${weekStatistics.start_date?weekStatistics.start_date:'——'}至${weekStatistics.end_date?weekStatistics.end_date:'——'}`;
    }
    clickNavBar(event, data) {
        let userData = PersonalCenterManager.getInstance().userInfoData;
        if (!userData.has_initial_tier) {
            return;
        }
        EventManager.getInstance().emit('onTopNavBarClick', data);
    }
    showCurrentWeekGraph() {
        let reportDataList: ReportData[] = ReportManager.getInstance().reportDataList;
        // const lastValues=reportDataList.map(item => item.last_tier);
        // this.radarMap.getComponent(RadiaGraph).setSecondValues(lastValues);
        const values = reportDataList.map(item => item.tier);
        this.radarMap.getComponent(RadiaGraph).setValues(values);
    }
    showInitialWeekGraph() {
        let reportDataListInitial: ReportData[] = ReportManager.getInstance().reportDataListInitial;
        const valuesInitial = reportDataListInitial.map(item => item.tier);
        this.radarMap.getComponent(RadiaGraph).setSecondValues(valuesInitial);
    }



    update(deltaTime: number) {

    }
}



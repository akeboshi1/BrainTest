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
        
    }

    protected onEnable(): void {
        ReportManager.getInstance().weekStatistics.addListener(this.onWeekStatisticsChange.bind(this));
        ReportManager.getInstance().reportDataList.addListener(this.onReportDataListChange.bind(this));
        ReportManager.getInstance().reportDataListInitial.addListener(this.onReportDataListInitialChange.bind(this));
    }

    protected onDisable(): void {
        ReportManager.getInstance().weekStatistics.removeAllListeners();
        ReportManager.getInstance().reportDataList.removeAllListeners();
        ReportManager.getInstance().reportDataListInitial.removeAllListeners();
    }


    onWeekStatisticsChange(data: WeekStatisticsData) {
        this.weekStatistics.string = `统计周期${data.start_date ? this.processDateString(data.start_date) : '——'}至${data.end_date ? this.processDateString(data.end_date) : '——'}`;
    }
    private processDateString(date: string): string {
        let year = date.split('-')[0];
        let month = date.split('-')[1];
        let day = date.split('-')[2];
        return `${month}.${day}`;
    }


    onReportDataListChange(data: ReportData[]) {
        const values = data.map(item => item.tier);
        this.radarMap.getComponent(RadiaGraph).setValues(values);
        this.radarMap.getComponent(RadiaGraph).updateView(data);
    }

    onReportDataListInitialChange(data: ReportData[]) {
        const valuesInitial = data.map(item => item.tier);
        this.radarMap.getComponent(RadiaGraph).setSecondValues(valuesInitial);
    }

    clickNavBar(event, data) {
        let userData = PersonalCenterManager.getInstance().userInfoData;
        if (!userData.has_initial_tier) {
            return;
        }
        EventManager.getInstance().emit('onTopNavBarClick', data);
    }

}



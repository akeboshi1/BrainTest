import { _decorator, Component, instantiate, Label, Node, Prefab } from 'cc';
import { ReportData, ReportManager } from '../ManagerV2/ReportManager';
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
    
    private _firstRequestCompleted: boolean = false;
    
    start() {   
        // ReportManager.getInstance().getPersonalReport();
    }
    
    onEnable() {
        EventManager.getInstance().on(ReportManager.getBrainTrainingTiersCallback, this.getBrainTrainingTiersCallback, this);
        
    }
    
    onDisable() {
        EventManager.getInstance().off(ReportManager.getBrainTrainingTiersCallback, this);
    }
    
    getBrainTrainingTiersCallback() {
        if (!this._firstRequestCompleted) {
            this._firstRequestCompleted = true;
            this.showWeekStatistics();
            this.showCurrentWeekGraph();
            ReportManager.getInstance().getPersonalReport(true);
        } else {   
            this.showInitialWeekGraph();
        }
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



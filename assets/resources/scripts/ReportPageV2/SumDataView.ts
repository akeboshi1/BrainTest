import { _decorator, Component, Label, Node, RichText } from 'cc';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { ReportManager } from '../ManagerV2/ReportManager';
const { ccclass, property } = _decorator;

@ccclass('SumDataView')
export class SumDataView extends Component {
    @property(RichText)
    reportSummary: RichText = null;
    @property(Label)
    reportSummaryData:Label=null;
    onEnable() {
        EventManager.getInstance().on(ReportManager.getUserSumReportCallback, this.getUserSumReportCallback, this);
    }
    onDisable() {
        EventManager.getInstance().off(ReportManager.getUserSumReportCallback, this);
    }
    start() {
        ReportManager.getInstance().getUserSumReport();
    }
    showReportSummary(data: any) {
        this.reportSummary.string = data.report;
        this.reportSummaryData.string=`报告生成日期:${data.report_date}`
    }
    getUserSumReportCallback(data: any) {
        console.log(data);
        this.showReportSummary(data);
    }

    update(deltaTime: number) {
        
    }
}



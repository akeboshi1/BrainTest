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
    
    start() {
        let summaryData= ReportManager.getInstance().userSumReport;
        this.showReportSummary(summaryData);
    }
    showReportSummary(data: any) {
        this.reportSummary.string = data.report;
        this.reportSummaryData.string=`报告生成日期:${data.report_date}`
    }

    update(deltaTime: number) {
        
    }
}



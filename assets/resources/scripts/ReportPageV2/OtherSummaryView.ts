import { _decorator, Component, Label, Node } from 'cc';
import { CogAbilityBriefData, ReportManager } from '../ManagerV2/ReportManager';
import { DataProvider } from '../Core/Data/DataProvider';
const { ccclass, property } = _decorator;

@ccclass('OtherSummaryView')
export class OtherSummaryView extends Component {
    @property(Label)
    summmaryDesLabel: Label = null;
    @property(Label)
    definitionDescLabel: Label = null;
    @property(Label)
    scoreDescLabel: Label = null;
    @property(Label)
    normRankingLabel: Label = null;
    @property(Label)
    lastWeekLabel: Label = null;
    @property(Label)
    curWeekLabel: Label = null;

    private _cogAbilityBriefData: DataProvider<CogAbilityBriefData> = null;

    start() {
        this._cogAbilityBriefData = ReportManager.getInstance().getAbilityBriefData();
        this._cogAbilityBriefData.addListener(this.onCogAbilityBriefDataChange.bind(this));
    }

    onDestroy(): void {
        this._cogAbilityBriefData.removeListener(this.onCogAbilityBriefDataChange.bind(this));
        this._cogAbilityBriefData = null;
    }

    onCogAbilityBriefDataChange(data: CogAbilityBriefData) {
        this.summmaryDesLabel.string = data.definition_desc;
        this.definitionDescLabel.string = `定义说明：${data.definition_desc}`;
        this.scoreDescLabel.string = `得分说明：${data.score_desc}`;
        this.normRankingLabel.string = `常模排名：${data.norm_ranking}`;
        if(data.last_tier){
            this.lastWeekLabel.string = data.last_tier.toString();
        }
        if(data.tier){
            this.curWeekLabel.string = data.tier.toString();
        }
    }
}



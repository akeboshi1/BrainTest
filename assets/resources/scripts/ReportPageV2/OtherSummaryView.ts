import { _decorator, Component, Label, Node } from 'cc';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { ReportManager } from '../ManagerV2/ReportManager';
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
    onLoad() {
        this.initData();
    }
    initData() {
        let cogAbilityBriefData = ReportManager.getInstance().cogAbilityBriefData;
        console.log(cogAbilityBriefData);
        this.summmaryDesLabel.string = cogAbilityBriefData.definition_desc;
        this.definitionDescLabel.string = `定义说明：${cogAbilityBriefData.definition_desc}`;
        this.scoreDescLabel.string = `得分说明：${cogAbilityBriefData.score_desc}`;
        this.normRankingLabel.string = `常模排名：${cogAbilityBriefData.norm_ranking}`;
        this.lastWeekLabel.string = cogAbilityBriefData.last_tier.toString();
        this.curWeekLabel.string = cogAbilityBriefData.tier.toString();
    }

    start() {

    }

    update(deltaTime: number) {

    }
}



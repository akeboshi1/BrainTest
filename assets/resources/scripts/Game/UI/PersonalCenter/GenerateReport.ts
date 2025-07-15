import { _decorator, Component, instantiate, Label, Node, Prefab, SpriteFrame, v3, tween, UITransform } from 'cc';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { PersonalCenterManager } from '../../PersonalCenterManager/PersonalCenterManager';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { DebugLog } from '../../../Core/Util/DebugLog';
import { RadarChart } from './RadarChart';
import { UIManager } from '../../../Core/Manager/UI/UIManager';

const { ccclass, property } = _decorator;


@ccclass('GenerateReport')
export class GenerateReport extends BasePanel {

    @property(Prefab)
    reportChartPrefab: Prefab = null;

    @property(Node)
    reportChartParent: Node = null;

    @property(Node)
    reportGraphics: Node = null;

    @property([Label])
    reportGraphicsList: Label[] = [];

    @property(Node)
    noReport: Node = null;

    @property(Node)
    scrollViewNode: Node = null;

    public static NAME = 'GenerateReport';
    // private reportChartPrefabList: Node[] = [];
    // private tween = null;

    start() {
        EventManager.getInstance().on(PersonalCenterManager.personalReportCallback, this.personalReportCallback, this);
        PersonalCenterManager.getInstance().getPersonalReport();

    }
    backToParent() {
        UIManager.getInstance().hidePanel(GenerateReport.NAME);
    }
    personalReportCallback() {
        EventManager.getInstance().off(PersonalCenterManager.personalReportCallback, this);
        let reportDataList = PersonalCenterManager.getInstance().reportDataList;
        if (!reportDataList.length) {
            this.scrollViewNode.active = false;
            this.noReport.active = true;
            return;
        }
        this.noReport.active = false;
        DebugLog.instance.log('处理后的个人报告', reportDataList);
        let lasteDataScore: number[] = [];
        reportDataList.forEach((item, index) => {
            let inst = instantiate(this.reportChartPrefab);
            this.reportChartParent.addChild(inst);
            inst.setPosition(v3(0, -index * 850, 0));
            inst.getChildByName('title').getComponent(Label).string = item.abilityEnum;
            let chartForm0 = inst.getChildByName(`chartForm0`);
            chartForm0.getChildByName('num').getComponent(Label).string = item.lastlastWeek;
            chartForm0.getChildByName(`pillar0`).getComponent(UITransform).height = item.lastlastWeek > 100 ? 360 : (item.lastlastWeek / 100 * 360);
            let chartForm1 = inst.getChildByName(`chartForm1`);
            chartForm1.getChildByName('num').getComponent(Label).string = item.lastWeek;
            chartForm1.getChildByName(`pillar1`).getComponent(UITransform).height = item.lastWeek > 100 ? 360 : (item.lastWeek / 100 * 360);
            let chartForm2 = inst.getChildByName(`chartForm2`);
            chartForm2.getChildByName('num').getComponent(Label).string = item.currentWeek;
            chartForm2.getChildByName(`pillar2`).getComponent(UITransform).height = item.currentWeek > 100 ? 360 : (item.currentWeek / 100 * 360);
            inst.getChildByName('bottomRank').getComponent(Label).string = `在所在年龄段 前${Math.floor((item as any).age_group_percentile)}%`
            this.reportGraphicsList[index].string = item.abilityEnum;
            lasteDataScore.push(item.latestScore / 100);
        })
        this.reportGraphics.getComponent(RadarChart).setRates(lasteDataScore);


    }

    update(deltaTime: number) {

    }
}



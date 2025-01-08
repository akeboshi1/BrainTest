import { _decorator, Component, instantiate, Label, Node, Prefab, SpriteFrame, v3,tween,UITransform } from 'cc';
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

    public static NAME = 'GenerateReport';
    private allReportData = [];
    private reportChartPrefabList:Node[] = [];
    private tween = null;

    start() {
        EventManager.getInstance().on(PersonalCenterManager.personalReportCallback, this.personalReportCallback, this);
        PersonalCenterManager.getInstance().getPersonalReport();

    }
    backToParent() {
        UIManager.getInstance().hidePanel(GenerateReport.NAME);
    }
    personalReportCallback() {
        let self=this;
        let lasteDataList = PersonalCenterManager.getInstance().reportLasteDataList;
        this.allReportData = PersonalCenterManager.getInstance().allReportDataList;
        DebugLog.instance.log('最新报告', lasteDataList);
        DebugLog.instance.log('所有报告', this.allReportData);
        let lasteDataScore = [];
        lasteDataList.forEach((item, index) => {
            lasteDataScore[index] = ((item as any).score)/100;
            this.reportGraphicsList[index].string = (item as any).cog_ability_desc;
        })
        this.reportGraphics.getComponent(RadarChart).setRates(lasteDataScore);
        for (let index = 0; index < this.allReportData.length; index++) {
            let inst = instantiate(this.reportChartPrefab);
            this.reportChartPrefabList[index] = inst;
            this.reportChartParent.addChild(inst);
            inst.setPosition(v3(0, -index * 850, 0));
           
            this.allReportData[index].map((oneReportItem, idx) => {
                inst.getChildByName('title').getComponent(Label).string = oneReportItem.cog_ability_desc;
                let allChartNode = self.reportChartPrefabList[index];
                let chartNode = allChartNode.getChildByName(`chartForm${idx}`);
                if (chartNode) {
                    chartNode.getComponent(UITransform).height = oneReportItem.score >100?100:(oneReportItem.score / 100 * 400);
                } 
                if( this.allReportData[index].length== 3){
                    inst.getChildByName('bottomRank').getComponent(Label).string = `在所在年龄段 前${oneReportItem.age_group_percentile}%`;
                }
            })
        }
    }

    update(deltaTime: number) {

    }
}



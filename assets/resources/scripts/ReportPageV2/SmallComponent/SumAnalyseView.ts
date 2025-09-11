import { _decorator, Component, instantiate, Label, Node, Prefab, resources, Sprite, SpriteFrame, Vec3 } from 'cc';
import { ReportManager, UserSumReport } from '../../ManagerV2/ReportManager';
import { DimensionItemView } from './DimensionItemView';
import { PersonalCenterManager } from '../../Game/PersonalCenterManager/PersonalCenterManager';
import { UIManager } from '../../Core/Manager/UI/UIManager';
import { StatePanel } from './StatePanel';
import { BundleName } from '../../Core/Manager/Load/BundleName';
import { DebugLog } from '../../Core/Util/DebugLog';
const { ccclass, property } = _decorator;

const SumAnalyseType = [
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_5',
        title: '',
        monthTierUp: 0,
        weekTier: 0,
    },
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_3',
        title: '',
        monthTierUp: 0,
        weekTier: 0,
    },
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_1',
        title: '',
        monthTierUp: 0,
        weekTier: 0,
    },
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_4',
        title: '',
        monthTierUp: 0,
        weekTier: 0,
    },
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_2',
        title: '',
        monthTierUp: 0,
        weekTier: 0,
    }
]
const resultAnalysisConfig = [
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_6',
        name: '优势领域',
    },
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_7',
        name: '待提升领域',
    }
]

const ComprehRecommendConfig = [
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_8',
        name: '认知训练',
        text: '每日2-3次认知功能训练，保持认知活跃度（派派智护脑力操+手指太极操）'
    },
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_9',
        name: '运动建议',
        text: '每日保持适度的有氧运动（如慢走、太极、八段锦）'
    },
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_10',   
        name: '饮食优化',
        text: '每日健康饮食，适量摄入富含Omega-3（深海鱼油、坚果）、抗氧化物质（蓝莓、绿茶）'
    },
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_11',
        name: '心理社交',
        text: '鼓励参与社交活动、维持积极情绪，多与亲友交流讨论时事或感兴趣的话题内容，有助激活多脑区联动'
    },
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_12',
        name: '评估复查',
        text: '建议每半年进行一次认知评估，动态掌握认知功能实时状态'
    }
];

const CognizeTipsConfig = [
        // 获取任务列表
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_1',
        name: '记忆力维护',
        text: '日常练习：建议通过联想记忆法（如将信息与图像、故事关联）数字、单词卡片记忆训练巩固',
        text2: '生活习惯：保持充足睡眠（7-8小时/天）睡眠不足易影响海马体功能'
    },
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_2',
        name: '计算力提升',
        text: '主动训练：每日进行速算练习（如心算购物金额）玩数字类训练（如24点训练）',
        text2: '实践应用：尝试自主规划家庭开支或理财计算，增强数字敏感度'
    },
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_3',
        name: '判断力与执行力优化',
        text: '策略训练：推荐象棋、围棋等需要预判和决策的训练，或通过“找不同”“拼图”等电子训练锻炼反应速度',
        text2: '目标拆分：将复杂任务拆解为小步骤（如制定每日计划表）逐步提升任务完成效率'
    },
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_5',
        name: '语言能力强化',
        text: '拓展练习：参与读书会、朗诵或日记写作，进一步丰富词汇和表达逻辑',
        text2: '社交互动：多与亲友交流讨论时事或书籍内容，激发语言创造性'
    }
]
@ccclass('SumAnalyseView')
export class SumAnalyseView extends Component {
    @property(Label)
    userEvaluationLabel: Label = null;
    @property(Prefab)
    dimensionItemPrefab: Prefab = null;
    @property(Node)
    firstAnalysisNode: Node = null;
    @property(Sprite)
    firstItemArrowIcon: Sprite = null;
    @property(Node)
    secondAnalysisNode: Node = null;
    @property(Sprite)
    secondItemArrowIcon: Sprite = null;
    @property(Node)
    thirdAnalysisNode: Node = null;
    @property(Sprite)
    thirdItemArrowIcon: Sprite = null;
    @property(Node)
    fourthAnalysisNode: Node = null;
    @property(Sprite)
    fourthItemArrowIcon: Sprite = null;

    start() {
        
    }
    
    onEnable(): void {
        ReportManager.getInstance().userSumReport.addListener(this.onUserSumReportChange.bind(this));
    }

    onDisable(): void {
        ReportManager.getInstance().userSumReport.removeAllListeners();
    }

    onUserSumReportChange(data: UserSumReport) {
        let reportPeriod = data.report_period;
        if (!reportPeriod) {
            this.userEvaluationLabel.node.destroy();
            return;
        }
        let personName = PersonalCenterManager.getInstance().userInfoData.full_name;
        if (reportPeriod == 'week') {
            this.userEvaluationLabel.string = `${personName}认知功能（周）保健评估`;
        } else if (reportPeriod == 'month') {
            this.userEvaluationLabel.string = `${personName}认知功能（月）保健评估`;
        }
    }

    clickFirstAnalysisItem() {
        if (this.firstItemArrowIcon.node.angle === 0) {
            // 箭头向下，展开内容
            this.firstItemArrowIcon.node.angle = 180;
            this.loadReportListData();
        } else {
            // 箭头向上，收起内容
            this.firstItemArrowIcon.node.angle = 0;
            this.hideChildNodes(this.firstAnalysisNode);
        }
    }

    async clickSecondAnalysisItem() {
        if (this.secondItemArrowIcon.node.angle === 0) {
            this.secondItemArrowIcon.node.angle = 180;
            for (const [index, configItem] of resultAnalysisConfig.entries()) {
                let dimensionItemView = instantiate(this.dimensionItemPrefab);
                this.secondAnalysisNode.addChild(dimensionItemView);
                let script = dimensionItemView.getComponent(DimensionItemView);
                const spriteFrame = await this.loadSpriteFrame(configItem.iconPath);
                script.setIcon(spriteFrame);
                script.setName(configItem.name);
                let data = ReportManager.getInstance().getFirstAnalysisDataByIndex(index);
                if (index == 0) {
                    if(data){
                        script.setText(data);
                    }else{
                        script.setText('暂无数据');
                    }
                } else {
                    if(data){
                        script.setText(data);
                    }else{
                        script.setText('暂无数据');
                    }
                }
            }
        } else {
            this.secondItemArrowIcon.node.angle = 0;
            this.hideChildNodes(this.secondAnalysisNode);
        }
    }
    async clickThirdAnalysisItem() {
        if (this.thirdItemArrowIcon.node.angle === 0) {
            this.thirdItemArrowIcon.node.angle = 180;
            for (const path of ComprehRecommendConfig) {
                let dimensionItemView = instantiate(this.dimensionItemPrefab);
                this.thirdAnalysisNode.addChild(dimensionItemView);
                let script = dimensionItemView.getComponent(DimensionItemView);
                const spriteFrame = await this.loadSpriteFrame(path.iconPath);
                script.setIcon(spriteFrame);
                script.setName(path.name);
                script.setText(path.text);
            }
        } else {
            this.thirdItemArrowIcon.node.angle = 0;
            this.hideChildNodes(this.thirdAnalysisNode);

        }
    }
    async clickFourthAnalysisItem() {
        if (this.fourthItemArrowIcon.node.angle === 0) {
            this.fourthItemArrowIcon.node.angle = 180;
            for (const configItem of CognizeTipsConfig) {
                let dimensionItemView = instantiate(this.dimensionItemPrefab);
                this.fourthAnalysisNode.addChild(dimensionItemView);
                let script = dimensionItemView.getComponent(DimensionItemView);
                const spriteFrame = await this.loadSpriteFrame(configItem.iconPath);
                script.setIcon(spriteFrame);
                script.setName(configItem.name);
                script.setText(configItem.text);
                script.showText2(true);
                script.setText2(configItem.text2);
            }

        } else {
            this.fourthItemArrowIcon.node.angle = 0;
            this.hideChildNodes(this.fourthAnalysisNode);
        }
    }
    hideChildNodes(currentAnalysisNode) {
        let nodes = currentAnalysisNode.children;
        for (let i = 1; i < nodes.length; i++) {
            nodes[i].destroy();
        }
    }

    private async loadSpriteFrame(path: string): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            resources.load(path, SpriteFrame, (err, spriteFrame) => {
                if (err) reject(err);
                else resolve(spriteFrame);
            });
        });
    }

    async loadReportListData() {
        let reportPeriod = ReportManager.getInstance().userSumReport.data.report_period;
        if(!reportPeriod){
            DebugLog.instance.error('reportPeriod is null');
            return;
        }

        let reportList = ReportManager.getInstance().reportDataList.data;
        for(let index=0;index<reportList.length;index++){
            SumAnalyseType[index].title = reportList[index].cog_ability_desc;
            SumAnalyseType[index].weekTier = reportList[index].tier;
        }
        let reportMonthList = ReportManager.getInstance().getUserSumReportMonthData();
        if(reportMonthList){
            for(let index=0;index<reportMonthList.length;index++){
                SumAnalyseType[index].monthTierUp = reportMonthList[index].tier - reportMonthList[index].last_tier;
            }
        }
        for (let item of SumAnalyseType) {
            let dimensionItemView = instantiate(this.dimensionItemPrefab);
            this.firstAnalysisNode.addChild(dimensionItemView);
            let script = dimensionItemView.getComponent(DimensionItemView);
            const spriteFrame = await this.loadSpriteFrame(item.iconPath);
            script.setIcon(spriteFrame);
            script.setName(item.title);
            let displayText = '';
            if (reportPeriod == 'week') {
                if (item.weekTier > 1) {
                    displayText = `在同龄组中超过了${(item.weekTier - 1) * 10}%的个体，高于平均水平`;
                } else {
                    displayText = `同龄组末位10%`;
                }
            } else {
                if (item.monthTierUp >= 3) {
                    displayText = `在同龄组中超过了${(item.weekTier - 1) * 10}%的个体，高于平均水平，较上月显著提升`;
                } else if (item.monthTierUp >=2) {
                    displayText = `在同龄组中超过了${(item.weekTier - 1) * 10}%的个体，高于平均水平，较上月明显提升`;
                } else if(item.monthTierUp >= 1){
                    displayText = `在同龄组中超过了${(item.weekTier - 1) * 10}%的个体，高于平均水平，较上月稳定提升`;
                } else if(item.monthTierUp == 0){
                    displayText = `位于同龄组末位10%，与上周相同`;
                }
            }
            script.setText(displayText);
        }
    }
    showStatePanel(){
        UIManager.getInstance().registerPanel(StatePanel.NAME, BundleName.RESOURCES, "/prefabV2/personReport/smallComponent/statementPanel", StatePanel);
        UIManager.getInstance().showPanel(StatePanel.NAME);
    }
}



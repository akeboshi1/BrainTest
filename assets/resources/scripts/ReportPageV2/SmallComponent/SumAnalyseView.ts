import { _decorator, Component, instantiate, Label, Node, Prefab, resources, Sprite, SpriteFrame, Vec3 } from 'cc';
import { ReportManager } from '../../ManagerV2/ReportManager';
import { DimensionItemView } from './DimensionItemView';
import { PersonalCenterManager } from '../../Game/PersonalCenterManager/PersonalCenterManager';
const { ccclass, property } = _decorator;

const SumAnalyseType =[
    {
        iconPath:'/textureV2/userReport/dimension_icon/texture/dime_5',
        tier:1,
    },
    {
        iconPath:'/textureV2/userReport/dimension_icon/texture/dime_3',
        tier:2,
    },
    {
        iconPath:'/textureV2/userReport/dimension_icon/texture/dime_1',
        tier:4,
    },
    {
        iconPath:'/textureV2/userReport/dimension_icon/texture/dime_4',
        tier:5,
    },
    {
        iconPath:'/textureV2/userReport/dimension_icon/texture/dime_2',
        tier:6,
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
//根据ComprehRecommend中的元素生成五个dimensionItemView
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
        name: '心里社交',
        text: '鼓励参与社交活动、维持积极情绪，多与亲友交流讨论时事或感兴趣的话题内容，有助激活多脑区联动'
    },
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_12',
        name: '评估复查',
        text: '建议每半年进行一次认知评估，动态掌握认知功能实时状态'
    }

];
const CognizeTipsConfig = [
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_1',
        name: '记忆力维护',
        text: '日常练习：建议通过联想记忆法（如将信息与图像、故事关联）数字、单词卡片记忆游戏巩固',
        text2: '生活习惯：保持充足睡眠（7-8小时/天）睡眠不足易影响海马体功能'
    },
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_2',
        name: '计算力提升',
        text: '主动训练：每日进行速算练习（如心算购物金额）玩数字类游戏（如24点游戏）',
        text2: '实践应用：尝试自主规划家庭开支或理财计算，增强数字敏感度'
    },
    {
        iconPath: '/textureV2/userReport/dimension_icon/texture/dime_3',
        name: '判断力与执行力优化',
        text: '策略游戏：推荐象棋、围棋等需要预判和决策的游戏，或通过“找不同”“拼图”等电子游戏锻炼反应速度',
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
        this.judgeIsWeekOrMonth();
    }
    judgeIsWeekOrMonth() {
        let reportPeriod = ReportManager.getInstance().userSumReport.report_period;
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
                if (index === 0) {
                    script.setText(data);
                } else {
                    script.setText(data);
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
        let reportList = ReportManager.getInstance().reportDataList;
        let reportMonth = ReportManager.getInstance().userSumReport.report.detail;
        let reportPeriod = ReportManager.getInstance().userSumReport.report_period;

        for (let item of reportList) {
            let dimensionItemView = instantiate(this.dimensionItemPrefab);
            this.firstAnalysisNode.addChild(dimensionItemView);
            let script = dimensionItemView.getComponent(DimensionItemView);

            // 检查并设置能力图标
            let ability = Object.keys(SumAnalyseType).find(key => key === item.cog_ability);
            if (ability) {
                const spriteFrame = await this.loadSpriteFrame(SumAnalyseType[ability]);
                script.setIcon(spriteFrame);
            }

            // 设置能力名称
            script.setName(item.cog_ability_desc);

            // 构建显示文本
            let displayText = '';
            if (reportPeriod == 'week') {
                if (item.tier > 1) {
                    displayText = `在同龄组中超过了${(item.tier - 1)*10}%的个体，高于平均水平`;
                } else {
                    displayText = `同龄组末位的10%`;
                }
            } else {
                // 月报告
                const tierChange = reportMonth?.tier && reportMonth?.last_tier ?
                    reportMonth.tier - reportMonth.last_tier : 0;

                if (tierChange > 0) {
                    displayText = `在同龄组中超过了${(item.tier-1)*10}%的个体，高于平均水平，档位提升了${tierChange}档`;
                } else if (tierChange < 0) {
                    displayText = `在同龄组中超过了${(item.tier-1)*10}%的个体，高于平均水平，档位下降了${Math.abs(tierChange)}档`;
                } else {
                    displayText = `在同龄组中超过了${(item.tier-1)*10}%的个体，高于平均水平，档位保持不变`;
                }
            }

            script.setText(displayText);
        }
    }
}



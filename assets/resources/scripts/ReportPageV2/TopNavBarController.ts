import { _decorator, Component, instantiate, Node, Prefab, resources, Label, Color, Vec2, ScrollView, tween, Vec3 } from 'cc';
import { DebugLog } from '../Core/Util/DebugLog';
import { AbilityType, ReportManager } from '../ManagerV2/ReportManager';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { VipAlert } from '../Game/UI/Vip/VipAlert';
const { ccclass, property } = _decorator;

export const TopNavBarConfig = {
    otherChartItem: '/prefabV2/personReport/otherChartItem',
    otherSumDataPrefab: '/prefabV2/personReport/otherSumDataPrefab',
    sumDataAnalysisPrefab: '/prefabV2/personReport/sumAnalysisPrefab',
    sumReportPrefab: '/prefabV2/personReport/sumReportPrefab',
    initDataPrefab: '/prefabV2/personReport/initDataPrefab'
}
@ccclass('TopNavBarController')
export class TopNavBarController extends Component {
    @property([Node])
    labelsNode: Node[] = [];

    @property(Node)
    parentNode_top: Node = null;

    @property(Node)
    parentNode_bottom: Node = null;

    @property(ScrollView)
    scrollViewNode: ScrollView = null;

    private _pageLoadFlag: boolean = false;
 
    onEnable() {
        EventManager.getInstance().on('onTopNavBarClick', this.onTopNavBarClick, this);
    }

    onDisable() {
        EventManager.getInstance().off('onTopNavBarClick', this);
    }

    private onTopNavBarClick(customData) {
        this.clickOtherNavLable(null, customData);
    }

    public async loadPage(pagePath: string, parentNode: Node): Promise<Node> {
        try {
            const prefab = await new Promise<Prefab>((resolve, reject) => {
                resources.load(pagePath, Prefab, (err, prefab: Prefab) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(prefab);
                });
            });

            const page = instantiate(prefab);
            parentNode.addChild(page);
            return parentNode;
        } catch (error) {
            DebugLog.instance.error(`Failed to load page ${pagePath}: ${error}`);
            return null;
        }
    }

    selectedColor(i: number) {
        // 先将所有标签设置为未选中颜色
        this.labelsNode.forEach((node, index) => {
            const label = node.getChildByName('text').getComponent(Label);
            const line = node.getChildByName('line');
            node.scale = new Vec3(1, 1, 1);
            if (label) {
                if (index === i) {
                    line.active = true;
                    label.color = new Color(0, 89, 247); // 选中颜色（蓝色）
                    tween(node).to(0.1, { scale: new Vec3(1.1, 1.1, 1.1) }).start();
                } else {
                    line.active = false;
                    label.color = new Color(98, 99, 102); // 未选中颜色（灰色）
                }
            }
        });
    }

    async loadSumReport() {
        // 切换页签时，如果VipAlert显示了，则关闭
        this.closeVipAlertIfShown();
        
        this.selectedColor(0);
        // Clear current page
        if (this.parentNode_top.children.length > 0 && this.parentNode_bottom.children.length > 0) {
            this.parentNode_top.removeAllChildren();
            this.parentNode_bottom.removeAllChildren();
        }

        await this.loadPage(TopNavBarConfig.sumReportPrefab, this.parentNode_top);
        const userData = PersonalCenterManager.getInstance().userInfoData;
        if (!userData.has_initial_tier) {
            await this.loadPage(TopNavBarConfig.initDataPrefab, this.parentNode_bottom);
        } else {
            await this.loadPage(TopNavBarConfig.sumDataAnalysisPrefab, this.parentNode_bottom);
        }

        // 滚动到最上方
        if (this.scrollViewNode) {
            const scrollView = this.scrollViewNode.getComponent(ScrollView);
            if (scrollView) {
                scrollView.scrollTo(new Vec2(0, 1), 0.1); // 0.1秒内滚动到顶部
            }
        }
    }

    async clickOtherNavLable(event, customData) {
        if(this._pageLoadFlag){
            return;
        }
        this._pageLoadFlag = true;

        // 切换页签时，如果VipAlert显示了，则关闭
        this.closeVipAlertIfShown();

        const { data, index } = JSON.parse(customData);
        if (data) {
            this.selectedColor(index);
            let abilityType = null;
            switch (data) {
                case 'JUDGMENT':
                    abilityType = AbilityType.JUDGMENT;
                    break;
                case 'MEMORY':
                    abilityType = AbilityType.MEMORY;
                    break;
                case 'EXECUTION':
                    abilityType = AbilityType.EXECUTION;
                    break;
                case 'CALCULATION':
                    abilityType = AbilityType.CALCULATION;
                    break;
                case 'LANGUAGE':
                    abilityType = AbilityType.LANGUAGE;
                    break;
                default:
                    break;
            }

            if (abilityType) {
                ReportManager.getInstance().setCurrentAbilityType(abilityType);
            } else {
                DebugLog.instance.error(`Ability type ${data} not found!`);
            }
        }

        // Clear current page
        if (this.parentNode_top.children.length > 0 && this.parentNode_bottom.children.length > 0) {
            this.parentNode_top.removeAllChildren();
            this.parentNode_bottom.removeAllChildren();
        }

        await this.loadPage(TopNavBarConfig.otherChartItem, this.parentNode_top);
        await this.loadPage(TopNavBarConfig.otherSumDataPrefab, this.parentNode_bottom);
        // 滚动到最上方
        if (this.scrollViewNode) {
            const scrollView = this.scrollViewNode.getComponent(ScrollView);
            if (scrollView) {
                scrollView.scrollTo(new Vec2(0, 1), 0.1); // 0.1秒内滚动到顶部
            }
        }
        
        this._pageLoadFlag = false;
    }

    /**
     * 如果VipAlert显示了，则关闭它
     */
    private closeVipAlertIfShown() {
        if (UIManager.getInstance().isPanelActive(VipAlert.NAME)) {
            UIManager.getInstance().hidePanel(VipAlert.NAME);
        }
    }
}



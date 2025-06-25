import { _decorator, Component, instantiate, Node, Prefab, resources, Label, Color, Vec2, ScrollView, Button } from 'cc';
import { DebugLog } from '../Core/Util/DebugLog';
import { SkewersGameType } from '../Game/Task/Skewers/SkewersGameData';
import { ReportManager } from '../ManagerV2/ReportManager';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
const { ccclass, property } = _decorator;

export const TopNavBarConfig = {
    otherChartItem: '/prefabV2/personReport/otherChartItem',
    otherSumDataPrefab: '/prefabV2/personReport/otherSumDataPrefab',
    sumDataPrefab: '/prefabV2/personReport/sumDataPrefab',
    sumReportPrefab: '/prefabV2/personReport/sumReportPrefab',
    initDataPrefab:'/prefabV2/personReport/initDataPrefab'
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
    onLoad(): void {
        // this.scheduleOnce(() => {
        //     if (this.parentNode_top && this.parentNode_bottom) {
        //         this.init(this.parentNode_top, this.parentNode_bottom);
        //         this.loadSumReport();
        //     }
        // }, 0);
    }
    start() {

    }


    public async loadPage(pageName: string): Promise<Node> {
        if (!this.parentNode_top && !this.parentNode_bottom) {
            DebugLog.instance.error('Page node not initialized!');
            return;
        }

        // Clear current page
        if (this.parentNode_top.children.length > 0 && this.parentNode_bottom.children.length > 0) {
            this.parentNode_top.removeAllChildren();
            this.parentNode_bottom.removeAllChildren();
        }

        // Load new page
        const pagePath = TopNavBarConfig[pageName];
        if (!pagePath) {
            DebugLog.instance.error(`Page ${pageName} not found in config!`);
            return;
        }

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
            if (!pageName.includes('Data')) {
                this.parentNode_top.addChild(page);
                return this.parentNode_top;
            } else {
                this.parentNode_bottom.addChild(page);
                return this.parentNode_bottom;
            }
        } catch (error) {
            DebugLog.instance.error(`Failed to load page ${pageName}: ${error}`);
            return null;
        }
    }
    selectedColor(i: number) {
        // 先将所有标签设置为未选中颜色
        this.labelsNode.forEach((node, index) => {
            const label = node.getChildByName('text').getComponent(Label);
            const line = node.getChildByName('line');
            if (label) {
                if (index === i) {
                    line.active = true;
                    label.color = new Color(0, 89, 247); // 选中颜色（蓝色）
                } else {
                    line.active = false;
                    label.color = new Color(98, 99, 102); // 未选中颜色（灰色）
                }
            }
        });
    }
   async loadSumReport() {
        this.selectedColor(0);
        await this.loadPage('sumReportPrefab');
        const userData = PersonalCenterManager.getInstance().userInfoData;
        if(!userData.has_initial_tier){
           await this.loadPage('initDataPrefab');
        }else{
            await this.loadPage('sumDataPrefab');
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
        const { data, index } = JSON.parse(customData);
        if (data) {
            this.selectedColor(index);
            ReportManager.getInstance().getCogAbilityBrief(data);
            ReportManager.getInstance().getCogAbilityWeeklyScores(data,0);
        }
        
        await this.loadPage('otherChartItem');
        await this.loadPage('otherSumDataPrefab');
        // 滚动到最上方
        if (this.scrollViewNode) {
            const scrollView = this.scrollViewNode.getComponent(ScrollView);
            if (scrollView) {
                scrollView.scrollTo(new Vec2(0, 1), 0.1); // 0.1秒内滚动到顶部
            }
        }
    }
    update(deltaTime: number) {

    }
}



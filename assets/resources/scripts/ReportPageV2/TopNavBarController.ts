import { _decorator, Component, instantiate, Node, Prefab, resources, Label, Color } from 'cc';
import { DebugLog } from '../Core/Util/DebugLog';
import { SkewersGameType } from '../Game/Task/Skewers/SkewersGameData';
const { ccclass, property } = _decorator;

export const TopNavBarConfig = {
    otherChartItem: '/prefabV2/personReport/otherChartItem',
    otherSumDataPrefab: '/prefabV2/personReport/otherSumDataPrefab',
    sumDataPrefab: '/prefabV2/personReport/sumDataPrefab',
    sumReportPrefab: '/prefabV2/personReport/sumReportPrefab'
}
@ccclass('TopNavBarController')
export class TopNavBarController extends Component {
    @property([Node])
    labelsNode: Node[] = [];

    @property(Node)
    parentNode_top: Node = null;
    @property(Node)
    parentNode_bottom: Node = null;
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

    public async loadPage(pageName: string) {
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
            } else {
                this.parentNode_bottom.addChild(page);
            }

            DebugLog.instance.log(`Page ${pageName} loaded successfully`);
        } catch (error) {
            DebugLog.instance.error(`Failed to load page ${pageName}: ${error}`);
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
    loadSumReport() {
        this.selectedColor(0);
        this.loadPage('sumReportPrefab');
        this.loadPage('sumDataPrefab');
    }
    clickOtherNavLable(type: SkewersGameType) {
        this.loadPage('otherChartItem');
        this.loadPage('otherSumDataPrefab');
    }
    // clickCalulationLable(){

    // }
    // clickLanguageLable(){

    // }
    // clickJudegmentLable(){

    // }
    // clickExecutionLable(){

    // }
    update(deltaTime: number) {

    }
}



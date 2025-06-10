import { _decorator, Component, instantiate, Node, Prefab, resources } from 'cc';
import { DebugLog } from '../Core/Util/DebugLog';
const { ccclass, property } = _decorator;

export const TopNavBarConfig = {
    otherChartItem:'/prefabV2/personReport/otherChartItem',
    otherSumDataPrefab:'/prefabV2/personReport/otherSumDataPrefab',
    sumDataPrefab:'/prefabV2/personReport/sumDataPrefab',
    sumReportPrefab:'/prefabV2/personReport/sumReportPrefab'
}
@ccclass('TopNavBarController')
export class TopNavBarController extends Component {

    private parentNode_top: Node = null;
    private parentNode_bottom: Node = null;
    start() {

    }
    init(pageNode: Node,pageNode_bottom: Node){
        this.parentNode_top = pageNode;
        this.parentNode_bottom = pageNode_bottom;
    }
    public async loadPage(pageName: string) {
        if (!this.parentNode_top&&!this.parentNode_bottom) {
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
            if(!pageName.includes('Data')){
                this.parentNode_top.addChild(page);
            }else{
                this.parentNode_bottom.addChild(page);
            }
            
            DebugLog.instance.log(`Page ${pageName} loaded successfully`);
        } catch (error) {
            DebugLog.instance.error(`Failed to load page ${pageName}: ${error}`);
        }
    }
    clickSumLable(){

    }
    async loadSumReport(){
       await this.loadPage('sumReportPrefab');
        await this.loadPage('sumDataPrefab');
    }
    loadOtherChartItem(){
        this.loadPage('otherChartItem');
    }
    loadOtherSumData(){
        this.loadPage('otherSumDataPrefab');
    }
    loadSumData(){
        this.loadPage('sumDataPrefab');
    }

    update(deltaTime: number) {
        
    }
}



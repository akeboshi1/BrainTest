import { _decorator, Component, Node, Color, Sprite, instantiate, Prefab, resources, Label } from 'cc';
import { ColorUtil } from '../Core/Util/ColorUtil';
import { DebugLog } from '../Core/Util/DebugLog'; 
import { ReportManager } from '../ManagerV2/ReportManager';

const { ccclass, property } = _decorator;

// Define PageConfig here since it's not in a separate file
export const PageConfig = {
    index: "/prefabV2/mainV2/indexPage",
    gameCenter: "/prefabV2/mainV2/gameCenterPage",
    reporter: "/prefabV2/mainV2/reporterPage",
    personalCenter: "/prefabV2/mainV2/personalCenterPage"
};

@ccclass('PageController')
export class PageController extends Component {

    @property({type: [Node]})
     navigationButtons: Node[] = [];
 
    private _currentPage: string = 'index';
    private _pageNode: Node = null;
    private _selectedColor: Color = ColorUtil.hexToColor("#0059F7");
    private _unselectedColor: Color = ColorUtil.hexToColor("#949599");
  

    public init(pageNode: Node) {
        this._pageNode = pageNode;
    }

    private updateButtonColors(event,index) {
        // Reset all buttons to unselected color
        this.navigationButtons.forEach(button => {
           const iconComp = button.getChildByName("icon");
           const labelComp = button.getChildByName("Label")?.getComponent(Label);
           const sprite = iconComp?.getComponent(Sprite);
           if (labelComp) {
               labelComp.color = this._unselectedColor;
           }
           if (sprite) {
               sprite.color = this._unselectedColor;
           }
        });

        // Set selected button color
        const selectedButton = this.navigationButtons[Number(index)];
        if (!selectedButton) return;

        const iconComp = selectedButton.getChildByName("icon");
        const labelComp = selectedButton.getChildByName("Label")?.getComponent(Label);
        const sprite = iconComp?.getComponent(Sprite);
        
        if (labelComp) {
            labelComp.color = this._selectedColor;
        }
        if (sprite) {
            sprite.color = this._selectedColor;
        }
    }

    public async loadPage(pageName: string) {
        if (!this._pageNode) {
            DebugLog.instance.error('Page node not initialized!');
            return;
        }

        // Clear current page
        if (this._pageNode.children.length > 0) {
            this._pageNode.removeAllChildren();
        }
    // 清空报告列表初始数据

        // Load new page
        const pagePath = PageConfig[pageName];
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
            this._pageNode.addChild(page);
            this._currentPage = pageName;
            
            // Update button colors when page is loaded
            
            DebugLog.instance.log(`Page ${pageName} loaded successfully`);
        } catch (error) {
            DebugLog.instance.error(`Failed to load page ${pageName}: ${error}`);
        }
    }

    public getCurrentPage(): string {
        return this._currentPage;
    }

    loadIndexPage(){
        this.loadPage('index');
        this.updateButtonColors(null,"0");
    }

    async loadReporterPage(){
      await this.loadPage('reporter');
        this.updateButtonColors(null,"2");
    }

    loadPersonalCenterPage(){
        this.loadPage('personalCenter');
        this.updateButtonColors(null,"3");
    }

    loadGameCenterPage(){
        this.loadPage('gameCenter');
        this.updateButtonColors(null,"1");
    }
} 

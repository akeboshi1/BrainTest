import { _decorator, Component, Node, Color, Sprite, instantiate, Prefab, resources, Label } from 'cc';
import { ColorUtil } from '../Core/Util/ColorUtil';
import { DebugLog } from '../Core/Util/DebugLog'; 
import { ReportManager } from '../ManagerV2/ReportManager';
import {AdaptComponent} from "db://assets/resources/scripts/mainV2/AdaptComponent";
import {ScreenAdapter} from "db://assets/resources/scripts/Adapter/ScreenAdapter";

const { ccclass, property } = _decorator;

// Define PageConfig here since it's not in a separate file
export const PageConfig = {
    index: "/prefabV2/mainV2/indexPage",
    gameCenter: "/prefabV2/mainV2/gameCenterPage",
    reporter: "/prefabV2/mainV2/reporterPage",
    personalCenter: "/prefabV2/mainV2/personalCenterPage"
};

@ccclass('PageController')
export class PageController extends AdaptComponent {

    @property({type: [Node]})
     navigationButtons: Node[] = [];
 
    private _currentPage: string = 'index';
    private _pageNode: Node = null;
    private _selectedColor: Color = ColorUtil.hexToColor("#0059F7");
    private _unselectedColor: Color = ColorUtil.hexToColor("#949599");
  

    public init(pageNode: Node) {
        this._pageNode = pageNode;
    }

    public start(){
        super.start();
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

    public async loadPage(pageName: string, params?: any) {
        if (!this._pageNode) {
            DebugLog.instance.error('Page node not initialized!');
            return;
        }

        // Clear current page
        if (this._pageNode.children.length > 0) {
            this._pageNode.removeAllChildren();
        }

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
            // 对添加的实例进行屏幕适配
            // ScreenAdapter.getInstance().adaptPanelUI(page);

            // 如果有传入参数，遍历所有组件并设置参数
            if (params) {
                const components = page.getComponents(Component);
                components.forEach(component => {
                    if (typeof component['initWithParams'] === 'function') {
                        component['initWithParams'](params);
                    }
                });
            }
            
            this._pageNode.addChild(page);
            this._currentPage = pageName;
            
            DebugLog.instance.log(`Page ${pageName} loaded successfully`);
            
            return page;
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

    async loadReporterPage(params: any = null, data: any = null){
        await this.loadPage('reporter', data);
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

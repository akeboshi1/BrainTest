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

    public async loadPage(pageName: string, params?: any, showImmediately: boolean = true) {
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
            
            // 如果不立即显示，先隐藏页面
            if (!showImmediately) {
                page.active = false;
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

    /**
     * 显示当前页面
     */
    public showCurrentPage() {
        if (this._pageNode && this._pageNode.children.length > 0) {
            const currentPage = this._pageNode.children[0];
            currentPage.active = true;
            DebugLog.instance.log(`Page ${this._currentPage} is now visible`);
        }
    }

    /**
     * 隐藏当前页面
     */
    public hideCurrentPage() {
        if (this._pageNode && this._pageNode.children.length > 0) {
            const currentPage = this._pageNode.children[0];
            currentPage.active = false;
            DebugLog.instance.log(`Page ${this._currentPage} is now hidden`);
        }
    }

    /**
     * 等待页面数据加载完成后显示页面
     * @param pageName 页面名称
     * @param params 页面参数
     * @param dataLoadCallback 数据加载回调函数，返回Promise
     * @param buttonIndex 按钮索引，用于更新按钮状态
     */
    public async loadPageWithData(pageName: string, params?: any, dataLoadCallback?: () => Promise<void>, buttonIndex?: string) {
        // 先加载页面但不显示
        await this.loadPage(pageName, params, false);
        
        // 如果有数据加载回调，等待数据加载完成
        if (dataLoadCallback) {
            try {
                await dataLoadCallback();
                DebugLog.instance.log(`Data loading completed for page ${pageName}`);
            } catch (error) {
                DebugLog.instance.error(`Data loading failed for page ${pageName}:`, error);
            }
        } else {
            // 如果没有提供数据加载回调，等待页面自身的数据加载完成
            await this.waitForPageDataLoad();
        }
        
        // 数据加载完成后显示页面
        this.showCurrentPage();
        
        // 如果提供了按钮索引，在数据加载完成后更新按钮状态
        if (buttonIndex !== undefined) {
            this.updateButtonColors(null, buttonIndex);
            DebugLog.instance.log(`Button colors updated for page ${pageName} with index ${buttonIndex}`);
        }
    }

    /**
     * 等待页面自身的数据加载完成
     * 通过检查页面是否实现了数据加载完成通知机制
     */
    private async waitForPageDataLoad(): Promise<void> {
        if (!this._pageNode || this._pageNode.children.length === 0) {
            return;
        }

        const currentPage = this._pageNode.children[0];
        const components = currentPage.getComponents(Component);
        
        // 查找实现了数据加载完成通知的组件
        for (const component of components) {
            if (typeof component['waitForDataLoad'] === 'function') {
                try {
                    await component['waitForDataLoad']();
                    DebugLog.instance.log(`Page data loading completed via waitForDataLoad`);
                    return;
                } catch (error) {
                    DebugLog.instance.error(`Page data loading failed:`, error);
                }
            }
        }

        // 如果没有找到数据加载方法，等待一个短暂的时间让页面完成初始化
        await new Promise(resolve => setTimeout(resolve, 100));
        DebugLog.instance.log(`Page data loading completed with default timeout`);
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

    /**
     * 加载首页并等待数据加载完成
     */
    async loadIndexPageWithData(dataLoadCallback?: () => Promise<void>){
        await this.loadPageWithData('index', null, dataLoadCallback, "0");
    }

    /**
     * 加载报告页面并等待数据加载完成
     */
    async loadReporterPageWithData(params: any = null, data: any = null, dataLoadCallback?: () => Promise<void>){
        await this.loadPageWithData('reporter', data, dataLoadCallback, "2");
    }

    /**
     * 加载个人中心页面并等待数据加载完成
     */
    async loadPersonalCenterPageWithData(dataLoadCallback?: () => Promise<void>){
        await this.loadPageWithData('personalCenter', null, dataLoadCallback, "3");
    }

    /**
     * 加载游戏中心页面并等待数据加载完成
     */
    async loadGameCenterPageWithData(dataLoadCallback?: () => Promise<void>){
        await this.loadPageWithData('gameCenter', null, dataLoadCallback, "1");
    }
} 

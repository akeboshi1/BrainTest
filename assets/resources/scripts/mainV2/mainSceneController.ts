import { _decorator, Component, Node } from 'cc';
import { PageController } from './PageController';
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";
import { ReportManager } from '../ManagerV2/ReportManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import {AdaptComponent} from "db://assets/resources/scripts/mainV2/AdaptComponent";
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';


const { ccclass, property } = _decorator;

@ccclass('MainSceneController')
export class MainSceneController extends AdaptComponent {
   @property(Node)
   pageContainer: Node = null;
   @property(PageController)
   pageController: PageController = null;

    onLoad(){
        // 初始化 PageController
        // this.pageController = this.getComponent(PageController);
        this.pageController.init(this.pageContainer);
        // 不在这里自动加载首页，而是根据实际需要加载
        // 这样可以避免与后续的页面切换产生按钮状态冲突
        DebugLog.instance.log("MainSceneController onLoad完成，等待具体页面加载指令");
    }
    onEnable(){
        EventManager.getInstance().on('onShowReport', this.onShowReport, this);
        EventManager.getInstance().on('loadIndexPage', this.loadIndexPage, this);
    }
    onDisable(){
        EventManager.getInstance().off('onShowReport', this);
        EventManager.getInstance().off('loadIndexPage', this);
    }
    onShowReport(data){
        this.showReportWithData(data);
    }

    /**
     * 加载首页事件处理
     */
    loadIndexPage(){
        DebugLog.instance.log("收到加载首页事件");
        this.pageController.loadIndexPage();
    }

    start() {
        super.start();
        DebugLog.instance.log("MainSceneController start");

        this.loadReportData();
    }

    async loadReportData(){
        try {   
            await ReportManager.getInstance().getRecentReport();
            await ReportManager.getInstance().getInitialReport();
            await ReportManager.getInstance().getUserSumReport();
            DebugLog.instance.log("报告数据加载完成");
        } catch (error) {
            DebugLog.instance.error("报告数据加载失败:", error.message);
        }
    }

    update(deltaTime: number) {
        
    }

    showGameCenter(){
        this.pageController.loadGameCenterPage();
    }

     showReport(){
         this.pageController.loadReporterPage();
    }

    showPersonalCenter(){
        this.pageController.loadPersonalCenterPage();
    }

    /**
     * 加载首页并等待数据加载完成
     */
    async loadIndexPageWithData(){
        await this.pageController.loadIndexPageWithData(async () => {
            // 等待用户信息数据加载完成
            await PersonalCenterManager.getInstance().requestUserInfo();
            // 加载报告数据
            await this.loadReportData();
            DebugLog.instance.log("首页数据加载完成");
        });
    }

    /**
     * 从游戏返回时加载首页，确保按钮状态正确更新
     * 这个方法专门处理从游戏场景返回时的延迟问题
     */
    async loadIndexPageFromGame(){
        DebugLog.instance.log("从游戏返回，开始加载首页");
        await this.pageController.loadIndexPageWithData(async () => {
            // 等待用户信息数据加载完成
            await PersonalCenterManager.getInstance().requestUserInfo();
            // 加载报告数据
            await this.loadReportData();
            DebugLog.instance.log("从游戏返回首页数据加载完成");
        });
    }

    /**
     * 加载游戏中心页面并等待数据加载完成
     */
    async showGameCenterWithData(){
        await this.pageController.loadGameCenterPageWithData(async () => {
            // 这里可以添加游戏中心页面特定的数据加载逻辑
            DebugLog.instance.log("游戏中心数据加载完成");
        });
    }

    /**
     * 加载报告页面并等待数据加载完成
     */
    async showReportWithData(data?: any){
        await this.pageController.loadReporterPageWithData(null, data, async () => {
            // 等待用户信息数据加载完成
            await PersonalCenterManager.getInstance().requestUserInfo();
            // 加载报告数据
            await this.loadReportData();
            DebugLog.instance.log("报告页面数据加载完成");
        });
    }

    /**
     * 加载个人中心页面并等待数据加载完成
     */
    async showPersonalCenterWithData(){
        await this.pageController.loadPersonalCenterPageWithData(async () => {
            // 等待用户信息数据加载完成
            await PersonalCenterManager.getInstance().requestUserInfo();
            DebugLog.instance.log("个人中心数据加载完成");
        });
    }

    /**
     * 公共方法：从游戏返回时显示首页
     * 这个方法确保按钮状态在数据加载完成后正确更新
     */
    async showIndexPageFromGame(){
        await this.loadIndexPageFromGame();
    }

    /**
     * 公共方法：显示首页（普通情况）
     */
    async showIndexPage(){
        await this.loadIndexPageWithData();
    }

    /**
     * 默认加载首页（当场景加载完成但没有特定页面需要显示时）
     * 这个方法用于处理直接进入mainV2场景的情况
     */
    async loadDefaultIndexPage(){
        DebugLog.instance.log("加载默认首页");
        await this.loadIndexPageWithData();
    }

}
import { _decorator, Component, Node } from 'cc';
import { PageController } from './PageController';
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";
import { ReportManager } from '../ManagerV2/ReportManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import {AdaptComponent} from "db://assets/resources/scripts/mainV2/AdaptComponent";


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
        this.pageController.loadIndexPage();
    }
    onEnable(){
        EventManager.getInstance().on('onShowReport', this.onShowReport, this);
    }
    onDisable(){
        EventManager.getInstance().off('onShowReport', this);
    }
    onShowReport(data){
        this.pageController.loadReporterPage(null,data);
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



}
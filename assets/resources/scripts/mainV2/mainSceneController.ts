import { _decorator, Component, Node } from 'cc';
import { PageController } from './PageController';
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";
import { ReportManager } from '../ManagerV2/ReportManager';
import { EventManager } from '../Core/Manager/Event/EventManager';


const { ccclass, property } = _decorator;

@ccclass('MainSceneController')
export class MainSceneController extends Component {
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
        EventManager.getInstance().on('onBottomNavBarClick', this.onBottomNavBarClick, this);
    }
    onDisable(){
        EventManager.getInstance().off('onBottomNavBarClick', this);
    }
    onBottomNavBarClick(data){
       this.showReport(null,data);
    }

    start() {
        DebugLog.instance.log("MainSceneController start");
        
    } 

    update(deltaTime: number) {
        
    }

    showGameCenter(){
        this.pageController.loadGameCenterPage();
    }

     showReport(params?:any,data?:any){
        if(data){
         this.pageController.loadReporterPage(params,data);
        }else{
         this.pageController.loadReporterPage();
        }
      
    }

    showPersonalCenter(){
        this.pageController.loadPersonalCenterPage();
    }



}
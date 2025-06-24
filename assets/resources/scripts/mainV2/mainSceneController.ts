import { _decorator, Component, Node } from 'cc';
import { PageController } from './PageController';
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";


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

    start() {
        DebugLog.instance.log("MainSceneController start");
        
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
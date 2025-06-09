import { _decorator, Component, Node } from 'cc';
import { PageController } from './PageController';


const { ccclass, property } = _decorator;

@ccclass('MainSceneController')
export class MainSceneController extends Component {
   @property(Node)
   pageContainer: Node = null;
   @property(PageController)
   pageController: PageController = null;
   

    start() {
        // 初始化 PageController
        // this.pageController = this.getComponent(PageController);
        this.pageController.init(this.pageContainer);
        this.pageController.loadIndexPage();
        
    } 

    update(deltaTime: number) {
        
    }



}
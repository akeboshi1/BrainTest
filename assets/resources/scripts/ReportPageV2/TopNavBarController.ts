import { _decorator, Component, Node, Prefab } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TopNavBarController')
export class TopNavBarController extends Component {
    @property(Prefab)
    sumReportPreable:Prefab
    @property( Prefab )
    otherReportPrefab:Prefab
    
    start() {

    }
    clickSumLable(){

    }

    update(deltaTime: number) {
        
    }
}



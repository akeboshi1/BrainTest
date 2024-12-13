import { _decorator, Component, Node, Prefab, instantiate, Label } from 'cc';
import { EventManager } from '../../Core/Manager/Event/EventManager';
import { TaskManager } from '../Task/TaskManager';
const { ccclass, property } = _decorator;

@ccclass('InfoListPopCtrl')
export class InfoListPopCtrl extends Component {
    @property(Prefab)
    infoAlertPrefab: Prefab = null;


    @property(Node)
    parentNode: Node = null;

    private static _infoDic: Map<number, Node>=new Map();
    start() {
    }

    update(deltaTime: number) {

    }
    updateInfoList(InfoData) {
        let alertPrefab = instantiate(this.infoAlertPrefab);
        alertPrefab.parent = this.parentNode;
        alertPrefab.getChildByName('ScrollView').getChildByName('view').getChildByName('content').getChildByName('item').getComponent(Label).string = InfoData.content;
        InfoListPopCtrl._infoDic.set(InfoData.id, alertPrefab);
        let btn1 = alertPrefab.getChildByName('btn1');
        let btn2 = alertPrefab.getChildByName('btn2');
        btn1["sub_id"] = InfoData.sub_id;
        btn2["id"] = InfoData.id;
        btn1.on('click', this.gotaskList,this);
        btn2.on('click', this.hideInfoAlert,this);
    }
    gotaskList(event) {
        event.target.off('click', this.gotaskList);
        let taskid = event.target["sub_id"];
        TaskManager.getInstance().requestStartTask(Number(taskid))
    }

    hideInfoAlert(event) {
        event.target.off('click', this.hideInfoAlert);
        let alertNode = InfoListPopCtrl._infoDic.get(event.target._id);
        this.node.getChildByName('ScrollView').getChildByName('view').getChildByName('content').removeChild(alertNode);
        InfoListPopCtrl._infoDic.delete(event.target._id);
        if(InfoListPopCtrl._infoDic.size==0){
            EventManager.getInstance().emit('hideInfoListPop');
        }
    }
}



import { _decorator, Component, Node, Prefab, instantiate, Label, Button } from 'cc';
import { EventManager } from '../../Core/Manager/Event/EventManager';
import { TaskManager } from '../Task/TaskManager';
import { SkewersManager } from '../Task/Skewers/SkewersManager';
import {SceneManager} from "db://assets/scripts/Core/Manager/Scene/SceneManager";
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";
const { ccclass, property } = _decorator;

@ccclass('InfoListPopCtrl')
export class InfoListPopCtrl extends Component {
    @property(Prefab)
    taskAlertPrefab: Prefab = null;

    @property(Prefab)
    remindAlertPrefab: Prefab = null;

    @property(Node)
    parentNode: Node = null;


    private _taskID: number = -1;

    start() {
    }

    update(deltaTime: number) {

    }

    private gotaskListCallBack() {
        EventManager.getInstance().off(SkewersManager.TASK_GET_BRAIN_TRAININGS, this);
        SceneManager.getInstance().backToSkewersGameCenter().then();
        // TaskManager.getInstance().requestStartTask(this._taskID);
    }

    updateInfoList(InfoData) {
        let alertPrefab = null;
        if (InfoData.notification_type == "1") {
            alertPrefab = instantiate(this.taskAlertPrefab);
            let btn1 = alertPrefab.getChildByName('btn1');
            btn1["sub_id"] = InfoData.sub_id;
            btn1.on('click', this.gotaskList, this);
            let btn2 = alertPrefab.getChildByName('btn2');
            btn2["id"] = InfoData.id;
            btn2.on('click', this.hideInfoAlert.bind(this,alertPrefab), this);
        } else if (InfoData.notification_type == "2") {
            alertPrefab = instantiate(this.remindAlertPrefab);
            let btn1: Node = alertPrefab.getChildByName('btn1');
            btn1["id"] = InfoData.id;
            btn1.on('click', this.hideInfoAlert.bind(this,alertPrefab), this);
        }
        alertPrefab.parent = this.parentNode;
        alertPrefab.getChildByName('ScrollView').getChildByName('view').getChildByName('content').getChildByName('item').getComponent(Label).string = InfoData.content;
    }
   
    gotaskList(event) {
        event.target.off('click', this.gotaskList);
        this._taskID = Number(event.target["sub_id"]);
        let taskDic = TaskManager.getInstance().taskDic;
        Global.userData.curTaskData = taskDic.get(this._taskID);
        EventManager.getInstance().on(SkewersManager.TASK_GET_BRAIN_TRAININGS, this.gotaskListCallBack, this);
        SkewersManager.getInstance().requestBranisTraining_list(this._taskID);
    }

    hideInfoAlert(infoItem:Node) {
        let content: Node = this.node.getChildByName('ScrollView').getChildByName('view').getChildByName('content');
        infoItem.removeFromParent();
        if (content.children.length == 0) {
            EventManager.getInstance().emit('hideInfoListPop');
        }
    }
}



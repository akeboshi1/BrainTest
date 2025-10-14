import { _decorator, Node, Prefab, instantiate, Label, Button, UITransform, tween, Vec3 } from 'cc';


import { SceneManager } from "db://assets/resources/scripts/Core/Manager/Scene/SceneManager";
import { Global } from "db://assets/resources/scripts/Core/Manager/Config/Global";
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { TaskManager } from '../../Task/TaskManager';
import { SkewersManager } from '../../Task/Skewers/SkewersManager';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { BasePanel } from '../../../Core/UI/BasePanel';

const { ccclass, property } = _decorator;
@ccclass('InfoListPopCtrl')
export class InfoListPopCtrl extends BasePanel {
   
    public static NAME: string = "InfoListPopCtrl";
    @property(Prefab)
    taskAlertPrefab: Prefab = null;

    @property(Prefab)
    remindAlertPrefab: Prefab = null;

    @property(Node)
    parentNode: Node = null;

    private _taskID: number = -1;
    private _closeCb: () => void = null;

    onEnable(): void {
        EventManager.getInstance().on(TaskManager.PushEvetCallBack, this.onInfoDataUpdate, this);
    }

    onDisable(): void {
        EventManager.getInstance().off(TaskManager.PushEvetCallBack, this);
    }

    restore(data: { closeCb: () => {} }): void {
        if (data) {
            this._closeCb = data.closeCb;
        }
        this.onInfoDataUpdate();
    }

    onInfoDataUpdate() {
        let infodataCache:any[] = TaskManager.getInstance().infoDataCache;
        for(let i = 0; i < infodataCache.length; i++) {
            this.updateInfoList(infodataCache[i]);
        }
        TaskManager.getInstance().cleanInfoDataCache();
    }

    private gotaskListCallBack() {
        EventManager.getInstance().off(SkewersManager.TASK_GET_BRAIN_TRAININGS, this);
        SceneManager.getInstance().backToHall().then();
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
            btn2.on('click', this.hideInfoAlert.bind(this, alertPrefab), this);
        } else if (InfoData.notification_type == "2") {
            alertPrefab = instantiate(this.remindAlertPrefab);
            let btn1: Node = alertPrefab.getChildByName('btn1');
            btn1["id"] = InfoData.id;
            btn1.on('click', this.hideInfoAlert.bind(this, alertPrefab), this);
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

    hideInfoAlert(infoItem: Node) {
        infoItem.removeFromParent();
        if (this.parentNode.children.length == 0) {
            UIManager.getInstance().hidePanel(InfoListPopCtrl.NAME);
        }
    }


    async hidePanel(): Promise<void> {
        await super.hidePanel();
        if (this._closeCb) {
            this._closeCb();
        }
    }
}



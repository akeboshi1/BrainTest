import { _decorator, Component, Node, Prefab, instantiate, Label, resources, SpriteFrame, Sprite } from 'cc';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { DebugLog } from '../Core/Util/DebugLog';
import { UserInfoData } from '../Game/PersonalCenterManager/UserInfoData';


import { ReportData, ReportManager } from '../ManagerV2/ReportManager';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { TaskAndNotificationPanelCtrl } from '../Game/UI/TaskAndNotificationPanel/TaskAndNotificationPanelCtrl';
import { BundleName } from '../Core/Manager/Load/BundleName';
import {VipPanel} from "db://assets/resources/scripts/Game/UI/Vip/VipPanel";

import { RadiaGraph } from './RadiaGraph';
import { TaskItemController } from './TaskItemController';
import { TaskContainerConfig } from './TaskContainerConfig';

const { ccclass, property } = _decorator;


@ccclass('IndexPageView')
export class IndexPageView extends Component {
    @property(Prefab)
    private taskPrefab: Prefab = null;
    @property(Node)
    private taskContainer: Node = null;
    @property(Label)
    private userName: Label = null;
    @property(Label)
    private dayLabel: Label = null;
    @property(Node)
    private radarMap: Node = null;
    @property(Prefab)
    private initDataPrefab: Prefab=null;
    @property(Node)
    private initDataParent: Node=null;

    private taskConfig: TaskContainerConfig = new TaskContainerConfig();

    @property(Node)
    vipNode: Node = null;

    start() {
        UIManager.getInstance().registerPanel(VipPanel.NAME, BundleName.RESOURCES, '/prefab/VipPanel/VipPanel', VipPanel);
        ReportManager.getInstance().getPersonalReport();
        PersonalCenterManager.getInstance().requestUserInfo();

    }
    onEnable() {
        EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, this.getUserInfoCallBack, this);
        EventManager.getInstance().on(ReportManager.getBrainTrainingTiersCallback, this.getBrainTrainingTiersCallback, this);
    }
    onDisable() {
        EventManager.getInstance().off(PersonalCenterManager.getUserInfoCallBack, this);
        EventManager.getInstance().off(ReportManager.getBrainTrainingTiersCallback, this);
    }
    // 获取大脑训练等级回调函数
    getBrainTrainingTiersCallback() {
        let reportDataList: ReportData[] = ReportManager.getInstance().reportDataList;
        const values = reportDataList.map(item => item.tier);
        this.radarMap.getComponent(RadiaGraph).setValues(values);
    }
    getUserInfoCallBack(data: any) {
        const userData: UserInfoData = PersonalCenterManager.getInstance().userInfoData;
        DebugLog.instance.log("用户信息", userData);
        this.setUserName(userData.full_name);
        this.setDayLabel(userData.trained_days);
        if(!userData.has_initial_tier){
           let initDataPanel= instantiate(this.initDataPrefab);
           initDataPanel.parent=this.initDataParent;
           initDataPanel.setPosition(0,0);
        }else{
          this.generateTask();
        }

        // 当会员时间还剩余1天，显示续费入口
        if (PersonalCenterManager.getInstance().userInfoData.getMemberRemainingDays() == 1) {
            this.vipNode.active = true;
        } else {
            this.vipNode.active = false;
        }
    }

    setUserName(name) {
        this.userName.string = name;
    }
    setDayLabel(day: number) {
        this.dayLabel.string = `${day}天`;
    }
    update(deltaTime: number) {
        
    }


    renewalHandler(){
        UIManager.getInstance().showPanel(VipPanel.NAME);
    }


    async generateTask() {
        await this.taskConfig.loadConfig();
        let taskdata = this.taskConfig.taskData;
        for (let i = 0; i < taskdata.length; i++) {
            let taskItem = instantiate(this.taskPrefab);
            // taskItem.setPosition(0, -i*350, 0);
            let taskController = taskItem.getComponent(TaskItemController);
            taskController.setTaskIndex(i);
            taskController.setTaskTitle(taskdata[i].title);
            taskController.setTaskContent(taskdata[i].txt);
            await taskController.setTaskBg(taskdata[i].icon_bg);
            await taskController.setTaskIcon(taskdata[i].icon);
            taskController.setIsComplete(taskdata[i].is_complete);
            taskController.node.parent = this.taskContainer;

        }
    }

    setTaskItem() {
        // this.taskItem.setTaskTitle(title);
    }
    showUserInfo() {
        PersonalCenterManager.getInstance().requestUserInfo();
    }
}



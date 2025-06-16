import { _decorator, Component, Node, Prefab, instantiate, Label, resources, SpriteFrame, Sprite } from 'cc';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { DebugLog } from '../Core/Util/DebugLog';
import { UserInfoData } from '../Game/PersonalCenterManager/UserInfoData';


import { ReportData, ReportManager } from '../ManagerV2/ReportManager';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { TaskAndNotificationPanelCtrl } from '../Game/UI/TaskAndNotificationPanel/TaskAndNotificationPanelCtrl';
import { BundleName } from '../Core/Manager/Load/BundleName';

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

    private taskConfig: TaskContainerConfig = new TaskContainerConfig();

    async start() {
        await this.generateTask();
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
    }

    setUserName(name) {
        this.userName.string = name;
    }
    setDayLabel(day: number) {
        this.dayLabel.string = `${day}天`;
    }
    update(deltaTime: number) {

    }

    async generateTask() {
        await this.taskConfig.loadConfig();
        let taskdata = this.taskConfig.taskData;
        for (let i = 0; i < taskdata.length; i++) {
            let taskItem = instantiate(this.taskPrefab);
            // taskItem.setPosition(0, -i*350, 0);
            let taskController = taskItem.getComponent(TaskItemController);
            taskController.onFirstTaskClick = this.onFirstTaskClick.bind(this);
            taskController.onOtherTaskClick = this.onOtherTaskClick.bind(this);
            taskController.setTaskTitle(taskdata[i].title); 
            taskController.setTaskContent(taskdata[i].txt);
            await taskController.setTaskBg(taskdata[i].icon_bg);
            await taskController.setTaskIcon(taskdata[i].icon);
            taskController.setIsComplete(taskdata[i].is_complete);
            taskController.node.parent = this.taskContainer;      
                  
        }   
    }

    // async initTaskData(taskId: string) {
    //     try {
    //         await this.taskConfig.loadConfig();

    //         // // 设置文本内容
    //         // this.taskTitle.string = taskData.title;
    //         // this.taskContent.string = taskData.txt;

    //         // 加载精灵图片
    //         await Promise.all([
    //             this.loadSprite(taskData.icon_bg, this.taskBg),
    //             this.loadSprite(taskData.icon, this.taskIcon)
    //         ]);
    //     } catch (err) {
    //         DebugLog.instance.error(`初始化任务数据失败: ${err}`);
    //     }
    // }

    private onFirstTaskClick(taskController: TaskItemController) {
        UIManager.getInstance().registerPanel(TaskAndNotificationPanelCtrl.NAME, BundleName.RESOURCES, "prefab/TaskAndNotification/TaskAndNotificationPanel", TaskAndNotificationPanelCtrl);
        UIManager.getInstance().showPanel(TaskAndNotificationPanelCtrl.NAME);
    }

    private onOtherTaskClick(index: number, taskController: TaskItemController) {
        console.log(`Task ${index} clicked`);
    }

    setTaskItem() {
        // this.taskItem.setTaskTitle(title);
    }
    showUserInfo() {
        PersonalCenterManager.getInstance().requestUserInfo();
    }
}



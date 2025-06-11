import { _decorator, Component, Node, Prefab, instantiate, Label } from 'cc';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { DebugLog } from '../Core/Util/DebugLog';
import { UserInfoData } from '../Game/PersonalCenterManager/UserInfoData';
import { TaskItemController } from './TaskItemController';
import { RadiaGraph } from './RadiaGraph';
import { ReportData, ReportManager } from '../ManagerV2/ReportManager';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { TaskAndNotificationPanelCtrl } from '../Game/UI/TaskAndNotificationPanel/TaskAndNotificationPanelCtrl';
import { BundleName } from '../Core/Manager/Load/BundleName';

const { ccclass, property } = _decorator;


@ccclass('IndexPageController')
export class IndexPageController extends Component {
    @property(Prefab)
    private taskPrefab: Prefab = null;
    @property(Node)
    private taskContainer: Node = null;
    @property(Label)
    private userName: Label = null;
    @property(Node)
    private radarMap: Node = null;

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
    getBrainTrainingTiersCallback(){
       let reportDataList: ReportData[] = ReportManager.getInstance().reportDataList;
       const values = reportDataList.map(item => item.tier);
       this.radarMap.getComponent(RadiaGraph).setValues(values);
    }
    getUserInfoCallBack(data: any) {
        const userData:UserInfoData = PersonalCenterManager.getInstance().userInfoData;
        DebugLog.instance.log("用户信息", userData);
        this.setUserName(userData.full_name);
    }
  
    setUserName(name) {
        this.userName.string = name;
    }
    update(deltaTime: number) {
        
    }
    
    async generateTask() {
        for (let i = 0; i < 2; i++) {
            const task = instantiate(this.taskPrefab);
            const taskController = task.getComponent(TaskItemController);
            if (taskController) {
                await taskController.initTaskData(`task${i}`);
            }
            if (i === 0) {
                task.on(Node.EventType.TOUCH_END, () => {
                    this.onFirstTaskClick(taskController);
                }, this);
            } else {
                task.on(Node.EventType.TOUCH_END, () => {
                    this.onOtherTaskClick(i, taskController);
                }, this);
            }
            
            this.taskContainer.addChild(task);
            task.setPosition(0, -i*(350+80), 0);
        }
    }
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
    showUserInfo(){
       PersonalCenterManager.getInstance().requestUserInfo();
    }
}



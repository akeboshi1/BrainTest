import { _decorator, Component, Node, Prefab, instantiate, Label, resources, SpriteFrame, Sprite, Button, UITransform } from 'cc';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { DebugLog } from '../Core/Util/DebugLog';
import { UserInfoData } from '../Game/PersonalCenterManager/UserInfoData';


import { ReportData, ReportManager } from '../ManagerV2/ReportManager';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { BundleName } from '../Core/Manager/Load/BundleName';
import { VipPanel } from "db://assets/resources/scripts/Game/UI/Vip/VipPanel";

import { RadiaGraph } from './RadiaGraph';
import { TaskItemController } from './TaskItemController';
import { TaskContainerConfig } from './TaskContainerConfig';
import { TaskManager } from '../Game/Task/TaskManager';
import { TaskAndNotificationPanelCtrl } from '../Game/UI/TaskAndNotificationPanel/TaskAndNotificationPanelCtrl';
import { SceneManager } from '../Core/Manager/Scene/SceneManager';
import { AlertData, AlertManager } from '../Core/Manager/Alert/AlertManager';
import { Global } from '../Core/Manager/Config/Global';
import { BundlePreloadEvent, BundlePreloadManager } from '../Core/Manager/Load/BundlePreloadManager';


const { ccclass, property } = _decorator;


@ccclass('IndexPageView')
export class IndexPageView extends Component {
    @property(Prefab)
    private taskPrefab: Prefab = null;
    @property(Node)
    private taskContainer: Node = null;
    @property(Label)
    private userName: Label = null;
    @property(Sprite)
    private userIcon: Sprite = null;
    @property(Label)
    private dayLabel: Label = null;
    @property(Node)
    private radarMap: Node = null;
    @property(Prefab)
    private initDataPrefab: Prefab = null;
    @property(Node)
    private initDataParent: Node = null;
    @property(Node)
    private trendEntery: Node = null;

    private taskConfig: TaskContainerConfig = new TaskContainerConfig();

    @property(Node)
    vipNode: Node = null;

    start() {
        UIManager.getInstance().registerPanel(VipPanel.NAME, BundleName.RESOURCES, '/prefab/VipPanel/VipPanel', VipPanel);
        ReportManager.getInstance().getPersonalReport();
        ReportManager.getInstance().getPersonalInitialReport();
        PersonalCenterManager.getInstance().requestUserInfo();
    }
    clickNavBar(event, data) {
        const userData: UserInfoData = PersonalCenterManager.getInstance().userInfoData;
        if(!userData.has_initial_tier){
            return;
        }
        EventManager.getInstance().emit('onShowReport', data);
    }
    onEnable() {
        EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, this.getUserInfoCallBack, this);
        EventManager.getInstance().on(ReportManager.getBrainTrainingTiersCallback, this.getBrainTrainingTiersCallback, this);
    }
    onDisable() {
        EventManager.getInstance().off(BundlePreloadEvent.FINISH, this);
        EventManager.getInstance().off(PersonalCenterManager.getUserInfoCallBack, this);
        EventManager.getInstance().off(ReportManager.getBrainTrainingTiersCallback, this);
    }
    // 获取大脑训练等级回调函数
    getBrainTrainingTiersCallback() {
        let reportDataList: ReportData[] = ReportManager.getInstance().reportDataList;
        const values = reportDataList.map(item => item.tier);
        this.radarMap.getComponent(RadiaGraph).setValues(values);
    }
    async getUserInfoCallBack(data: any) {
        const userData: UserInfoData = PersonalCenterManager.getInstance().userInfoData;
         if(userData.gender==1){
            const spriteFrame = await this.loadTaskSprite('textureV2/indexPage/male/spriteFrame');
            this.userIcon.spriteFrame = spriteFrame;
         }else{
            const spriteFrame = await this.loadTaskSprite('textureV2/indexPage/female/spriteFrame');
            this.userIcon.spriteFrame = spriteFrame;
         }
         if(userData.full_name){
            this.setUserName(userData.nickname);
         }else{
            this.setUserName("未设置昵称");
         }
      
        this.setDayLabel(userData.trained_days);
        if (!userData.has_initial_tier) {
            this.initDataParent.active = true;
            TaskManager.getInstance().start();
            let initDataPanel = instantiate(this.initDataPrefab);
            initDataPanel.parent = this.initDataParent;
            initDataPanel.setPosition(0, 0);
        } else {
            this.trendEntery.active = true;
            this.generateTask();
        }

        // 当会员时间还剩余1天，显示续费入口
        if (PersonalCenterManager.getInstance().userInfoData.getMemberRemainingDays() == 1) {
            this.vipNode.active = true;
        } else {
            this.vipNode.active = false;
        }
    }
    async loadTaskSprite(path: string): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            resources.load(path, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    DebugLog.instance.error(`Failed to load sprite: ${path}`, err);
                    reject(err);
                    return;
                }

                if (!spriteFrame) {
                    DebugLog.instance.error(`Loaded sprite frame is null: ${path}`);
                    reject(new Error('Loaded sprite frame is null'));
                    return;
                }
                resolve(spriteFrame);
            });
        })
    }
    setUserName(name) {
        this.userName.string = name;
    }
    setDayLabel(day: number) {
        this.dayLabel.string = `${day}天`;
    }
    renewalHandler() {
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
            taskController.setClickCallback(this[taskdata[i].click_function_name].bind(this))
            taskController.node.parent = this.taskContainer;
        }
    }
    showBrainTrainingPanel() {
        let is_member = PersonalCenterManager.getInstance().userInfoData.is_member;
        if (is_member) {
            UIManager.getInstance().registerPanel(TaskAndNotificationPanelCtrl.NAME, BundleName.RESOURCES, "prefab/TaskAndNotification/TaskAndNotificationPanel", TaskAndNotificationPanelCtrl);
            UIManager.getInstance().showPanel(TaskAndNotificationPanelCtrl.NAME);
        } else {
            const alertData: AlertData = new AlertData();
            alertData.title = "去解锁会员,畅玩更多功能";
            alertData.cancelButtonVisible=true;
            alertData.confirmCb = function () {
                this.cofirmGoToVip();
            }.bind(this);
            AlertManager.getInstance().showAlert(alertData);
        }
    }

    navigatetoFingerGame() {
        let is_member = PersonalCenterManager.getInstance().userInfoData.is_member;
        if (is_member) {
            this.goToFingerCame();
        } else {
            const alertData: AlertData = new AlertData();
            alertData.title = "去解锁会员,畅玩更多功能";
            alertData.cancelButtonVisible=true;
            alertData.confirmCb = function () {
                this.cofirmGoToVip();
            }.bind(this);
            AlertManager.getInstance().showAlert(alertData);
        }
    }
    private _clickBoo = false;
    goToFingerCame(){
        if (this._clickBoo) {
            return;
        }
        this._clickBoo = true;
        let url = Global.RES_Root + BundleName.FINGERGAME;
        EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onPreloadFinish.bind(this, url, BundleName.FINGERGAME), this, true);
        BundlePreloadManager.getInstance().preload(BundleName.FINGERGAME); 
    }
    private onPreloadFinish(url: string, sceneName: string, data: any) {
        let self = this;
        SceneManager.getInstance().changeScene(url, sceneName).then((scene) => {
            self._clickBoo = false;
            DebugLog.instance.log(`${sceneName} 场景切换成功`);
        });
    }
    cofirmGoToVip() {
        UIManager.getInstance().showPanel(VipPanel.NAME);
    }
    showUserInfo() {
        PersonalCenterManager.getInstance().requestUserInfo();
    }
}



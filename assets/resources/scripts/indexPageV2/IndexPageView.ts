import { _decorator, Node, Prefab, instantiate, Label, resources, SpriteFrame, Sprite, UITransform, Texture2D, assetManager, ImageAsset, Rect, view } from 'cc';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { DebugLog } from '../Core/Util/DebugLog';
import { ReportData, ReportManager } from '../ManagerV2/ReportManager';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { BundleName } from '../Core/Manager/Load/BundleName';
import { VipPanel } from "db://assets/resources/scripts/Game/UI/Vip/VipPanel";
import { RadiaGraph } from './RadiaGraph';
import { TaskItemController } from './TaskItemController';
import { TaskContainerConfig } from './TaskContainerConfig';
import { IndexPageConfig } from './IndexPageConfig';
import { TaskManager } from '../Game/Task/TaskManager';
import { TaskAndNotificationPanelCtrl } from '../Game/UI/TaskAndNotificationPanel/TaskAndNotificationPanelCtrl';
import { SceneManager } from '../Core/Manager/Scene/SceneManager';
import { AlertData, AlertManager } from '../Core/Manager/Alert/AlertManager';
import { Global } from '../Core/Manager/Config/Global';
import { BundlePreloadEvent, BundlePreloadManager } from '../Core/Manager/Load/BundlePreloadManager';
import { AdaptComponent } from "db://assets/resources/scripts/mainV2/AdaptComponent";
import { VipAlert } from '../Game/UI/Vip/VipAlert';
import { GameType } from '../Core/Scene/SceneModel/BaseGameModel';
import { ThemeConfig, ThemeConfigData } from '../Config/ThemeConfig';
import { SkewersManager } from '../Game/Task/Skewers/SkewersManager';
import { GlobalConfigManager } from '../Config/GlobalConfigManager';
import { ImageLoaderUtil } from '../Core/Util/ImageLoaderUtil';
import {ChatPanel} from "db://assets/resources/scripts/Game/UI/ChatPanel/ChatPanel";


const { ccclass, property } = _decorator;


@ccclass('IndexPageView')
export class IndexPageView extends AdaptComponent {
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

    @property(Node)
    private vipIcon: Node = null;

    @property(Node)
    private vipBg: Node = null;

    @property(Node)
    private vipNoBg: Node = null;

    @property(Node)
    private titleBg: Node = null;

    @property(Node)
    private titleIcon: Node = null;

    @property(Node)
    private titleText: Node = null;

    private taskConfig: TaskContainerConfig = new TaskContainerConfig();
    private indexPageConfig: IndexPageConfig = new IndexPageConfig();

    @property(Node)
    vipNode: Node = null;

    private _listenerId: string = null;
    private _dataLoadPromise: Promise<void> = null;
    private _dataLoadResolve: Function = null;
    private _configApplied: boolean = false; // 防止重复应用配置

    async start() {
        super.start();
        UIManager.getInstance().registerPanel(VipPanel.NAME, BundleName.RESOURCES, '/prefab/VipPanel/VipPanel', VipPanel);
        UIManager.getInstance().registerPanel(VipAlert.NAME, BundleName.RESOURCES, "/prefab/VipPanel/VipAlert", VipAlert);

        // 创建数据加载Promise
        this._dataLoadPromise = new Promise<void>((resolve) => {
            this._dataLoadResolve = resolve;
        });

        // 使用缓存机制请求用户信息
        PersonalCenterManager.getInstance().requestUserInfo().then(() => {
            this.getUserInfoCallBack();
        }).catch((error) => {
            DebugLog.instance.error("加载用户信息失败:", error);
        });
    }

    onEnable() {
        // 注意：getUserInfoCallBack已经在start()中通过Promise方式调用，这里不需要重复监听
        // EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, this.getUserInfoCallBack, this);

        this._listenerId = ReportManager.getInstance().reportDataList.addListener(this.onReportDataListChange.bind(this));

    }

    onDisable() {
        EventManager.getInstance().off(BundlePreloadEvent.FINISH, this);
        EventManager.getInstance().off(PersonalCenterManager.getUserInfoCallBack, this);

        ReportManager.getInstance().reportDataList.removeListenerById(this._listenerId);
    }

    onReportDataListChange(data: ReportData[]) {
        const values = data.map(item => item.tier);
        this.radarMap.getComponent(RadiaGraph).setValues(values);
        this.radarMap.getComponent(RadiaGraph).updateView(data);
    }

    async getUserInfoCallBack() {
        const userData = PersonalCenterManager.getInstance().userInfoData;
        if (!userData) { return; }
        this.vipBg.active = userData.is_member;
        this.vipNoBg.active = !userData.is_member;
        if (userData.gender == 1) {
            const spriteFrame = await this.loadTaskSprite('textureV2/indexPage/male/spriteFrame');
            this.userIcon.spriteFrame = spriteFrame;
        } else {
            const spriteFrame = await this.loadTaskSprite('textureV2/indexPage/female/spriteFrame');
            this.userIcon.spriteFrame = spriteFrame;
        }
        if (userData.full_name) {
            this.setUserName(userData.nickname);
        } else {
            this.setUserName("未设置昵称");
        }

        this.setDayLabel(userData.trained_days);

        // 当会员时间还剩余1天，显示续费入口
        if (userData.getMemberRemainingDays() == 1) {
            this.vipNode.active = true;
        } else {
            this.vipNode.active = false;
        }
        if (!userData.has_initial_tier) {
            this.initDataParent.active = true;
            TaskManager.getInstance().start();
            let initDataPanel = instantiate(this.initDataPrefab);
            initDataPanel.parent = this.initDataParent;
            initDataPanel.setPosition(0, 0);
        } else {
            this.trendEntery.active = true;
            await this.generateTask();
        }

        // 应用首页配置
        await this.applyIndexPageConfig();

        // 数据加载完成，通知PageController
        if (this._dataLoadResolve) {
            this._dataLoadResolve();
            this._dataLoadResolve = null;
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


    buyHandler() {
        UIManager.getInstance().showPanel(VipPanel.NAME);
    }

    setUserName(name) {
        if (name.length > 5) {
            name = name.substring(0, 6) + '...';
        }
        this.userName.string = name;
    }

    setDayLabel(day: number) {
        this.dayLabel.string = `${day}天`;
    }

    renewalHandler() {
        UIManager.getInstance().showPanel(VipPanel.NAME);
    }


    /**
     * 应用首页配置到UI
     */
    async applyIndexPageConfig() {
        // 防止重复调用
        if (this._configApplied) {
            DebugLog.instance.log("配置已经应用过，跳过重复调用");
            return;
        }

        // 使用GlobalConfigManager的公共方法
        await GlobalConfigManager.getInstance().applyIndexPageConfig(
            this.titleBg,
            this.titleIcon,
            this.titleText
        );

        // 标记配置已应用
        this._configApplied = true;
        DebugLog.instance.log("IndexPageView配置应用完成");
    }

    async generateTask() {
        // 使用GlobalConfigManager获取任务配置
        const taskdata = await GlobalConfigManager.getInstance().getTaskConfig();
        
        await this.taskConfig.loadConfig();
        EventManager.getInstance().on(TaskManager.TaskListRequestCallBack, this._taskListCallBack.bind(this,taskdata), this, true);
        TaskManager.getInstance().requestTaskList();
    }

    private async _taskListCallBack(taskdata){
        // 如果缓存中没有任务配置，则重新加载
        if (!taskdata) {
            DebugLog.instance.log("缓存中没有任务配置，重新加载");
            taskdata = await GlobalConfigManager.getInstance().getTaskConfig();
        }

        let iconPath =[
            "textureV2/indexPage/brainIcon/spriteFrame",
            "textureV2/indexPage/handIcon/spriteFrame",
            "textureV2/indexPage/talkIcon/spriteFrame"];
        for (let i = 0; i < taskdata.length; i++) {
            let taskItem = instantiate(this.taskPrefab);
            let taskController = taskItem.getComponent(TaskItemController);
            taskController.setTaskIndex(i);
            taskController.setTaskTitle(taskdata[i].title);
            taskController.setTaskContent(taskdata[i].txt);
            if(i == 0){
                TaskManager.getInstance().getFirstUnCompleteTask();
                if(TaskManager.getInstance().getFirstUnCompleteTask()){
                    taskController.setIsComplete(false);
                }else{
                    taskController.setIsComplete(true);
                }
            }else if(i == 2){
                taskController.setButtonStr("去聊天");
            }
            await taskController.setTaskBg(taskdata[i].btn);
            await taskController.setTaskIcon(iconPath[i], taskdata[i].icon_color);
            await taskController.setbgColor(taskdata[i].bg0_color, taskdata[i].bg1_color);

            //设置文本颜色
            // if (taskdata[i].word_color) {
            //     taskController.setTaskWordColor(taskdata[i].word_color);
            // }

            // // 设置文本外发光效果
            // if (taskdata[i].word_out_color) {
            //     taskController.setTaskWordOutline(taskdata[i].word_out_color);
            // }

            // taskController.setIsComplete(taskdata[i].is_complete);
            taskController.setClickCallback(this[taskdata[i].click_function_name].bind(this))
            taskController.node.parent = this.taskContainer;
        }
    }

    private taskListRequestCallBack() {
        const firstUnCompleteTask = TaskManager.getInstance().getFirstUnCompleteTask();
        if (firstUnCompleteTask) {
            TaskManager.getInstance().setCurTaskId(firstUnCompleteTask.id);
            EventManager.getInstance().on(SkewersManager.TASK_GET_BRAIN_TRAININGS, this.requestBranisTraining_listCallBack.bind(this), this, true);
            SkewersManager.getInstance().requestBranisTraining_list(firstUnCompleteTask.id);
        } else {
            // 没有未完成的任务，显示完成提示弹窗
            this.showAllTasksCompleteAlert();
        }
    }

    private requestBranisTraining_listCallBack() {
        const firstUnCompleteTask = TaskManager.getInstance().getFirstUnCompleteTask();
        if (firstUnCompleteTask) {
            TaskManager.getInstance().requestStartTask(firstUnCompleteTask.id);
        } else {
            // 没有未完成的任务，显示完成提示弹窗
            this.showAllTasksCompleteAlert();
        }

    }

    /**
     * 显示所有任务完成提示弹窗
     */
    private showAllTasksCompleteAlert() {
        AlertManager.getInstance().showToastAlert("当前时间段任务已全部完成");
    }

    showBrainTrainingPanel() {
        let is_member = PersonalCenterManager.getInstance().userInfoData.is_member;
        if (is_member) {
            // EventManager.getInstance().on(TaskManager.TaskListRequestCallBack, this.taskListRequestCallBack, this, true);
            // TaskManager.getInstance().requestTaskList();
            this.taskListRequestCallBack();

            // UIManager.getInstance().registerPanel(TaskAndNotificationPanelCtrl.NAME, BundleName.RESOURCES, "prefab/TaskAndNotification/TaskAndNotificationPanel", TaskAndNotificationPanelCtrl);
            // UIManager.getInstance().showPanel(TaskAndNotificationPanelCtrl.NAME);
        } else {
            const alertData: AlertData = new AlertData();
            alertData.title = "去解锁会员,畅玩更多功能";
            alertData.cancelButtonVisible = true;
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
            alertData.cancelButtonVisible = true;
            alertData.confirmCb = function () {
                this.cofirmGoToVip();
            }.bind(this);
            AlertManager.getInstance().showAlert(alertData);
        }
    }

    showAIChatPanel(){
        UIManager.getInstance().registerPanel(ChatPanel.NAME,BundleName.RESOURCES,"prefab/ChatPanel/ChatPanel2",ChatPanel);
        UIManager.getInstance().showPanel(ChatPanel.NAME);
    }

    private _clickBoo = false;
    goToFingerCame() {
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
        SceneManager.getInstance().changeScene(sceneName, "", { gametype: GameType.SKEWERS }).then((scene) => {
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

    clickNavBar(event, data) {
        const userData = PersonalCenterManager.getInstance().userInfoData;
        if (!userData.has_initial_tier) {
            return;
        }
        EventManager.getInstance().emit('onShowReport', data);
    }


    /**
     * 强制刷新首页配置
     * 清除缓存并重新加载配置
     */
    async refreshIndexPageConfig(): Promise<void> {
        // 使用GlobalConfigManager清除缓存
        await GlobalConfigManager.getInstance().refreshIndexPageConfig();

        // 重置配置应用标志
        this._configApplied = false;

        // 重新应用配置
        await this.applyIndexPageConfig();
    }

    /**
     * 等待数据加载完成
     * 供PageController调用，用于延迟显示页面
     */
    async waitForDataLoad(): Promise<void> {
        if (this._dataLoadPromise) {
            await this._dataLoadPromise;
        }
    }
}



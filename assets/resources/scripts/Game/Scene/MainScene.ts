import { _decorator, Button, Component, Label, Node} from 'cc';
import { DebugLog } from "../../../scripts/Core/Util/DebugLog";
import { TaskManager } from "../../Game/Task/TaskManager";
import { EventManager } from "../../Core/Manager/Event/EventManager";
import { ChatPanelCtrl } from '../UI/ChatPanel/ChatPanelCtrl';
import { TimeUtil } from "../../Core/Util/TimeUtil";
import { Global } from "db://assets/resources/scripts/Core/Manager/Config/Global";
import { SceneManager } from "db://assets/resources/scripts/Core/Manager/Scene/SceneManager";
import { SkewersManager } from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
import  {AlertManager, AlertData } from '../../Core/Manager/Alert/AlertManager';
import { LocalStorageUtil } from '../../Core/Util/LocalStorageUtil';

import { BundlePreloadEvent, BundlePreloadManager } from '../../Core/Manager/Load/BundlePreloadManager';
import { InfoListPopCtrl } from '../UI/TaskAndNotificationPanel/InfoListPopCtrl';
import { FrameComponent } from '../../Core/Component/FrameComponent';
import { BundleName } from '../../Core/Manager/Load/BundleName';
import { UIManager } from '../../Core/Manager/UI/UIManager';

import { GameCenter } from '../UI/GameCenter/GameCenter';
import { BrainTrain } from '../UI/BrainTrain/BrainTrain';
import { TaskAndNotificationPanelCtrl } from '../UI/TaskAndNotificationPanel/TaskAndNotificationPanelCtrl';
import FeatureTogglesSetting, { FeatureToggle } from '../../FeatureTogglesSetting';
import { GameType } from '../../Core/Scene/SceneModel/BaseGameModel';

const { ccclass, property } = _decorator;

export enum MainSceneView {
    TaskNode,
    GameCenter,
    TaskProgressView,
    BrainTrainView
}

@ccclass('MainScene')
export class MainScene extends Component {

    // ===================== 主界面
    /**
     * 主界面
     */
    @property(Node)
    taskNode: Node = null;

    @property(Label)
    timeLabel: Label = null;

    @property(Label)
    dayLabel: Label = null;

    @property(Label)
    titleLabel: Label = null;

    @property(Label)
    taskDesLabel: Label = null;

    @property(Node)
    taskEnterLabel: Label = null;

    @property(Node)
    taskView: Node = null;

    @property(Node)
    remindView: Node = null;

    @property(FrameComponent)
    frame: FrameComponent = null;

    @property(Node)
    brainTrainView: Node = null;

    @property(Node)
    gameCenterNode: Node = null;

    @property(Node)
    langureTrainNode: Node = null;

    @property(Node)
    personalCenterNode: Node = null;

    @property(Button)
    chatButton: Button = null;

    @property(Button)
    roleChatButton: Button = null;

    /**
     * 当前页面
     * @private
     */
    private _curPanel: Node = null;

    private chatPanel: Node = null;

    protected onDisable(): void {
        EventManager.getInstance().off(BundlePreloadEvent.FINISH, this);
        EventManager.getInstance().off(TaskManager.TaskListRequestCallBack, this);
        EventManager.getInstance().off(TaskManager.pushEvet, this);
        EventManager.getInstance().off(TaskManager.PushEvetCallBack, this);
    }

    protected onEnable(): void {
        EventManager.getInstance().on(TaskManager.PushEvetCallBack, this.pushEvetCallBack, this);
        TaskManager.getInstance().pushTask();
    }

    /**
     * 切换主场景页面
     */
    startShowView() {
        switch (this._viewIndex) {
            case MainSceneView.TaskNode:
                this.backToTaskView();
                break;
            case MainSceneView.GameCenter:
                this.showGameCenter();
                break;
            case MainSceneView.TaskProgressView:
                this.showTaskProgress()
                break;
            case MainSceneView.BrainTrainView:
                this.remindClick();
                break;
        }
    }


    private _viewIndex: number = 0;
    setCurrentIndex(index: number) {
        this._viewIndex = index;
        this.startShowView();
    }

    start() {
        this.frame.playAnimation("idle", 24, true, true);
        EventManager.getInstance().on(TaskManager.TaskListRequestCallBack, this.taskListRequestCallBack, this);
        TaskManager.getInstance().start();
        this.startShowView();
        this.initFeature();
    }

    initFeature() {
        this.gameCenterNode.active = FeatureTogglesSetting.getInstance().getToggleValue(FeatureToggle.GameCenter);
        this.langureTrainNode.active = FeatureTogglesSetting.getInstance().getToggleValue(FeatureToggle.LanguageTraining);
        this.personalCenterNode.active = FeatureTogglesSetting.getInstance().getToggleValue(FeatureToggle.PersonalCenter);
        this.chatButton.interactable = FeatureTogglesSetting.getInstance().getToggleValue(FeatureToggle.Chat);
        this.roleChatButton.interactable = FeatureTogglesSetting.getInstance().getToggleValue(FeatureToggle.Chat);
    }

    private _infoPanelOpenState: boolean = false;
    pushEvetCallBack(data) {
        if (!data.id) { return }

        TaskManager.getInstance().isReadNotification([data.id]);

        if (this._infoPanelOpenState) {
            return;
        }

        this._infoPanelOpenState = true;
        UIManager.getInstance().registerPanel(InfoListPopCtrl.NAME, BundleName.RESOURCES, "/prefab/TaskAndNotification/InfoPopup", InfoListPopCtrl, true, "infoList");
        UIManager.getInstance().showPanel(InfoListPopCtrl.NAME, {
            closeCb: () => {
                this._infoPanelOpenState = false;
            }
        });
    }

    updateTime() {
        const now = new Date();
        const currentHour = now.getHours();
        if (currentHour >= 0 && currentHour < 12) {
            this.dayLabel.string = '开启美好的一天';
        } else if (currentHour >= 12 && currentHour < 14) {
            this.dayLabel.string = '午餐时光，给自己补充能量';
        } else if (currentHour >= 14 && currentHour < 18) {
            this.dayLabel.string = '午后的阳光透过窗帘，温暖而懒散';
        } else {
            this.dayLabel.string = '感恩今天的经历，明天再出发';
        }
        this.timeLabel.string = TimeUtil.getTimePeriodFromTimestamp(now.getHours()) + "好";//`${hours}:${minutes}:${seconds}`;
    }

    backToTaskView() {
        this.taskRemind();
        this.switchTaskNode(true);
        this._curPanel = this.taskNode;
    }
    private _clickBoo = false;
    onClickVirtualLecturer() {
        if (this._clickBoo) {
            return;
        }
        this._clickBoo = true;
        // let url = Global.RES_Root + BundleName.SMALLTHEATER;
        // EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onPreloadFinish.bind(this, url, BundleName.SMALLTHEATER), this, true);
        // BundlePreloadManager.getInstance().preload(BundleName.SMALLTHEATER);

        let url = Global.RES_Root + BundleName.FINGERGAME;
        EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onPreloadFinish.bind(this, url, BundleName.FINGERGAME), this, true);
        BundlePreloadManager.getInstance().preload(BundleName.FINGERGAME);
    }

    private switchTaskNode(open: boolean = false) {
        if (open) {
            this.taskNode.active = true;
            // 刷新时间
            // 强行显示时间，防止updateTime间隔过长导致文本时间短暂不显示
            // 更新时间
            this.updateTime();
            this.schedule(this.updateTime, 1);
            // this.dayLabel.string = TimeUtil.getCurrentDate();
            this.titleLabel.string = TimeUtil.getCurrentDate();
            let count = TaskManager.getInstance().getSkewersGameCount();
            this.taskDesLabel.string = `今日待完成事项:${count}`;
            this.timeLabel.node.active = true;
            this.dayLabel.node.active = true;
        } else {
            this.taskNode.active = false;
            this.unschedule(this.updateTime);
            this.timeLabel.string = "";
            this.dayLabel.string = "";
            this.titleLabel.string = TimeUtil.getCurrentDate();
            this.taskDesLabel.string = "";
            this.timeLabel.node.active = false;
            this.dayLabel.node.active = false;
        }
    }

    openChatPanel() {
        UIManager.getInstance().registerPanel(ChatPanelCtrl.NAME, BundleName.RESOURCES, "/prefab/ChatPanel/ChatPanel", ChatPanelCtrl);
        UIManager.getInstance().showPanel(ChatPanelCtrl.NAME);
    }

    showTaskProgress() {
        this.updateTime();
        UIManager.getInstance().registerPanel(TaskAndNotificationPanelCtrl.NAME, BundleName.RESOURCES, "/prefab/TaskAndNotification/TaskAndNotificationPanel", TaskAndNotificationPanelCtrl);
        UIManager.getInstance().showPanel(TaskAndNotificationPanelCtrl.NAME);
        EventManager.getInstance().on(TaskAndNotificationPanelCtrl.TaskAndNotificationHide,this.backToCenteter.bind(this),this,true);
    }


    showGameCenter() {
        UIManager.getInstance().registerPanel(GameCenter.NAME, BundleName.RESOURCES, "/prefab/GameCenter/GameCenter", GameCenter);
        UIManager.getInstance().showPanel(GameCenter.NAME);
    }


    showMore() {
        const ad: AlertData = new AlertData();
        ad.title = "";
        ad.message = "开发中";
        AlertManager.getInstance().showAlert(ad);

        LocalStorageUtil.clean();
    }

    // ======= 任务中心
    private taskListRequestCallBack(data, context) {
        // EventManager.getInstance().off(TaskManager.TaskListRequestCallBack, context);
        switch (this._curPanel) {
            case this.taskNode:
                this.taskRemind();
                break;
            case this.chatPanel:
                break;
        }
    }

    remindClick() {
        let taskDatas = TaskManager.getInstance().taskList;
        let obj = this.findFirstAvailableName(taskDatas);
        if (!obj) {
            return;
        }
        TaskManager.getInstance().setCurTaskId(obj.id);
        UIManager.getInstance().registerPanel(BrainTrain.NAME, BundleName.RESOURCES, "/prefab/BrainTrain/BrainTrain", BrainTrain);
        UIManager.getInstance().showPanel(BrainTrain.NAME);
    }
    // private showTaskId;
    taskRemind() {
        let taskDatas = TaskManager.getInstance().taskList;
        let obj = this.findFirstAvailableName(taskDatas);
        if (!obj) {
            return;
        }
        this.remindView.active = true;
        this.remindView.getChildByName('back').getChildByName('txt').getComponent(Label).string = obj.name;
        this.titleLabel.node.active = false;
        let count = TaskManager.getInstance().getSkewersGameCount();
        this.taskDesLabel.string = `今日待完成事项:${count}`;
        // EventManager.getInstance().on(SkewersManager.TASK_GET_BRAIN_TRAININGS, () => {
        // }, this);
        SkewersManager.getInstance().requestBranisTraining_list(obj.id);
    }
    findFirstAvailableName(taskDatas) {
        for (const item of taskDatas) {
            if (item.isAvailable) {
                return { name: item.name, id: item.id };
            }
        }
        return null; // 如果没有找到符合条件的对象，则返回null
    }

    backToTaskCenter() {
        this.showTaskProgress();
    }

    backToCenteter() {
        SceneManager.getInstance().backToHall();
    }

    onDestroy(){
        EventManager.getInstance().disableContext(this);
        // super.onDestroy();
    }

    private onPreloadFinish(url: string, sceneName: string, data: any) {
        let self = this;
        // 判断是否是串烧训练模式
        let restoreData: any = {gametype: GameType.GAME_CENTER};
        
        // 如果是串烧训练模式，添加难度和关卡参数
        if (SkewersManager.getInstance().curGame) {
            const curGame = SkewersManager.getInstance().curGame;
            restoreData = {
                gametype: GameType.SKEWERS,
                difficulty: curGame.difficulty,
                level: curGame.level
            };
        }
        
        SceneManager.getInstance().changeScene(sceneName, "", restoreData).then((scene) => {
            self._clickBoo = false;
            DebugLog.instance.log(`${sceneName} 场景切换成功`);
        });
    }
}



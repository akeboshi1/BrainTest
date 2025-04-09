import {_decorator, Button, instantiate, Label, Node, Prefab, ProgressBar, ScrollView, Sprite} from 'cc';

import {TaskManager} from '../../Task/TaskManager';
import {EventManager} from '../../../Core/Manager/Event/EventManager';
import {TaskData, TaskStatus, TaskType} from '../../Task/TaskData';
import {StringUtil} from '../../../Core/Util/StringUtil';
import {ColorUtil} from '../../../Core/Util/ColorUtil';
import {DebugLog} from '../../../Core/Util/DebugLog';
import {BasePanel} from '../../../Core/UI/BasePanel';
import {UIManager} from '../../../Core/Manager/UI/UIManager';
import AlertManager, {AlertData} from '../../../Core/Manager/Alert/AlertManager';
import {BrainTrain} from '../BrainTrain/BrainTrain';
import {BundleName} from '../../../Core/Manager/Load/BundleName';
import {Global} from '../../../Core/Manager/Config/Global';

const { ccclass, property } = _decorator;

@ccclass('TaskAndNotificationPanelCtrl')
export class TaskAndNotificationPanelCtrl extends BasePanel {

    public static NAME: string = "TaskAndNotificationPanelCtrl";
    /**
     * 任务详细界面
     */
    @property({ type: Node })
    taskProgressNode: Node = null;

    @property(ProgressBar)
    progressBar: ProgressBar = null;

    @property(Label)
    progressLabel: Label = null;

    @property(Button)
    taskTab: Button = null;

    @property(Button)
    infoTab: Button = null;

    @property(Node)
    progressContent: Node = null;

    @property(Node)
    progressTaskNode: Node = null;

    @property(Node)
    progressInfoNode: Node = null;

    @property({ type: [Node] })
    taskList: Node[] = [];

    // ======================

    @property(Node)
    notifictionListNode: Node = null;

    @property(Prefab)
    notificationItemPrefab: Prefab;

    @property(Node)
    redDotNode: Node = null;

    @property(ScrollView)
    scrollViewNode: ScrollView = null;

    private completeColor = "#2DABFF";
    private unCompleteColor = "#FF2D55";
    private expireColor = "#686E72";
    private processingColor = "#FF2D55";

    private notificationList: any[] = [];

    public static TaskAndNotificationHide:string = "TaskAndNotificationHide";

    start() {

    }

    onEnable(): void {
        this.tabClick(null, 0);
        EventManager.getInstance().on(TaskManager.TaskListRequestCallBack, this.taskListRequestCallBack, this);
        TaskManager.getInstance().start();

        EventManager.getInstance().on(TaskManager.NotificationListRequestCallBack, this.notificationRequestCallBack, this);
        TaskManager.getInstance().requestStartInform();
        this.scrollViewNode.node.on("scroll-to-bottom", this.scrollViewEvent, this);
    }

    onDisable(): void {
        EventManager.getInstance().off(TaskManager.NotificationListRequestCallBack, this);
    }

    // ======= 任务中心
    private taskListRequestCallBack(data, context) {
        EventManager.getInstance().off(TaskManager.TaskListRequestCallBack, context);
        let taskDatas = TaskManager.getInstance().taskList;
        let index = 0;
        let count = 0;
        let self = context;
        taskDatas.forEach((task: TaskData) => {
            let taskItem = self.taskList[index];
            index++;
            if (taskItem == null) return;
            let label = taskItem.getChildByName("Label").getComponent(Label);
            let timeLabel = taskItem.getChildByName("time1").getComponent(Label);
            let complete = taskItem.getChildByName("complete");
            let arrow = taskItem.getChildByName("arror_right");
            let btnBG = taskItem.getChildByName("btn").getComponent(Sprite);
            let cornorNode = taskItem.getChildByName("cornorNode");
            cornorNode.active = task.type == TaskType.Review|| task.type ==TaskType.Revise || task.status == TaskStatus.Processing;
            let cornorLabel = cornorNode.getChildByName("cornorLabel").getComponent(Label);
            if (task.type == TaskType.Review) {
                cornorLabel.string = "评测";
            } else if (task.status == TaskStatus.Processing) {
                cornorLabel.string = "正在做";
            }else if (task.type == TaskType.Revise) {
                cornorLabel.string = "订正";
            }
            (label as Label).string = task.name;
            let startTime = StringUtil.spliceStr(task.startTime + "", " ")[1];
            let endTime = StringUtil.spliceStr(task.endTime + "", " ")[1];
            let startTimes = StringUtil.spliceStr(startTime, ":");
            let endTimes = StringUtil.spliceStr(endTime, ":");
            startTime = startTimes[0] + ":" + startTimes[1];
            endTime = endTimes[0] + ":" + endTimes[1];
            (timeLabel as Label).string = startTime + "-" + endTime;
            taskItem.active = true;
            if (task.status == TaskStatus.Completed) {
                complete.active = true;
                arrow.active = false;
                (btnBG as Sprite).color = ColorUtil.hexToColor(context.completeColor);
                count++;
            } else {
                if (task.status == TaskStatus.Expired) {
                    (btnBG as Sprite).color = ColorUtil.hexToColor(context.expireColor);
                }
                else if (task.status == TaskStatus.Processing) {
                    (btnBG as Sprite).color = ColorUtil.hexToColor(context.processingColor);
                }
                else {
                    (btnBG as Sprite).color = ColorUtil.hexToColor(context.unCompleteColor);
                }
                complete.active = false;
                arrow.active = true;
            }
        });
        context.progressLabel.string = `${count} / ${taskDatas.length}`;
        context.progressBar.progress = count / taskDatas.length;

    }

    private _curTaskData: TaskData;
    taskItemClick(event, data) {
        let taskList = TaskManager.getInstance().taskList;
        this._curTaskData = taskList[Number(data)];
        if (!this._curTaskData) {
            return;
        }
        TaskManager.getInstance().setCurTaskId(this._curTaskData.id);
        if (this._curTaskData.status == TaskStatus.Completed) {
            DebugLog.instance.log("当前任务已经完成");
            const ad: AlertData = new AlertData();
            ad.title = "提示";
            ad.message = "当前任务已经完成";
            AlertManager.getInstance().showAlert(ad);
            ad.cancelButtonVisible = false;
            return;
        }
        if (this._curTaskData.status == TaskStatus.Expired) {
            const ad: AlertData = new AlertData();
            ad.title = "提示";
            ad.message = "当前任务已经过期";
            AlertManager.getInstance().showAlert(ad);
            ad.cancelButtonVisible = false;
            return;
        }
        this.openBrainTrain();
    }
    openBrainTrain() {
        UIManager.getInstance().registerPanel(BrainTrain.NAME, BundleName.RESOURCES, "/prefab/BrainTrain/BrainTrain", BrainTrain);
        UIManager.getInstance().showPanel(BrainTrain.NAME).then(() => {
            const brainTrain = UIManager.getInstance().getActivePanel(BrainTrain.NAME);
            Global.prePanel = BrainTrain.NAME;
        });
    }

    tabClick(event, index: number) {
        switch (Number(index)) {
            case 0:
                this.taskTab.normalColor = ColorUtil.getCCColor(18, 197, 241);
                this.infoTab.normalColor = ColorUtil.getCCColor(255, 255, 255);
                break;
            case 1:
                this.infoTab.normalColor = ColorUtil.getCCColor(18, 197, 241);
                this.taskTab.normalColor = ColorUtil.getCCColor(255, 255, 255);
                this.clickNotificationBtn();
                break;
        }

        this.progressTaskNode.active = !Number(index);
        this.progressInfoNode.active = Boolean(Number(index));
    }

    public clickNotificationBtn() {
        this.progressTaskNode.active = false;
        this.progressInfoNode.active = true;
    }
    scrollViewEvent(event, index: number) {
        console.log("scrollview", event, index);
        this.hideRedDot();

        const subIds: number[] = this.notificationList.map(item => (item as any).id);
        if (subIds.length !== 0) {
            TaskManager.getInstance().isReadNotification(subIds);
        }
        this.notificationList = [];
        this.scrollViewNode.node.off("scroll-to-bottom", this.scrollViewEvent, this);
    }
    private notificationRequestCallBack() {
        this.notificationList = TaskManager.getInstance().notificationList;
        if (this.notificationList && this.notificationList.length > 0) {
            this.showRedDot()
        } else {
            this.hideRedDot()
        }

        this.updateList(this.notificationList);
    }

    hideRedDot() {
        if (this.redDotNode) this.redDotNode.active = false;
    }

    showRedDot() {
        if (this.redDotNode) this.redDotNode.active = true;
    }

    clearList() {
        this.notifictionListNode.removeAllChildren();
    }

    updateList(notificationArr: any[] = []) {
        this.clearList();
        for (let index = 0; index < notificationArr.length; index++) {
            let notificationPrefab = instantiate(this.notificationItemPrefab);
            this.notifictionListNode.addChild(notificationPrefab);
            notificationPrefab.getChildByName("timeLabel").getComponent(Label).string = notificationArr[index].start_at;
            notificationPrefab.getChildByName("decsLabel").getComponent(Label).string = notificationArr[index].content;
        }
    }

    backToParent() {
        UIManager.getInstance().hidePanel(TaskAndNotificationPanelCtrl.NAME);
        EventManager.getInstance().emit(TaskAndNotificationPanelCtrl.TaskAndNotificationHide,this);
    }
}



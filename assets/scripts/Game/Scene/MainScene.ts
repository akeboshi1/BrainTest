import { _decorator, Component, instantiate, Node, Prefab, Label, Sprite, ProgressBar, Button } from 'cc';
import { DebugLog } from "../../../scripts/Core/Util/DebugLog";
import { TaskManager } from "../../Game/Task/TaskManager";
import { EventManager } from "../../Core/Manager/Event/EventManager";
import { TaskData, TaskStatus } from "../../Game/Task/TaskData";
import { StringUtil } from "../../Core/Util/StringUtil";
import { ColorUtil } from "../../Core/Util/ColorUtil";
import { ChatPanelCtrl } from '../UI/ChatPanel/ChatPanelCtrl';
import { TimeUtil } from "../../Core/Util/TimeUtil";
import { GameCenterManager } from "db://assets/scripts/Game/GameCenter/GameCenterManager";
import { Global } from "db://assets/scripts/Core/Manager/Config/Global";
import { SceneManager } from "db://assets/scripts/Core/Manager/Scene/SceneManager";
import { SkewersManager } from "db://assets/scripts/Game/Task/Skewers/SkewersManager";
import { GameType, SkewersGameData } from "db://assets/scripts/Game/Task/Skewers/SkewersGameData";
import AlertManager, { AlertData } from '../../Core/Manager/Alert/AlertManager';
import { LocalStorageUtil } from '../../Core/Util/LocalStorageUtil';
import { TaskAndNotificationPanelCtrl } from './TaskAndNotificationPanelCtrl';
import { BundlePreloadEvent, BundlePreloadManager } from '../../Core/Manager/Load/BundlePreloadManager';
const { ccclass, property } = _decorator;

export enum MainSceneView {
    TaskNode,
    GameCenter,
    TaskProgressView,
    BrainTrainView
}

@ccclass('MainScene')
export class MainScene extends Component {
    @property(Prefab)
    chatPanelPrefab: Prefab = null;

    @property(Node)
    parentNode: Node = null;


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

    // ====================== 任务详情页
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


    // ====================== 任务提示界面
    /**
     * 任务提示界面
     */
    @property({ type: Node })
    taskScrollView: Node = null;

    @property({ type: [Node] })
    taskList: Node[] = [];


    // ====================== 游戏大厅
    @property(Node)
    gameCenterNode: Node = null;

    @property({ type: [Node] })
    gameList: Node[] = [];


    // ===================== 串烧游戏开始界面
    @property(Node)
    brainTrainNode: Node;

    @property({ type: [Node] })
    skewersGameItems: Node[] = [];


    /**
     * 当前页面
     * @private
     */
    private _curPanel: Node = null;

    private completeColor = "#2DABFF";
    private unCompleteColor = "#FF2D55";
    private expireColor = "#686E72";

    private chatPanel: Node = null;
    private tmpGameNames: string[] = ["找茬", '翻牌', '拼图', '捕鱼', '猜谜'];
    private notificationArr: [];
    onLoad() {

    }

    protected onEnable(): void {
        EventManager.getInstance().on(ChatPanelCtrl.ChatPanelCloseEvent, this.onChatPanelClose, this);
    }

    protected onDisable(): void {
        EventManager.getInstance().off(ChatPanelCtrl.ChatPanelCloseEvent, this);
        EventManager.getInstance().off(BundlePreloadEvent.FINISH, this);
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
                this.tabItemClickByRemote();
                break;
        }
    }

    private _viewIndex: number = 0;
    setCurrentIndex(index: number) {
        this._viewIndex = index;
    }

    start() {
        if (this.taskList.length != 0) {
            this.taskList.forEach(task => {
                if (task) task.active = false;
            });
        }
        EventManager.getInstance().on(TaskManager.TaskListRequestCallBack, this.taskListRequestCallBack, this);
        TaskManager.getInstance().start();

        this.startShowView();
    }

    updateTime() {
        const now = new Date();
        const hours = TimeUtil.padZero(now.getHours());
        const minutes = TimeUtil.padZero(now.getMinutes());
        const seconds = TimeUtil.padZero(now.getSeconds());
        this.timeLabel.string = `${hours}:${minutes}:${seconds}`;
    }

    update(deltaTime: number) {

    }

    backToTaskView() {
        this.gameCenterNode.active = false;
        this.taskProgressNode.active = false;
        this.taskScrollView.active = false;
        this.brainTrainNode.active = false;
        this.switchTaskNode(true);
        this._curPanel = this.taskNode;
    }

    private switchTaskNode(open: boolean = false) {
        if (open) {
            this.taskNode.active = true;
            // 刷新时间
            // 强行显示时间，防止updateTime间隔过长导致文本时间短暂不显示
            this.updateTime();
            this.schedule(this.updateTime, 1);
            this.dayLabel.string = TimeUtil.getCurrentDate();
            this.titleLabel.string = TimeUtil.getCurrentDate();
            this.taskDesLabel.string = "当前暂无待办事宜";
            this.timeLabel.node.active = true;
            this.dayLabel.node.active = true;
        } else {
            this.taskNode.active = false;
            this.unschedule(this.updateTime);
            this.timeLabel.string = "";
            this.dayLabel.string = "";
            this.titleLabel.string = "";
            this.taskDesLabel.string = "";
            this.timeLabel.node.active = false;
            this.dayLabel.node.active = false;
        }
    }

    openChatPanel() {
        if (this.chatPanel == null) {
            this.createChatPanel();
        }
        this.chatPanel.getComponent(ChatPanelCtrl).fadeIn();
        this.taskProgressNode.active = false;
        this.taskScrollView.active = false;
        this.switchTaskNode(false);
        this._curPanel = this.chatPanel;
    }

    onChatPanelClose(data: any, context: MainScene) {
        context.backToTaskView();
    }

    createChatPanel() {
        if (this.chatPanelPrefab && this.parentNode) {
            this.chatPanel = instantiate(this.chatPanelPrefab);
            this.parentNode.addChild(this.chatPanel);
            this.parentNode.active = true;
        } else {
            DebugLog.instance.error("预制体或者父节点未正确绑定，请检查！");
        }
    }

    showTaskProgress() {
        this.progressLabel.string = "";
        this.taskProgressNode.active = true;
        EventManager.getInstance().on(TaskManager.NotificationListRequestCallBack, this.notificationRequestCallBack, this);
        TaskManager.getInstance().requestStartInform();
        this.taskScrollView.active = false;
        this.brainTrainNode.active = false;
        this.tabClick(null, 0);
        this.switchTaskNode(false);
        this._curPanel = this.taskProgressNode;
        EventManager.getInstance().on(TaskManager.TaskListRequestCallBack, this.taskListRequestCallBack, this);
        TaskManager.getInstance().start();
    }

    tabClick(event, index: number) {
        switch (Number(index)) {
            case 0:
                this.taskTab.normalColor = ColorUtil.getCCColor(245, 80, 80);
                this.infoTab.normalColor = ColorUtil.getCCColor(255, 255, 255);
                break;
            case 1:
                this.infoTab.normalColor = ColorUtil.getCCColor(245, 80, 80);
                this.taskTab.normalColor = ColorUtil.getCCColor(255, 255, 255);
                this.clickNotificationBtn();
                break;
        }

        this.progressTaskNode.active = !Number(index);
        this.progressInfoNode.active = Boolean(Number(index));


    }
    public notificationRequestCallBack(data, context) {
        this.notificationArr = data;
    }
    public clickNotificationBtn() {
        this.progressTaskNode.active = false;
        this.progressInfoNode.active = true;
        this.taskProgressNode.getComponent(TaskAndNotificationPanelCtrl).updateList(this.notificationArr);
    }
    showGameCenter() {
        let len = this.gameList.length;
        for (let i = 0; i < len; i++) {
            let gameItem = this.gameList[i];
            if (this.tmpGameNames[i] == null || i == 0) {
                gameItem.active = false;
                continue;
            }
            gameItem.active = true;
            let label = gameItem.getChildByName("Label").getComponent(Label);
            label.string = this.tmpGameNames[i];
        }
        this.gameCenterNode.active = true;
        this.taskProgressNode.active = false;
        this.taskScrollView.active = false;
        this.switchTaskNode(false);
        this._curPanel = this.gameCenterNode;
    }

    showUserCenter() {

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
        EventManager.getInstance().off(TaskManager.TaskListRequestCallBack, context);
        switch (this._curPanel) {
            case this.taskNode:
                // let taskUnCompleteDic = TaskManager.getInstance().getTodayUnCompleteTask();
                // taskUnCompleteDic.forEach((task:TaskData)=>{
                //
                // })
                break;
            case this.taskProgressNode:
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
                        DebugLog.instance.log("complete", complete)
                    } else {
                        if (task.status == TaskStatus.Expired) {
                            (btnBG as Sprite).color = ColorUtil.hexToColor(context.expireColor);
                        } else {
                            (btnBG as Sprite).color = ColorUtil.hexToColor(context.unCompleteColor);
                        }
                        complete.active = false;
                        arrow.active = true;
                    }
                });
                context.progressLabel.string = `${count} / ${taskDatas.length}`;
                context.progressBar.progress = count / taskDatas.length;
                break;
            case this.chatPanel:
                break;
            case this.taskScrollView:
                break;
        }
    }


    private _curTaskData: TaskData;
    taskItemClick(event, data) {
        DebugLog.instance.log(data);
        let taskList = TaskManager.getInstance().taskList;
        this._curTaskData = taskList[Number(data)];
        if (this._curTaskData.status == TaskStatus.Completed) {
            DebugLog.instance.log("当前任务已经完成");
            return;
        }
        EventManager.getInstance().on(SkewersManager.TASK_GET_BRAIN_TRAININGS, this.requestBranisTraining_listCallBack, this);
        Global.userData.curTaskData = this._curTaskData;
        SkewersManager.getInstance().requestBranisTraining_list(this._curTaskData.id);
    }

    tabItemClickByRemote() {
        this._curTaskData = Global.userData.curTaskData;
        if (!this._curTaskData || this._curTaskData.status == TaskStatus.Completed) {
            DebugLog.instance.log("当前任务已经完成或不存在");
            return;
        } EventManager.getInstance().on(SkewersManager.TASK_GET_BRAIN_TRAININGS, this.requestBranisTraining_listCallBack, this);
        SkewersManager.getInstance().requestBranisTraining_list(this._curTaskData.id);

    }

    private requestBranisTraining_listCallBack(data, context) {
        EventManager.getInstance().off(SkewersManager.TASK_GET_BRAIN_TRAININGS, this);
        this.brainTrainNode.active = true;
        this.taskNode.active = false;
        this.taskProgressNode.active = false;
        this.gameCenterNode.active = false;
        this.taskScrollView.active = false;

        let gameDatas = data;
        let len = this.gameList.length;
        // let len = gameDatas.length;
        for (let i = 0; i < len; i++) {


            let gameItem = this.skewersGameItems[i];
            let _gameData: SkewersGameData = gameDatas[i];
            if (_gameData) {
                gameItem.active = true;
                let label = gameItem.getChildByName("label").getComponent(Label);
                let type = _gameData.type;
                switch (type) {
                    case GameType.Memory:
                        label.string = "记忆";
                        break;
                    case GameType.Judgment:
                        label.string = "判断";
                        break;
                    case GameType.Calculator:
                        label.string = "计算";
                        break;
                    case GameType.Executionability:
                        label.string = "执行力";
                        break;
                    case GameType.Language:
                        label.string = "语言";
                        break;
                    case GameType.cognition:
                        label.string = "认知";
                        break;
                }
                let progressBar = gameItem.getChildByName("ProgressBar").getComponent(ProgressBar);
                progressBar.progress = _gameData.progress;
                let progressLabel = progressBar.node.getChildByName("Label").getComponent(Label);
                let progressStr = _gameData.progressStr;
                progressLabel.string = `当前进度: ${progressStr}`;
                let completeIcon = gameItem.getChildByName("completeIcon");
                if (_gameData.progress >= 1) {
                    completeIcon.active = true;
                } else {
                    completeIcon.active = false;
                }
            } else {
                gameItem.active = false;
                let label = gameItem.getChildByName("label").getComponent(Label);
                label.string = "未知";
                let progressBar = gameItem.getChildByName("ProgressBar").getComponent(ProgressBar);
                progressBar.progress = 1;
            }

        }


    }

    startTaskClick() {
        TaskManager.getInstance().requestStartTask(this._curTaskData.id);
    }

    backToTaskCenter() {
        this.showTaskProgress();
    }


    // =========== 游戏中心
    gameItemClick(event, data) {
        let index = Number(data);
        GameCenterManager.getInstance().startGame(index + 1, (data) => {
            if (data.status == 0) {
                DebugLog.instance.error(data.message);
                return;
            }
            GameCenterManager.getInstance().enterGameCenter();
            DebugLog.instance.log(data);
            let gameid = data.data.game_id;
            let sceneName = "";
            switch (gameid) {
                case 1:
                    sceneName = "finding";
                    return;
                case 2:
                    sceneName = "fanpai";
                    break;
                case 3:
                    sceneName = "puzzle";
                    break;
                case 4:
                    sceneName = "catchFish";
                    break;
                case 5:
                    sceneName = "guessingGame";
                    break;
            }
            let url = Global.RES_Root + sceneName;

            EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onPreloadFinish.bind(this, url, sceneName), this);
            BundlePreloadManager.getInstance().preload(sceneName);
        })
    }


    private onPreloadFinish(url: string, sceneName: string, data: any) {
        SceneManager.getInstance().changeScene(url, sceneName).then((scene) => {
            DebugLog.instance.log(`${sceneName} 场景切换成功`);
        });
    }
}



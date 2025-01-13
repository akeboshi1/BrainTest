import {_decorator, Button, Component, instantiate, Label, Node, Prefab, ProgressBar, Sprite} from 'cc';
import {DebugLog} from "../../../scripts/Core/Util/DebugLog";
import {TaskManager} from "../../Game/Task/TaskManager";
import {EventManager} from "../../Core/Manager/Event/EventManager";
import {TaskData, TaskStatus, TaskType} from "../../Game/Task/TaskData";
import {StringUtil} from "../../Core/Util/StringUtil";
import {ColorUtil} from "../../Core/Util/ColorUtil";
import {ChatPanelCtrl} from '../UI/ChatPanel/ChatPanelCtrl';
import {TimeUtil} from "../../Core/Util/TimeUtil";
import {GameCenterManager} from "db://assets/scripts/Game/GameCenter/GameCenterManager";
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";
import {SceneManager} from "db://assets/scripts/Core/Manager/Scene/SceneManager";
import {SkewersManager} from "db://assets/scripts/Game/Task/Skewers/SkewersManager";
import {GameType, SkewersGameData} from "db://assets/scripts/Game/Task/Skewers/SkewersGameData";
import AlertManager, {AlertData} from '../../Core/Manager/Alert/AlertManager';
import {LocalStorageUtil} from '../../Core/Util/LocalStorageUtil';

import {BundlePreloadEvent, BundlePreloadManager} from '../../Core/Manager/Load/BundlePreloadManager';
import {InfoListPopCtrl} from './InfoListPopCtrl';
import {FrameComponent} from '../../Core/Component/FrameComponent';
import {BundleName} from '../../Core/Manager/Load/BundleName';
import {UIManager} from '../../Core/Manager/UI/UIManager';
import {PersonalCenterPanel} from '../UI/PersonalCenter/PersonalCenterPanel';
import {AlertType} from "db://assets/scripts/Game/UI/Alert/GameAlert";

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


    @property({ type: [Node] })
    taskList: Node[] = [];

    @property(Node)
    virturalLecturerPanel:Node = null;

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
    private processingColor = "#FF2D55";

    private chatPanel: Node = null;
    private tmpGameNames: string[] = ["找茬", '翻牌', '拼图', '捕鱼', '猜谜' ,'麻将组句'];
 

    onLoad() {

    }

    protected onDisable(): void {
        EventManager.getInstance().off(TaskManager.getInstance().pushEvet, this);
        EventManager.getInstance().off(BundlePreloadEvent.FINISH, this);
        EventManager.getInstance().off(TaskManager.PushEvetCallBack, this);
        EventManager.getInstance().off(TaskManager.TaskListRequestCallBack, this);
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
        this.startShowView();
    }

        start() {
            this.frame.playAnimation("idle", 24, true, true);
            if (this.taskList.length != 0) {
                this.taskList.forEach(task => {
                    if (task) task.active = false;
                });
            }
            EventManager.getInstance().on(TaskManager.PushEvetCallBack, this.pushEvetCallBack, this);
            TaskManager.getInstance().pushTask();

            EventManager.getInstance().on(TaskManager.TaskListRequestCallBack, this.taskListRequestCallBack, this);
            TaskManager.getInstance().start();
            this.startShowView();
        }

        hideInfoPopup(){
            UIManager.getInstance().hidePanel(InfoListPopCtrl.NAME);
        }
        private _curID;
        pushEvetCallBack(data) {
            if(!data.id){return}
            if(this._curID == data.id)return;
            this._curID = data.id;
            if(!UIManager.getInstance().getPanel(InfoListPopCtrl.NAME)) UIManager.getInstance().registerPanel(InfoListPopCtrl.NAME, BundleName.RESOURCES, "/prefab/TaskAndNotification/InfoPopup",InfoListPopCtrl,true,"infoList");
            this.hideInfoPopup();
            UIManager.getInstance().showPanel(InfoListPopCtrl.NAME,data);

            EventManager.getInstance().on("hideInfoListPop",this.hideInfoListPop, this);
            TaskManager.getInstance().isReadNotification([data.id]);
        }
        hideInfoListPop() {
            EventManager.getInstance().off("hideInfoListPop",this);
            this.hideInfoPopup();
        }
        updateTime() {
            const now = new Date();
            // const hours = TimeUtil.padZero(now.getHours());
            // const minutes = TimeUtil.padZero(now.getMinutes());
            // const seconds = TimeUtil.padZero(now.getSeconds());
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
            this.timeLabel.string = TimeUtil.getTimePeriodFromTimestamp(now.getHours())+"好";//`${hours}:${minutes}:${seconds}`;
        }

    update(deltaTime: number) {

    }


    backToTaskView() {
        this.gameCenterNode.active = false;
        this.taskProgressNode.active = false;
       
        this.brainTrainNode.active = false;
        this.switchTaskNode(true);
        this._curPanel = this.taskNode;
    }

    onClickVirtualLecturer(){
        this.virturalLecturerPanel.active = true;
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
        UIManager.getInstance().registerPanel(ChatPanelCtrl.NAME, BundleName.RESOURCES, "/prefab/ChatPanel/ChatPanel",ChatPanelCtrl);
        UIManager.getInstance().showPanel(ChatPanelCtrl.NAME);
        this.taskProgressNode.active = false;
   
    }

    showTaskProgress() {
        this.progressLabel.string = "";
        this.taskProgressNode.active = true;
        //EventManager.getInstance().on(TaskManager.NotificationListRequestCallBack, this.notificationRequestCallBack, this);
        TaskManager.getInstance().requestStartInform();
    
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
        

        showGameCenter() {
            let len = this.gameList.length;
            for (let i = 0; i < len; i++) {
                let gameItem = this.gameList[i];
                if (this.tmpGameNames[i] == null) {
                    gameItem.active = false;
                    continue;
                }
                gameItem.active = true;
                let label = gameItem.getChildByName("Label").getComponent(Label);
                label.string = this.tmpGameNames[i];
            }
            this.gameCenterNode.active = true;
            this.taskProgressNode.active = false;
           
            this.switchTaskNode(false);
            this._curPanel = this.gameCenterNode;
        }

    showUserCenter() {
        UIManager.getInstance().registerPanel(PersonalCenterPanel.NAME, BundleName.RESOURCES, "prefab/personalCenter/PersonalCenterPanel",PersonalCenterPanel);
        UIManager.getInstance().showPanel(PersonalCenterPanel.NAME);
    }
    reportNode() {
        // DebugLog.instance.log("reportNode");
        // this.personalInfoNode.getChildByName('PersonalCenter').active = false;
        // this.reportUINode.active = true;
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
                this.taskRemind();
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
                    let cornorNode = taskItem.getChildByName("cornorNode");
                    cornorNode.active = task.type == TaskType.Review || task.status == TaskStatus.Processing;
                    let cornorLabel = cornorNode.getChildByName("cornorLabel").getComponent(Label);
                    if(task.type == TaskType.Review){
                        cornorLabel.string = "评测";
                    }else if(task.status == TaskStatus.Processing){
                        cornorLabel.string = "正在做";
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
                        DebugLog.instance.log("complete", complete)
                    } else {
                        if (task.status == TaskStatus.Expired) {
                            (btnBG as Sprite).color = ColorUtil.hexToColor(context.expireColor);
                        }
                        else if(task.status == TaskStatus.Processing){
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
                break;
            case this.chatPanel:
                break;
        }
    }
       
    remindClick(){
        EventManager.getInstance().on(SkewersManager.TASK_GET_BRAIN_TRAININGS, this.requestBranisTraining_listCallBack, this);
        SkewersManager.getInstance().requestBranisTraining_list(this.showTaskId);
        // EventManager.getInstance().off(SkewersManager.TASK_GET_BRAIN_TRAININGS,this);
        // TaskManager.getInstance().requestStartTask(this.showTaskId,true);
    }
    private showTaskId;
    taskRemind(){
        let taskDatas = TaskManager.getInstance().taskList;
        let obj = this.findFirstAvailableName(taskDatas);
        if(!obj){
            return;
        }
        this.showTaskId = obj.id;
        this.remindView.active =true;
        this.remindView.getChildByName('back').getChildByName('txt').getComponent(Label).string =obj.name;
        this.titleLabel.node.active = false;
        let count = TaskManager.getInstance().getSkewersGameCount();
        this.taskDesLabel.string = `今日待完成事项:${count}`;
        EventManager.getInstance().on(SkewersManager.TASK_GET_BRAIN_TRAININGS,()=>{
        },this);
        SkewersManager.getInstance().requestBranisTraining_list(obj.id);
    }
    findFirstAvailableName(taskDatas) {
        for (const item of taskDatas) {
          if (item.isAvailable) {
            return {name:item.name,id:item.id};
          }
        }
        return null; // 如果没有找到符合条件的对象，则返回null
      }
    goBrainTraining() {
      
    }
    private _curTaskData: TaskData;
    taskItemClick(event, data) {
        DebugLog.instance.log(data);
        let taskList = TaskManager.getInstance().taskList;
        this._curTaskData = taskList[Number(data)];
        this.showTaskId = this._curTaskData.id
        if (this._curTaskData.status == TaskStatus.Completed) {
            DebugLog.instance.log("当前任务已经完成");
            const ad:AlertData= new AlertData();
            ad.title = "提示";
            ad.message = "当前任务已经完成";
            AlertManager.getInstance().showAlert(ad);
            ad.cancelButtonVisible = false;
            return;
        }
        if(this._curTaskData.status == TaskStatus.Expired) {
            const ad:AlertData= new AlertData();
            ad.title = "提示";
            ad.message = "当前任务已经过期";
            AlertManager.getInstance().showAlert(ad);
            ad.cancelButtonVisible = false;
            return;
        }
        EventManager.getInstance().on(SkewersManager.TASK_GET_BRAIN_TRAININGS, this.requestBranisTraining_listCallBack, this);
        Global.userData.curTaskData = this._curTaskData;
        SkewersManager.getInstance().requestBranisTraining_list(this._curTaskData.id);
    }

    tabItemClickByRemote() {
        this._curTaskData = Global.userData.curTaskData;
        if (!this._curTaskData || this._curTaskData.status == TaskStatus.Completed|| this._curTaskData.status == TaskStatus.Expired) {
            this.backToTaskView();
            // DebugLog.instance.log("当前任务已经完成或不存在");
            // const ad:AlertData= new AlertData();
            // ad.title = "提示";
            // ad.message = "当前任务已经完成或不存在";
            // AlertManager.getInstance().showAlert(ad);
            // ad.cancelButtonVisible = false;
            return;
        }
        EventManager.getInstance().on(SkewersManager.TASK_GET_BRAIN_TRAININGS, this.requestBranisTraining_listCallBack, this);
        SkewersManager.getInstance().requestBranisTraining_list(this._curTaskData.id);

    }

    private requestBranisTraining_listCallBack(data, context) {
        EventManager.getInstance().off(SkewersManager.TASK_GET_BRAIN_TRAININGS, this);
        this.brainTrainNode.active = true;
        this.taskNode.active = false;
        this.taskProgressNode.active = false;
        this.gameCenterNode.active = false;

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
                        label.string = "记忆力";
                        break;
                    case GameType.Judgment:
                        label.string = "判断力";
                        break;
                    case GameType.Calculator:
                        label.string = "计算力";
                        break;
                    case GameType.Executionability:
                        label.string = "执行力";
                        break;
                    case GameType.Language:
                        label.string = "语言力";
                        break;
                    case GameType.Comprehension:
                        label.string = "理解力";
                        break;
                }
                let progressBar = gameItem.getChildByName("ProgressBar").getComponent(ProgressBar);
                progressBar.progress = _gameData.progress;
                let progressLabel = progressBar.node.getChildByName("Label").getComponent(Label);
                let progressStr = _gameData.progressStr;
                progressLabel.string = `${progressStr}`;
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
        let taskList = TaskManager.getInstance().taskList;
        taskList.forEach(task => {
            if(task&&task.id == this.showTaskId){
                this._curTaskData = task;
            }
        });
        SkewersManager.getInstance().showGameAlert(this.brainTrainNode,AlertType.Next, SkewersManager.getInstance().nextSkewersGameStr,'', 0, 0, this._alertNext, this._alertExit, this);

    }

    private _alertExit(){

    }

    private _alertNext(){
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
                    sceneName = BundleName.FINGING;
                    break;
                case 2:
                    sceneName = BundleName.FANPAI;
                    break;
                case 3:
                    sceneName = BundleName.PUZZLE;
                    break;
                case 4:
                    sceneName = BundleName.CATCHFISH;
                    break;
                case 5:
                    sceneName = BundleName.GUESSINGGAME;
                    break;
                case 6:
                    sceneName = BundleName.SENTENCEMAKING;
                    break;
                case 7:
                    sceneName = BundleName.SMALLTHEATER;
                    break;
            }
            let url = Global.RES_Root + sceneName;

            EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onPreloadFinish.bind(this, url, sceneName), this);
            BundlePreloadManager.getInstance().preload(sceneName as BundleName);
        })
    }

    backToCenteter() {
        SceneManager.getInstance().backToHall();
    }

    private onPreloadFinish(url: string, sceneName: string, data: any) {
        SceneManager.getInstance().changeScene(url, sceneName).then((scene) => {
            DebugLog.instance.log(`${sceneName} 场景切换成功`);
        });
    }
}



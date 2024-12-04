import { _decorator, Component, instantiate, Node, Prefab,Label,Sprite,ProgressBar,Button } from 'cc';
import {DebugLog} from "../../../scripts/Core/Util/DebugLog";
import {TaskManager} from "../../Game/Task/TaskManager";
import {EventManager} from "../../Core/Manager/Event/EventManager";
import {TaskData, TaskStatus} from "../../Game/Task/TaskData";
import {StringUtil} from "../../Core/Util/StringUtil";
import {ColorUtil} from "../../Core/Util/ColorUtil";
import { ChatPanelCtrl } from '../UI/ChatPanel/ChatPanelCtrl';
import {TimeUtil} from "../../Core/Util/TimeUtil";
import {GameCenterManager} from "db://assets/scripts/Game/Socket/GameCenterManager";
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";
import {SceneManager} from "db://assets/scripts/Core/Manager/Scene/SceneManager";
const { ccclass, property } = _decorator;

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
    timeLabel:Label = null;

    @property(Label)
    dayLabel:Label = null;

    @property(Label)
    titleLabel:Label = null;

    @property(Label)
    taskDesLabel:Label = null;

    // ====================== 任务详情页
    /**
     * 任务详细界面
     */
    @property({ type: Node })
    taskProgressNode: Node = null;

    @property(ProgressBar)
    progressBar:ProgressBar = null;

    @property(Label)
    progressLabel:Label = null;

    @property(Button)
    taskTab:Button = null;

    @property(Button)
    infoTab:Button = null;

    @property(Node)
    progressContent:Node = null;

    @property(Node)
    progressTaskNode:Node = null;

    @property(Node)
    progressInfoNode:Node = null;


    // ====================== 任务提示界面
    /**
     * 任务提示界面
     */
    @property({ type: Node })
    taskScrollView: Node = null;

    @property({type:[Node]})
    taskList:Node[] = [];


    // ====================== 脑力保健
    @property(Node)
    gameCenterNode:Node = null;

    @property({type:[Node]})
    gameList:Node[]=[];


    /**
     * 当前页面
     * @private
     */
    private _curPanel:Node = null;

    private completeColor = "#2DABFF";
    private unCompleteColor = "#FF2D55";
    private expireColor="#686E72";

    private chatPanel:Node = null;
    private tmpGameNames:string[]=['翻牌','捕鱼','拼图']
    onLoad(){

    }

    protected onEnable(): void {
        EventManager.getInstance().on(ChatPanelCtrl.ChatPanelCloseEvent,this.onChatPanelClose,this);
    }

    protected onDisable(): void {
        EventManager.getInstance().off(ChatPanelCtrl.ChatPanelCloseEvent,this);
    }

    start() {
        if(this.taskList.length != 0){
            this.taskList.forEach(task=>{
                if(task)task.active =false;
            });
        }

        EventManager.getInstance().on(TaskManager.TaskListRequestCallBack,this.taskListRequestCallBack,this);
        TaskManager.getInstance().start();
        this.backToTaskView();

    }

    updateTime(){
        const now = new Date();
        const hours = TimeUtil.padZero(now.getHours());
        const minutes = TimeUtil.padZero(now.getMinutes());
        const seconds = TimeUtil.padZero(now.getSeconds());
        this.timeLabel.string = `${hours}:${minutes}:${seconds}`;
    }

    update(deltaTime: number) {

    }

    backToTaskView(){
        this.gameCenterNode.active = false;
        this.taskProgressNode.active = false;
        this.taskScrollView.active = false;
        this.switchTaskNode(true);
        this._curPanel = this.taskNode;
    }

    private switchTaskNode(open:boolean = false){
        if(open){
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
        }else{
            this.taskNode.active = false;
            this.unschedule(this.updateTime);
            this.timeLabel.string="";
            this.dayLabel.string="";
            this.titleLabel.string = "";
            this.taskDesLabel.string = "";
            this.timeLabel.node.active = false;
            this.dayLabel.node.active = false;
        }
    }

    openChatPanel() {
        if(this.chatPanel == null)
        {
            this.createChatPanel();
        }
        this.chatPanel.getComponent(ChatPanelCtrl).fadeIn();
        this.taskProgressNode.active = false;
        this.taskScrollView.active = false;
        this.switchTaskNode(false);
        this._curPanel = this.chatPanel;
    }

    onChatPanelClose(data:any,context:MainScene){
        context.backToTaskView();
    }

    createChatPanel() {
        if (this.chatPanelPrefab && this.parentNode) {
            this.chatPanel = instantiate(this.chatPanelPrefab);
            this.parentNode.addChild(this.chatPanel);
        } else {
            DebugLog.instance.error("预制体或者父节点未正确绑定，请检查！");
        }
    }

    showTaskProgress() {
        this.progressLabel.string = "";
        this.taskProgressNode.active = true;
        this.taskScrollView.active = false;
        this.tabClick(null,0);
        this.switchTaskNode(false);
        this._curPanel = this.taskProgressNode;
        EventManager.getInstance().on(TaskManager.TaskListRequestCallBack,this.taskListRequestCallBack,this);
        TaskManager.getInstance().start();
    }

    tabClick(event,index:number){
        switch (Number(index)){
            case 0:
                this.taskTab.normalColor = ColorUtil.getCCColor(245,80,80);
                this.infoTab.normalColor = ColorUtil.getCCColor(255,255,255);
                break;
            case 1:
                this.infoTab.normalColor = ColorUtil.getCCColor(245,80,80);
                this.taskTab.normalColor = ColorUtil.getCCColor(255,255,255);
                break;
        }
        this.progressTaskNode.active = !Number(index);
        this.progressInfoNode.active = Boolean(Number(index));
    }


    showGameCenter(){
        let len = this.gameList.length;
        for(let i=0;i<len;i++){
            let gameItem = this.gameList[i];
            if(this.tmpGameNames[i]==null){
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

    showUserCenter(){

    }

    showMore(){

    }

    private taskListRequestCallBack(data,context){
        EventManager.getInstance().off(TaskManager.TaskListRequestCallBack,context);
        switch (this._curPanel){
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
                taskDatas.forEach((task:TaskData)=>{
                    let taskItem = self.taskList[index];
                    index++;
                    if(taskItem == null)return;
                    let label = taskItem.getChildByName("Label").getComponent(Label);
                    let timeLabel = taskItem.getChildByName("time1").getComponent(Label);
                    let complete = taskItem.getChildByName("complete");
                    let arrow = taskItem.getChildByName("arror_right");
                    let btnBG = taskItem.getChildByName("btn").getComponent(Sprite);
                    (label as Label).string = task.name;
                    let startTime = StringUtil.spliceStr(task.startTime+""," ")[1];
                    let endTime = StringUtil.spliceStr(task.endTime+""," ")[1];
                    let startTimes = StringUtil.spliceStr(startTime,":");
                    let endTimes = StringUtil.spliceStr(endTime,":");
                    startTime = startTimes[0]+":"+startTimes[1];
                    endTime = endTimes[0]+":"+endTimes[1];
                    (timeLabel as Label).string = startTime+"-"+ endTime;
                    taskItem.active =true;
                    if(task.status == TaskStatus.Completed){
                        complete.active = true;
                        arrow.active = false;
                        (btnBG as Sprite).color = ColorUtil.hexToColor(context.completeColor);
                        DebugLog.instance.log("complete",complete)
                        count++;
                    }else{
                        if(task.status == TaskStatus.Expired){
                            (btnBG as Sprite).color =  ColorUtil.hexToColor(context.expireColor);
                        }else{
                            (btnBG as Sprite).color =  ColorUtil.hexToColor(context.unCompleteColor);
                        }
                        complete.active = false;
                        arrow.active = true;
                    }
                });
                context.progressLabel.string = `${count} / ${taskDatas.length}`;
                context.progressBar.progress = count/taskDatas.length;
                break;
            case this.chatPanel:
                break;
            case this.taskScrollView:
                break;
        }
    }


    taskItemClick(event,data){
        DebugLog.instance.log(data);
        let taskList = TaskManager.getInstance().taskList;
        let taskData = taskList[Number(data)];
        if(taskData.status ==  TaskStatus.Completed){
            DebugLog.instance.log("当前任务已经完成");
            return;
        }
        TaskManager.getInstance().requestStartTask(taskData.id);
    }


    gameItemClick(event,data){
        let index = Number(data);
        GameCenterManager.getInstance().startGame(index+1,(data)=>{
            if(data.status  == 0){
                DebugLog.instance.error(data.message);
                return;
            }
            GameCenterManager.getInstance().enterGameCenter();
            DebugLog.instance.log(data);
            let gameid = data.data.game_id;
            let sceneName = "";
            switch (gameid){
                case 1:
                    sceneName = "fanpai";
                    break;
                case 2:
                    sceneName = "puzzle";
                    break;
                case 3:
                    sceneName = "catchFish";
                    break;
            }
            let url = Global.RES_Root +sceneName;
            SceneManager.getInstance().changeScene(url,sceneName).then((scene)=>{
                DebugLog.instance.log(`${sceneName} 场景切换成功`);
            });
        })
    }
}



import { _decorator, Component, instantiate, Node, Prefab,Label,Sprite,Color } from 'cc';
import {DebugLog} from "../../../scripts/Core/Util/DebugLog";
import {SocketManager} from "db://assets/scripts/Core/Manager/Net/SocketManager";
import {TaskManager} from "../../Game/Task/TaskManager";
import {EventManager} from "../../Core/Manager/Event/EventManager";
import {TaskData, TaskStatus} from "../../Game/Task/TaskData";
import {StringUtil} from "../../Core/Util/StringUtil";
import {ColorUtil} from "../../Core/Util/ColorUtil";
import { ChatBubbleCtrl } from '../UI/ChatPanel/ChatBubbleCtrl';
import { ChatPanelCtrl } from '../UI/ChatPanel/ChatPanelCtrl';
import {TimeUtil} from "../../Core/Util/TimeUtil";
const { ccclass, property } = _decorator;

@ccclass('MainScene')
export class MainScene extends Component {
    @property(Prefab)
    chatPanelPrefab: Prefab = null;

    @property(Node)
    parentNode: Node = null;

    @property(Node)
    taskNode: Node = null;

    @property({type:[Node]})
    taskList:Node[] = [];

    @property(Label)
    progressLabel:Label = null;

    @property({ type: Node })
    taskProgressNode: Node = null;

    @property({ type: Node })
    taskScrollView: Node = null;

    @property(Label)
    timeLabel:Label = null;

    @property(Label)
    dayLabel:Label = null;

    @property(Label)
    titleLabel:Label = null;

    @property(Label)
    taskDesLabel:Label = null;


    /**
     * 当前页面
     * @private
     */
    private _curPanel:Node = null;

    private completeColor = "#2DABFF";
    private unCompleteColor = "#FF2D55";
    private expireColor="#686E72";

    private chatPanel:Node = null;
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
        this.switchTaskNode(false);
        this._curPanel = this.taskProgressNode;
        EventManager.getInstance().on(TaskManager.TaskListRequestCallBack,this.taskListRequestCallBack,this);
        TaskManager.getInstance().start();
    }

    showGameCenter(){

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
}



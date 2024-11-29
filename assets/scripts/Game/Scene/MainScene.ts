import { _decorator, Component, instantiate, Node, Prefab,Label,Sprite,Color } from 'cc';
import {DebugLog} from "../../../scripts/Core/Util/DebugLog";
import {SocketManager} from "db://assets/scripts/Core/Manager/Net/SocketManager";
import {TaskManager} from "db://assets/scripts/Game/Task/TaskManager";
import {EventManager} from "db://assets/scripts/Core/Manager/Event/EventManager";
import {TaskData, TaskStatus} from "db://assets/scripts/Game/Task/TaskData";
import {StringUtil} from "db://assets/scripts/Core/Util/StringUtil";
import {ColorUtil} from "db://assets/scripts/Core/Util/ColorUtil";
import { ChatBubbleCtrl } from '../UI/ChatPanel/ChatBubbleCtrl';
import { ChatPanelCtrl } from '../UI/ChatPanel/ChatPanelCtrl';
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
        this.backToTaskView();
    }

    update(deltaTime: number) {
        
    }

    openChatPanel() {
        if(this.chatPanel == null)
        {
            this.createChatPanel();
        }

        this.chatPanel.getComponent(ChatPanelCtrl).fadeIn();

        this.taskProgressNode.active = false;
        this.taskScrollView.active = false;
        this.taskNode.active = false;
    }

    onChatPanelClose(data:any,context:MainScene){
        //context.taskProgressNode.active = true;
        //context.taskScrollView.active = true;
        context.taskNode.active = true;
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
        this.taskNode.active = false;
        EventManager.getInstance().on(TaskManager.TaskListRequestCallBack,this.taskListRequestCallBack,this);
        TaskManager.getInstance().start();
    }

    showGameCenter(){

    }

    showUserCenter(){

    }

    showMore(){

    }

    backToTaskView(){
        this.taskProgressNode.active = false;
        this.taskScrollView.active = false;
        this.taskNode.active = true;
    }

    private taskListRequestCallBack(data,context){
        EventManager.getInstance().off(TaskManager.TaskListRequestCallBack,context);
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



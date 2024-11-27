import { _decorator, Component, instantiate, Node, Prefab,Label } from 'cc';
import {DebugLog} from "../../../scripts/Core/Util/DebugLog";
import {SocketManager} from "db://assets/scripts/Core/Manager/Net/SocketManager";
import {TaskManager} from "db://assets/scripts/Game/Task/TaskManager";
import {EventManager} from "db://assets/scripts/Core/Manager/Event/EventManager";
import {TaskData} from "db://assets/scripts/Game/Task/TaskData";
const { ccclass, property } = _decorator;

@ccclass('mainScene')
export class mainScene extends Component {
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



    private chatPanel:Node = null;
    onLoad(){

    }


    start() {
        this.backToTaskView();
    }

    update(deltaTime: number) {
        
    }

    openChatPanel() {
        if(this.chatPanel == null)
        {
            this.createChatPanel();
        }

        this.chatPanel.active = true;
        this.taskProgressNode.active = false;
        this.taskScrollView.active = false;
        this.taskNode.active = false;
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
        EventManager.getInstance().off(TaskManager.TaskListRequestCallBack,this.taskListRequestCallBack);
        let taskList = TaskManager.getInstance().taskList;
        let index = 0;
        let count = 0;
        taskList.forEach((task:TaskData)=>{
            let taskItem = context.taskList[index];
            index++;
            if(taskItem == null)return;
            let label = taskItem.getChildByName("Label").getComponent("Label");
            let timeLabel = taskItem.getChildByName("time1").getComponent("Label");
            (label as Label).string = task.name;
            (timeLabel as Label).string = task.startTime+"-"+ task.endTime;
            taskItem.active =true;
            if(task.status == 1){
                count++;
            }
        });
        context.progressLabel.string = `${count} / ${taskList.length}`;
    }

    taskItemClick(event,data){
        DebugLog.instance.log(data);
        let taskList = TaskManager.getInstance().taskList;
        let taskData = taskList[Number(data)];
        TaskManager.getInstance().requestStartTask(taskData.id);
    }
}



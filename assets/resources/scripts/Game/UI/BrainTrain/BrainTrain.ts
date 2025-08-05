import { _decorator, Label, Node, ProgressBar } from 'cc';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { SkewersManager } from '../../Task/Skewers/SkewersManager';
import { SkewersGameType } from '../../Task/Skewers/SkewersGameData';
import { SkewersGameData } from '../../Task/Skewers/SkewersGameData';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { TaskManager } from '../../Task/TaskManager';
import { AlertType } from '../Alert/GameAlert';
import { TaskAndNotificationPanelCtrl } from '../TaskAndNotificationPanel/TaskAndNotificationPanelCtrl';
import { Global } from '../../../Core/Manager/Config/Global';
import {TaskData, TaskType} from "db://assets/resources/scripts/Game/Task/TaskData";
const { ccclass, property } = _decorator;

@ccclass('BrainTrain')
export class BrainTrain extends BasePanel {
    public static NAME: string = "BrainTrain";
    @property({ type: [Node] })
    skewersGameItems: Node[] = [];


    @property(Label)
    label: Label = null;
    private curTaskId: number = -1;
    onEnable(): void {
        if(this.curTaskId == -1){
            this.curTaskId = TaskManager.getInstance().getCurTaskId;
        }

    }

    private _curTask:TaskData;
    async showPanel(){
        super.showPanel();
        EventManager.getInstance().on(SkewersManager.TASK_GET_BRAIN_TRAININGS, this.requestBranisTraining_listCallBack.bind(this), this,true);
        SkewersManager.getInstance().requestBranisTraining_list(this.curTaskId);
    }

    restore(data){
        if(data !=null)this.curTaskId = data;
    }
    start() {

    }
    private requestBranisTraining_listCallBack(data, context) {
        EventManager.getInstance().off(SkewersManager.TASK_GET_BRAIN_TRAININGS, this);
        if(!this._curTask){
            this._curTask = TaskManager.getInstance().taskDic.get(this.curTaskId);
        }
        if(!this._curTask)return;
        this.label.string = this._curTask.name;
        this.node.active = true;
        let gameDatas = data;
        let len = this.skewersGameItems.length;
        for (let i = 0; i < len; i++) {
            let gameItem = this.skewersGameItems[i];
            let _gameData: SkewersGameData = gameDatas[i];
            if (_gameData) {
                gameItem.active = true;
                let label = gameItem.getChildByName("label").getComponent(Label);
                let descLabel = gameItem.getChildByName("desclabel").getComponent(Label);
                let type = _gameData.type;
                switch (type) {
                    case SkewersGameType.Memory:
                        label.string = "记忆力";
                        descLabel.string = "增强你的记忆能力。";
                        break;
                    case SkewersGameType.Judgment:
                        label.string = "判断力";
                        descLabel.string = "增强你的判断能力。";
                        break;
                    case SkewersGameType.Calculator:
                        label.string = "计算力";
                        descLabel.string = "增强你的计算能力。";
                        break;
                    case SkewersGameType.Executionability:
                        label.string = "执行力";
                        descLabel.string = "增强你的执行能力。";
                        break;
                    case SkewersGameType.Language:
                        label.string = "语言力";
                        descLabel.string = "增强你的语言能力。";
                        break;
                    case SkewersGameType.Comprehension:
                        label.string = "理解力";
                        descLabel.string = "增强你的理解能力。";
                        break;
                }
                let progressBar = gameItem.getChildByName("ProgressBar").getComponent(ProgressBar);
                progressBar.progress = _gameData.progress;
                let progressLabel = progressBar.node.getChildByName("Label").getComponent(Label);
                let progressStr = _gameData.progressStr;
                progressLabel.string = `${progressStr}`;
                let completeIcon = gameItem.getChildByName("completeIcon");
                if (_gameData.progress > 1) {
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
        // let taskList = TaskManager.getInstance().taskList;
        // taskList.forEach(task => {
        //     if (task && task.id == this.curTaskId) {
        //         this._curTaskData = task;
        //     }
        // });
        if(SkewersManager.getInstance().nextSkewersGameStr == null){
            this.backToCenteter();
            return;
        }
        let curTask = TaskManager.getInstance().getTaskByID(TaskManager.getInstance().getCurTaskId);
        let isRevise = curTask && curTask.type == TaskType.Revise;
        let nextGameStr = isRevise?SkewersManager.getInstance().nextSkewersGameDZStr:SkewersManager.getInstance().nextSkewersGameStr;
        SkewersManager.getInstance().showGameAlert(this.node, AlertType.Next, nextGameStr, '', 0, 0, this._alertNext, null, this);
    }
    private _alertNext() {
        TaskManager.getInstance().requestStartTask(this.curTaskId);
    }
    backToCenteter() {
        if (Global.prePanel != "") {
            let taskView = UIManager.getInstance().getActivePanel(Global.prePanel);
            if (taskView) {
                UIManager.getInstance().showPanel(TaskAndNotificationPanelCtrl.NAME);
            }
            Global.prePanel = "";
            
        }
        UIManager.getInstance().hidePanel(BrainTrain.NAME);
    }
}



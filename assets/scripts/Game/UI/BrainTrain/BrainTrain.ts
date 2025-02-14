import { _decorator, Component, Label, Node, ProgressBar } from 'cc';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { SkewersManager } from '../../Task/Skewers/SkewersManager';
import { SkewersGameType } from '../../Task/Skewers/SkewersGameData';
import { SkewersGameData } from '../../Task/Skewers/SkewersGameData';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { SceneManager } from '../../../Core/Manager/Scene/SceneManager';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { TaskManager } from '../../Task/TaskManager';
import { AlertType } from '../Alert/GameAlert';
const { ccclass, property } = _decorator;

@ccclass('BrainTrain')
export class BrainTrain extends BasePanel {
    public static NAME: string = "BrainTrain";
    @property({ type: [Node] })
    skewersGameItems: Node[] = [];
    private curTaskId: number = -1;
    onEnable(): void {
        this.curTaskId = TaskManager.getInstance().getCurTaskId;
        EventManager.getInstance().on(SkewersManager.TASK_GET_BRAIN_TRAININGS, this.requestBranisTraining_listCallBack, this);
        SkewersManager.getInstance().requestBranisTraining_list(this.curTaskId);
    }
    start() {

    }
    private requestBranisTraining_listCallBack(data, context) {
        EventManager.getInstance().off(SkewersManager.TASK_GET_BRAIN_TRAININGS, this);
        this.node.active = true;
        let gameDatas = data;
        let len = this.skewersGameItems.length;
        for (let i = 0; i < len; i++) {
            let gameItem = this.skewersGameItems[i];
            let _gameData: SkewersGameData = gameDatas[i];
            if (_gameData) {
                gameItem.active = true;
                let label = gameItem.getChildByName("label").getComponent(Label);
                let type = _gameData.type;
                switch (type) {
                    case SkewersGameType.Memory:
                        label.string = "记忆力";
                        break;
                    case SkewersGameType.Judgment:
                        label.string = "判断力";
                        break;
                    case SkewersGameType.Calculator:
                        label.string = "计算力";
                        break;
                    case SkewersGameType.Executionability:
                        label.string = "执行力";
                        break;
                    case SkewersGameType.Language:
                        label.string = "语言力";
                        break;
                    case SkewersGameType.Comprehension:
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
        // let taskList = TaskManager.getInstance().taskList;
        // taskList.forEach(task => {
        //     if (task && task.id == this.curTaskId) {
        //         this._curTaskData = task;
        //     }
        // });
        SkewersManager.getInstance().showGameAlert(this.node, AlertType.Next, SkewersManager.getInstance().nextSkewersGameStr, '', 0, 0, this._alertNext, null, this);
    }
    private _alertNext() {
        TaskManager.getInstance().requestStartTask(this.curTaskId);
    }
    backToCenteter() {
        UIManager.getInstance().hidePanel(BrainTrain.NAME);
    }
}



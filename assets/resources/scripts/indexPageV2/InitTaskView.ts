import { _decorator, Component, Node } from 'cc';
import { TaskManager } from '../Game/Task/TaskManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import {SkewersManager} from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
const { ccclass, property } = _decorator;

@ccclass('InitTaskView')
export class InitTaskView extends Component {

  start() {
    
  }
  onEnable() {
    EventManager.getInstance().on(TaskManager.RequestInitTaskCallback, this.requestInitTaskCallback, this);
  }
  onDisable() {
    EventManager.getInstance().off(TaskManager.RequestInitTaskCallback, this);
  }
  onButtonClick() {
    // console.log('点击按钮')
    TaskManager.getInstance().requestInitLevalTask();
  }

  requestInitTaskCallback() {
    // UIManager.getInstance().registerPanel(BrainTrain.NAME, BundleName.RESOURCES, "/prefab/BrainTrain/BrainTrain", BrainTrain);
    // UIManager.getInstance().showPanel(BrainTrain.NAME);
    EventManager.getInstance().on(SkewersManager.TASK_GET_BRAIN_TRAININGS, this.requestBranisTraining_listCallBack.bind(this), this, true);
    SkewersManager.getInstance().requestBranisTraining_list(TaskManager.getInstance().getCurTaskId);
  }

  private requestBranisTraining_listCallBack(data, context) {
    TaskManager.getInstance().requestStartTask(TaskManager.getInstance().getCurTaskId);
  }

  update(deltaTime: number) {

  }
}



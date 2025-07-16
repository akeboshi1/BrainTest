import { _decorator, Component, Node } from 'cc';
import { TaskManager } from '../Game/Task/TaskManager';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { BrainTrain } from '../Game/UI/BrainTrain/BrainTrain';
import { BundleName } from '../Core/Manager/Load/BundleName';
import { AdaptComponent } from "db://assets/resources/scripts/mainV2/AdaptComponent";
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
    UIManager.getInstance().registerPanel(BrainTrain.NAME, BundleName.RESOURCES, "/prefab/BrainTrain/BrainTrain", BrainTrain);
    UIManager.getInstance().showPanel(BrainTrain.NAME);
  }

  update(deltaTime: number) {

  }
}



import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('IndexPageController')
export class IndexPageController extends Component {
    @property(Prefab)
    private taskPrefab: Prefab = null;
    @property(Node)
    private taskContainer: Node = null;
    start() {
        this.generateTask();
    }

    update(deltaTime: number) {
        
    }
    generateTask() {
        for (let i = 0; i < 2; i++) {
            const task = instantiate(this.taskPrefab);
          
            this.taskContainer.addChild(task);
            task.setPosition(0, -i*350-150, 0);
        }
    }
}



import { _decorator, Component, Node, Prefab, instantiate } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('indexPageController')
export class indexPageController extends Component {
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
        const task = instantiate(this.taskPrefab);
        this.taskContainer.addChild(task);
    }
}



import { _decorator, Component, instantiate, Node, Prefab, Label } from 'cc';
import { TaskManager } from '../Task/TaskManager';
import { EventManager } from '../../Core/Manager/Event/EventManager';
const { ccclass, property } = _decorator;

@ccclass('TaskAndNotificationPanelCtrl')
export class TaskAndNotificationPanelCtrl extends Component {
    @property(Node)
    notifictionListNode: Node = null;

    @property(Prefab)
    notificationItemPrefab: Prefab;

    @property(Node)
    redDotNode: Node = null;

    start() {

    }

    protected onEnable(): void {
        EventManager.getInstance().on(TaskManager.NotificationListRequestCallBack, this.notificationRequestCallBack, this);
    }

    protected onDisable(): void {
        EventManager.getInstance().off(TaskManager.NotificationListRequestCallBack, this);
    }

    update(deltaTime: number) {

    }

    private notificationRequestCallBack(data, context) {
        console.log("通知列表", data);

        if (data && data.length > 0) {
            this.showRedDot()
        } else {
            this.hideRedDot()
        }

        this.updateList(data);
    }

    hideRedDot() {
        if (this.redDotNode) this.redDotNode.active = false;
    }

    showRedDot() {
        if (this.redDotNode) this.redDotNode.active = true;
    }

    clearList() {
        this.notifictionListNode.removeAllChildren();
    }

    updateList(notificationArr: any[] = []) {
        this.clearList();
        for (let index = 0; index < notificationArr.length; index++) {
            let notificationPrefab = instantiate(this.notificationItemPrefab);
            this.notifictionListNode.addChild(notificationPrefab);
            notificationPrefab.getChildByName("timeLabel").getComponent(Label).string = notificationArr[index].start_at;
            notificationPrefab.getChildByName("decsLabel").getComponent(Label).string = notificationArr[index].content;
        }
    }

}



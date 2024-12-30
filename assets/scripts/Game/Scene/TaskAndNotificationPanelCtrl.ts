import { _decorator, Component, instantiate, Node, Prefab, Label ,ScrollView} from 'cc';
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

    @property(ScrollView)
    scrollViewNode: ScrollView = null;

    private notificationList: any[] = [];

    start() {

    }

    protected onEnable(): void {
        EventManager.getInstance().on(TaskManager.NotificationListRequestCallBack, this.notificationRequestCallBack, this);
        this.scrollViewNode.node.on("scroll-to-bottom", this.scrollViewEvent, this);
    }

    protected onDisable(): void {
        EventManager.getInstance().off(TaskManager.NotificationListRequestCallBack, this);
    }
    scrollViewEvent(event, index: number) {
        console.log("scrollview", event, index);
       this.hideRedDot();

        const subIds: number[] = this.notificationList.map(item => (item as any).id);
        if(subIds.length!==0){ 
            TaskManager.getInstance().isReadNotification(subIds);
        }
        this.notificationList=[];
        this.scrollViewNode.node.off("scroll-to-bottom", this.scrollViewEvent, this);
    }

    update(deltaTime: number) {

    }

    private notificationRequestCallBack() {
        this.notificationList = TaskManager.getInstance().notificationList;
        if (this.notificationList && this.notificationList.length > 0) {
            this.showRedDot()
        } else {
            this.hideRedDot()
        }

        this.updateList(this.notificationList);
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



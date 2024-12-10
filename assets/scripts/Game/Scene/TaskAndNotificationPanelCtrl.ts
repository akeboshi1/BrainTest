import { _decorator, Component, instantiate, Node ,Prefab,Label} from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TaskAndNotificationPanelCtrl')
export class TaskAndNotificationPanelCtrl extends Component {
    @property(Node)
    notifictionListNode: Node = null;

    @property(Prefab)
    notificationItemPrefab: Prefab ;

    start() {

    }

    update(deltaTime: number) {
        
    }

    updateList(notificationArr){

        for (let index = 0; index < notificationArr.length; index++) {
           let notificationPrefab = instantiate(this.notificationItemPrefab)
            this.notifictionListNode.addChild(notificationPrefab);
            notificationPrefab.getChildByName("timeLabel").getComponent(Label).string=notificationArr[index].time;
            notificationPrefab.getChildByName("decsLabel").getComponent(Label).string=notificationArr[index].content;
            
        }

    }

}



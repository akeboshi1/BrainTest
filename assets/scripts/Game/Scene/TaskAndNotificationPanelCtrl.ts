import { _decorator, Component, instantiate, Node ,Prefab,Label} from 'cc';
const { ccclass, property } = _decorator;

@ccclass('TaskAndNotificationPanelCtrl')
export class TaskAndNotificationPanelCtrl extends Component {
    @property(Node)
    notifictionListNode: Node = null;

    @property(Prefab)
    notificationItemPrefab: Prefab ;

    @property(Node)
    redDotNode: Node = null;

    start() {

    }

    update(deltaTime: number) {
        
    }
    hideRedDot(){
        if(this.redDotNode)this.redDotNode.active=false;
    }
    showRedDot(){
        if(this.redDotNode)this.redDotNode.active=true;
    }
    clearList(){
        this.notifictionListNode.removeAllChildren();   
    }
    updateList(notificationArr: any[]=[]){
        this.clearList();
        for (let index = 0; index < notificationArr.length; index++) {
           let notificationPrefab = instantiate(this.notificationItemPrefab)
            this.notifictionListNode.addChild(notificationPrefab);
            notificationPrefab.getChildByName("timeLabel").getComponent(Label).string=notificationArr[index].start_at;
            notificationPrefab.getChildByName("decsLabel").getComponent(Label).string=notificationArr[index].content;
            
        }

    }

}



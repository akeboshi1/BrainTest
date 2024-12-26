import { _decorator, Component, Label, Node } from 'cc';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
// import { PersonalCenterManager } from '../../GameCenter/PersonalCenterManager';
import { DebugLog } from '../../../Core/Util/DebugLog';
import { PersonalCenterManager } from '../../PersonalCenterManager/PersonalCenterManager';


const { ccclass, property } = _decorator;

@ccclass('PersonalCenterPanel')
export class PersonalCenterPanel extends Component {

    @property(Label)
    titleLabel: Label = null;

    start() {
        DebugLog.instance.log("PersonalCenterPanel start");
         EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, this.getUserInfoCallBack, this);
         PersonalCenterManager.getInstance().requestUserInfo();
    }

    getUserInfoCallBack(data: any) {
       let userData= PersonalCenterManager.getInstance().userInfoData
    }
   
    update(deltaTime: number) {
       
    }
    showUserInfo() {
        this.node.parent.getChildByName('UserInfoPanel').active = true;
    }
}



import { _decorator, Component, Node } from 'cc';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
// import { PersonalCenterManager } from '../../GameCenter/PersonalCenterManager';
import { DebugLog } from '../../../Core/Util/DebugLog';
import { PersonalCenterManager } from '../../PersonalCenterManager/PersonalCenterManager';

const { ccclass, property } = _decorator;

@ccclass('PersonalCenterPanel')
export class PersonalCenterPanel extends Component {
    start() {
        DebugLog.instance.log("PersonalCenterPanel start");
         EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, this.getUserInfoCallBack, this);
         PersonalCenterManager.getInstance().requestUserInfo();
    }

    getUserInfoCallBack(data: any) {
        
    }
    update(deltaTime: number) {
        
    }
}



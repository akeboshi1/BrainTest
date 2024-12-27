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

    onEnable() {
        DebugLog.instance.log("PersonalCenterPanel start");
         EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, this.getUserInfoCallBack, this);
         PersonalCenterManager.getInstance().requestUserInfo();
    }

    getUserInfoCallBack(data: any) {
       let userData= PersonalCenterManager.getInstance().userInfoData;
       this.setPersonalCenterTitle(userData.full_name.toString());
       
    }
    setPersonalCenterTitle(title: string) {
        this.titleLabel.string = title;
    }
    backToParent() {
        this.node.parent.active = false;
    }
    update(deltaTime: number) {
       
    }
    showUserInfo() {
        this.node.active = false;
        this.node.parent.getChildByName('UserInfoPanel').active = true;
    }
}



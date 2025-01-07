import { _decorator, Label, Node } from 'cc';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { DebugLog } from '../../../Core/Util/DebugLog';
import { PersonalCenterManager } from '../../PersonalCenterManager/PersonalCenterManager';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { UserInfoPanel } from './UserInfoPanel';
import { BundleName } from '../../../Core/Manager/Load/BundleName';
import { GenerateReport } from './GenerateReport';

const { ccclass, property } = _decorator;

@ccclass('PersonalCenterPanel')
export class PersonalCenterPanel extends BasePanel {
    public static NAME: string = "PersonalCenterPanel";

    @property(Label)
    titleLabel: Label = null;

    onEnable() {
        EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, this.getUserInfoCallBack, this);
        PersonalCenterManager.getInstance().requestUserInfo();
    }

    onDisable(): void {
        EventManager.getInstance().off(PersonalCenterManager.getUserInfoCallBack, this);
    }

    getUserInfoCallBack(data: any) {
        let userData = PersonalCenterManager.getInstance().userInfoData;
        if(userData.full_name) {
            this.setPersonalCenterTitle(userData.full_name.toString());
        }else {
            this.setPersonalCenterTitle("未登录");
        }
    }

    setPersonalCenterTitle(title: string) {
        this.titleLabel.string = title;
    }

    backToParent() {
        UIManager.getInstance().hidePanel(PersonalCenterPanel.NAME);
    }

    update(deltaTime: number) {

    }

    showUserInfo() {
        UIManager.getInstance().registerPanel(UserInfoPanel.NAME, BundleName.RESOURCES, "prefab/personalCenter/UserInfoPanel", UserInfoPanel);
        UIManager.getInstance().showPanel(UserInfoPanel.NAME);
    }

    showReport() {

        UIManager.getInstance().registerPanel(GenerateReport.NAME, BundleName.RESOURCES, "prefab/personalCenter/GenerateReport", GenerateReport);
        UIManager.getInstance().showPanel(GenerateReport.NAME);
    }


}



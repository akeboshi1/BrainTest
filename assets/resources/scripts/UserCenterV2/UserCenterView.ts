import { _decorator, Component, Label, Node } from 'cc';
import { LoginManager } from '../Core/Manager/LoginManager/LoginManager';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { AlterUserInfoView } from './AlterUserInfoView';
import { BundleName } from '../Core/Manager/Load/BundleName';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
const { ccclass, property } = _decorator;

@ccclass('UserCenterPanel')
export class UserCenterPanel extends Component {
   @property(Label)
   userName: Label = null;


   start() {

   }
   onEnable() {
      EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, this.getUserInfoCallBack, this);
      PersonalCenterManager.getInstance().requestUserInfo();
   }
   onDisable() {
      EventManager.getInstance().off(PersonalCenterManager.getUserInfoCallBack, this);
   }

   getUserInfoCallBack() {
      let userData = PersonalCenterManager.getInstance().userInfoData;
      if (userData.full_name) {
         this.setPersonalCenterTitle(userData.full_name.toString());
      } else {
         this.setPersonalCenterTitle("未设置昵称");
      }
   }
   setPersonalCenterTitle(title: string) {
      this.userName.string = title;
   }
   onClickLogOut() {
      LoginManager.getInstance().loginout();
   }
   onClickAlterUserInfo() {
      UIManager.getInstance().registerPanel(AlterUserInfoView.NAME, BundleName.RESOURCES, "/prefabV2/personalCenter/alterUserInfo", AlterUserInfoView);
      UIManager.getInstance().showPanel(AlterUserInfoView.NAME);
   }
}



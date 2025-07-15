import { _decorator, Component, Label, Node, resources, Sprite, SpriteFrame } from 'cc';
import { LoginManager } from '../Core/Manager/LoginManager/LoginManager';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { AlterUserInfoView } from './AlterUserInfoView';
import { BundleName } from '../Core/Manager/Load/BundleName';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import {VipPanel} from "db://assets/resources/scripts/Game/UI/Vip/VipPanel";
import { VerifyPanel } from '../Game/UI/Login/VerifyPanel';
import { MySetView } from './MySetView';
import {AlertData, AlertManager} from "db://assets/resources/scripts/Core/Manager/Alert/AlertManager";
import {AdaptComponent} from "db://assets/resources/scripts/mainV2/AdaptComponent";
const { ccclass, property } = _decorator;

@ccclass('UserCenterPanel')
export class UserCenterPanel extends AdaptComponent {
   @property(Label)
   userName: Label = null;
   @property(Sprite)
   userIcon: Sprite = null;

   @property(Node)
   memberNode:Node = null;


    @property(Label)
    descLabel:Label = null;

    start(){
       super.start();
   }

   onEnable() {
      EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, this.getUserInfoCallBack, this);
      PersonalCenterManager.getInstance().requestUserInfo();
   }
   onDisable() {
      EventManager.getInstance().off(PersonalCenterManager.getUserInfoCallBack, this);
   }

   async getUserInfoCallBack() {
      let userData = PersonalCenterManager.getInstance().userInfoData;
      if(userData.gender==1){
         const spriteFrame = await this.loadTaskSprite('textureV2/indexPage/male/spriteFrame');
         this.userIcon.spriteFrame = spriteFrame;
      }else{
         const spriteFrame = await this.loadTaskSprite('textureV2/indexPage/female/spriteFrame');
         this.userIcon.spriteFrame = spriteFrame;
      }
      if (userData.full_name) {
         this.setPersonalCenterTitle(userData.nickname);
      } else {
         this.setPersonalCenterTitle("未设置昵称");
      }
       let label = this.memberNode.getChildByName("label").getComponent(Label);
      if(userData.is_member){
          label.string = "续费会员";
          this.descLabel.string =  "您已开通会员，点击续费";
      }else{
          label.string = "开通会员";
          this.descLabel.string = "开通会员，享受更多特权";
      }
   }
   async loadTaskSprite(path: string): Promise<SpriteFrame> {
      return new Promise((resolve, reject) => {
          resources.load(path, SpriteFrame, (err, spriteFrame) => {
              if (err) {
                  reject(err);
                  return;
              }

              if (!spriteFrame) {
                  reject(new Error('Loaded sprite frame is null'));
                  return;
              }
              resolve(spriteFrame);
          });
      })
  }
   setPersonalCenterTitle(title: string) {
      this.userName.string = title;
   }
   onClickLogOut() {
      const alertData: AlertData = new AlertData();
      alertData.title = "确定要退出登录吗？";
      alertData.message = "退出后将返回登录界面";
      alertData.cancelButtonVisible = true;
      alertData.cancelButtonText = "取消";
      alertData.confirmButtonText = "确定";
      alertData.confirmCb = () => {
         LoginManager.getInstance().loginout();
      };
      alertData.cancelCb = () => {
         // 取消操作，不需要做任何处理
      };
      AlertManager.getInstance().showAlert(alertData);
   }
   onClickAlterUserInfo() {
      UIManager.getInstance().registerPanel(AlterUserInfoView.NAME, BundleName.RESOURCES, "/prefabV2/personalCenter/alterUserInfo", AlterUserInfoView);
      UIManager.getInstance().showPanel(AlterUserInfoView.NAME);
   }
   onClickMySet() {
      UIManager.getInstance().registerPanel(MySetView.NAME, BundleName.RESOURCES, "/prefabV2/personalCenter/mySet", MySetView);
      UIManager.getInstance().showPanel(MySetView.NAME);
   }

   onClickShowVip(){
      EventManager.getInstance().on(VerifyPanel.CloseVerifyPanel, this.onCloseVerifyPanel, this, true);
      UIManager.getInstance().showPanel(VipPanel.NAME);
   }

   private onCloseVerifyPanel(){
   }

   showScanPanel(){
      UIManager.getInstance().registerPanel(VerifyPanel.NAME, BundleName.RESOURCES, "prefab/UserCenter/VerifyPanel", VerifyPanel);
      UIManager.getInstance().showPanel(VerifyPanel.NAME);
  }
}



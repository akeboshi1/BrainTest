import { _decorator, Component, Label, Node, resources, Sprite, SpriteFrame } from 'cc';
import { LoginManager } from '../Core/Manager/LoginManager/LoginManager';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { AlterUserInfoView } from './AlterUserInfoView';
import { BundleName } from '../Core/Manager/Load/BundleName';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { VipPanel } from "db://assets/resources/scripts/Game/UI/Vip/VipPanel";
import { VerifyPanel } from '../Game/UI/Login/VerifyPanel';
import { MySetView } from './MySetView';
import { AlertData, AlertManager } from "db://assets/resources/scripts/Core/Manager/Alert/AlertManager";
import { BundleInfoDebugPanel } from '../Game/UI/Debug/BundleInfoDebugPanel';
import { AdaptComponent } from '../mainV2/AdaptComponent';
import {ChangePassword} from "db://assets/resources/scripts/Game/UI/Login/ChangePassword";
const { ccclass, property } = _decorator;

@ccclass('UserCenterPanel')
export class UserCenterPanel extends AdaptComponent {
   @property(Label)
   userName: Label = null;
   @property(Sprite)
   userIcon: Sprite = null;
   @property(Label)
   phoneNumberLabel: Label = null;
   @property(Label)
   memberValidity: Label = null;
   @property(Node)
   memberNode: Node = null;

   @property(Node)
   inviteNode:Node = null;

   @property(Label)
   descLabel: Label = null;

   @property(Node)
   changPasswordNode:Node = null;

   // 点击计数器相关属性
   private clickCount: number = 0;
   private clickTimer: number = 0;
   private readonly CLICK_TIMEOUT: number = 3; // 3秒超时
   private readonly REQUIRED_CLICKS: number = 5; // 需要5次点击

   start() {
      super.start();
      if(PersonalCenterManager.getInstance().userInfoData.is_org_user){
         this.changPasswordNode.active = true;
      }else{
         this.changPasswordNode.active = false;
      }
   }

   onEnable() {
      EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, this.getUserInfoCallBack, this);
      EventManager.getInstance().on(LoginManager.LoginByTokenResult, this.invitecodeCallBack, this);
      PersonalCenterManager.getInstance().requestUserInfo();

      // 为userIcon添加点击事件
      this.userIcon.node.on(Node.EventType.TOUCH_END, this.onUserIconClick, this);
   }
   
   onDisable() {
      EventManager.getInstance().off(PersonalCenterManager.getUserInfoCallBack, this);
      EventManager.getInstance().off(LoginManager.LoginByTokenResult, this);
      // 移除点击事件监听
      this.userIcon.node.off(Node.EventType.TOUCH_END, this.onUserIconClick, this);
   }

   /**
    * 处理用户头像点击事件
    */
   private onUserIconClick() {
      const currentTime = Date.now() / 1000;
      
      // 如果是第一次点击或超时，重置计数器
      if (this.clickCount === 0 || (currentTime - this.clickTimer) > this.CLICK_TIMEOUT) {
         this.clickCount = 1;
         this.clickTimer = currentTime;
      } else {
         // 在时间窗口内，增加计数
         this.clickCount++;
         
         // 检查是否达到目标点击次数
         if (this.clickCount >= this.REQUIRED_CLICKS) {
            this.openBundleInfoDebugPanel();
            this.resetClickCounter();
         }
      }
   }

   /**
    * 重置点击计数器
    */
   private resetClickCounter() {
      this.clickCount = 0;
      this.clickTimer = 0;
   }

   /**
    * 打开BundleInfoDebugPanel
    */
   private openBundleInfoDebugPanel() {
      UIManager.getInstance().registerPanel(
         BundleInfoDebugPanel.NAME, 
         BundleName.RESOURCES, 
         "/prefab/Debug/BundleInfoDebugPanel", 
         BundleInfoDebugPanel
      );
      UIManager.getInstance().showPanel(BundleInfoDebugPanel.NAME);
   }

   private invitecodeCallBack(){
      if(this.inviteNode){
          this.inviteNode.active = false;
      }
   }

   async getUserInfoCallBack() {
      let userData = PersonalCenterManager.getInstance().userInfoData;
      if(!userData){ return; }
      if (userData.gender == 1) {
         const spriteFrame = await this.loadTaskSprite('textureV2/indexPage/male/spriteFrame');
         this.userIcon.spriteFrame = spriteFrame;
      } else {
         const spriteFrame = await this.loadTaskSprite('textureV2/indexPage/female/spriteFrame');
         this.userIcon.spriteFrame = spriteFrame;
      }
      if (userData.full_name) {
         this.setPersonalCenterTitle(userData.nickname);
      } else {
         this.setPersonalCenterTitle("未设置昵称");
      }
      let label = this.memberNode.getChildByName("label").getComponent(Label);
      if (userData.is_member) {
         label.string = "续费会员";
         this.descLabel.string = "您已开通会员，点击续费";
      } else {
         label.string = "开通会员";
         this.descLabel.string = "开通会员，享受更多特权";
      }
      if(userData.mp_no){
         this.phoneNumberLabel.string = `手机号：${userData.mp_no}`;
      }else{
         this.phoneNumberLabel.string = "未绑定手机号";
      }
      if(userData.member_endTime){
         this.memberValidity.string = `会员有效期至：${userData.member_endTime}`;
      }
      if(userData.is_invited){
         this.inviteNode.active = false;
      }else{
          this.inviteNode.active = true;
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
      if (title.length > 5) {
         title = title.substring(0, 6) + '...';
      }
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

   onClickShowVip() {
      EventManager.getInstance().on(VerifyPanel.CloseVerifyPanel, this.onCloseVerifyPanel, this, true);
      UIManager.getInstance().showPanel(VipPanel.NAME);
   }

   onClickChangePassword(){
      UIManager.getInstance().registerPanel(ChangePassword.NAME, BundleName.RESOURCES, "/prefab/AuthLogin/ChangePassword", ChangePassword);
      UIManager.getInstance().showPanel(ChangePassword.NAME);
   }

   private onCloseVerifyPanel() {
   }

   showScanPanel() {
      UIManager.getInstance().registerPanel(VerifyPanel.NAME, BundleName.RESOURCES, "prefab/UserCenter/VerifyPanel", VerifyPanel);
      UIManager.getInstance().showPanel(VerifyPanel.NAME);
   }
}



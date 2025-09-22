import { _decorator, Component, Label, Node, resources, Sprite, SpriteFrame, UITransform, Texture2D, assetManager, ImageAsset } from 'cc';
import { LoginManager } from '../Core/Manager/LoginManager/LoginManager';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { AlterUserInfoView } from './AlterUserInfoView';
import { BundleName } from '../Core/Manager/Load/BundleName';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { DebugLog } from '../Core/Util/DebugLog';
import { VipPanel } from "db://assets/resources/scripts/Game/UI/Vip/VipPanel";
import { VerifyPanel } from '../Game/UI/Login/VerifyPanel';
import { MySetView } from './MySetView';
import { AlertData, AlertManager } from "db://assets/resources/scripts/Core/Manager/Alert/AlertManager";
import { BundleInfoDebugPanel } from '../Game/UI/Debug/BundleInfoDebugPanel';
import { AdaptComponent } from '../mainV2/AdaptComponent';
import {ChangePassword} from "db://assets/resources/scripts/Game/UI/Login/ChangePassword";
import { IndexPageConfig } from '../indexPageV2/IndexPageConfig';
import { ThemeConfig } from '../Config/ThemeConfig';
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

   @property(Node)
   private titleBg: Node = null;

   @property(Node)
   private titleIcon: Node = null;

   @property(Node)
   private titleText: Node = null;

   // 点击计数器相关属性
   private clickCount: number = 0;
   private clickTimer: number = 0;
   private readonly CLICK_TIMEOUT: number = 3; // 3秒超时
   private readonly REQUIRED_CLICKS: number = 5; // 需要5次点击

   // 首页配置相关属性
   private indexPageConfig: IndexPageConfig = new IndexPageConfig();
   private _configApplied: boolean = false; // 防止重复应用配置

   // 数据加载完成通知相关属性
   private _dataLoadPromise: Promise<void> = null;
   private _dataLoadResolve: Function = null;

   start() {
      super.start();
      
      // 创建数据加载Promise
      this._dataLoadPromise = new Promise<void>((resolve) => {
         this._dataLoadResolve = resolve;
      });
      
      if(PersonalCenterManager.getInstance().userInfoData.is_org_user){
         this.changPasswordNode.active = true;
      }else{
         this.changPasswordNode.active = false;
      }
   }

   onEnable() {
      EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, this.getUserInfoCallBack, this);
      EventManager.getInstance().on(LoginManager.LoginByTokenResult, this.invitecodeCallBack, this);
      
      // 使用缓存机制请求用户信息
      this.loadUserInfo();

      // 为userIcon添加点击事件
      this.userIcon.node.on(Node.EventType.TOUCH_END, this.onUserIconClick, this);
   }

   /**
    * 加载用户信息（使用缓存机制）
    */
   private async loadUserInfo() {
      try {
         await PersonalCenterManager.getInstance().requestUserInfo();
         // 数据加载完成后，直接调用回调更新UI
         this.getUserInfoCallBack();
      } catch (error) {
         DebugLog.instance.error("加载用户信息失败:", error);
      }
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

      // 应用首页配置
      await this.applyIndexPageConfig();

      // 数据加载完成，通知PageController
      if (this._dataLoadResolve) {
         this._dataLoadResolve();
         this._dataLoadResolve = null;
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

   /**
    * 获取当前应该使用的配置类型
    * @returns 配置类型：'normal' 或节日名称
    */
   getCurrentConfigType(): string {
      let currentFestival = ThemeConfig.getInstance().getThemeTitle();
      if(currentFestival == "" || currentFestival == null){
         currentFestival = "normal";
      }
      return currentFestival;
   }

   /**
    * 从远程URL加载图片并转换为SpriteFrame
    * @param url 远程图片URL
    * @returns Promise<SpriteFrame>
    */
   async loadRemoteSprite(url: string): Promise<SpriteFrame> {
      return new Promise((resolve, reject) => {
         this.wwwLoadSpriteFrame(url,(spriteFrame: SpriteFrame) => {
            if (spriteFrame) {
               resolve(spriteFrame);
            } else {
               reject(new Error(`远程图片加载失败: ${url}`));
            }
         });
      });
   }

   /**
    * 使用assetManager加载远程图片
    * @param path 远程图片路径
    * @param completeHD 完成回调函数
    */
   public wwwLoadSpriteFrame(path: string,completeHD?: Function) {
      assetManager.loadRemote<ImageAsset>(path,
         {
            xhrResponseType: "blob",
            xhrHeader: { 'Content-Type': 'application/octet-stream' }
         },
         (err, imageAsset: ImageAsset) => {
            if (err) {
               DebugLog.instance.error("load error  ");
               DebugLog.instance.log(err);
               completeHD(null);
               return;
            }
            const spriteFrame = new SpriteFrame();
            const texture = new Texture2D();
            texture.image = imageAsset;
            spriteFrame.texture = texture;
            
            completeHD(spriteFrame);
         }
      );
   }

   /**
    * 应用首页配置到UI
    */
   async applyIndexPageConfig() {
      // 防止重复调用
      if (this._configApplied) {
         DebugLog.instance.log("UserCenter配置已经应用过，跳过重复调用");
         return;
      }
      
      DebugLog.instance.log("UserCenter开始应用首页配置");
      const userData = PersonalCenterManager.getInstance().userInfoData;
      let config = null;
      
      // 优先从用户信息缓存中获取配置
      if (userData) {
         DebugLog.instance.log("UserCenter用户数据存在，检查缓存");
         const cachedConfig = userData.getIndexPageConfigCache();
         if (cachedConfig) {
            DebugLog.instance.log("UserCenter使用缓存的首页配置");
            config = cachedConfig;
         } else {
            DebugLog.instance.log("UserCenter缓存中没有配置");
         }
      } else {
         DebugLog.instance.log("UserCenter用户数据不存在");
      }
      
      // 如果缓存中没有配置，则重新加载
      if (!config) {
         DebugLog.instance.log("UserCenter缓存中没有配置，重新加载首页配置");
         await this.indexPageConfig.loadConfig();
         let type = this.getCurrentConfigType(); // 动态获取配置类型
         
         if (type === "normal") {
            config = this.indexPageConfig.normalConfig;
         } else {
            config = ThemeConfig.getInstance().getConfig();
         }
         
         // 将配置存储到用户信息缓存中
         if (userData && config) {
            userData.setIndexPageConfigCache(config);
            DebugLog.instance.log("UserCenter首页配置已缓存到用户信息中");
         }
      }
      
      if (config && config.ui) {
         DebugLog.instance.log("UserCenter配置存在，开始应用UI配置");
         // 应用UI配置
         if (config.ui.bg) {
            DebugLog.instance.log("UserCenter开始加载背景图片:", config.ui.bg);
            // 设置标题背景 - 统一使用远程加载
            const titleSprite = await this.loadRemoteSprite(config.ui.bg);
            
            if (this.titleBg && titleSprite) {
               this.titleBg.getComponent(Sprite).spriteFrame = titleSprite;
               DebugLog.instance.log("UserCenter成功应用标题背景配置");
            } else {
               DebugLog.instance.log("UserCenter标题背景节点或图片不存在", this.titleBg, titleSprite);
            }
            DebugLog.instance.log("UserCenter应用标题配置:", config.ui.bg);
         } else {
            DebugLog.instance.log("UserCenter配置中没有背景图片");
         }
         if (config.ui.middle) {
            // 设置图标0 - 统一使用远程加载
            const icon0Sprite = await this.loadRemoteSprite(config.ui.middle);

            if (this.titleIcon && icon0Sprite) {
               const transform = this.titleIcon.getComponent(Sprite).node.getComponent(UITransform);
               // 调整尺寸
               transform.width = icon0Sprite.width;
               transform.height = icon0Sprite.height;
               // 调整位置 - 保持图片中心位置不变
               const currentPos = this.titleIcon.position;
               this.titleIcon.setPosition(
                  currentPos.x + 40 ,
                  currentPos.y + 260,
                  currentPos.z
               );
               this.titleIcon.getComponent(Sprite).spriteFrame = icon0Sprite;
            }
         }
         if (config.ui.title) {
            // 设置图标1 - 统一使用远程加载
            const icon1Sprite = await this.loadRemoteSprite(config.ui.title);
            
            if (this.titleText && icon1Sprite) {
               this.titleText.getComponent(Sprite).spriteFrame = icon1Sprite;
            }
            DebugLog.instance.log("UserCenter应用图标1配置:", config.ui.title);
         }
      }
      
      // 标记配置已应用
      this._configApplied = true;
      DebugLog.instance.log("UserCenter配置应用完成");
   }

   /**
    * 强制刷新首页配置
    * 清除缓存并重新加载配置
    */
   async refreshIndexPageConfig(): Promise<void> {
      const userData = PersonalCenterManager.getInstance().userInfoData;
      if (userData) {
         userData.clearIndexPageConfigCache();
         DebugLog.instance.log("UserCenter已清除首页配置缓存，将重新加载");
      }
      
      // 重置配置应用标志
      this._configApplied = false;
      
      // 重新应用配置
      await this.applyIndexPageConfig();
   }

   /**
    * 等待数据加载完成
    * 供PageController调用，用于延迟显示页面
    */
   async waitForDataLoad(): Promise<void> {
      if (this._dataLoadPromise) {
         await this._dataLoadPromise;
      }
   }
}



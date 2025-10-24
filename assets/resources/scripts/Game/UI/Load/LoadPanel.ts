import { BasePanel, PanelState } from "../../../Core/UI/BasePanel";
import { _decorator, Label, Node, tween, Vec3, UIOpacity, easing, Sprite, UITransform, Texture2D, assetManager, ImageAsset, SpriteFrame } from "cc";
import { DebugLog } from "db://assets/resources/scripts/Core/Util/DebugLog";
import { EventManager } from "../../../Core/Manager/Event/EventManager";
import { BundlePreloadEvent, BundlePreloadManager } from "../../../Core/Manager/Load/BundlePreloadManager";
import { AudioManager } from "../../../Core/Manager/Audio/AudioManager";
import { PersonalCenterManager } from "../../PersonalCenterManager/PersonalCenterManager";
import { IndexPageConfig } from "../../../indexPageV2/IndexPageConfig";
import { ThemeConfig } from "../../../Config/ThemeConfig";
import { GlobalConfigManager } from "../../../Config/GlobalConfigManager";
import { ImageLoaderUtil } from "../../../Core/Util/ImageLoaderUtil";

const { ccclass, property } = _decorator;

@ccclass('LoadPanel')
export class LoadPanel extends BasePanel {

      //==== loadNode

      @property(Node)
      loadNode:Node =null;

      @property(Label)
      titleLabel: Label;

      @property(Label)
      progressLabel: Label;

      @property(Node)
      loadSprite: Node = null;

      //==== timeNode

      @property(Label)
      timeTimeTickLabel:Label;

      @property(Node)
      timeTickNode:Node =null;

      @property(Label)
      timeLabel0:Label =null;

      @property(Label)
      timeDescLabel:Label =null;

      @property(Node)
      private titleBg: Node = null;
   
      @property(Node)
      private titleIcon: Node = null;
   
      @property(Node)
      private titleText: Node = null;

      private _rotateTween: any = null;

      // 首页配置相关属性
      private _configApplied: boolean = false; // 防止重复应用配置

      public static NAME: string = 'LoadPanel';

      constructor() {
            super();
      }

      onLoad() {
            DebugLog.instance.log("load onload");
      }

      start() {
            DebugLog.instance.log("load start");
            this.setTitle("加载资源中");
            this.setProgress('开始加载');
            
            // 应用首页配置
            this.applyIndexPageConfig();
      }

      onEnable(): void {
            EventManager.getInstance().on(BundlePreloadEvent.PROGRESS, this.processBundleProcess.bind(this), this,true);
            EventManager.getInstance().on(BundlePreloadEvent.SCENE_LOADED, this.onSceneLoaded.bind(this), this,true);
            EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onBundleLoadFinish.bind(this), this,true);
            this.startRotate();
      }

      onDisable(): void {
            EventManager.getInstance().off(BundlePreloadEvent.PROGRESS, this);
            EventManager.getInstance().off(BundlePreloadEvent.SCENE_LOADED, this);
            EventManager.getInstance().off(BundlePreloadEvent.FINISH, this);
            this.stopRotate();
      }

      private startRotate() {
            if (this.loadSprite) {
                  // 停止之前的旋转动画
                  this.stopRotate();
                  
                  // 创建新的旋转动画
                  this._rotateTween = tween(this.loadSprite)
                        .by(1, { eulerAngles: new Vec3(0, 0, -360) })
                        .union()
                        .repeatForever()
                        .start();
            }
      }

      private stopRotate() {
            if (this._rotateTween) {
                  this._rotateTween.stop();
                  this._rotateTween = null;
            }
      }

      processBundleProcess(data: any) {
            this.setProgress(`加载资源中 ${data.progress}%`);
      }

      onSceneLoaded(data: any) {
            this.setTitle("进入场景中");
            this.setProgress(`场景资源加载完成!`);
      }

      onBundleLoadFinish() {
            this.setTitle("进入场景中");
            this.setProgress(`全部加载完成！`);
      }

      setTitle(str: string) {
            this.titleLabel.node.active = true;
            this.titleLabel.string = str;
      }

      setProgress(str: string) {
            this.progressLabel.string = str;
      }

      showTimeNode(){
            this.loadNode.active = false;
            this.stopRotate();
            this.timeTickNode.active = true;
            
            // 开始倒计时动画
            this.startCountdown();
      }

      private startCountdown() {
            // 只使用timeLabel0做倒计时
            // this.timeLabel0.string = "倒计时";
            this.timeTimeTickLabel.node.active = true;
            
            // 先让 timeTimeTickLabel 做缩放动画：从2倍到1倍
            this.timeTimeTickLabel.node.setScale(2, 2, 1);
            tween(this.timeTimeTickLabel.node)
                .to(1, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .call(() => {
                    // 缩放动画完成后开始倒计时
                    this.startActualCountdown();
                })
                .start();
      }

      private startActualCountdown() {
            AudioManager.getInstance().playShortSound('music/tick', 0.5);
            
            // 确保timeLabel0有UIOpacity组件
            let uiOpacity0 = this.timeLabel0.node.getComponent(UIOpacity);
            if (!uiOpacity0) {
                uiOpacity0 = this.timeLabel0.node.addComponent(UIOpacity);
            }
            
            // 初始状态：完全可见
            uiOpacity0.opacity = 0;
            
            // 倒计时参数
            let currentValue = 3;
            let currentCircle = 0; // 当前圈数
            const totalCircles = 3; // 总圈数
            
            // 执行一圈旋转的函数
            const doOneCircle = () => {
                // 检查是否完成所有圈数
                if (currentCircle >= totalCircles) {
                    this.onCountdownFinish();
                    return;
                }
                
                // 设置当前倒计时数字
                this.timeLabel0.string = currentValue.toString();
                
                // 添加数字出现时的力度动画：先放大再缩小
                this.timeLabel0.node.setScale(1.5, 1.5, 1);
                tween(this.timeLabel0.node)
                    .to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: 'elasticOut' })
                    .start();
                
                // 计算当前圈的起始角度和中间角度、结束角度
                let startAngle = -currentCircle * 360;
                let middleAngle = startAngle - 270;  // 中间180度
                let endAngle = startAngle - 450;     // 结束360度
                
                // 第一部分：0到180度，0.15秒，alpha保持0，使用更有力的缓动
                let firstPartTween = tween(this.timeTickNode)
                    .to(0, { eulerAngles: new Vec3(0, 0, middleAngle) }, { easing: 'quadIn' })
                    .call(() => {
                        // 第二部分：180到360度，0.85秒，alpha从0→1→0，使用更有力的缓动
                        let secondPartTween = tween(this.timeTickNode)
                            .to(0.85, { eulerAngles: new Vec3(0, 0, endAngle) }, { easing: 'quadOut' })
                            .call(() => {
                                // 一圈完成，准备下一圈
                                currentCircle++;
                                currentValue--;
                                
                                // 继续下一圈或结束
                                doOneCircle();
                            });
                        
                        // 第二部分的透明度变化：0→1→0（0.85秒），使用更有力的缓动
                        let secondOpacityTween = tween(uiOpacity0)
                            .to(0.4, { opacity: 255 }, { easing: 'quadOut' })  // 前0.4秒：alpha从0到255
                            .to(0.45, { opacity: 0 }, { easing: 'quadIn' });   // 后0.45秒：alpha从255到0
                        
                        // 启动第二部分动画
                        secondPartTween.start();
                        secondOpacityTween.start();
                    });
                
                // 第一部分的透明度：保持0（0.15秒）
                let firstOpacityTween = tween(uiOpacity0)
                    .to(0, { opacity: 0 });
                
                // 启动第一部分动画
                firstPartTween.start();
                firstOpacityTween.start();
            };
            
            // 开始第一圈
            doOneCircle();
      }

      private onCountdownFinish() {
            // 倒计时结束后的处理
            DebugLog.instance.log("倒计时结束");
            this.timeTickNode.eulerAngles = new Vec3(0, 0, 0);
            this.timeTimeTickLabel.node.active = false;
            
            // 显示 timeDescLabel 并做缩放动画
            this.timeDescLabel.node.active = true;
            this.timeDescLabel.node.setScale(0, 0, 1); // 初始状态：缩放为0
            
            // 执行从0到1的缩放动画
            tween(this.timeDescLabel.node)
                .to(0.5, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                .call(() => {
                  EventManager.getInstance().emit(BundlePreloadEvent.COUNTDOWN_FINISH);
                })
                .start();
      }

      async showPanel(skipTween: boolean = false): Promise<void> {
            this.startRotate();
      }

      async hidePanel(): Promise<void> {
            this.stopRotate();
      }



      /**
       * 应用首页配置到UI
       */
      async applyIndexPageConfig() {
            // 防止重复调用
            if (this._configApplied) {
                  DebugLog.instance.log("LoadPanel配置已经应用过，跳过重复调用");
                  return;
            }
            
            DebugLog.instance.log("LoadPanel开始应用首页配置");
            
            // 使用GlobalConfigManager的公共方法
            await GlobalConfigManager.getInstance().applyIndexPageConfig(
                  this.titleBg,
                  this.titleIcon,
                  this.titleText
            );
            
            // 标记配置已应用
            this._configApplied = true;
            DebugLog.instance.log("LoadPanel配置应用完成");
      }

      /**
       * 强制刷新首页配置
       * 清除缓存并重新加载配置
       */
      async refreshIndexPageConfig(): Promise<void> {
            // 使用GlobalConfigManager清除缓存
            await GlobalConfigManager.getInstance().refreshIndexPageConfig();
            
            // 重置配置应用标志
            this._configApplied = false;
            
            // 重新应用配置
            await this.applyIndexPageConfig();
      }
}
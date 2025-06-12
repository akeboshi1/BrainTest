import { BasePanel, PanelState } from "../../../Core/UI/BasePanel";
import { _decorator, Label, Node, tween, Vec3, UIOpacity, easing } from "cc";
import { DebugLog } from "db://assets/resources/scripts/Core/Util/DebugLog";
import { EventManager } from "../../../Core/Manager/Event/EventManager";
import { BundlePreloadEvent, BundlePreloadManager } from "../../../Core/Manager/Load/BundlePreloadManager";

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

      @property(Node)
      timeTickNode:Node =null;

      @property(Label)
      timeLabel0:Label =null;

      @property(Label)
      timeDescLabel:Label =null;

      private _rotateTween: any = null;

      public static NAME: string = 'LoadPanel';

      constructor() {
            super();
      }

      onLoad() {
            DebugLog.instance.log("load onload");
      }

      start() {
            DebugLog.instance.log("load start");
            this.setTitle("正在进入场景");
            this.setProgress('开始加载');
      }

      onEnable(): void {
            EventManager.getInstance().on(BundlePreloadEvent.PROGRESS, this.processBundleProcess.bind(this), this);
            EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onBundleLoadFinish.bind(this), this);
            this.startRotate();
      }

      onDisable(): void {
            EventManager.getInstance().off(BundlePreloadEvent.PROGRESS, this);
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

      onBundleLoadFinish() {
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
            this.timeLabel0.string = "3";
            this.timeLabel0.node.eulerAngles = new Vec3(0, 0, 0);
            
 
            // 确保timeLabel0有UIOpacity组件
            let uiOpacity0 = this.timeLabel0.node.getComponent(UIOpacity);
            if (!uiOpacity0) {
                uiOpacity0 = this.timeLabel0.node.addComponent(UIOpacity);
            }
            
            // 初始状态：完全可见
            uiOpacity0.opacity = 255;
            
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
                
                // 计算目标角度（顺时针旋转360度）
                let targetAngle = -(currentCircle + 1) * 360;
                
                // 执行1秒的顺时针旋转360度
                let rotateTween = tween(this.timeTickNode)
                    .to(1.0, { eulerAngles: new Vec3(0, 0, targetAngle) }, { easing: 'linear' })
                    .call(() => {
                        // 一圈完成，准备下一圈
                        currentCircle++;
                        
                        // 继续下一圈或结束
                        doOneCircle();
                    });
                
                // 执行透明度变化动画（总共1秒）
                let opacityTween = tween(uiOpacity0)
                    // 前0.25秒：alpha从255到0
                    .to(0.4, { opacity: 0 })
                    // 中间0.5秒：alpha保持0
                    .to(0.2, { opacity: 0 }).call(()=>{
                        currentValue--;
                        this.timeLabel0.string = currentValue.toString();
                    })
                    // 后0.25秒：alpha从0到255
                    .to(0.4, { opacity: 255 });
                
                // 同时启动旋转和透明度动画
                rotateTween.start();
                opacityTween.start();
            };
            
            // 开始第一圈
            doOneCircle();
      }

      private onCountdownFinish() {
            // 倒计时结束后的处理
            DebugLog.instance.log("倒计时结束");
            // 派发倒计时完成事件，通知BundlePreloadManager继续派发FINISH事件
            EventManager.getInstance().emit(BundlePreloadEvent.COUNTDOWN_FINISH);
      }

      async showPanel(): Promise<void> {
            this.startRotate();
      }

      async hidePanel(): Promise<void> {
            this.stopRotate();
      }
}
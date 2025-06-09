import { BasePanel, PanelState } from "../../../Core/UI/BasePanel";
import { _decorator, Label, Node, tween, Vec3 } from "cc";
import { DebugLog } from "db://assets/resources/scripts/Core/Util/DebugLog";
import { EventManager } from "../../../Core/Manager/Event/EventManager";
import { BundlePreloadEvent } from "../../../Core/Manager/Load/BundlePreloadManager";

const { ccclass, property } = _decorator;

@ccclass('LoadPanel')
export class LoadPanel extends BasePanel {

      @property(Label)
      titleLabel: Label;

      @property(Label)
      progressLabel: Label;

      @property(Node)
      loadSprite: Node = null;

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

      async showPanel(): Promise<void> {
            this.startRotate();
      }

      async hidePanel(): Promise<void> {
            this.stopRotate();
      }
}
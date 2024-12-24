import { BasePanel, PanelState } from "../../../Core/UI/BasePanel";
import { _decorator, Label } from "cc";
import { DebugLog } from "db://assets/scripts/Core/Util/DebugLog";
import { EventManager } from "../../../Core/Manager/Event/EventManager";
import { BundlePreloadEvent } from "../../../Core/Manager/Load/BundlePreloadManager";
import { UIManager } from "../../../Core/Manager/UI/UIManager";

const { ccclass, property } = _decorator;

@ccclass('LoadPanel')
export class LoadPanel extends BasePanel {

      @property(Label)
      titleLabel: Label;

      @property(Label)
      progressLabel: Label;

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
            EventManager.getInstance().on(BundlePreloadEvent.PROGRESS,this.processBundleProcess,this);
            EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onBundleLoadFinish,this);
      }

      onDisable(): void {
            EventManager.getInstance().off(BundlePreloadEvent.PROGRESS,this);
            EventManager.getInstance().off(BundlePreloadEvent.FINISH,this);
      }

      processBundleProcess(data:any){
            this.setProgress(`加载资源中 ${data.progress}%`);
      }

      onBundleLoadFinish(){
            this.setProgress(`全部加载完成！`);
      }

      setTitle(str: string) {
            this.titleLabel.node.active = true;
            this.titleLabel.string = str;
      }

      setProgress(str: string) {
            this.progressLabel.string = str;
      }
}
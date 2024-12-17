import {BasePanel} from "../../../Core/UI/BasePanel";
import { _decorator,Label } from "cc";
import {DebugLog} from "db://assets/scripts/Core/Util/DebugLog";

const { ccclass, property } = _decorator;

@ccclass('LoadPanel')
export class LoadPanel extends BasePanel{

      @property(Label)
      titleLabel:Label;

      @property(Label)
      progressLabel:Label;

      constructor() {
            super();
      }

      onLoad() {
            DebugLog.instance.log("load onload");
      }

      start(){
            DebugLog.instance.log("load start");
      }

      setTitle(str:string){
            this.titleLabel.node.active = true;
            this.titleLabel.string = str;
      }

      setProgress(str:string){
            this.progressLabel.string = str;
      }
}
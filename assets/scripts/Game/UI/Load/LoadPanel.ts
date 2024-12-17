import {BasePanel} from "../../../Core/UI/BasePanel";
import {UIManager} from "../../../Core/Manager/UI/UIManager";
import { _decorator,Label } from "cc";

const { ccclass, property } = _decorator;

@ccclass('LoadPanel')
export class LoadPanel extends BasePanel{

      @property(Label)
      titleLabel:Label;

      @property(Label)
      progressLabel:Label;

      public static NAME = UIManager.LOAD_PANEL;

      setTitle(str:string){
            this.titleLabel.string = str;
      }

      setProgress(str:string){
            this.progressLabel.string = str;
      }
}
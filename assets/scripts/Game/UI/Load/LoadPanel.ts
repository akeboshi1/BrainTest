import {BasePanel} from "../../../Core/UI/BasePanel";
import {UIManager} from "../../../Core/Manager/UI/UIManager";
import { _decorator } from "cc";

const { ccclass, property } = _decorator;

@ccclass('LoadPanel')
export class LoadPanel extends BasePanel{
      public static NAME = UIManager.LOAD_PANEL;
}
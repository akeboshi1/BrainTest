import { _decorator, Button, EditBox,SpriteFrame,sp } from 'cc';
import {BasePanel} from "../../../../scripts/Core/UI/BasePanel";
import {EventManager} from "../../../../scripts/Core/Manager/Event/EventManager";
import {LoginManager} from "db://assets/scripts/Core/Manager/LoginManager/LoginManager";
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";
const { ccclass, property } = _decorator;

@ccclass('PhoneLoginPanel')
export class PhoneLoginPanel extends BasePanel{
    @property(Button)
    enterBtn:Button;

    @property(Button)
    backBtn:Button;

    @property(EditBox)
     phoneNumberEdit:EditBox;

     constructor() {
         super();
         PhoneLoginPanel.NAME = "PhoneLoginPanel";
         this.name = PhoneLoginPanel.NAME;
     }

     onLoad() {
         const eventName = PhoneLoginPanel.NAME;
         EventManager.getInstance().on(eventName,this.loadPanelComplete,this);
         EventManager.getInstance().emit(eventName,eventName);

     }

    private loadPanelComplete(){
        EventManager.getInstance().off(PhoneLoginPanel.NAME,this);
    }

    /**
     * 返回上一级界面
     */
    public backClick(){
        LoginManager.getInstance().start(this.node);
    }

    /**
     * 登录操作
     */
    public enterClick(){
        Global.userData.phoneNumber = this.phoneNumberEdit.string;
        LoginManager.getInstance().showPhoneView(this.node);
    }


}
import { _decorator, Button, EditBox,Node,sp } from 'cc';
import {BasePanel} from "../../../Core/UI/BasePanel";
import {EventManager} from "../../..//Core/Manager/Event/EventManager";
import {LoginManager} from "../../../Core/Manager/LoginManager/LoginManager";
import {Global} from "../../../Core/Manager/Config/Global";
import {UIManager} from "../../../Core/Manager/UI/UIManager";
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

     start() {
         if(this.phoneNumberEdit.node)this.phoneNumberEdit.node.on(Node.EventType.TOUCH_END,this.checkBoxHandler,this);
     }

     onDisable() {
         if(this.phoneNumberEdit.node)this.phoneNumberEdit.node.off(Node.EventType.TOUCH_END,this.checkBoxHandler);
     }

    private checkBoxHandler(evt:Event) {
         this.phoneNumberEdit.setFocus();
     }


    private loadPanelComplete(){
        EventManager.getInstance().off(PhoneLoginPanel.NAME,this);
    }

    /**
     * 返回上一级界面
     */
    public backClick(){
        EventManager.getInstance().emit(UIManager.BACK_TO_PARENT);
        this.node.removeFromParent();
    }

    /**
     * 登录操作
     */
    public enterClick(){
        Global.userData.phoneNumber = this.phoneNumberEdit.string;
        LoginManager.getInstance().showPhoneView(this.node);
    }


}
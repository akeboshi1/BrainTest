import { _decorator, Button, EditBox,Node,Sprite } from 'cc';
import {BasePanel} from "../../../Core/UI/BasePanel";
import {EventManager} from "../../..//Core/Manager/Event/EventManager";
import {LoginManager} from "../../../Core/Manager/LoginManager/LoginManager";
import {Global} from "../../../Core/Manager/Config/Global";
import {UIManager} from "../../../Core/Manager/UI/UIManager";
import {ColorUtil} from "db://assets/scripts/Core/Util/ColorUtil";
const { ccclass, property } = _decorator;

@ccclass('PhoneLoginPanel')
export class PhoneLoginPanel extends BasePanel{
    @property(Button)
    enterBtn:Button;

    @property(Button)
    backBtn:Button;

    @property(EditBox)
     phoneNumberEdit:EditBox;

    @property(Node)
    phoneNumberEditBG:Node;

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
         if(this.phoneNumberEdit.node){
             this.phoneNumberEdit.node.on(Node.EventType.TOUCH_END,this.checkBoxHandler,this);
         }
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

    /**
     * editbox change
     */
    public textChange(){
        let sprite = this.phoneNumberEditBG.getComponent(Sprite);
        let btnSprite = this.enterBtn.node.getComponent(Sprite);
        if(this.phoneNumberEdit.string.length>0){
            sprite.color = ColorUtil.getCCColor(10,89,247);
            btnSprite.color = ColorUtil.getCCColor(10,89,247);
        }else{
            sprite.color = ColorUtil.getCCColor(255,255,255);
            btnSprite.color = ColorUtil.getCCColor(255,255,255);
        }
    }


}
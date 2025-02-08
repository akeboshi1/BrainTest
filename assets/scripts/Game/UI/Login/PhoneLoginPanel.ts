import { _decorator, Button, EditBox, Node, Sprite } from 'cc';
import { BasePanel } from "../../../Core/UI/BasePanel";
import { EventManager } from "../../..//Core/Manager/Event/EventManager";
import { LoginManager } from "../../../Core/Manager/LoginManager/LoginManager";
import { Global } from "../../../Core/Manager/Config/Global";
import { UIManager } from "../../../Core/Manager/UI/UIManager";
import { ColorUtil } from "db://assets/scripts/Core/Util/ColorUtil";
import { LoginPopUpPanel } from './LoginPopUpPanel';
const { ccclass, property } = _decorator;

@ccclass('PhoneLoginPanel')
export class PhoneLoginPanel extends BasePanel {
    @property(Button)
    enterBtn: Button;

    @property(Button)
    backBtn: Button;

    @property(EditBox)
    phoneNumberEdit: EditBox;

    @property(Node)
    phoneNumberEditBG: Node;

    public static NAME: string = "PhoneLoginPanel";

    constructor() {
        super();
        this.name = PhoneLoginPanel.NAME;
    }

    onLoad() {
    }

    start() {
        if (this.phoneNumberEdit.node) {
            this.phoneNumberEdit.node.on(Node.EventType.TOUCH_END, this.checkBoxHandler, this);
        }
    }

    onDisable() {
        if (this.phoneNumberEdit.node) this.phoneNumberEdit.node.off(Node.EventType.TOUCH_END, this.checkBoxHandler);
    }

    private checkBoxHandler(evt: Event) {
        this.phoneNumberEdit.setFocus();
    }

    /**
     * 返回上一级界面
     */
    public backClick() {
        EventManager.getInstance().emit(UIManager.BACK_TO_PARENT);
        UIManager.getInstance().hidePanel(PhoneLoginPanel.NAME);
    }

    /**
     * 登录操作
     */
    public enterClick() {
        const phoneNum = this.phoneNumberEdit.string;
        LoginManager.getInstance().phoneNum = phoneNum;
        
        // 添加监听
        EventManager.getInstance().on('login.send_mp_code', (data) => {
            if (data['status'] == 0) {
                // 请求失败，不进行操作
                return;
            }
            // 请求成功，显示验证码面板
            UIManager.getInstance().showPanel(LoginPopUpPanel.NAME, { switchView: false });
        }, this, true);
        
        // 发送验证码请求
        LoginManager.getInstance().requestSendMpCode(phoneNum);
    }

    /**
     * editbox change
     */
    public textChange() {
        let sprite = this.phoneNumberEditBG.getComponent(Sprite);
        let btnSprite = this.enterBtn.node.getComponent(Sprite);
        if (this.phoneNumberEdit.string.length > 0) {
            sprite.color = ColorUtil.getCCColor(10, 89, 247);
            btnSprite.color = ColorUtil.getCCColor(10, 89, 247);
        } else {
            sprite.color = ColorUtil.getCCColor(255, 255, 255);
            btnSprite.color = ColorUtil.getCCColor(255, 255, 255);
        }
    }


}
import { _decorator, Node, Label, Button, EditBox, Vec3 } from 'cc';
import { BasePanel } from "../../../Core/UI/BasePanel";
import { DebugLog } from "../../../Core/Util/DebugLog";
import { EventManager } from "../../../Core/Manager/Event/EventManager";
import { UIManager } from "../../../Core/Manager/UI/UIManager";
import { LoginPanel } from "../../../Game/UI/Login/LoginPanel";
import { LoginErrorCode, LoginManager } from "../../../Core/Manager/LoginManager/LoginManager";
import { Global } from "db://assets/scripts/Core/Manager/Config/Global";
import { SceneManager } from '../../../Core/Manager/Scene/SceneManager';
import { LocalStorageKeyEnum, LocalStorageUtil } from '../../../Core/Util/LocalStorageUtil';
import { TimeUtil } from '../../../Core/Util/TimeUtil';
import AlertManager, { AlertData } from '../../../Core/Manager/Alert/AlertManager';
import { TimerCommonComponent } from '../Common/TimerCommonComponent';


const { ccclass, property } = _decorator;

@ccclass('LoginPopUpPanel')
export class LoginPopUpPanel extends BasePanel {
    //==== XieyiView
    @property(Node)
    XieyiView: Node;

    @property(Label)
    XieyiTitleTxt: Label;

    @property(Label)
    XieyiDescTxt: Label;

    @property(Button)
    AgreeButton: Button;

    @property(Button)
    CancelButton: Button;

    //==== PhoneView

    @property(Node)
    PhoneView: Node;

    @property(Label)
    PhoneViewTitle: Label;

    @property(Label)
    PhoneNumberTxt: Label;

    @property(Label)
    PhoneDescTxt: Label;

    @property(Node)
    num0: Node;

    @property(Node)
    num1: Node;

    @property(Node)
    num2: Node;

    @property(Node)
    num3: Node;

    @property(EditBox)
    editBox: EditBox;


    @property(Label)
    enterTxt: Label;

    @property(Node)
    labelNode: Node;

    @property(TimerCommonComponent)
    private timerCommonComponent: TimerCommonComponent;

    private numNodes: Node[];

    public static NAME: string = "LoginPopUpPanel";

    /**
     * 手机验证码下发
     * @private
     */
    private login_send_mp_code: string = "login.send_mp_code";

    /**
     * 手机登录（验证)
     * @private
     */
    private login_login_by_mp: string = "login.login_by_mp";

    private phoneNumber: string = "";
    private phoneCode: string = "";

    constructor() {
        super();
        this.name = LoginPopUpPanel.NAME;
    }

    onLoad() {

    }

    start() {
        this.PhoneDescTxt.string = "发送>>";
        this.numNodes = [this.num0, this.num1, this.num2, this.num3];
        this.startEditbox();
        this.timerCommonComponent.startTimer(60);

    }
    onTimerEnd() {
        this.PhoneDescTxt.node.active = true;
        this.PhoneDescTxt.string = "重新发送>>";
        this.timerCommonComponent.node.active = false;
    }

    reSendCode() {
        this.timerCommonComponent.startTimer(60);
        this.PhoneDescTxt.node.active = false;
        this.timerCommonComponent.node.active = true;
        this.startEditbox();
        EventManager.getInstance().on(this.login_send_mp_code, this.requestCodeCallBack, this, true);
        LoginManager.getInstance().requestSendMpCode(this.phoneNumber);
    }
    
    onEnable() {
        if (this.timerCommonComponent) this.timerCommonComponent.on('timer-end', this.onTimerEnd, this);

    }

    onDisable() {

        EventManager.getInstance().off(this.login_send_mp_code, this);
        EventManager.getInstance().off(this.login_login_by_mp, this);
        if (this.timerCommonComponent) this.timerCommonComponent.off('timer-end', this.onTimerEnd, this);
    }

    restore(data: any): void {
        if (data != null && data.switchView) {
            this.switchView();
        } else {
            this.agreeClick();
        }
    }

    agreeClick() {
        this.phoneNumber = LoginManager.getInstance().phoneNum;
        this.PhoneDescTxt.node.active = false;
        this.enterTxt.node.active = true;
        this.updateView(true);
    }

    private requestCodeCallBack(data, context) {
        if (data['status'] == 0) {
            DebugLog.instance.error(`请求${data['action']}失败，${data.message}`);
            UIManager.getInstance().hidePanel(LoginPopUpPanel.NAME);
            return;
        }

        this.PhoneDescTxt.node.active = false;
        this.enterTxt.node.active = true;
        this.phoneNumber = data['data']['mp_no'];
        this.updateView(true);
    }
    backToParent() {
        UIManager.getInstance().hidePanel(LoginPopUpPanel.NAME);
    }
    cancelClick() {
        UIManager.getInstance().showPanel(LoginPanel.NAME);
        this.hidePanel();
    }

    public switchView(isPhoneView: boolean = false) {
        this.XieyiView.active = !isPhoneView;
        this.PhoneView.active = false;
        if (isPhoneView) {
            this._initPhoneView();
        } else {
            this._initXieyiView();
        }
    }

    public updateView(isPhoneView: boolean = false) {
        this.XieyiView.active = !isPhoneView;
        this.PhoneView.active = isPhoneView;
        if (isPhoneView) {
            this._updatePhoneView();
        } else {
            this._updateXieyiView();
        }
    }

    private _initPhoneView() {
        this.agreeClick();
    }

    private _updatePhoneView() {
        this.PhoneNumberTxt.string = this.phoneNumber;
    }

    private _initXieyiView() {

    }

    private _updateXieyiView() { }


    private requestLoginCallBack(data, context) {
        if (data['status'] == 0) {
            this.PhoneDescTxt.string = "重新发送>>";
            return;
        }
    }

    public requestEnter() {
        let len = this.numNodes.length;
        let codeStr = "";
        for (let i = 0; i < len; i++) {
            let editBox = this.numNodes[i];
            if (editBox == null) continue;
            codeStr += editBox.getChildByName('label').getComponent(Label).string;
        }
        this.phoneCode = codeStr;
        EventManager.getInstance().on(this.login_login_by_mp, this.requestLoginCallBack, this, true);
        LoginManager.getInstance().requestLoginByMp(this.phoneCode);
    }

    public startEditbox() {
        if (!this.editBox.isFocused()) {
            this.editBox.setFocus();
            let _index = -1;
            for (let i: number = 3; i >= 0; i--) {
                const node = this.numNodes[i];
                if (node.getChildByName('label').getComponent(Label).string != '' && i > _index) {
                    node.setScale(new Vec3(1.2, 1.2, 1.2));
                    _index = i;
                } else {
                    node.setScale(new Vec3(1, 1, 1));
                }
            }
            if (_index == -1) {
                this.numNodes[0].setScale(new Vec3(1.2, 1.2, 1.2));
            }
        }
    }

    public editBoxValue(event) {
        var str = this.editBox.string;
        let characters = str.split('');
        let len = characters.length;
        this.numNodes.forEach((node) => {
            node.getChildByName('label').getComponent(Label).string = "";
            node.setScale(new Vec3(1, 1, 1))
        })
        let selectIndex = 0;
        for (let i = 0; i < len; i++) {
            let tmpStr = characters[i];
            let numLabel = this.numNodes[i].getChildByName('label').getComponent(Label);
            if (numLabel) {
                numLabel.string = tmpStr;
            }
            selectIndex++;
        }
        let selectNode = this.numNodes[selectIndex];
        if (selectNode) {
            selectNode.setScale(new Vec3(1.2, 1.2, 1.2));
        }
        if (len == 4) {
            this.editBox.node.active = false;
            this.labelNode.active = true;
            this.requestEnter();
        }
    }
}
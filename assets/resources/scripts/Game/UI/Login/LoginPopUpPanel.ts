import { _decorator, Node, Label, Button, EditBox, Vec3,Sprite,SpriteFrame,resources } from 'cc';
import { BasePanel } from "../../../Core/UI/BasePanel";
import { DebugLog } from "../../../Core/Util/DebugLog";
import { EventManager } from "../../../Core/Manager/Event/EventManager";
import { UIManager } from "../../../Core/Manager/UI/UIManager";
import { LoginPanel } from "../../../Game/UI/Login/LoginPanel";
import { LoginManager } from "../../../Core/Manager/LoginManager/LoginManager";
import { TimerCommonComponent } from '../Common/TimerCommonComponent';


const { ccclass, property } = _decorator;

@ccclass('LoginPopUpPanel')
export class LoginPopUpPanel extends BasePanel {
    @property(Label)
    PhoneViewTitle: Label;

    private unPhoneStr:string = "未注册的手机号再接收协议并填入我们发送的验证码后将自动创建可乐派账号";

    @property(Label)
    phoneDesTxt:Label;

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


    @property(Node)
    labelNode: Node;

    @property(Button)
    loginBtn:Button;

    @property(Label)
    loginBtnLabel:Label;

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
        this.numNodes = [this.num0, this.num1, this.num2, this.num3];
        this.startEditbox();
        this.textChange(0);
        // this.timerCommonComponent.startTimer(60);

    }
    onTimerEnd() {
        this.timerCommonComponent.node.active = false;
    }

    reSendCode() {
        this.timerCommonComponent.startTimer(60);
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
        this.showVerifyCodeAlert();
    }

    private showVerifyCodeAlert() {
        this.phoneNumber = LoginManager.getInstance().phoneNum;
        this.updateView(true);
    }

    agreeClick() {
        UIManager.getInstance().hidePanel(LoginPopUpPanel.NAME);
    }

    private requestCodeCallBack(data, context) {
        if (data['status'] == 0) {
            DebugLog.instance.error(`请求${data['action']}失败，${data.message}`);
            UIManager.getInstance().hidePanel(LoginPopUpPanel.NAME);
            return;
        }
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


    public updateView(isPhoneView: boolean = false) {
        this._updatePhoneView();
    }

    private _updatePhoneView() {
        this.phoneDesTxt.string = `请输入${this.phoneNumber}收到的验证码`;
    }

    private requestLoginCallBack(data, context) {
        if (data['status'] == 0) {
            // this.loginBtnLabel.string = "重新发送";
            this.textChange(0);
            this.clearEditBox();
            this.editBox.string = "";
            this.editBox.setFocus(); // 重新获取焦点
            this.timerCommonComponent.startTimer(60);
            return;
        }
    }

    requestEnter() {
        let len = this.numNodes.length;
        var str = this.editBox.string;
        let characters = str.split('');
        if(characters.length!=4){
            DebugLog.instance.error("请正确输入验证码");

            return;
        }
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
            this.textChange(len);
            // this.requestEnter();
        }

    }

    private clearEditBox() {
        this.editBox.string = "";
        this.editBoxValue(null);
    }

    public textChange(len:number) {
        let btnSprite = this.loginBtn.getComponent(Sprite);
        let url = "";
        if (len > 0) {
            url = "textureV2/component/componentnormalbg/spriteFrame";
        } else {
            url = "textureV2/component/componentbg/spriteFrame";
        }
        resources.load(url, SpriteFrame,(err,sp)=>{
            if(err){
                DebugLog.instance.error(err);
                return;
            }
            btnSprite.spriteFrame  = sp;
        });
    }
}
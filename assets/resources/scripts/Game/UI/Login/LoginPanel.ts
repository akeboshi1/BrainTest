import { _decorator, Toggle, Node, Vec3, Label, EditBox, Button, Sprite, resources, SpriteFrame, Color } from 'cc';
import { BasePanel } from "../../../Core/UI/BasePanel";
import { UIManager } from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import { AlertManager, AlertData } from "db://assets/resources/scripts/Core/Manager/Alert/AlertManager";
import { DebugLog } from "db://assets/resources/scripts/Core/Util/DebugLog";
import { BundleName } from '../../../Core/Manager/Load/BundleName';
import { LoginManager } from "db://assets/resources/scripts/Core/Manager/LoginManager/LoginManager";
import { EventManager } from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
import { TimerCommonComponent } from "db://assets/resources/scripts/Game/UI/Common/TimerCommonComponent";
import { TreatyView } from '../../../TreatyV2/TreatyView';
const { ccclass, property } = _decorator;

@ccclass('LoginPanel')
export class LoginPanel extends BasePanel {

    @property(Node)
    loginBtn: Node;

    @property(Toggle)
    toggle: Toggle;

    @property(Node)
    tips: Node;

    @property(Label)
    phoneDesTxt: Label;

    @property(Label)
    loginBtnLabel: Label;

    @property(TimerCommonComponent)
    private timerCommonComponent: TimerCommonComponent;

    // ===== 手机号输入
    @property(Node)
    phoneView: Node;

    @property(EditBox)
    phoneNumberEdit: EditBox;

    @property(Button)
    cleanNumberBtn: Button;


    // ===== 验证码
    @property(Node)
    yanzhengView: Node;

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

    private numNodes: Node[];

    public static NAME: string = "LoginPanel";


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

    private isTimeOver: boolean = false;


    constructor() {
        super();
        this.name = LoginPanel.NAME;
    }

    start() {
        if (this.phoneNumberEdit.node) {
            this.phoneNumberEdit.node.on(Node.EventType.TOUCH_END, this.checkBoxHandler, this);
        }
        this.textChange();

        this.numNodes = [this.num0, this.num1, this.num2, this.num3];
    }

    onEnable() {
        if (this.timerCommonComponent) this.timerCommonComponent.on('timer-end', this.onTimerEnd, this);
    }


    onDisable() {
        if (this.phoneNumberEdit.node) this.phoneNumberEdit.node.off(Node.EventType.TOUCH_END, this.checkBoxHandler);
        EventManager.getInstance().off(this.login_send_mp_code, this);
        EventManager.getInstance().off(this.login_login_by_mp, this);
        if (this.timerCommonComponent) this.timerCommonComponent.off('timer-end', this.onTimerEnd, this);
    }



    onDestroy() {
        super.onDestroy();
    }

    private checkBoxHandler(evt: Event) {
        this.phoneNumberEdit.setFocus();
    }

    /**
     * 点击协议显示协议面板
     */

    public loginClick() {
        if (!this.toggle.isChecked) {
            let ad: AlertData = new AlertData();
            ad.title = "提示";
            ad.cancelButtonVisible = true;
            ad.cancelButtonText = "不接受"
            ad.confirmButtonText = "接受"
            ad.contentClickCb = this.showXieYi.bind(this);
            AlertManager.getInstance().showUserAgreeAlert(ad);
            ad.confirmCb = this.confirmHandler.bind(this);
            ad.cancelCb = this.cancelHandler.bind(this);
            return;
        }
        if (this.phoneView.active) {
            const phoneNum = this.phoneNumberEdit.string;
            LoginManager.getInstance().phoneNum = phoneNum;

            // 添加监听
            let self = this;
            EventManager.getInstance().on('login.send_mp_code', (data) => {
                if (data['status'] == 0) {
                    // 请求失败，不进行操作
                    AlertManager.getInstance().showSocketAlert('请求失败重新再试');
                    return;
                }
                // 请求成功，显示验证码面板

                self.timerCommonComponent.startTimer(30);
                self.switchView(false);
                self.startEditbox();
                self.textChange1();
                self.phoneNumber = LoginManager.getInstance().phoneNum;
                self.updateYanzhengView();

                // UIManager.getInstance().showPanel(LoginPopUpPanel.NAME, { switchView: false });
            }, this, true);

            // 发送验证码请求
            LoginManager.getInstance().requestSendMpCode(phoneNum);
        } else {
            let len = this.numNodes.length;
            var str = this.editBox.string;
            let characters = str.split('');
            this.loginBtn.active = true;

            if (this.isTimeOver) {
                this.reSendCode();
            } else {
                if (characters.length != 4) {
                    DebugLog.instance.error("请正确输入验证码");
                    AlertManager.getInstance().showSocketAlert('请正确输入验证码');
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
        }
    }

    private async changeBtnFrame(index: number = 0): Promise<void> {
        let btnSprite = this.loginBtn.getComponent(Sprite);
        let url: string = "";
        switch (index) {
            case 0:
                url = "textureV2/component/componentbg/spriteFrame"
                break
            case 1:
                url = "textureV2/component/componentnormalbg/spriteFrame"
                break;
        }
        
        return new Promise<void>((resolve, reject) => {
            resources.load(url, SpriteFrame, (err, sp) => {
                if (err) {
                    DebugLog.instance.error(err);
                    reject(err);
                    return;
                }
                btnSprite.spriteFrame = sp;
                if (index === 0) {
                    btnSprite.color = new Color(200, 201, 204, 255); // c8c9cc
                } else {
                    btnSprite.color = new Color(255, 255, 255, 255); // white
                }
                resolve();
            });
        });
    }

    cancelHandler() {
        AlertManager.getInstance().closeCurrentAlert();
    }
    // 显示协议
    showXieYi() {
        UIManager.getInstance().registerPanel(TreatyView.NAME, BundleName.RESOURCES, '/prefabV2/treatyPrefab', TreatyView);
        UIManager.getInstance().showPanel(TreatyView.NAME,{
            flag:"XieYi"
        });
    }
    showPrivacy() {
        UIManager.getInstance().registerPanel(TreatyView.NAME, BundleName.RESOURCES, '/prefabV2/treatyPrefab', TreatyView);
        UIManager.getInstance().showPanel(TreatyView.NAME,{
            flag:"Privacy"
        });
    }

    private confirmHandler() {
        //todo
        DebugLog.instance.log("请点击确认协议");
        this.toggle.isChecked = true;
        this.tips.active = false;
    }

    private toggleClickHandler() {
        this.tips.active = this.toggle.isChecked;
    }

    /**
     * editbox change
     */
    public async textChange() {
        let btn = this.loginBtn.getComponent(Button);
        let len = 0;
        let maxLen = 4;
        if (this.phoneView.active) {
            maxLen = 11;
            len = this.phoneNumberEdit.string.length;
        } else {
            var str = this.editBox.string;
            let characters = str.split('');
            len = characters.length;
        }

        await this.btnEnableChange(len>=maxLen);
    }

    private textChange1(){
        let btn = this.loginBtn.getComponent(Button);
        let len = 0;
        let maxLen = 4;
        if (this.phoneView.active) {
            maxLen = 11;
            len = this.phoneNumberEdit.string.length;
        } else {
            var str = this.editBox.string;
            let characters = str.split('');
            len = characters.length;
        }
        btn.enabled = len>=maxLen;
    }

    public async btnEnableChange(boo: boolean = false) {
        let btn = this.loginBtn.getComponent(Button);
        btn.enabled = boo;
        await this.changeBtnFrame(Number(boo));
    }

    public cleanNumber() {
        this.phoneNumberEdit.string = "";
        // this.textChange();
    }

    // ============ 验证码界面
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
            // this.textChange();
            this.loginClick();
        }

    }

    /**
     * 请求登录返回
     * @param data
     * @param context
     * @private
     */
    private requestLoginCallBack(data, context) {
        if (data['status'] == 0) {
            // this.clearEditBox();
            // this.editBox.string = "";
            this.editBox.setFocus(); // 重新获取焦点
            // this.timerCommonComponent.startTimer(30);
            this.btnEnableChange(false);
            AlertManager.getInstance().showSocketAlert(this.errorYanZhenStr);
            return;
        }
    }

    private clearEditBox() {
        this.editBox.string = "";
        this.editBoxValue(null);
    }

    onTimerEnd() {
        this.isTimeOver = true;
        this.btnEnableChange(true);
        this.setLoginBtnMessage(this.retryStr);
    }


    /**
     * 请求验证码
     */
    reSendCode() {
        this.startEditbox();
        EventManager.getInstance().on(this.login_send_mp_code, this.requestCodeCallBack, this, true);
        LoginManager.getInstance().requestSendMpCode(this.phoneNumber);
    }

    /**
     * 请求验证码返回
     * @param data
     * @param context
     * @private
     */
    private requestCodeCallBack(data, context) {
        this.isTimeOver = false;
        if (data['status'] == 0) {
            let errStr = `请求${data['action']}失败，${data.message}`;
            DebugLog.instance.error(errStr);
            AlertManager.getInstance().showSocketAlert("请求验证码失败");
            this.phoneView.active = true;
            this.yanzhengView.active = false;
            return;
        }
        this.timerCommonComponent.startTimer(30);
        this.timerCommonComponent.node.active = true;
        this.phoneNumber = data['data']['mp_no'];
        this.updateYanzhengView();
        this.btnEnableChange(false);
    }

    private updateYanzhengView() {
        this.phoneDesTxt.string = `请输入${this.phoneNumber}收到的验证码`;
    }

    private loginStr = "立即登录";
    private yanzhengStr= "获取验证码";
    private retryStr = "重新获取";
    private errorYanZhenStr = "验证码错误";
    switchView(phoneViewBoo: boolean) {
        this.phoneView.active = phoneViewBoo;
        this.yanzhengView.active = !phoneViewBoo;
        let btn = this.loginBtn.getComponent(Button);
        let str = "";
        if (phoneViewBoo) {
            this.toggle.node.active = true;
            if (this.timerCommonComponent) this.timerCommonComponent.resetTimer();
            str = this.yanzhengStr;
            this.clearEditBox();
            this.loginBtn.active = true;
            this.btnEnableChange(true);
            btn.enabled = true;
        } else {
            this.toggle.node.active = false;
            str = this.loginStr;
            this.loginBtn.active = true;
            this.btnEnableChange(false);
        }
       this.setLoginBtnMessage(str);
    }

    private setLoginBtnMessage(str:string){
        this.loginBtnLabel.string = str;
    }


}



import { _decorator, Component, Node, Label, Button, EditBox } from 'cc';
import { BasePanel } from "../../../Core/UI/BasePanel";
import { DebugLog } from "../../../Core/Util/DebugLog";
import { EventManager } from "../../../Core/Manager/Event/EventManager";
import { UIManager } from "../../../Core/Manager/UI/UIManager";
import { SocketData } from "../../../Core/Manager/Net/SocketData";
import { LoginPanel } from "../../../Game/UI/Login/LoginPanel";
import { TaskManager } from "../../../Game/Task/TaskManager";
import { LoginErrorCode, LoginManager } from "../../../Core/Manager/LoginManager/LoginManager";
import { Global } from "db://assets/scripts/Core/Manager/Config/Global";
import { SkewersManager } from "db://assets/scripts/Game/Task/Skewers/SkewersManager";
import { SceneManager } from '../../../Core/Manager/Scene/SceneManager';
import { UserData } from "db://assets/scripts/Core/Data/UserData";
import { LocalStorageKeyEnum, LocalStorageUtil } from '../../../Core/Util/LocalStorageUtil';
import { TimeUtil } from '../../../Core/Util/TimeUtil';
import AlertManager, { AlertData } from '../../../Core/Manager/Alert/AlertManager';

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

    @property(EditBox)
    num0: EditBox;

    @property(EditBox)
    num1: EditBox;

    @property(EditBox)
    num2: EditBox;

    @property(EditBox)
    num3: EditBox;

    @property({ type: [EditBox] })
    numBox: EditBox[] = [];

    @property(Label)
    enterTxt: Label;

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
        LoginPopUpPanel.NAME = "LoginPopUpPanel";
        this.name = LoginPopUpPanel.NAME;
    }

    onLoad() {

    }

    start() {
       this.PhoneDescTxt.string = "发送>>"
    }

    onEnable() {

    }

    onDisable() {

    }

    bgClick() {
        this.hidePanel();
    }

    agreeClick() {
        this.phoneNumber = Global.userData.phoneNumber;
        this.PhoneDescTxt.node.active = true;
        this.enterTxt.node.active = false;
        EventManager.getInstance().on(this.login_send_mp_code, this.requestCodeCallBack, this);
        LoginManager.getInstance().request(this.login_send_mp_code, { "mp_no": this.phoneNumber });
    }

    cancelClick() {
        UIManager.getInstance().showView(LoginPanel.NAME, this.node.parent);
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
        EventManager.getInstance().off(this.login_login_by_mp, this);
        DebugLog.instance.log(data);
        if (data['status'] == 0) {
            DebugLog.instance.error(`请求${data['action']}失败，请重新再试`);
            this.PhoneDescTxt.string = "重新发送>>"
            const alertData:AlertData = new AlertData;
            alertData.message = LoginErrorCode[data.error] ? LoginErrorCode[data.error] : data.error;
            AlertManager.getInstance().showAlert(alertData);

            return;
        }

        if (data['data']['mp_no'] != this.phoneNumber) {
            DebugLog.instance.error(`${data['data']['mp_no']} 手机号不匹配`);

            const alertData:AlertData = new AlertData;
            alertData.message = LoginErrorCode.LOGIN_INVALID_MP_NO;
            AlertManager.getInstance().showAlert(alertData);

            return;
        }
        Global.userData.token = data.data['token'];
        DebugLog.instance.log(`${data} ====`);
        Global.userData.tokenExpires = data.data['expires'];
        context.PhoneDescTxt.string = "登录成功！！！";


        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN, Global.userData.token);
        const expiredTime:number = TimeUtil.getNow() + Number(Global.userData.tokenExpires) * 1000;
        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN_EXPIREDTIME, expiredTime.toString());


        // 根据是否是新用户来调整ui显示逻辑
        let isNew = data.data["is_new"];
        if(isNew){
            // 主动弹出验证码界面
            LoginManager.getInstance().showVerifryView();
        }else{
            SceneManager.getInstance().backToHall();
        }
    }

    private requestCodeCallBack(data, context) {
        EventManager.getInstance().off(this.login_send_mp_code, context);
        DebugLog.instance.log(data);
        if (data['status'] == 0) {
            DebugLog.instance.error(`请求${data['action']}失败，${data.message}`);
            this.PhoneDescTxt.string = "重新发送>>";
            const alertData:AlertData = new AlertData;
            alertData.message = LoginErrorCode[data.error] ? LoginErrorCode[data.error] : data.error;

            AlertManager.getInstance().showAlert(alertData);

            return;
        }

        this.PhoneDescTxt.node.active = false;
        this.enterTxt.node.active = true;
        this.phoneNumber = data['data']['mp_no'];
        // this.phoneCode = data['data']['code'];
        this.updateView(true);
    }

    public requestEnter(){
        let len =  this.numBox.length;
        let codeStr = "";
        for (let i = 0; i < len; i++) {
            let editBox = this.numBox[i];
            if (editBox == null) continue;
            codeStr+=editBox.string;
        }
        this.phoneCode = codeStr;
        EventManager.getInstance().on(this.login_login_by_mp, this.requestLoginCallBack, this);
        LoginManager.getInstance().request(this.login_login_by_mp, { "mp_no": this.phoneNumber, "code": this.phoneCode });
    }



}
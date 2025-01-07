import {UIManager} from "db://assets/scripts/Core/Manager/UI/UIManager";
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";
import {LoginPanel} from "db://assets/scripts/Game/UI/Login/LoginPanel";
import {LoginPopUpPanel} from "db://assets/scripts/Game/UI/Login/LoginPopUpPanel";
import {SocketData} from "db://assets/scripts/Core/Manager/Net/SocketData";
import {SocketManager} from "db://assets/scripts/Core/Manager/Net/SocketManager";
import {PhoneLoginPanel} from "db://assets/scripts/Game/UI/Login/PhoneLoginPanel";
import {TimeUtil} from "../../Util/TimeUtil";
import {LocalStorageKeyEnum, LocalStorageUtil} from "../../Util/LocalStorageUtil";
import {EventManager} from "../Event/EventManager";
import {SceneManager} from "../Scene/SceneManager";
import AlertManager, {AlertData} from "../Alert/AlertManager";
import {VerifyPanel} from "db://assets/scripts/Game/UI/Login/VerifyPanel";
import {BundleName} from "../Load/BundleName";
import {DebugLog} from "../../Util/DebugLog";
import {GenerateReport} from "db://assets/scripts/Game/UI/PersonalCenter/GenerateReport";

export class LoginManager {
    private static _instance: LoginManager;

    public static getInstance(): LoginManager {
        if (!LoginManager._instance) {
            LoginManager._instance = new LoginManager();
        }
        return LoginManager._instance;
    }

    private login_login_by_token: string = "login.login_by_token";
    private login_send_mp_code: string = "login.send_mp_code";
    private login_login_by_mp: string = "login.login_by_mp";
    private user_set_invite_code: string = "user.set_invite_code";

    private _phoneNum: string = "";

    private _loginByTokenCb: (arg0: boolean) => void = null;

    get phoneNum(): string {
        return this._phoneNum;
    }
    set phoneNum(v: string) {
        this._phoneNum = v;
    }

    init() {
        UIManager.getInstance().registerPanel(LoginPanel.NAME, BundleName.RESOURCES, "prefab/LoginPanel", LoginPanel);
        UIManager.getInstance().registerPanel(PhoneLoginPanel.NAME, BundleName.RESOURCES, "prefab/PhoneLoginPanel", PhoneLoginPanel);
        UIManager.getInstance().registerPanel(LoginPopUpPanel.NAME, BundleName.RESOURCES, "prefab/LoginPopUpPanel", LoginPopUpPanel);
        UIManager.getInstance().registerPanel(VerifyPanel.NAME, BundleName.RESOURCES, "prefab/UserCenter/VerifyPanel", VerifyPanel);
        UIManager.getInstance().registerPanel(GenerateReport.NAME,BundleName.RESOURCES, "prefab/personalCenter/GenerateReport",GenerateReport);
    }

    private tokenExpirationVerification(): boolean {
        const cur = TimeUtil.getNow();
        const token = LocalStorageUtil.get(LocalStorageKeyEnum.USER_TOKEN);
        const tokenExp = LocalStorageUtil.get(LocalStorageKeyEnum.USER_TOKEN_EXPIREDTIME);
        if (!tokenExp || !token || Number(tokenExp) <= cur) {
            return true;//需要重新登陆
        }
        return false;
    }

    private onTokenVerificationCompleted(data, context) {
        if (data.status == 0) {
            const alertData: AlertData = new AlertData();
            alertData.message = LoginErrorCode[data.error] ? LoginErrorCode[data.error] : data.error;
            alertData.confirmCb = function () {
                this.showLoginPanel();
            }.bind(this);
            AlertManager.getInstance().showAlert(alertData);

            if (this._loginByTokenCb) {
                this._loginByTokenCb(false);
                this._loginByTokenCb = null;
            }
            return;
        }

        Global.userData.token = data.data['token'];
        Global.userData.tokenExpires = data.data['expires'];

        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN, Global.userData.token);
        const expiredTime: number = TimeUtil.getNow() + Number(Global.userData.tokenExpires) * 1000;
        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN_EXPIREDTIME, expiredTime.toString());

        if (this._loginByTokenCb) {
            this._loginByTokenCb(true);
            this._loginByTokenCb = null;
        }
    }

    private setInviteCodeCallBack(data: any) {
        if (data.status == 0) {
            const alertData: AlertData = new AlertData();
            alertData.message = LoginErrorCode[data.error] ? LoginErrorCode[data.error] : data.error;
            alertData.confirmCb = function () {
                this.showVerifryView();
            }.bind(this);
            AlertManager.getInstance().showAlert(alertData);

            //const verifyPanel: VerifyPanel = UIManager.getInstance().getView(VerifyPanel.NAME) as VerifyPanel;
            // if (verifyPanel) verifyPanel.start();
            return;
        }

        Global.userData.inviteCode = data.data['invite_code'];
        //const verifyPanel: VerifyPanel = UIManager.getInstance().getView(VerifyPanel.NAME) as VerifyPanel;
        //if (verifyPanel) verifyPanel.stopTween();
    }

    private requestSendMpCodeHandler(data: any) {
        DebugLog.instance.log(data);
        if (data['status'] == 0) {
            DebugLog.instance.error(`请求${data['action']}失败，${data.message}`);
            const alertData: AlertData = new AlertData();
            alertData.message = LoginErrorCode[data.error] ? LoginErrorCode[data.error] : data.error;
            AlertManager.getInstance().showAlert(alertData);
            return;
        }
        this._phoneNum = data['data']['mp_no'];
        Global.userData.phoneNumber = this._phoneNum;
    }

    private requestLoginByMpHandler(data: any) {
        DebugLog.instance.log(data);
        if (data['status'] == 0) {
            DebugLog.instance.error(`请求${data['action']}失败，请重新再试`);
            const alertData: AlertData = new AlertData();
            alertData.message = LoginErrorCode[data.error] ? LoginErrorCode[data.error] : data.error;
            AlertManager.getInstance().showAlert(alertData);
            return;
        }

        if (data['data']['mp_no'] != this.phoneNum) {
            DebugLog.instance.error(`${data['data']['mp_no']} 手机号不匹配`);
            const alertData: AlertData = new AlertData();
            alertData.message = LoginErrorCode.LOGIN_INVALID_MP_NO;
            AlertManager.getInstance().showAlert(alertData);
            return;
        }

        Global.userData.token = data.data['token'];
        DebugLog.instance.log(`${data} ====`);
        Global.userData.tokenExpires = data.data['expires'];


        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN, Global.userData.token);
        const expiredTime: number = TimeUtil.getNow() + Number(Global.userData.tokenExpires) * 1000;
        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN_EXPIREDTIME, expiredTime.toString());


        // 根据是否是新用户来调整ui显示逻辑
        let isNew = data.data["is_new"];
        if (isNew) {
            // 主动弹出邀请码界面
            UIManager.getInstance().showPanel(VerifyPanel.NAME);
        } else {
            SceneManager.getInstance().backToHall();
        }
    }

    public requestTokenVerification(cb: (result: boolean) => void = null) {
        const token = LocalStorageUtil.get(LocalStorageKeyEnum.USER_TOKEN);
        this._loginByTokenCb = cb;
        EventManager.getInstance().on(this.login_login_by_token, this.onTokenVerificationCompleted, this, true);
        this.request(this.login_login_by_token, { token: token });
    }

    // ===================== 设置邀请码
    public setInviteCode(code: string) {
        EventManager.getInstance().on(this.user_set_invite_code, this.setInviteCodeCallBack, this, true);
        this.request(this.user_set_invite_code, { invite_code: code });
    }

    public requestSendMpCode(phoneNum: string) {
        EventManager.getInstance().on(this.login_send_mp_code, this.requestSendMpCodeHandler, this, true);
        this._phoneNum = phoneNum;
        this.request(this.login_send_mp_code, { "mp_no": phoneNum });
    }

    public requestLoginByMp(mpCode: string) {
        EventManager.getInstance().on(this.login_login_by_mp, this.requestLoginByMpHandler, this, true);
        this.request(this.login_login_by_mp, { "mp_no": this.phoneNum, "code": mpCode });
    }

    start() {
        if (this.tokenExpirationVerification()) {
            UIManager.getInstance().showPanel(LoginPanel.NAME);
        } else {
            this.requestTokenVerification((result)=>{
                if(result){
                    SceneManager.getInstance().backToHall();
                }
            });
        }
    }

    request(action: string, data: any) {
        const socketData = new SocketData({ "action": action, "data": data })
        SocketManager.getInstance().send(socketData);
    }
}

export enum LoginErrorCode {
    LOGIN_INVALID_MP_NO = "无效的手机号",
    LOGIN_ERROR_MP_CODE = "短信验证码错误",
    USER_NOT_FOUND = "用户不存在",
    INVALID_TOKEN = "无效的token, 或token过期",
    INVALID_INVITE_CODE = "无效邀请码",
}
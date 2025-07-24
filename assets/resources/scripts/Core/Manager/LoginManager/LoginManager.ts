import { UIManager } from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import { Global } from "db://assets/resources/scripts/Core/Manager/Config/Global";
import { SocketData } from "db://assets/resources/scripts/Core/Manager/Net/SocketData";
import { SocketManager } from "db://assets/resources/scripts/Core/Manager/Net/SocketManager";
import { TimeUtil } from "../../Util/TimeUtil";
import { LocalStorageKeyEnum, LocalStorageUtil } from "../../Util/LocalStorageUtil";
import { EventManager } from "../Event/EventManager";
import { SceneManager } from "../Scene/SceneManager";
import {AlertManager, AlertData } from "../Alert/AlertManager";
import { VerifyPanel } from "db://assets/resources/scripts/Game/UI/Login/VerifyPanel";
import { BundleName } from "../Load/BundleName";
import { DebugLog } from "../../Util/DebugLog";
import { GlobalConfigManager } from "../../../Config/GlobalConfigManager";
import {AudioManager} from "db://assets/resources/scripts/Core/Manager/Audio/AudioManager";
import { NativeEvent } from "../Event/NativeEvent";
import { native, sys } from "cc";
import {AlterUserInfoView} from "db://assets/resources/scripts/UserCenterV2/AlterUserInfoView";
import {PersonalCenterManager} from "db://assets/resources/scripts/Game/PersonalCenterManager/PersonalCenterManager";
import { SwitchLoginPanel } from "../../../Game/UI/Login/SwitchLoginPanel";

export class LoginManager {
    private static _instance: LoginManager;

    public static getInstance(): LoginManager {
        if (!LoginManager._instance) {
            LoginManager._instance = new LoginManager();
        }
        return LoginManager._instance;
    }
    public static LoginByInstitutionResult: string = "LoginByInstitutionResult";

    private login_login_by_token: string = "login.login_by_token";
    private login_send_mp_code: string = "login.send_mp_code";
    private login_login_by_mp: string = "login.login_by_mp";
    private user_set_invite_code: string = "user.set_invite_code";
    private login_by_institution: string = "login.login_by_organization"

    private _phoneNum: string = "";

    private _loginByTokenCb: (arg0: boolean) => void = null;

    get phoneNum(): string {
        return this._phoneNum;
    }
    set phoneNum(v: string) {
        this._phoneNum = v;
    }

    init() {
        UIManager.getInstance().registerPanel(SwitchLoginPanel.NAME, BundleName.RESOURCES, "/prefab/AuthLogin/SwitchLoginPanel",SwitchLoginPanel);
        UIManager.getInstance().registerPanel(AlterUserInfoView.NAME, BundleName.RESOURCES, "/prefabV2/personalCenter/alterUserInfo", AlterUserInfoView);
        UIManager.getInstance().registerPanel(VerifyPanel.NAME, BundleName.RESOURCES, "prefab/UserCenter/VerifyPanel", VerifyPanel);
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
        Global.userData.phoneNumber = data.data['mp_no'];

        this.phoneNum = data.data['mp_no'];

        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN, Global.userData.token);
        const expiredTime: number = TimeUtil.getNow() + Number(Global.userData.tokenExpires) * 1000;
        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN_EXPIREDTIME, expiredTime.toString());

        if (this._loginByTokenCb) {
            this._loginByTokenCb(true);
            this._loginByTokenCb = null;
        }

        GlobalConfigManager.getInstance().init();
    }

    public static InviteCodeResult: string = "InviteCodeResult";
    public static LoginByTokenResult: string = "LoginByTokenResult";

    private setInviteCodeCallBack(data: any) {
        if (data.status == 0) {
            AlertManager.getInstance().showSocketAlert("无效验证码");
            return;
        }

        Global.userData.inviteCode = data.data['invite_code'];
        EventManager.getInstance().emit(LoginManager.LoginByTokenResult, data.data['invite_code']);
        // SceneManager.getInstance().backToHall();
    }

    private requestSendMpCodeHandler(data: any) {
        DebugLog.instance.log(data);
        if (data['status'] == 0) {
            DebugLog.instance.error(`请求${data['action']}失败，${data.message}`);
            AlertManager.getInstance().showSocketAlert(data.message);
            // const alertData: AlertData = new AlertData();
            // alertData.message = LoginErrorCode[data.error] ? LoginErrorCode[data.error] : data.error;
            // AlertManager.getInstance().showAlert(alertData);
            return;
        }
        this._phoneNum = data['data']['mp_no'];
        Global.userData.phoneNumber = this._phoneNum;
    }

    private requestLoginByMpHandler(data: any) {
        DebugLog.instance.log(data);     
        if (data['status'] == 0) {  
            AlertManager.getInstance().showSocketAlert(`请求${data['action']}失败，请重新再试`);       
            DebugLog.instance.error(`请求${data['action']}失败，请重新再试`);
            // const alertData: AlertData = new AlertData();
            // alertData.message = LoginErrorCode[data.error] ? LoginErrorCode[data.error] : data.error;
            // AlertManager.getInstance().showAlert(alertData);
            return;
        }

        // 如果返回的数据中的手机号与当前用户的手机号不匹配，表示登录失败
        if (data['data']['mp_no'] != this.phoneNum) {
            DebugLog.instance.error(`${data['data']['mp_no']} 手机号不匹配`);
            AlertManager.getInstance().showSocketAlert(`${data['data']['mp_no']} 手机号不匹配`);
            // const alertData: AlertData = new AlertData();
            // alertData.message = LoginErrorCode.LOGIN_INVALID_MP_NO;
            // AlertManager.getInstance().showAlert(alertData);
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

            UIManager.getInstance().showPanel(AlterUserInfoView.NAME,true);
            UIManager.getInstance().hidePanel(SwitchLoginPanel.NAME);

            // 主动弹出邀请码界面
            EventManager.getInstance().on(VerifyPanel.CloseVerifyPanel, this.onCloseVerifyPanel, this, true);
            // UIManager.getInstance().showPanel(LoginPopUpPanel.NAME);
            // SceneManager.getInstance().backToHall();
        } else {
            SceneManager.getInstance().backToHall();
        }

        GlobalConfigManager.getInstance().init();
    }
    private requestLoginByInstitutionHandler(data: any) {
        if (data['status'] == 0) {  
            AlertManager.getInstance().showSocketAlert(`请求${data['action']}失败，请重新再试`);       
            DebugLog.instance.error(`请求${data['action']}失败，请重新再试`);
            return;
        }
        
        Global.userData.token = data.data['token'];
        Global.userData.tokenExpires = data.data['expires'];
       
        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN, Global.userData.token);
        const expiredTime: number = TimeUtil.getNow() + Number(Global.userData.tokenExpires) * 1000;
        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN_EXPIREDTIME, expiredTime.toString());
        EventManager.getInstance().emit(LoginManager.LoginByInstitutionResult);
      
    }

    private onCloseVerifyPanel(){
        SceneManager.getInstance().backToHall();
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

    // 发送验证码
    public requestSendMpCode(phoneNum: string) {
        EventManager.getInstance().on(this.login_send_mp_code, this.requestSendMpCodeHandler, this, true);
        this._phoneNum = phoneNum;
        this.request(this.login_send_mp_code, { "mp_no": phoneNum });
    }

    public requestLoginByMp(mpCode: string) {
        EventManager.getInstance().on(this.login_login_by_mp, this.requestLoginByMpHandler, this, true);
        this.request(this.login_login_by_mp, { "mp_no": this.phoneNum, "code": mpCode });
    }
    public requestLoginByInstitution(institutionCode: string, userCode: string, password: string) {
        EventManager.getInstance().on(this.login_by_institution, this.requestLoginByInstitutionHandler, this, true);
        this.request(this.login_by_institution, { "org_code": institutionCode, "username": userCode, "password": password });
    }



    start() {
        if (this.tokenExpirationVerification()) {
            UIManager.getInstance().showPanel(SwitchLoginPanel.NAME);
        } else {
            let self = this;
            this.requestTokenVerification((result) => {
                if (result) {
                    EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack,self.requestUserInfoCallback, self,true);
                    PersonalCenterManager.getInstance().requestUserInfo();
                }
            });
        }
    }

    private requestUserInfoCallback(){
        let usetData = PersonalCenterManager.getInstance().userInfoData;
        if(usetData.full_name == ""){
            UIManager.getInstance().showPanel(AlterUserInfoView.NAME,true);
            UIManager.getInstance().hidePanel(SwitchLoginPanel.NAME);

            // 主动弹出邀请码界面
            EventManager.getInstance().on(VerifyPanel.CloseVerifyPanel, this.onCloseVerifyPanel, this, true);
        }else{
            SceneManager.getInstance().backToHall();
        }
        if(sys.platform === 'ANDROID'){
            console.log(`发送设备信息到native`);
            native.bridge.sendToNative(NativeEvent.Device, 'info');
        }
    }

    request(action: string, data: any) {
        const socketData = new SocketData({ "action": action, "data": data })
        SocketManager.getInstance().send(socketData);
    }

    loginout(){
        LocalStorageUtil.clean();
        EventManager.getInstance().destory();
        AudioManager.getInstance().destory();
        SocketManager.getInstance().cleanSocketDatas();
        PersonalCenterManager.getInstance().clean();
        SceneManager.getInstance().changeScene("start", BundleName.RESOURCES).then(() => {
            DebugLog.instance.log(`start场景切换成功`);
        });
    }
}

export enum LoginErrorCode {
    LOGIN_INVALID_MP_NO = "无效的手机号",
    LOGIN_ERROR_MP_CODE = "短信验证码错误",
    USER_NOT_FOUND = "用户不存在",
    INVALID_TOKEN = "无效的token, 或token过期",
    INVALID_INVITE_CODE = "无效邀请码",
}
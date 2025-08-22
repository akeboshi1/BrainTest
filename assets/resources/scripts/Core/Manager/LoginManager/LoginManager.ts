import { UIManager } from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import { Global } from "db://assets/resources/scripts/Core/Manager/Config/Global";
import { SocketData } from "db://assets/resources/scripts/Core/Manager/Net/SocketData";
import { SocketManager } from "db://assets/resources/scripts/Core/Manager/Net/SocketManager";
import { TimeUtil } from "../../Util/TimeUtil";
import { LocalStorageKeyEnum, LocalStorageUtil } from "../../Util/LocalStorageUtil";
import { EventManager } from "../Event/EventManager";
import { SceneManager } from "../Scene/SceneManager";
import { AlertManager, AlertData } from "../Alert/AlertManager";
import { VerifyPanel } from "db://assets/resources/scripts/Game/UI/Login/VerifyPanel";
import { BundleName } from "../Load/BundleName";
import { DebugLog } from "../../Util/DebugLog";
import { GlobalConfigManager } from "../../../Config/GlobalConfigManager";
import { AudioManager } from "db://assets/resources/scripts/Core/Manager/Audio/AudioManager";
import { NativeEvent } from "../Event/NativeEvent";
import { native, sys } from "cc";
import { AlterUserInfoView } from "db://assets/resources/scripts/UserCenterV2/AlterUserInfoView";
import { PersonalCenterManager } from "db://assets/resources/scripts/Game/PersonalCenterManager/PersonalCenterManager";
import { SwitchLoginPanel } from "../../../Game/UI/Login/SwitchLoginPanel";
import { ReportManager } from "../../../ManagerV2/ReportManager";

/**
 * 组织用户信息接口
 */
export interface OrganizationUser {
    /** 用户名（用来登录） */
    username: string;
    /** 昵称 */
    nickname: string;
    /** 姓名（显示） */
    full_name: string;
    /** 性别 1-男 2-女 */
    gender: number;
    /** 当天是否训练 */
    today_trained: boolean;
}

/**
 * 获取组织用户列表返回数据结构
 */
export interface GetOrganizationUsersResult {
    /** 组织代码 */
    org_code: string;
    /** 用户列表 */
    result: OrganizationUser[];
}

export class LoginManager {
    private static _instance: LoginManager;

    public static getInstance(): LoginManager {
        if (!LoginManager._instance) {
            LoginManager._instance = new LoginManager();
        }
        return LoginManager._instance;
    }
    public static FirstLoginXieYi:string = "FirstLoginXieYi";
    public static LoginOrganizationResult: string = "LoginOrganizationResult";
    public static GetOrganizationUsersResult: string = "GetOrganizationUsersResult";

    private login_login_by_token: string = "login.login_by_token";
    private login_send_mp_code: string = "login.send_mp_code";
    private login_login_by_mp: string = "login.login_by_mp";
    private user_set_invite_code: string = "user.set_invite_code";
    private login_organization: string = "login.login_organization"
    private login_get_organization_users: string = "login.get_organization_users"
    private login_login_by_organization_and_username: string = "login.login_by_organization_and_username"

    private _phoneNum: string = "";
    private _xieyiToggleFlag: boolean = false;

    private _loginByTokenCb: (arg0: boolean) => void = null;

    get phoneNum(): string {
        return this._phoneNum;
    }
    set phoneNum(v: string) {
        this._phoneNum = v;
    }

    init() {
        UIManager.getInstance().registerPanel(SwitchLoginPanel.NAME, BundleName.RESOURCES, "/prefab/AuthLogin/SwitchLoginPanel", SwitchLoginPanel);
        UIManager.getInstance().registerPanel(AlterUserInfoView.NAME, BundleName.RESOURCES, "/prefabV2/personalCenter/alterUserInfo", AlterUserInfoView);
        UIManager.getInstance().registerPanel(VerifyPanel.NAME, BundleName.RESOURCES, "prefab/UserCenter/VerifyPanel", VerifyPanel);
    }

    start() {
        if (!LocalStorageUtil.get(LocalStorageKeyEnum.IS_FIRST_LOGIN)) {
            LocalStorageUtil.set(LocalStorageKeyEnum.IS_FIRST_LOGIN, "true");
        }

        if (this.tokenExpirationVerification()) {
            UIManager.getInstance().showPanel(SwitchLoginPanel.NAME);
        } else {
            let self = this;
            let defaultLoginStatus = LocalStorageUtil.get(LocalStorageKeyEnum.USER_DEFAULT_LOGIN_STATUS);
            this.requestTokenVerification((result) => {
                if (result) {
                    if (defaultLoginStatus == "1") {
                        SceneManager.getInstance().backToHall();
                    } else {
                        EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, self.requestUserInfoCallback, self, true);
                        PersonalCenterManager.getInstance().requestUserInfo();
                    }
                }
            });
        }
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

    public cleanUserToken(){
        LocalStorageUtil.remove(LocalStorageKeyEnum.USER_TOKEN);
        LocalStorageUtil.remove(LocalStorageKeyEnum.USER_TOKEN_EXPIREDTIME);
        LocalStorageUtil.remove(LocalStorageKeyEnum.USER_PHONENUM);
    }

    public organizationTokenExpirationVerification(): boolean {
        const cur = TimeUtil.getNow();
        const token = LocalStorageUtil.get(LocalStorageKeyEnum.ORGANIZATION_TOKEN);
        const tokenExp = LocalStorageUtil.get(LocalStorageKeyEnum.ORGANIZATION_TOKEN_EXPIREDTIME);
        if (!tokenExp || !token || Number(tokenExp) <= cur) {
            return true;//需要重新登陆
        }  
        return false;
    }

    public clearOrganizationToken(){
        LocalStorageUtil.remove(LocalStorageKeyEnum.ORGANIZATION_TOKEN);
        LocalStorageUtil.remove(LocalStorageKeyEnum.ORGANIZATION_TOKEN_EXPIREDTIME);
        LocalStorageUtil.remove(LocalStorageKeyEnum.ORGANIZATION_NAME);
    }

    private onTokenVerificationCompleted(data, context) {
        if (data.status == 0) {
            const alertData: AlertData = new AlertData();
            alertData.message = LoginErrorCode[data.error] ? LoginErrorCode[data.error] : data.error;
            alertData.confirmCb = function () {
                UIManager.getInstance().showPanel(SwitchLoginPanel.NAME);
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
            AlertManager.getInstance().showSocketAlert("无效邀请码");
            return;
        }

        Global.userData.inviteCode = data.data['invite_code'];
        EventManager.getInstance().emit(LoginManager.LoginByTokenResult, data.data['invite_code']);
    }

    private requestSendMpCodeHandler(data: any) {
        DebugLog.instance.log(data);
        if (data['status'] == 0) {
            DebugLog.instance.error(`请求${data['action']}失败，${data.message}`);
            AlertManager.getInstance().showSocketAlert(data.message);
            return;
        }
        this._phoneNum = data['data']['mp_no'];
        Global.userData.phoneNumber = this._phoneNum;
    }

    private requestLoginByMpHandler(data: any) {
        DebugLog.instance.log(data);
        if (data['status'] == 0) {
            AlertManager.getInstance().showSocketAlert(`${data['message']}`);
            DebugLog.instance.error(`请求${data['action']}失败，请重新再试`);
            return;
        }

        // 如果返回的数据中的手机号与当前用户的手机号不匹配，表示登录失败
        if (data['data']['mp_no'] != this.phoneNum) {
            DebugLog.instance.error(`手机号不匹配`);
            AlertManager.getInstance().showSocketAlert(`${data['data']['mp_no']} 手机号不匹配`);
            return;
        }

        Global.userData.token = data.data['token'];
        DebugLog.instance.log(`${data} ====`);
        Global.userData.tokenExpires = data.data['expires'];


        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN, Global.userData.token);
        const expiredTime: number = TimeUtil.getNow() + Number(Global.userData.tokenExpires) * 1000;
        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN_EXPIREDTIME, expiredTime.toString());
        LocalStorageUtil.set(LocalStorageKeyEnum.USER_DEFAULT_LOGIN_STATUS, "0");


        // 根据是否是新用户来调整ui显示逻辑
        let isNew = data.data["is_new"];
        if (isNew) {

            UIManager.getInstance().showPanel(AlterUserInfoView.NAME, true);
            UIManager.getInstance().hidePanel(SwitchLoginPanel.NAME);

            // 主动弹出邀请码界面
            EventManager.getInstance().on(VerifyPanel.CloseVerifyPanel, this.onCloseVerifyPanel, this, true);
        } else {
            SceneManager.getInstance().backToHall();
        }
        GlobalConfigManager.getInstance().init();
    }

    private onCloseVerifyPanel() {
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

    public requestLoginOrganization(institutionCode: string, password: string) {
        EventManager.getInstance().on(this.login_organization, this.requestLoginOrganizationHandler, this, true);
        this.request(this.login_organization, { "org_code": institutionCode, "org_password": password });
    }
    
    private requestLoginOrganizationHandler(data: any) {
        if (data['status'] == 0) {
            AlertManager.getInstance().showSocketAlert(`${data.message}`);
            return;
        }

        LocalStorageUtil.set(LocalStorageKeyEnum.ORGANIZATION_TOKEN, data.data['org_token']);
        LocalStorageUtil.set(LocalStorageKeyEnum.ORGANIZATION_NAME, data.data['org_name']);
        const expiredTime: number = TimeUtil.getNow() + Number(data.data['org_token_expires']) * 1000;
        LocalStorageUtil.set(LocalStorageKeyEnum.ORGANIZATION_TOKEN_EXPIREDTIME, expiredTime.toString());
        LocalStorageUtil.set(LocalStorageKeyEnum.INSTITUTION_CODE, data.data['org_code']);
        LocalStorageUtil.set(LocalStorageKeyEnum.USER_DEFAULT_LOGIN_STATUS, "1");
        EventManager.getInstance().emit(LoginManager.LoginOrganizationResult, data.data['org_name']);
    }

    public requestGetOrganizationUsers(orgToken: string) {
        EventManager.getInstance().on(this.login_get_organization_users, this.requestGetOrganizationUsersHandler, this, true);
        this.request(this.login_get_organization_users, { "org_token": orgToken });
    }

    private requestGetOrganizationUsersHandler(data: any) {
        DebugLog.instance.log(data);
        if (data['status'] == 0) {
            AlertManager.getInstance().showSocketAlert(`${data.message}`);
            return;
        }

        const result: GetOrganizationUsersResult = data.data;
        EventManager.getInstance().emit(LoginManager.GetOrganizationUsersResult, result);
    }

    public requestLoginOrganizationAndUsername(org_token: string, username: string, password: string) {
        EventManager.getInstance().on(this.login_login_by_organization_and_username, this.requestLoginOrganizationAndUsernameHandler, this, true);
        this.request(this.login_login_by_organization_and_username, { "org_token": org_token, "username": username, "password": password });
    }

    private requestLoginOrganizationAndUsernameHandler(data: any) {
        if (data['status'] == 0) {
            AlertManager.getInstance().showSocketAlert(`${data.message}`);
            return;
        }
        Global.userData.token = data.data['token'];
        DebugLog.instance.log(`${data} ====`);
        Global.userData.tokenExpires = data.data['expires'];

        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN, Global.userData.token);
        const expiredTime: number = TimeUtil.getNow() + Number(Global.userData.tokenExpires) * 1000;
        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN_EXPIREDTIME, expiredTime.toString());
        LocalStorageUtil.set(LocalStorageKeyEnum.USER_DEFAULT_LOGIN_STATUS, "1");

        SceneManager.getInstance().backToHall();
    }

    private requestUserInfoCallback() {
        let usetData = PersonalCenterManager.getInstance().userInfoData;
        if (usetData.full_name == "") {
            UIManager.getInstance().showPanel(AlterUserInfoView.NAME, true);
            UIManager.getInstance().hidePanel(SwitchLoginPanel.NAME);

            // 主动弹出邀请码界面
            EventManager.getInstance().on(VerifyPanel.CloseVerifyPanel, this.onCloseVerifyPanel, this, true);
        } else {
            SceneManager.getInstance().backToHall();
        }
        if (sys.platform === 'ANDROID') {
            console.log(`发送设备信息到native`);
            native.bridge.sendToNative(NativeEvent.Device, 'info');
        }
    }

    request(action: string, data: any) {
        const socketData = new SocketData({ "action": action, "data": data })
        SocketManager.getInstance().send(socketData);
    }

    loginout() {
        this._xieyiToggleFlag = true;
        LoginManager.getInstance().cleanUserToken();
        EventManager.getInstance().destory();
        AudioManager.getInstance().destory();
        SocketManager.getInstance().cleanSocketDatas();
        PersonalCenterManager.getInstance().clean();
        ReportManager.getInstance().clean();
        SceneManager.getInstance().changeScene("start", BundleName.RESOURCES).then(() => {
            DebugLog.instance.log(`start场景切换成功`);
        });
    }

    get xieyiToggleFlag(): boolean {
        return this._xieyiToggleFlag;
    }

    set xieyiToggleFlag(flag: boolean) {
        this._xieyiToggleFlag = flag;
    }
}

export enum LoginErrorCode {
    LOGIN_INVALID_MP_NO = "无效的手机号",
    LOGIN_ERROR_MP_CODE = "短信验证码错误",
    USER_NOT_FOUND = "用户不存在",
    INVALID_TOKEN = "登录已过期",
    INVALID_INVITE_CODE = "无效邀请码",
}
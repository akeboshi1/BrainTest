import { UIManager } from "db://assets/scripts/Core/Manager/UI/UIManager";
import { Node, instantiate } from "cc"
import { LoaderManager } from "db://assets/scripts/Core/Manager/Load/LoaderManager";
import { Global } from "db://assets/scripts/Core/Manager/Config/Global";
import { LoginPanel } from "db://assets/scripts/Game/UI/Login/LoginPanel";
import { LoginPopUpPanel } from "db://assets/scripts/Game/UI/Login/LoginPopUpPanel";
import { SocketData } from "db://assets/scripts/Core/Manager/Net/SocketData";
import { SocketManager } from "db://assets/scripts/Core/Manager/Net/SocketManager";
import { PhoneLoginPanel } from "db://assets/scripts/Game/UI/Login/PhoneLoginPanel";
import { TimeUtil } from "../../Util/TimeUtil";
import { LocalStorageKeyEnum, LocalStorageUtil } from "../../Util/LocalStorageUtil";
import { EventManager } from "../Event/EventManager";
import { SceneManager } from "../Scene/SceneManager";
import AlertManager, { AlertData } from "../Alert/AlertManager";

export class LoginManager {
    private static _instance: LoginManager;

    public static getInstance(): LoginManager {
        if (!LoginManager._instance) {
            LoginManager._instance = new LoginManager();
        }
        return LoginManager._instance;
    }

    /**
     * token登录
     * @private
     */
    private login_login_by_token: string = "login.login_by_token";

    init() {

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

    private requestTokenVerification() {
        const token = LocalStorageUtil.get(LocalStorageKeyEnum.USER_TOKEN);
        EventManager.getInstance().on(this.login_login_by_token, this.onTokenVerificationCompleted, this);
        this.request(this.login_login_by_token, { token: token });
    }

    private onTokenVerificationCompleted(data, context) {
        EventManager.getInstance().off(this.login_login_by_token, this);
        if (data.status == 0) {
            const alertData:AlertData = new AlertData;
            alertData.message = LoginErrorCode[data.error] ? LoginErrorCode[data.error] : data.error;
            alertData.confirmCb = function(){
                this.showLoginPanel();
            }.bind(this);
            AlertManager.getInstance().showAlert(alertData);

            return;
        }

        Global.userData.token = data.data['token'];
        Global.userData.tokenExpires = data.data['expires'];

        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN, Global.userData.token);
        const expiredTime: number = TimeUtil.getNow() + Number(Global.userData.tokenExpires) * 1000;
        LocalStorageUtil.set(LocalStorageKeyEnum.USER_TOKEN_EXPIREDTIME, expiredTime.toString());

        SceneManager.getInstance().backToHall();
    }


    start() {
        if (this.tokenExpirationVerification()) {
            this.showLoginPanel();
        } else {
            this.requestTokenVerification();
        }
    }


    showLoginPanel() {
        LoaderManager.getInstance().resourcesLoadPrefab(Global.RES_Root + "prefab/LoginPanel").then((resource) => {
            const node = instantiate(resource);
            UIManager.getInstance().registerView(LoginPanel.NAME, node);

            UIManager.getInstance().showView(LoginPanel.NAME);
            node.setPosition(0, 0, 0);
        });
    }

    showPhoneLoginPanel(parentNode: Node) {
        LoaderManager.getInstance().resourcesLoadPrefab(Global.RES_Root + `prefab/PhoneLoginPanel`).then((resource) => {
            const node = instantiate(resource);
            UIManager.getInstance().registerView(PhoneLoginPanel.NAME, node);
            UIManager.getInstance().showView(PhoneLoginPanel.NAME, parentNode);
            node.setPosition(0, 0, 0);
        });
    }

    showXieyi(parentNode: Node) {
        LoaderManager.getInstance().resourcesLoad(Global.RES_Root + "prefab/LoginPopUpPanel").then((resource) => {
            const node = instantiate(resource);
            UIManager.getInstance().registerView(LoginPopUpPanel.NAME, node);
            const parendNode = parentNode.parent;
            UIManager.getInstance().showView(LoginPopUpPanel.NAME, parendNode);
            UIManager.getInstance().hideView(PhoneLoginPanel.NAME);
            const logingpopupPanel: LoginPopUpPanel = UIManager.getInstance().getView(LoginPopUpPanel.NAME) as LoginPopUpPanel;
            if (logingpopupPanel) logingpopupPanel.switchView();

        });
    }

    showPhoneView(parentNode: Node) {
        LoaderManager.getInstance().resourcesLoad(Global.RES_Root + "prefab/LoginPopUpPanel").then((resource) => {
            const node = instantiate(resource);
            UIManager.getInstance().registerView(LoginPopUpPanel.NAME, node);
            const parendNode = parentNode.parent;
            UIManager.getInstance().showView(LoginPopUpPanel.NAME, parendNode);
            UIManager.getInstance().hideView(PhoneLoginPanel.NAME);
            const logingpopupPanel = UIManager.getInstance().getView(LoginPopUpPanel.NAME) as LoginPopUpPanel;
            if (logingpopupPanel) logingpopupPanel.agreeClick();
        });
    }

    showVerifryView(parentNode: Node) {
        LoaderManager.getInstance().resourcesLoad(Global.RES_Root + "prefab/UserCenter/VerifyPanel").then((resource) => {
            const node = instantiate(resource);
            parentNode.addChild(node);
        });
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
}
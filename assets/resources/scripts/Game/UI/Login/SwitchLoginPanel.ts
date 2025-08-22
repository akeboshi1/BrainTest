import { _decorator, Button, Color, Component, instantiate, Label, Node, Prefab, resources } from 'cc';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { LoginManager } from '../../../Core/Manager/LoginManager/LoginManager';
import { OrganizationMemberSelectPanel } from './OrganizationMemberSelectPanel';
import { LocalStorageUtil } from '../../../Core/Util/LocalStorageUtil';
import { LocalStorageKeyEnum } from '../../../Core/Util/LocalStorageUtil';
const { ccclass, property } = _decorator;

const loginPanelConfig = {
    authCodeLoginUrl: "/prefab/AuthLogin/LoginPanel",
    orangizeLoginUrl: "/prefab/AuthLogin/OrganizationLoginPanel",
    orangizeSelectUrl: "/prefab/AuthLogin/OrganizationMemberSelectPanel",
}
@ccclass('SwitchLoginPanel')
export class SwitchLoginPanel extends BasePanel {
    static NAME: string = "SwitchLoginPanel";
    @property(Node)
    authCodeLoginBtn: Node;

    @property(Node)
    orangizeLoginBtn: Node;

    @property(Node)
    loginContainer: Node;

    @property(Node)
    loginBtnsNode: Node;

    private currentPanelName: string = "";

    start() {
        let defaultLoginStatus = LocalStorageUtil.get(LocalStorageKeyEnum.USER_DEFAULT_LOGIN_STATUS);
        
        if(defaultLoginStatus == "1"){
            if(LoginManager.getInstance().organizationTokenExpirationVerification()){
                this.orangizeLogin();
            }else{
                let orgName = LocalStorageUtil.get(LocalStorageKeyEnum.ORGANIZATION_NAME);
                this.orangizeSelect(orgName);
            }
        }else{
            this.authCodeLogin();
        }

        EventManager.getInstance().on(LoginManager.LoginOrganizationResult, this.onGetOrganizationUsersResult, this);
    }

    onDestroy(): void {
        EventManager.getInstance().off(LoginManager.LoginOrganizationResult, this);
    }

    onGetOrganizationUsersResult(orgName: string) {
       this.orangizeSelect(orgName);
    }

    async authCodeLogin() {
        if (this.currentPanelName === "authCodeLogin") {
            return;
        }
        this.authCodeLoginBtn.getChildByName("label").getComponent(Label).color = new Color(36, 98, 207);
        this.orangizeLoginBtn.getChildByName("label").getComponent(Label).color = new Color(148, 149, 153);
        const prefab = await this.loadPrefab(loginPanelConfig.authCodeLoginUrl);
        const instance = instantiate(prefab);
        this.clearLoginContainer();
        this.loginContainer.addChild(instance);
        this.loginBtnsNode.active = true;
        this.currentPanelName = "authCodeLogin";
    }

    async orangizeLogin() {
        if (this.currentPanelName === "orangizeLogin") {
            return;
        }
        this.authCodeLoginBtn.getChildByName("label").getComponent(Label).color = new Color(148, 149, 153);
        this.orangizeLoginBtn.getChildByName("label").getComponent(Label).color = new Color(36, 98, 207);
        const prefab = await this.loadPrefab(loginPanelConfig.orangizeLoginUrl);
        const instance = instantiate(prefab);
        this.clearLoginContainer();
        this.loginContainer.addChild(instance);
        this.loginBtnsNode.active = true;
        this.currentPanelName = "orangizeLogin";
    }

    async orangizeSelect(orgName: string) {
        if (this.currentPanelName === "orangizeSelect") {
            return;
        }
        const prefab = await this.loadPrefab(loginPanelConfig.orangizeSelectUrl);
        const instance = instantiate(prefab);
        this.clearLoginContainer();
        this.loginContainer.addChild(instance);
        this.loginBtnsNode.active = false;
        this.currentPanelName = "orangizeSelect";
        instance.getComponent(OrganizationMemberSelectPanel).setOrgName(orgName);
        instance.getComponent(OrganizationMemberSelectPanel).setClickBack(this.onBackToLogin.bind(this));
    }

    private onBackToLogin(){
        LoginManager.getInstance().clearOrganizationToken();
        this.orangizeLogin();
    }

    clearLoginContainer() {
        const children = this.loginContainer.children;
        for (const child of children) {
            child.destroy();
            child.removeFromParent();
        }
    }

    //加载预制体
    async loadPrefab(url: string): Promise<Prefab> {
        return new Promise<Prefab>((resolve, reject) => {
            resources.load(url, Prefab, (err, prefab: Prefab) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(prefab);
                }
            });
        });
    }
}



import { _decorator, Button, Color, Component, instantiate, Label, Node, Prefab, resources, tween, Vec3, UIOpacity } from 'cc';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { LoginManager } from '../../../Core/Manager/LoginManager/LoginManager';
import { OrganizationMemberSelectPanel } from './OrganizationMemberSelectPanel';
import { LocalStorageUtil } from '../../../Core/Util/LocalStorageUtil';
import { LocalStorageKeyEnum } from '../../../Core/Util/LocalStorageUtil';
import {AlertData, AlertManager} from "db://assets/resources/scripts/Core/Manager/Alert/AlertManager";
import { ScreenAdapter } from '../../../Adapter/ScreenAdapter';
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
        
    }

    onEnable(): void {
        let defaultLoginStatus = LocalStorageUtil.get(LocalStorageKeyEnum.USER_DEFAULT_LOGIN_STATUS);
        
        if(defaultLoginStatus == "1"){
            if(LoginManager.getInstance().organizationTokenExpirationVerification()){
                this.orangizeLogin();
            }else{
                let orgName = LocalStorageUtil.get(LocalStorageKeyEnum.ORGANIZATION_NAME);
                this.orangizeSelect(orgName);
            }
        }else{
            this.authCodeLogin(false);
        }

        EventManager.getInstance().on(LoginManager.LoginOrganizationResult, this.onGetOrganizationUsersResult, this);
    }

    onDisable(): void {
        EventManager.getInstance().off(LoginManager.LoginOrganizationResult, this);
    }

    onGetOrganizationUsersResult(orgName: string) {
       this.orangizeSelect(orgName);
    }
    async authCodeLogin(click:boolean = true) {
        if(click){
            let isFirstLogin = LocalStorageUtil.get(LocalStorageKeyEnum.IS_FIRST_LOGIN);
            if(isFirstLogin == "true") {
                EventManager.getInstance().emit(LoginManager.FirstLoginXieYi);
                return;
            }
        }
        if (this.currentPanelName === "authCodeLogin") {
            return;
        }
        this.authCodeLoginBtn.getChildByName("label").getComponent(Label).color = new Color(36, 98, 207);
        this.orangizeLoginBtn.getChildByName("label").getComponent(Label).color = new Color(148, 149, 153);
        const prefab = await this.loadPrefab(loginPanelConfig.authCodeLoginUrl);
        const instance = instantiate(prefab);
        this.clearLoginContainer();
        this.loginContainer.addChild(instance);
        // 对添加的实例进行屏幕适配
        ScreenAdapter.getInstance().adaptPanelUI(instance);
        this.loginBtnsNode.active = true;
        this.currentPanelName = "authCodeLogin";
    }

    async orangizeLogin() {
        let isFirstLogin = LocalStorageUtil.get(LocalStorageKeyEnum.IS_FIRST_LOGIN);
        if(isFirstLogin == "true") {
            EventManager.getInstance().emit(LoginManager.FirstLoginXieYi);
            return;
        }
        if (this.currentPanelName === "orangizeLogin") {
            return;
        }
        this.authCodeLoginBtn.getChildByName("label").getComponent(Label).color = new Color(148, 149, 153);
        this.orangizeLoginBtn.getChildByName("label").getComponent(Label).color = new Color(36, 98, 207);
        const prefab = await this.loadPrefab(loginPanelConfig.orangizeLoginUrl);
        const instance = instantiate(prefab);
        this.clearLoginContainer();
        this.loginContainer.addChild(instance);
        // 对添加的实例进行屏幕适配
        ScreenAdapter.getInstance().adaptPanelUI(instance);
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
        // 对添加的实例进行屏幕适配
        ScreenAdapter.getInstance().adaptPanelUI(instance);
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

    async showPanel(): Promise<void> {
        return new Promise<void>((resolve) => {
            // 设置面板位置到原点
            this.node.setPosition(Vec3.ZERO);
            
            // 获取或添加UIOpacity组件
            let uiOpacity = this.node.getComponent(UIOpacity);
            if (!uiOpacity) {
                uiOpacity = this.node.addComponent(UIOpacity);
            }
            
            // 设置初始透明度为0
            uiOpacity.opacity = 10;
            
            // 执行淡入动画，持续0.2秒
            tween(uiOpacity)
                .to(0.1, { opacity: 255 })
                .call(() => {
                    resolve();
                })
                .start();
        });
    }

    async hidePanel(): Promise<void> {
        return new Promise<void>((resolve) => {
            tween(this.node.getComponent(UIOpacity))
                .to(0.1, { opacity: 10 })
                .call(() => {
                    resolve();
                })
                .start();
        });
    }
}



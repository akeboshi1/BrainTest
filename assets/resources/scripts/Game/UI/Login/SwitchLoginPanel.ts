import { _decorator, Button, Color, Component, instantiate, Label, Node, Prefab, resources } from 'cc';
import { BasePanel } from '../../../Core/UI/BasePanel';
const { ccclass, property } = _decorator;

const loginPanelConfig = {
    authCodeLoginUrl: "/prefab/AuthLogin/LoginPanel",
    orangizeLoginUrl: "/prefab/AuthLogin/OrganizationLoginPanel",
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

    start() {
        this.authCodeLogin();
    }

    update(deltaTime: number) {

    }

    async authCodeLogin() {
        this.authCodeLoginBtn.getComponent(Label).color = new Color(36, 98, 207);
        this.orangizeLoginBtn.getComponent(Label).color = new Color(148, 149, 153);
        const prefab = await this.loadPrefab(loginPanelConfig.authCodeLoginUrl);
        const instance = instantiate(prefab);
        this.clearLoginContainer();
        this.loginContainer.addChild(instance);

    }
    clearLoginContainer() {
        const children = this.loginContainer.children;
        for (const child of children) {
            child.destroy();
        }
    }
    async orangizeLogin() {
        this.authCodeLoginBtn.getComponent(Label).color = new Color(148, 149, 153);
        this.orangizeLoginBtn.getComponent(Label).color = new Color(36, 98, 207);
        const prefab = await this.loadPrefab(loginPanelConfig.orangizeLoginUrl);
        const instance = instantiate(prefab);
        this.clearLoginContainer();
        this.loginContainer.addChild(instance);
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



import { _decorator, Button, Color, Component, EditBox, Node, resources, Sprite, SpriteFrame, Toggle, tween, Vec3 } from 'cc';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { TreatyView } from '../../../TreatyV2/TreatyView';
import { BundleName } from '../../../Core/Manager/Load/BundleName';
import { AlertData, AlertManager } from '../../../Core/Manager/Alert/AlertManager';
import { LoginManager } from '../../../Core/Manager/LoginManager/LoginManager';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { SceneManager } from '../../../Core/Manager/Scene/SceneManager';
import { Md5 } from '../../../Core/Util/md5';
const { ccclass, property } = _decorator;

@ccclass('OrganizationPanel')
export class OrganizationPanel extends Component {
    @property(Node)
    institutionCode: Node;
    @property(Node)
    userCode: Node;
    @property(Node)
    password: Node;
    @property(Node)
    commitBtn: Node;
    @property(Toggle)
    toggle: Toggle;
    @property(Node)
    tips: Node;
    @property(Node)
    institutionCodePrompt: Node;
    @property(Node)
    userCodePrompt: Node;
    @property(Node)
    passwordPrompt: Node;
    @property(Sprite)
    passwordEye: Sprite;
    private institutionCodeValue: string = "";
    private userCodeValue: string = "";
    private passwordValue: string = "";
    private isPasswordVisible: boolean = false; // 密码是否可见
    start() {
        // this.changeBtnFrame(0);
        // 初始化密码输入框，设置占位符文本和密码模式
        let passwordEditBox = this.password.getComponent(EditBox);
        passwordEditBox.inputFlag = EditBox.InputFlag.PASSWORD; // 设置密码模式
        passwordEditBox.placeholder = "请输入密码";
        
        // 初始化密码眼睛图标为闭眼状态
        this.initPasswordEye();
    }
    
    // 初始化密码眼睛图标
    async initPasswordEye() {
        try {
            let closeEyeSprite = await this.loadSprite("/textureV2/component/closeEye/spriteFrame");
            this.passwordEye.spriteFrame = closeEyeSprite;
        } catch (error) {
            console.error("加载密码眼睛图标失败:", error);
        }
    }
    onEnable() {
        EventManager.getInstance().on(LoginManager.LoginByInstitutionResult, this.onLoginByInstitutionResult, this);
    }
    onDisable() {
        EventManager.getInstance().off(LoginManager.LoginByInstitutionResult, this);
        this.stopPromptAnimation();
    }
    onLoginByInstitutionResult() {
        SceneManager.getInstance().backToHall();
    }
    showXieYi() {
        UIManager.getInstance().registerPanel(TreatyView.NAME, BundleName.RESOURCES, '/prefabV2/treatyPrefab', TreatyView);
        UIManager.getInstance().showPanel(TreatyView.NAME, {
            flag: "XieYi"
        });
    }
    showPrivacy() {
        UIManager.getInstance().registerPanel(TreatyView.NAME, BundleName.RESOURCES, '/prefabV2/treatyPrefab', TreatyView);
        UIManager.getInstance().showPanel(TreatyView.NAME, {
            flag: "Privacy"
        });
    }
    private toggleClickHandler() {
        this.tips.active = this.toggle.isChecked;
    }
    institutionCodeChange() {
        this.institutionCodeValue = this.institutionCode.getComponent(EditBox).string;
        if (this.institutionCodeValue.length > 10) {
            this.institutionCodePrompt.active = true;
            this.promptAnimation(this.institutionCodePrompt);
            return;
        }
        this.institutionCodePrompt.active = false;
        let institutionCode = this.institutionCode.getComponent(EditBox);
        this.institutionCodeValue = institutionCode.string;
    }

    userCodeChange() {
        this.userCodeValue = this.userCode.getComponent(EditBox).string;
        if (this.userCodeValue.length < 4 || this.userCodeValue.length > 10) {
            this.userCodePrompt.active = true;
            this.promptAnimation(this.userCodePrompt);
            return;
        }
        this.userCodePrompt.active = false;
        let userCode = this.userCode.getComponent(EditBox);
        this.userCodeValue = userCode.string;
    }
    // 修改密码
    passwordChange() {
        let passwordEditBox = this.password.getComponent(EditBox);
        this.passwordValue = passwordEditBox.string;
        
        if (this.passwordValue.length < 4 || this.passwordValue.length > 10) {
            this.passwordPrompt.active = true;
            this.promptAnimation(this.passwordPrompt);
            return;
        }
        this.passwordPrompt.active = false;
    }
  
    async onPasswordEyeClick() {
        this.isPasswordVisible = !this.isPasswordVisible;
        let passwordEditBox = this.password.getComponent(EditBox);
        if (this.isPasswordVisible) {
            let openEyeSprite = await this.loadSprite("/textureV2/component/openEye/spriteFrame");
            this.passwordEye.spriteFrame = openEyeSprite;
            passwordEditBox.inputFlag = EditBox.InputFlag.DEFAULT;
        } else {
            let closeEyeSprite = await this.loadSprite("/textureV2/component/closeEye/spriteFrame");
            this.passwordEye.spriteFrame = closeEyeSprite;
            passwordEditBox.inputFlag = EditBox.InputFlag.PASSWORD;
        }
    }

    private loadSprite(url: string): Promise<SpriteFrame> {
        let promise = new Promise<SpriteFrame>((resolve, reject) => {
            resources.load(url, SpriteFrame, (err, sp) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(sp);
            });
        });
        return promise;
    }
    private promptAnimation(node: Node) {
        node.active = true;
        tween(node)
            .to(0.03, { scale: new Vec3(1.1, 1.1, 1.1) })
            .to(0.03, { scale: new Vec3(1, 1, 1) })
            .to(0.03, { scale: new Vec3(1.1, 1.1, 1.1) })
            .start();
    }
    stopPromptAnimation() {
        tween(this.institutionCodePrompt).stop();
        tween(this.userCodePrompt).stop();
        tween(this.passwordPrompt).stop();
    }
    private confirmHandler() {
        this.toggle.isChecked = true;
        this.tips.active = false;
        // LoginManager.getInstance().requestLoginByInstitution(this.institutionCodeValue,this.userCodeValue,this.passwordValue);
    }
    private async changeBtnFrame(index: number = 0): Promise<void> {
        let btnSprite = this.commitBtn.getComponent(Sprite);
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
    verifyAllInput() {
        let isVerify = true;
        if(this.institutionCodeValue.length > 10){
            this.institutionCodePrompt.active = true;
            this.promptAnimation(this.institutionCodePrompt);
            isVerify = false;
        }
        if(this.userCodeValue.length < 4 || this.userCodeValue.length > 10){
            this.userCodePrompt.active = true;
            this.promptAnimation(this.userCodePrompt);
            isVerify = false;
        }
        if(this.passwordValue.length < 4 || this.passwordValue.length > 10){
            this.passwordPrompt.active = true;
            this.promptAnimation(this.passwordPrompt);
            isVerify = false;
        }
        return isVerify;
    }
    commitBtnClick() {
        if(!this.verifyAllInput()){
            return;
        }
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
        let md5Value = Md5.hashStr(this.passwordValue);
        LoginManager.getInstance().requestLoginByInstitution(this.institutionCodeValue, this.userCodeValue, md5Value);

    }

    cancelHandler() {

    }

    update(deltaTime: number) {

    }
}


import { _decorator, Button, Color, Component, EditBox, Node, resources, Sprite, SpriteFrame, Toggle, tween, Vec3 } from 'cc';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { TreatyView } from '../../../TreatyV2/TreatyView';
import { BundleName } from '../../../Core/Manager/Load/BundleName';
import { AlertData, AlertManager } from '../../../Core/Manager/Alert/AlertManager';
import { LoginManager } from '../../../Core/Manager/LoginManager/LoginManager';
import { Md5 } from '../../../Core/Util/md5';
import { LocalStorageKeyEnum, LocalStorageUtil } from '../../../Core/Util/LocalStorageUtil';
const { ccclass, property } = _decorator;

@ccclass('OrganizationPanel')
export class OrganizationPanel extends Component {
    @property(Node)
    institutionCode: Node;
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
    passwordPrompt: Node;
    @property(Sprite)
    passwordEye: Sprite;
    private institutionCodeValue: string = "";
    private passwordValue: string = "";
    private isPasswordVisible: boolean = false; // 密码是否可见
  
    start() {
        this.initInstitutionCodeEditBox();
        this.initPasswordEditBox();
        this.initPasswordEye();
        this.initToggle();
    }

    initToggle(){
        this.toggle.isChecked = LoginManager.getInstance().xieyiToggleFlag;
        this.tips.active = !LoginManager.getInstance().xieyiToggleFlag;
    }

    initInstitutionCodeEditBox() {
        let institutionCode = LocalStorageUtil.get(LocalStorageKeyEnum.INSTITUTION_CODE);
        // 添加空值检查，如果为 null 则使用空字符串
        if (!institutionCode) {
            institutionCode = "";
        }
        this.institutionCode.getComponent(EditBox).string = institutionCode;
        this.institutionCodeValue = institutionCode;
    }

    initPasswordEditBox() {
        let passwordEditBox = this.password.getComponent(EditBox);
        passwordEditBox.inputFlag = EditBox.InputFlag.PASSWORD; // 设置密码模式
        passwordEditBox.placeholder = "请输入密码";
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
    
    onDisable() {
        this.stopPromptAnimation();
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

    private _hasHandledFirstLogin: boolean = false;
    private toggleClickHandler() {
        if (!this._hasHandledFirstLogin) {
            let isFirstLogin = LocalStorageUtil.get(LocalStorageKeyEnum.IS_FIRST_LOGIN);
            if (isFirstLogin == "true") {
                LocalStorageUtil.set(LocalStorageKeyEnum.IS_FIRST_LOGIN, "false");
                this._hasHandledFirstLogin = true;
            }
        }
        this.tips.active = this.toggle.isChecked; 
        LoginManager.getInstance().xieyiToggleFlag = !this.toggle.isChecked;
    }

    institutionCodeChangeFinished() {
        this.institutionCodeValue = this.institutionCode.getComponent(EditBox).string ;
        if (this.institutionCodeValue.length > 10) {
            this.institutionCodePrompt.active = true;
            this.promptAnimation(this.institutionCodePrompt);
            return;
        }
        this.institutionCodePrompt.active = false;
    }

    // 修改密码
    passwordChangeFinished() {
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
        tween(this.passwordPrompt).stop();
    }

    private confirmHandler() {
        this.toggle.isChecked = true;
        this.tips.active = false;
        LoginManager.getInstance().xieyiToggleFlag = true;
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
            ad.message = "为了保证您的权益，请确认并勾选";
            ad.cancelButtonVisible = true;
            ad.cancelButtonText = "不接受"
            ad.confirmButtonText = "接受"
            ad.contentClickCb = this.showXieYi.bind(this);
            AlertManager.getInstance().showAlert(ad);
            ad.confirmCb = this.confirmHandler.bind(this);
            ad.cancelCb = this.cancelHandler.bind(this);
            return;
        }
        let md5Value = Md5.hashStr(this.passwordValue);
        LoginManager.getInstance().requestLoginOrganization(this.institutionCodeValue, md5Value);

    }

    cancelHandler() {

    }

    update(deltaTime: number) {

    }
}


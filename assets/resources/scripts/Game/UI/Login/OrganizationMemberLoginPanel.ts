import { _decorator, Component, EditBox, Label, Node, resources, Sprite, SpriteFrame, tween, Vec3 } from 'cc';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { LoginManager, OrganizationUser } from '../../../Core/Manager/LoginManager/LoginManager';
import { DebugLog } from '../../../Core/Util/DebugLog';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { LocalStorageKeyEnum } from '../../../Core/Util/LocalStorageUtil';
import { LocalStorageUtil } from '../../../Core/Util/LocalStorageUtil';
import { Md5 } from '../../../Core/Util/md5';
const { ccclass, property } = _decorator;

@ccclass('OrganizationMemberLoginPanel')
export class OrganizationMemberLoginPanel extends BasePanel {
    public static NAME = 'OrganizationMemberLoginPanel';

    @property(Label)
    private memberName: Label;

    @property(Sprite)
    private userIcon: Sprite;

    @property(Node)
    password: Node;

    @property(Node)
    passwordPrompt: Node;

    @property(Sprite)
    private passwordEye: Sprite;

    @property(SpriteFrame)
    private eyeOpen: SpriteFrame;

    @property(SpriteFrame)
    private eyeClose: SpriteFrame;

    @property(Node)
    loginBtn: Node;

    private _isPasswordVisible: boolean = false;

    private _data: OrganizationUser;
    private _password: string = "";

    start() {
        this.setInputFlag(this._isPasswordVisible);
    }

    restore(data: OrganizationUser) {
        this._data = data;
        this.memberName.string = data.full_name;
        let userIconPath = data.gender == 1 ? "textureV2/indexPage/male/spriteFrame" : "textureV2/indexPage/female/spriteFrame";
        resources.load(userIconPath, SpriteFrame, (err, spriteFrame) => {
            if (err) {
                DebugLog.instance.error(err);
            } else {
                this.userIcon.spriteFrame = spriteFrame;
            }
        });
    }

    // 修改密码
    passwordChangeFinished() {
        let passwordEditBox = this.password.getComponent(EditBox);
        this._password = passwordEditBox.string;
        
        if (this._password.length < 4 || this._password.length > 10) {
            this.passwordPrompt.active = true;
        }else{
            this.passwordPrompt.active = false;
        }
    }

    private setInputFlag(flag:boolean){
        let passwordEditBox = this.password.getComponent(EditBox);
        if (flag) {
            this.passwordEye.spriteFrame = this.eyeOpen;
            passwordEditBox.inputFlag = EditBox.InputFlag.DEFAULT;
        } else {
            this.passwordEye.spriteFrame = this.eyeClose;
            passwordEditBox.inputFlag = EditBox.InputFlag.PASSWORD;
        }
    }

    onPasswordEyeClick() {
        this._isPasswordVisible = !this._isPasswordVisible;
        this.setInputFlag(this._isPasswordVisible);
    }

    onClickBack() {
        UIManager.getInstance().hidePanel(OrganizationMemberLoginPanel.NAME);
    }

    onClickLogin() {
        if(this.passwordPrompt.active || this._password.length < 4 || this._password.length > 10){
            this.passwordPrompt.active = true;
            this.promptAnimation(this.passwordPrompt);
        }else{
            let md5password = Md5.hashStr(this._password);
            LoginManager.getInstance().requestLoginOrganizationAndUsername(LocalStorageUtil.get(LocalStorageKeyEnum.ORGANIZATION_TOKEN), this._data.username, md5password);
        }
    }

    private promptAnimation(node: Node) {
        tween(node)
            .to(0.03, { scale: new Vec3(1.1, 1.1, 1.1) })
            .to(0.03, { scale: new Vec3(1, 1, 1) })
            .to(0.03, { scale: new Vec3(1.1, 1.1, 1.1) })
            .start();
    }
}



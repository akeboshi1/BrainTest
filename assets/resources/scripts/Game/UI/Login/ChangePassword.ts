import { _decorator, Component, Node, SpriteFrame, Sprite, Label, EditBox } from 'cc';
import { BasePanel } from "db://assets/resources/scripts/Core/UI/BasePanel";
import { UIManager } from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import { AlertData, AlertManager } from '../../../Core/Manager/Alert/AlertManager';
import { SocketManager } from '../../../Core/Manager/Net/SocketManager';
import { SocketData } from '../../../Core/Manager/Net/SocketData';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { Md5 } from '../../../Core/Util/md5';
import { LocalStorageKeyEnum, LocalStorageUtil } from '../../../Core/Util/LocalStorageUtil';
const { ccclass, property } = _decorator;

@ccclass('ChangePassword')
export class ChangePassword extends BasePanel {

    @property(Label)
    public accountLabel: Label = null;

    public oldPassword: string = null;

    public newPassword: string = null;

    public confirmPassword: string = null;

    @property(SpriteFrame)
    private eyeOpen: SpriteFrame;

    @property(SpriteFrame)
    private eyeClose: SpriteFrame;

    @property(EditBox)
    oldPasswordEdit: EditBox;

    @property(EditBox)
    newPasswordEdit: EditBox;

    @property(EditBox)
    confirmPasswordEdit: EditBox;

    @property(Sprite)
    public oldPasswordEyeSprite: Sprite = null;

    @property(Sprite)
    public newPasswordEyeSprite: Sprite = null;

    @property(Sprite)
    public confirmPasswordEyeSprite: Sprite = null;

    public static NAME: string = "ChangePassword";


    public static updatePasswordResult: string = "user.update_password";


    start() {
        this.accountLabel.node.active = false;
        // let organizationName = LocalStorageUtil.get(LocalStorageKeyEnum.ORGANIZATION_NAME);
        // this.accountLabel.string = `请您为${organizationName}账号修改密码`;
    }


    public backHandler() {
        UIManager.getInstance().hidePanel(ChangePassword.NAME);
    }

    public confirmHandler() {
        let errorMessage = "";
        if (this.oldPassword == null || this.oldPassword == "") {
            errorMessage = "请输入旧密码";
        }
        if (this.newPassword == null || this.newPassword == "") {
            errorMessage = "请输入新密码";
        }
        if (this.confirmPassword == null || this.confirmPassword == "") {
            errorMessage = "请输入确认密码";
        }
        if (this.newPassword != this.confirmPassword) {
            errorMessage = "两次输入的密码不一致";
        }
        if (this.newPassword.length < 10 || this.newPassword.length > 10) {
            errorMessage = "密码长度为10位";
        }
        if (this.oldPassword == this.newPassword) {
            errorMessage = "新密码不能与旧密码相同";
        }

        // 验证密码只能包含数字和字母
        const passwordRegex = /^[a-zA-Z0-9]+$/;
        if (!passwordRegex.test(this.newPassword)) {
            errorMessage = "密码只能包含数字和字母";
        }

        if (errorMessage != "") {
            const alertData: AlertData = new AlertData();
            alertData.confirmCb = function () {
                AlertManager.getInstance().closeCurrentAlert();
            }.bind(this);
            alertData.message = errorMessage;
            AlertManager.getInstance().showAlert(alertData);
            return;
        }


        EventManager.getInstance().on(ChangePassword.updatePasswordResult, this.updatePasswordResultHandler, this, true);
        let socketData = new SocketData({
            action: ChangePassword.updatePasswordResult,
            data: {
                old_password: Md5.hashStr(this.oldPassword),
                new_password: Md5.hashStr(this.newPassword),
                confirm_password: Md5.hashStr(this.confirmPassword),
            }
        });
        SocketManager.getInstance().send(socketData);
    }

    private updatePasswordResultHandler(data: any) {
        if (data.status == 0) {
            AlertManager.getInstance().showSocketAlert(data.message);
        } else {
            AlertManager.getInstance().showSocketAlert("修改成功");
            this.backHandler();
        }

    }

    public resetHandler() {
        this.oldPassword = "";
        this.newPassword = "";
        this.confirmPassword = "";
    }

    public oldPasswordInputHandler() {
        this.oldPassword = this.oldPasswordEdit.string;
    }

    public newPasswordInputHandler() {
        this.newPassword = this.newPasswordEdit.string;
    }

    public confirmPasswordInputHandler() {
        this.confirmPassword = this.confirmPasswordEdit.string;
    }

    public changeOldPasswordOutPutType() {
        this._changeInputType(this.oldPasswordEdit, this.oldPasswordEyeSprite);
    }

    public changeNewPasswordOutPutType() {
        this._changeInputType(this.newPasswordEdit, this.newPasswordEyeSprite);
    }

    public changeConfirmPasswordOutPutType() {
        this._changeInputType(this.confirmPasswordEdit, this.confirmPasswordEyeSprite);
    }

    private _changeInputType(edit: EditBox, eyeSprite: Sprite) {
        if (edit.inputFlag == EditBox.InputFlag.PASSWORD) {
            edit.inputFlag = EditBox.InputFlag.DEFAULT;
            eyeSprite.spriteFrame = this.eyeClose;
        } else {
            edit.inputFlag = EditBox.InputFlag.PASSWORD;
            eyeSprite.spriteFrame = this.eyeOpen;
        }
    }



}
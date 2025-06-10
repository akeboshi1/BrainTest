import { _decorator, Component, ProgressBar, Node, SpriteFrame, Vec3, Label, EditBox, lerp,Button,Sprite,resources, native,sys } from 'cc';
import { SceneManager } from "../../../Core/Manager/Scene/SceneManager";
import { LoginManager } from "db://assets/resources/scripts/Core/Manager/LoginManager/LoginManager";
import { BasePanel } from "db://assets/resources/scripts/Core/UI/BasePanel";
import { NativeEventManager } from "db://assets/resources/scripts/Core/Manager/Event/NativeEventManager";
import {NativeEvent} from "db://assets/resources/scripts/Core/Manager/Event/NativeEvent";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";
import { EventManager } from '../../../Core/Manager/Event/EventManager';
const { ccclass, property } = _decorator;

@ccclass('VerifyPanel')
export class VerifyPanel extends BasePanel {

    // @property(Node)
    // private loadNode: Node;

    @property(Node)
    private verifyNode: Node;

    // @property(ProgressBar)
    // private loadEffect: ProgressBar;
    //
    // @property(ProgressBar)
    // private hookEffect: ProgressBar;

    // @property(Label)
    // private descLable: Label = null;

    @property(EditBox)
    private editBox: EditBox = null;

    @property(Node)
    loginBtn:Node;


    private _tween;

    public static NAME: string = "VerifyPanel";

    private _inviteCode: string = ""; // 默认

    start() {
        if (this._tween) this._tween.stop();
        this._tween = null;
        this.verifyNode.active = true;
        this.btnEnableChange(false);

        // test
        this.editBox.string = this._inviteCode;
    }


    // 停止Tween的函数
    stopTween() {
        if (this._tween) this._tween.stop();
        this._tween = null;

        // 这里可以添加其他停止Tween的逻辑
    }

    submit() {
        this.verifyNode.active = false;

        this._inviteCode = this.editBox.string;
        //     .start();
        LoginManager.getInstance().setInviteCode(this._inviteCode);
    }

    close() {
        SceneManager.getInstance().backToHall();
    }

    useCamera() {
        // todo use camera
        if(sys.platform === sys.Platform.ANDROID){
            DebugLog.instance.error(`使用摄像头`);
            EventManager.getInstance().on(NativeEvent.QRCODEResult,this.scanCallBack,this,true);
            native.bridge.sendToNative(NativeEvent.QRCODE, 'scan');
        }
    }

    private scanCallBack(data){
        DebugLog.instance.error(`获取native消息回调`);
        this.editBox.string = data;
        this.btnEnableChange(true);
    }

    // private setTween(progressBar: ProgressBar, repeat: boolean = true) {
    //     let self = this;
    //     progressBar.progress = 0;
    //     const durTime: number = 2;
    //     if (repeat) {
    //         this._tween = tween(progressBar)
    //             .repeatForever(
    //                 tween()
    //                     .to(durTime, { progress: 1 })
    //                     .call(() => {
    //                         progressBar.reverse = !progressBar.reverse;
    //                         let rotationX = progressBar.node.rotation.x - 180;
    //                         let rotationY = progressBar.node.rotation.y - 180;
    //                         progressBar.node.setRotationFromEuler(new Vec3(rotationX, rotationY, progressBar.node.rotation.z));
    //                     })
    //                     .to(durTime, { progress: 0 })
    //                     .call(() => {
    //                         progressBar.reverse = !progressBar.reverse;
    //                         let rotationX = progressBar.node.rotation.x + 360;
    //                         let rotationY = progressBar.node.rotation.y + 360;
    //                         progressBar.node.setRotationFromEuler(new Vec3(rotationX, rotationY, progressBar.node.rotation.z));
    //                     })
    //             )
    //             .start();
    //     } else {
    //         // 钩子tween
    //         this._tween = tween(progressBar)
    //             .to(0.5, { progress: 1 }) // 从0到1，持续0.5秒
    //             .call(() => {
    //                 self.descLable.string = "提交成功";
    //                 self._tween = null;
    //                 self.close();
    //             })
    //             .start(); // 启动Tween
    //     }

    // }

    public async btnEnableChange(boo: boolean = false) {
        let btn = this.loginBtn.getComponent(Button);
        btn.enabled = boo;
        await this.changeBtnFrame(Number(boo));
    }

    private async changeBtnFrame(index: number = 0): Promise<void> {
        let btnSprite = this.loginBtn.getComponent(Sprite);
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
                    DebugLog.instance.error(err);
                    reject(err);
                    return;
                }
                btnSprite.spriteFrame = sp;
                resolve();
            });
        });
    }

}
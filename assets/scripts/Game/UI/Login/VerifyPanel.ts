import { _decorator, Component, ProgressBar, Node ,tween,Vec3,Label,EditBox,lerp} from 'cc';
import {SceneManager} from "../../../Core/Manager/Scene/SceneManager";
import {LoginManager} from "db://assets/scripts/Core/Manager/LoginManager/LoginManager";
import {BasePanel} from "db://assets/scripts/Core/UI/BasePanel";
const { ccclass, property } = _decorator;

@ccclass('VerifyPanel')
export class VerifyPanel extends BasePanel{

    @property(Node)
    private loadNode:Node;

    @property(Node)
    private verifyNode:Node;

    @property(ProgressBar)
    private loadEffect:ProgressBar;

    @property(ProgressBar)
    private hookEffect:ProgressBar;

    @property(Label)
    private descLable:Label = null;

    @property(EditBox)
    private editBox:EditBox = null;


    private _tween;

    private _stopTween:boolean = false;
    public static NAME:string = "VerifyPanel";

    private _inviteCode:string = "9038765838"; // 默认

    start(){
       this.loadNode.active = false;
       this.verifyNode.active = true;

       // test
        this.editBox.string = this._inviteCode;
    }


    // 停止Tween的函数
    stopTween() {
        if(this._tween)this._tween.stop();
        this._tween = null;
        this.hookEffect.node.active = true;
        this.loadEffect.node.active = false;
        this.setTween(this.hookEffect,false);
        // 这里可以添加其他停止Tween的逻辑
    }

    submit(){
         this.verifyNode.active = false;
         this.loadNode.active = true;
         this.setTween(this.loadEffect);
         this._inviteCode = this.editBox.string;
        //     .start();
        LoginManager.getInstance().setInviteCode(this._inviteCode);
    }

    close(){
        SceneManager.getInstance().backToHall();
    }

    useCamera(){
        // todo use camera

        this.node.removeFromParent();
        SceneManager.getInstance().backToHall();
    }

    private setTween(progressBar:ProgressBar,repeat:boolean = true){
        let self = this;
        progressBar.progress = 0;
        const durTime:number = 2;
        if(repeat){
            this._tween = tween(progressBar)
                .repeatForever(
                    tween()
                        .to(durTime,{progress:1})
                         .call(()=>{
                               progressBar.reverse = !progressBar.reverse;
                               let rotationX =  progressBar.node.rotation.x-180;
                               let rotationY =  progressBar.node.rotation.y-180;
                               progressBar.node.setRotationFromEuler(new Vec3(rotationX,rotationY,progressBar.node.rotation.z));
                         })
                         .to(durTime,{progress:0})
                         .call(()=>{
                               progressBar.reverse = !progressBar.reverse;
                               let rotationX = progressBar.node.rotation.x + 360;
                               let rotationY = progressBar.node.rotation.y + 360;
                               progressBar.node.setRotationFromEuler(new Vec3(rotationX,rotationY,progressBar.node.rotation.z));
                         })
                )
                .start();
        }else{
            // 钩子tween
            this._tween = tween(progressBar)
                .to(0.5, { progress: 1 }) // 从0到1，持续0.5秒
                .call(()=>{
                    self.descLable.string = "提交成功";
                    self._tween = null;
                    tween({})
                        .delay(0.5) // 延时0.5秒
                        .call(() => {
                            // 在延时之后执行的操作
                            self.close();
                        })
                        .start();
                })
                .start(); // 启动Tween
        }

    }

}
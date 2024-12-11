import { _decorator, Component, tween, Node ,Prefab,Label} from 'cc';
import {SceneManager} from "../../../Core/Manager/Scene/SceneManager";
const { ccclass, property } = _decorator;

@ccclass('VerifyPanel')
export class VerifyPanel extends Component{

    @property(Node)
    private loadNode:Node;

    @property(Node)
    private verifyNode:Node;

    @property(Node)
    private loadEffect:Node;

    public static NAME:string = "VerifyPanel";

    private _tween;

    start(){

    }


    submit(){
         this.verifyNode.active = false;
         this.loadNode.active = true;
         let self = this;
        this._tween = tween(this.loadEffect)
            .to(3, { angle: this.loadEffect.angle + 360 })
            .to(3, { angle: this.loadEffect.angle + 720 })
            .to(3, { angle: this.loadEffect.angle + 1080 })// 9秒内旋转3圈
            .call(() => {
                // 在 tween 完成后的回调中停止 tween
                console.log("旋转结束，停止 tween");
                self.close();
                self._tween.stop(); // 停止 tween
            })
            .start();

    }

    close(){
        SceneManager.getInstance().backToHall();
    }

    useCamera(){
        // todo use camera

        this.node.removeFromParent();
        SceneManager.getInstance().backToHall();
    }

}
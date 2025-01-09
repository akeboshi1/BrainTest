import { _decorator, Component, Node, UIOpacity } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CharacterCtrl')
export class CharacterCtrl extends Component {
    private characterMask:Node = null;
    private touchNode:Node = null;

    private _touchedCallback:()=>void = null;

    start() {
        this.characterMask = this.node.getChildByName("mask");
        this.touchNode = this.node.getChildByName("touchNode");

        if (this.touchNode) {
            this.touchNode.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        }

        this.setInteractive(false);
        this.setMaskOpacity(0);
    }

    setTouchedCallback(cb:()=>void){
        this._touchedCallback = cb;
    }

    protected onDestroy(): void {
        this._touchedCallback = null;
    }

    setMaskOpacity(value:number){
        this.characterMask.getComponent(UIOpacity).opacity = value;
    }

    setInteractive(value:boolean){
        this.touchNode.active = value;
    }

    onTouchEnd(event) {
        this.setMaskOpacity(0);
        if(this._touchedCallback){
            this._touchedCallback();
        }
    }
}



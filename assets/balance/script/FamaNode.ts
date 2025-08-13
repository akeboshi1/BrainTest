import {Label, _decorator, Component, Node, UITransform} from "cc";
const { ccclass, property } = _decorator;

@ccclass('FamaNode')
export class FamaNode extends Component{
    @property(Label)
    label:Label;

    private _value:number = Math.round(Math.random()*100);

    onLoad() {
        // 确保节点可以接收触摸事件
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        this.label.string = this._value.toString()+"kg";
    }

    onDestroy() {
        // 清理触摸事件
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }

    get value():number{
        return this._value;
    }

    private onTouchStart(event: any) {
        // 触摸开始事件
    }

    private onTouchMove(event: any) {
        // 触摸移动事件
    }

    private onTouchEnd(event: any) {
        // 触摸结束事件
    }

    private onTouchCancel(event: any) {
        // 触摸取消事件
    }
}
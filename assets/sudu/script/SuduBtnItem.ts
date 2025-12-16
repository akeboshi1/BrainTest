import { _decorator, Color, Component, Label, Node, resources, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

/** 按钮点击回调类型 */
export type SuduBtnClickCallback = (num: number) => void;

@ccclass('SuduBtnItem')
export class SuduBtnItem extends Component {

    @property(Node)
    private itemNode: Node = null;

    @property(Label)
    private itemLabel: Label = null;

    /** 按钮代表的数字 (1-9) */
    private _num: number = 0;

    /** 点击回调 */
    private _clickCallback: SuduBtnClickCallback = null;

    /**
     * 初始化按钮
     * @param num 按钮代表的数字
     * @param callback 点击回调
     */
    public init(num: number, callback?: SuduBtnClickCallback): void {
        this._num = num;
        this._clickCallback = callback || null;
        
        if (this.itemLabel) {
            this.itemLabel.string = num.toString();
        }
    }

    /**
     * 设置点击回调
     * @param callback 回调函数
     */
    public setClickCallback(callback: SuduBtnClickCallback): void {
        this._clickCallback = callback;
    }

    /**
     * 获取按钮数字
     */
    public get num(): number {
        return this._num;
    }

    /**
     * 点击事件处理（绑定到节点的点击事件）
     */
    public onClick(event: Event, data: any): void {
        // 如果有回调，使用回调
        if (this._clickCallback) {
            this._clickCallback(this._num);
        }
    }
}
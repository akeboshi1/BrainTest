import { _decorator, Color, Component, Label, Node, resources, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

/** 按钮点击回调类型 */
export type SuduBtnClickCallback = (num: number) => void;

/** 正常颜色（白色） */
const NORMAL_COLOR = new Color(255, 255, 255, 255);
/** 禁用颜色 #806969 */
const DISABLED_COLOR = new Color(128, 105, 105, 255);
/** 禁用时标签颜色（深灰色） */
const DISABLED_LABEL_COLOR = new Color(110, 110, 110, 255);

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

    /** 是否启用状态 */
    private _isActive: boolean = true;

    /** 原始标签颜色 */
    private _originalLabelColor: Color = null;

    /** 原始节点颜色 */
    private _originalNodeColor: Color = null;

    /** 缓存的 Sprite 组件 */
    private _sprite: Sprite = null;

    /**
     * 初始化按钮
     * @param num 按钮代表的数字
     * @param callback 点击回调
     * @param setLabel 是否设置标签文字，默认为 true
     */
    public init(num: number, callback?: SuduBtnClickCallback, setLabel: boolean = true): void {
        this._num = num;
        this._clickCallback = callback || null;
        
        // 如果 itemLabel 没有绑定，尝试从节点或子节点中查找
        if (!this.itemLabel) {
            this.itemLabel = this.node.getComponent(Label);
            if (!this.itemLabel) {
                this.itemLabel = this.node.getComponentInChildren(Label);
            }
        }
        
        if (this.itemLabel) {
            // 只有 setLabel 为 true 时才设置文字
            if (setLabel) {
                this.itemLabel.string = num.toString();
            }
            // 保存原始标签颜色
            if (!this._originalLabelColor) {
                this._originalLabelColor = this.itemLabel.color.clone();
            }
        }

        // 查找并缓存 Sprite 组件
        if (!this._sprite) {
            if (this.itemNode) {
                this._sprite = this.itemNode.getComponent(Sprite);
            }
            if (!this._sprite) {
                this._sprite = this.node.getComponent(Sprite);
            }
            if (!this._sprite) {
                this._sprite = this.node.getComponentInChildren(Sprite);
            }
        }

        // 保存原始节点颜色
        if (this._sprite && !this._originalNodeColor) {
            this._originalNodeColor = this._sprite.color.clone();
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
        // 如果禁用状态，不处理点击
        if (!this._isActive) {
            return;
        }

        // 如果有回调，使用回调
        if (this._clickCallback) {
            this._clickCallback(this._num);
        }
    }

    /**
     * 设置按钮启用/禁用状态
     * @param enabled 是否启用
     */
    public setEnabled(enabled: boolean): void {
        this._isActive = enabled;
        this.updateColor();
    }

    /**
     * 获取按钮启用状态
     */
    public get isActive(): boolean {
        return this._isActive;
    }

    /**
     * 更新按钮颜色
     */
    private updateColor(): void {
        // 更新 Sprite 颜色（使用缓存的 Sprite）
        if (this._sprite) {
            const nodeColor = this._isActive 
                ? (this._originalNodeColor || NORMAL_COLOR) 
                : DISABLED_COLOR;
            this._sprite.color = nodeColor;
        }

        // 更新标签颜色（禁用时变灰，启用时恢复原始颜色）
        if (this.itemLabel) {
            const labelColor = this._isActive 
                ? (this._originalLabelColor || new Color(0, 0, 0, 255)) 
                : DISABLED_LABEL_COLOR;
            this.itemLabel.color = labelColor;
        }
    }
}
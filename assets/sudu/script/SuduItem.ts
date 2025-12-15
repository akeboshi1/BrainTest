import { _decorator, Color, Component, Label, Node, resources, Sprite, SpriteFrame, EventHandler } from 'cc';
const { ccclass, property } = _decorator;

/** 格子点击回调类型 */
export type SuduItemClickCallback = (item: SuduItem) => void;

@ccclass('SuduItem')
export class SuduItem extends Component {
    @property(Node)
    private itemNode: Node = null;

    @property(Label)
    private itemLabel: Label = null;

    @property(Node)
    private itemBg: Node = null;

    @property(Node)
    private itemBgSelected: Node = null;

    @property(Node)
    private itemBgError: Node = null;

    private _data: string = '';

    private _isSelected: boolean = false;

    private _isFixed: boolean = false;

    private _row: number = 0;

    private _col: number = 0;

    /** 点击回调 */
    private _clickCallback: SuduItemClickCallback = null;

    /**
     * 初始化格子
     * @param row 行索引
     * @param col 列索引
     * @param clickCallback 点击回调函数
     */
    public init(row: number, col: number, clickCallback?: SuduItemClickCallback): void {
        this._row = row;
        this._col = col;
        this._clickCallback = clickCallback || null;
    }
    
    /**
     * 设置点击回调
     * @param callback 回调函数
     */
    public setClickCallback(callback: SuduItemClickCallback): void {
        this._clickCallback = callback;
    }

    /**
     * 设置格子数据
     * @param item 数字字符串
     * @param isFixed 是否为固定数字（题目原有的数字）
     */
    public setData(item: string, isFixed: boolean = false): void {
        this._data = item;
        this._isFixed = isFixed;
        this.itemLabel.string = item;

        // 固定数字可以用不同颜色显示
        if (this.itemLabel) {
            this.itemLabel.color = isFixed ? new Color(0, 0, 0, 255) : new Color(0, 100, 200, 255);
        }
    }

    /**
     * 清除格子数据
     */
    public clearData(): void {
        this._data = '';
        this.itemLabel.string = '';
        this._isFixed = false;
    }

    /**
     * 点击事件处理（绑定到节点的点击事件）
     */
    public onClick(): void {
        // 如果是固定数字，不处理点击
        if (this._isFixed) {
            return;
        }
        
        // 调用回调通知父组件
        if (this._clickCallback) {
            this._clickCallback(this);
        }
    }

    /**
     * 设置选中状态
     * @param selected 是否选中
     */
    public setSelected(selected: boolean): void {
        this._isSelected = selected;
        if (this.itemBgSelected) {
            this.itemBgSelected.active = selected;
        }
    }

    /**
     * 设置错误状态
     * @param error 是否显示错误
     */
    public setError(error: boolean): void {
        if (this.itemBgError) {
            this.itemBgError.active = error;
        }
    }

    /**
     * 设置背景颜色
     * @param color 颜色值
     */
    public setBgColor(color: Color): void {
        if (this.itemBg) {
            const sprite = this.itemBg.getComponent(Sprite);
            if (sprite) {
                sprite.color = color;
            }
        }
    }

    /**
     * 获取格子数据
     */
    public get data(): string {
        return this._data;
    }

    /**
     * 获取是否为固定数字
     */
    public get isFixed(): boolean {
        return this._isFixed;
    }

    /**
     * 获取行索引
     */
    public get row(): number {
        return this._row;
    }

    /**
     * 获取列索引
     */
    public get col(): number {
        return this._col;
    }
}
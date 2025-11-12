import { _decorator, Color, Component, Label, Node, resources, Sprite, SpriteFrame } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ChatChooseItem')
export class ChatChooseItem extends Component {
    @property(Label)
    private label: Label = null;
    @property(Node)
    private bg_choosen: Node = null;
    @property(Node)
    private bg_unchoosen: Node = null;
    @property(Node)
    private bg_wait: Node = null;

    @property(Sprite)
    private itemIcon: Sprite = null;
    @property(Color)
    private selectedColor: Color = null;
    @property(Color)
    private unselectedColor: Color = null;

    public getSelectionId():number {
        return this._selectionId;
    }

    private _isSelected: boolean = false;
    private _selectionId:number = 0;

    private _clickCallback: (id: number) => void = null;
    private _debounceCallback: (() => void) | null = null; // 防抖回调函数
    public setData(id: number, label: string, isSelected: boolean, iconUrl: string, clickCallback: (id: number) => void):void {
        this._selectionId = id;
        if(label !== ""){
            this.label.string = label;
            this.label.node.active = true;
        }else{
            this.label.node.active = false;
        }
        if(iconUrl !== "" && this.itemIcon != null){
            resources.load(iconUrl, SpriteFrame, (err, spriteFrame) => {
                if(err){
                    console.error('加载图标失败', err);
                }else{
                    this.itemIcon.node.active = true;
                    this.itemIcon.spriteFrame = spriteFrame as SpriteFrame;
                }
            });
        }
        this._isSelected = isSelected;
        this.setSelected(this._isSelected);
        this._clickCallback = clickCallback;
    }

    public setSelected(isSelected: boolean):void {
        this._isSelected = isSelected;
        this.bg_choosen.active = this._isSelected;
        this.bg_unchoosen.active = !this._isSelected;
        if(this.bg_wait)this.bg_wait.active = false;
        if(this.label !== null){
            this.label.color = this._isSelected ? Color.WHITE : Color.GRAY;
        }
        if(this.itemIcon != null){
            this.itemIcon.color = this._isSelected ? this.selectedColor : this.unselectedColor;
        }
    }

    /**
     * 设置防抖期间的灰色状态
     */
    private setDebouncingState(isDebouncing: boolean): void {
        if(isDebouncing) {
            // 防抖期间：设置为灰色状态
            this.bg_choosen.active = false;
            this.bg_unchoosen.active = false;
            if(this.bg_wait)this.bg_wait.active = true;
            
        } else {
            // 防抖结束：恢复正常的选中状态
            this.setSelected(this._isSelected);
        }
    }

    public onClick():void {
        if(this._isSelected) {
            return;
        }
        // 清除之前的防抖定时器
        if (this._debounceCallback) {
            this.unschedule(this._debounceCallback);
            this._debounceCallback = null;
        }

        // 防抖期间：设置为灰色状态
        this.setDebouncingState(true);

        // 创建防抖回调函数
        const callback = () => {
            // 防抖结束：恢复正常的选中状态
            this.setSelected(true);
            if(this._clickCallback) {
                this._clickCallback(this._selectionId);
            }
            this._debounceCallback = null;
        };

        // 设置防抖定时器，500毫秒后执行
        this._debounceCallback = callback;
        this.scheduleOnce(callback, 0.5);
    }

    protected onDestroy(): void {
        // 清理防抖定时器
        if (this._debounceCallback) {
            this.unschedule(this._debounceCallback);
            this._debounceCallback = null;
        }
    }
}

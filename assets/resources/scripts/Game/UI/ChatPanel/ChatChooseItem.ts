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


    public set isSelected(boo:boolean) {
        this._isSelected = boo;
    }

    private _selectionId:number = 0;

    private _clickCallback: (id: number) => void = null;
    public setData(id: number, label: string, isSelected: boolean, iconUrl: string, clickCallback: (id: number) => void, protectionDebounceCheck?: () => boolean):void {
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
     * 设置防抖期间的等待状态
     */
    public setDebouncingState(isDebouncing: boolean): void {
        if(isDebouncing) {
            // 防抖期间：显示等待背景
            if(this.bg_wait) {
                this.bg_wait.active = true;
            }
            this.bg_choosen.active = false;
            this.bg_unchoosen.active = false;
        } else {
            // 防抖结束：隐藏等待背景
            if(this.bg_wait) {
                this.bg_wait.active = false;
            }
            this.setSelected(this._isSelected);
        }
    }

    /**
     * 检查是否在防抖状态
     */
    public isDebouncing(): boolean {
        return this.bg_wait && this.bg_wait.active;
    }

    public onClick():void {
        if(this._isSelected) {
            return;
        }

        // 选中item：立即触发选中效果，不做防抖
        this.setSelected(true);
        
        // 立即执行回调
        if(this._clickCallback) {
            this._clickCallback(this._selectionId);
        }
    }

}

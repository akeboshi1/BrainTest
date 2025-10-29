import { _decorator, Color, Component, Label, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ChatChooseItem')
export class ChatChooseItem extends Component {
    @property(Label)
    private label: Label = null;
    @property(Node)
    private bg_choosen: Node = null;
    @property(Node)
    private bg_unchoosen: Node = null;

    public getSelectionId():number {
        return this._selectionId;
    }

    private _isSelected: boolean = false;
    private _selectionId:number = 0;

    private _clickCallback: (id: number) => void = null;
    public setData(id: number, label: string, isSelected: boolean, clickCallback: (id: number) => void):void {
        this._selectionId = id;
        this.label.string = label;
        this._isSelected = isSelected;
        this.setSelected(this._isSelected);
        this._clickCallback = clickCallback;
    }

    public setSelected(isSelected: boolean):void {
        this._isSelected = isSelected;
        this.bg_choosen.active = this._isSelected;
        this.bg_unchoosen.active = !this._isSelected;
        this.label.color = this._isSelected ? Color.WHITE : Color.GRAY;
    }

    public onClick():void {
        if(this._isSelected) {
            return;
        }

        this.setSelected(true);

        if(this._clickCallback) {
            this._clickCallback(this._selectionId);
        }
    }
}

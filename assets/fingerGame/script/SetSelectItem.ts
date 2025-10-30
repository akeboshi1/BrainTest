import { _decorator, assetManager, Component, Label, Node, Sprite, SpriteFrame } from 'cc';
import { SetConfig } from '../config/fingerGameConfig';
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
const { ccclass, property } = _decorator;

@ccclass('SetSelectItem')
export class SetSelectItem extends Component {
    @property(Label)
    private setName: Label = null;

    @property(Label)
    private nameLabel:Label = null;

    @property(Sprite)
    private setIconSprite: Sprite = null;

    private _onClickStartHandler: (setIndex: number) => void = null;
    private _setIndex:number = -1;

    start() {

    }

    public setData(setConfig: SetConfig, setIndex: number = 0, onClickStart: (setIndex: number) => void = null) {
        this._onClickStartHandler = onClickStart;
        this._setIndex = setIndex;
        this.setName.string = setConfig.name;
        this.nameLabel.string = setConfig.description;
        if(setConfig.icon){
            let bundle = assetManager.getBundle(BundleName.FINGERGAME); 
            bundle.load(setConfig.icon, SpriteFrame, (err, spriteFrame) => {    
                if (err) {
                    console.error('加载图标失败', err);
                } else {
                    this.setIconSprite.spriteFrame = spriteFrame as SpriteFrame;
                }
            });
        }
    }   

    public onClickStart(){
        if(this._onClickStartHandler){
            this._onClickStartHandler(this._setIndex);
        }
    }
}



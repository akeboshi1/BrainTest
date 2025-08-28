import { _decorator, assetManager, Component, Label, Node, Sprite, SpriteFrame } from 'cc';
import { SectionConfig } from '../config/fingerGameConfig';
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
const { ccclass, property } = _decorator;

@ccclass('SectionSelectItem')
export class SectionSelectItem extends Component {
    @property(Label)
    private sectionNameLabel: Label = null;

    @property(Sprite)
    private sectionIconSprite: Sprite = null;

    private _index: number = 0;

    private _onClickStartHandler: (index: number) => void = null;

    start() {

    }

    public setData(sectionConfig: SectionConfig, index: number = 0, onClickStart: (index: number) => void = null) {
        this._onClickStartHandler = onClickStart;
        this._index = index;
        this.sectionNameLabel.string = sectionConfig.name;
        if(sectionConfig.icon){
            let bundle = assetManager.getBundle(BundleName.FINGERGAME);
            bundle.load(sectionConfig.icon, SpriteFrame, (err, spriteFrame) => {    
                if (err) {
                    console.error('加载图标失败', err);
                } else {
                    this.sectionIconSprite.spriteFrame = spriteFrame as SpriteFrame;
                }
            });
        }
    }   

    public onClickStart(){
        if(this._onClickStartHandler){
            this._onClickStartHandler(this._index);
        }
    }
}



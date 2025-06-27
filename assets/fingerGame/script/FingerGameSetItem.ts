import { _decorator, assetManager, Component, Label, Node, Sprite, SpriteFrame } from 'cc';
import { SetConfig } from '../config/fingerGameConfig';
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
const { ccclass, property } = _decorator;

@ccclass('FingerGameSetItem')
export class FingerGameSetItem extends Component {
    @property(Label)
    private setNameLabel: Label = null;

    @property(Label)
    private setDescriptionLabel: Label = null;

    @property(Sprite)
    private setIconSprite: Sprite = null;

    private _index: number = 0;

    start() {

    }

    public setData(setConfig: SetConfig, index: number = 0) {
        this._index = index;
        this.setNameLabel.string = setConfig.name;
        this.setDescriptionLabel.string = setConfig.description;
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



import { _decorator, assetManager, Component, Label, Node, Sprite, SpriteFrame } from 'cc';
import { IFingerActivity, IFingerSet } from './FingerGameProtocol';
import { IVListItemInfo, VList } from '../../resources/scripts/Core/Component/VList';
import { SectionConfig, SetConfig } from '../config/fingerGameConfig';
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
const { ccclass, property } = _decorator;

@ccclass('FingerGameSectionSelectItem')
export class FingerGameSectionSelectItem extends Component {
    @property(Label)
    private sectionNameLabel: Label = null;

    @property(Sprite)
    private sectionIconSprite: Sprite = null;

    private _setIndex: number = 0;
    private _sectionIndex: number = 0;

    private _onClickStartHandler: (setIndex: number, sectionIndex: number) => void = null;


    public setData(sectionConfig: SectionConfig, setIndex: number = 0, sectionIndex: number = 0, onClickStart: (setIndex: number, sectionIndex: number) => void = null) {
        this._onClickStartHandler = onClickStart;
        this._setIndex = setIndex;
        this._sectionIndex = sectionIndex;
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
            this._onClickStartHandler(this._setIndex, this._sectionIndex);
        }
    }

}
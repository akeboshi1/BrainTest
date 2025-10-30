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


    private _iconRequestId: number = 0;
    private _lastIconPath: string = "";

    public async setData(sectionConfig: SectionConfig, setIndex: number = 0, sectionIndex: number = 0, onClickStart: (setIndex: number, sectionIndex: number) => void = null) {
        this._onClickStartHandler = onClickStart;
        this._setIndex = setIndex;
        this._sectionIndex = sectionIndex;
        this.sectionNameLabel.string = sectionConfig.name;
        if (!sectionConfig.icon) return;

        const bundle = assetManager.getBundle(BundleName.FINGERGAME);
        if (!bundle) return;

        // 记录请求ID，避免异步返回覆盖后续数据
        const requestId = ++this._iconRequestId;
        const iconPath = sectionConfig.icon;
        this._lastIconPath = iconPath;

        try {
            const spriteFrame = await new Promise<SpriteFrame>((resolve, reject) => {
                bundle.load(iconPath, SpriteFrame, (err, sf) => {
                    if (err || !sf) reject(err || new Error('sprite null'));
                    else resolve(sf as SpriteFrame);
                });
            });
            // 若期间数据被刷新，丢弃过期结果
            if (requestId !== this._iconRequestId || iconPath !== this._lastIconPath) return;
            if (this.sectionIconSprite && this.sectionIconSprite.isValid) {
                this.sectionIconSprite.spriteFrame = spriteFrame;
            }
        } catch (err) {
            console.error('加载图标失败', err);
        }
    }   


    public onClickStart(){
        if(this._onClickStartHandler){
            this._onClickStartHandler(this._setIndex, this._sectionIndex);
        }
    }

}
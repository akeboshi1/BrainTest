import { _decorator, v2, Component, Label, Node, Sprite, SpriteFrame, UITransform, Vec3 } from 'cc';
import { IVListItemInfo, VList } from '../../resources/scripts/Core/Component/VList';
import { FingerGameSectionSelectItem } from './FingerGameSectionSelectItem';
import { SectionConfig, SectionIndexConfig, SetIndexConfig } from '../config/fingerGameConfig';
const { ccclass, property } = _decorator;

@ccclass('FingerGameSectionSelectGroupItem')
export class FingerGameSectionSelectGroupItem extends Component {
    @property(Label)
    private sectionNameLabel: Label = null;

    @property(VList)
    private activesList: VList = null;

    private _index: number = 0;

    private _isVListInited: boolean = false;


    public setData(config, index: number = 0, selectSectionHandler: (setIndex: number, sectionIndex: number) => void) {
        this._index = index;
        
        this.sectionNameLabel.string = config.name;
        const activities: SectionIndexConfig[] = [];
        for (let i = 0; i < config.sections.length; i++) {
            const section = config.sections[i] as any;
            if (section && section.is_evaluable === true) {
                activities.push({ index: i, config: config.sections[i] } as SectionIndexConfig);
            }
        }

        if (!this._isVListInited) {

            this.activesList.init({
                onData: (info: IVListItemInfo<SectionIndexConfig>) => {
                    const section = config.sections[info.data.index];
                    info.node.getComponent(FingerGameSectionSelectItem).setData(section, this._index, info.data.index, selectSectionHandler.bind(this, this._index, info.data.index));
                }
            });
            this._isVListInited = true;
        }
        this.activesList.setData(activities);
    }

}


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
    private _activitiesCount: number = 0;

    private _isVListInited: boolean = false;
    private _initialListY: number = 0;

    private baseHeight: number = 84;
    /** 每个item的高度 */
    private readonly ITEM_HEIGHT: number = 190;
    /** item之间的间隔 */
    private readonly ITEM_SPACING: number = 30;
    /** 每行高度（item高度 + 间隔） */
    private readonly ROW_HEIGHT: number = this.ITEM_HEIGHT + this.ITEM_SPACING;
    /** 列数 */
    private readonly COLUMN_COUNT: number = 2;


    public setData(config: SetIndexConfig, selectSectionHandler: (setIndex: number, sectionIndex: number) => void, index: number = 0) {
        this._index = index;
        
        this.sectionNameLabel.string = config.config.name;
        const activities = config.config.sections.map((section, i) => ({ index: i, config: section } as SectionIndexConfig));
        this._activitiesCount =activities.length;

        if (!this._isVListInited) {
            // 保存 activesList 的初始 y 位置
            if (this.activesList && this.activesList.node) {
                this._initialListY = this.activesList.node.position.y;
            }
            
            this.activesList.init({
                onData: (info: IVListItemInfo<SectionIndexConfig>) => {
                    const section = config.config.sections[info.data.index];
                    info.node.getComponent(FingerGameSectionSelectItem).setData(section, this._index, info.data.index, selectSectionHandler.bind(this, this._index, info.data.index));
                }
            });
            this._isVListInited = true;
        }
        this.activesList.setData(activities);
        
        this.updateView();

        this.activesList.setAllItemsOffset(v2(0, 50));
    }

    private updateView(){
        // 计算行数（两列布局）
        const rowCount = Math.ceil(this._activitiesCount / this.COLUMN_COUNT);
        
        // 计算总高度：行数 * 每行高度（220）
        const totalHeight = rowCount * this.ROW_HEIGHT + this.baseHeight;
        
        // 更新节点高度
        const transform = this.node.getComponent(UITransform);
        if (transform) {
            transform.height = totalHeight;
        }
        
        // 更新 activesList 的高度和位置
        if (this.activesList && this.activesList.node) {
            const listTransform = this.activesList.node.getComponent(UITransform);
            if (listTransform) {
                listTransform.height = totalHeight;
            }
            
            // 将 activesList 的 y 位置向下移动一半高度（基于初始位置）
            const currentPos = this.activesList.node.position;
            const newY = this._initialListY - totalHeight / 2;
            this.activesList.node.setPosition(currentPos.x, newY, currentPos.z);
        }
    }

}


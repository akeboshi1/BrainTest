import { _decorator, Component, Node, Prefab, instantiate, Button, Label, UITransform, Size } from 'cc';
import { BasePanel } from '../../resources/scripts/Core/UI/BasePanel';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
import { fingerGameConfig } from '../config/fingerGameConfig';
import { FingerGameSetItem } from './FingerGameSetItem';
import { FingerGameSectionItem } from './FingerGameSectionItem';
import { EventManager } from '../../resources/scripts/Core/Manager/Event/EventManager';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
const { ccclass, property } = _decorator;

enum FingerGameSelectSetPanelState {
    SELECT_SET = 0,
    SELECT_SECTION = 1,
}

@ccclass('FingerGameSelectSetPanel')
export class FingerGameSelectSetPanel extends BasePanel {
    public static NAME = 'FingerGameSelectSetPanel';

    @property(Node)
    private setsListContainer: Node = null;

    @property(Prefab)
    private setItemPrefab: Prefab = null;

    @property(Node)
    private sectionListContainer: Node = null;

    @property(Prefab)
    private sectionItemPrefab: Prefab = null;

    @property(Label)
    private sectionNameLabel: Label = null;

    @property(Label)
    private sectionDescriptionLabel: Label = null;

    @property(Node)
    private selectSetNode: Node = null;

    @property(Node)
    private selectSectionNode: Node = null;

    @property(Label)
    private sectionCountLabel: Label = null;

    @property(Node)
    private sectionPageContainer: Node = null;

    private panelState: FingerGameSelectSetPanelState = FingerGameSelectSetPanelState.SELECT_SET;
    private _currentSetIndex: number = -1; // 当前选中的套数索引

    restore(data: any) {

    }

    start() {
        // 根据配置创建手指操套装项目
        this.createSetItems();
        this.selectSectionNode.active = false;
        this.selectSetNode.active = true;
    }

    /**
     * 创建手指操套装项目
     */
    private createSetItems() {
        if (!this.setItemPrefab || !this.setsListContainer) {
            console.error('setItemPrefab 或 setsListContainer 未设置');
            return;
        }

        // 遍历配置中的所有手指操套装
        fingerGameConfig.fingerSets.forEach((setConfig, index) => {
            const setItemNode = instantiate(this.setItemPrefab);
            setItemNode.setParent(this.setsListContainer);
            setItemNode.getComponent(FingerGameSetItem)?.setData(setConfig, index);
            setItemNode.on(Button.EventType.CLICK, () => {
                this.onClickSetItem(index);
            });
        });
    }

    onClickBack() {
        if (this.panelState === FingerGameSelectSetPanelState.SELECT_SET) {
            SceneManager.getInstance().backToHall();
        } else {
            this.panelState = FingerGameSelectSetPanelState.SELECT_SET;
            this.selectSetNode.active = true;
            this.selectSectionNode.active = false;
        }
    }

    onClickSetItem(index: number) {
        this._currentSetIndex = index; // 保存当前选中的套数索引
        this.panelState = FingerGameSelectSetPanelState.SELECT_SECTION;
        this.initSelectSection(index);
        this.selectSetNode.active = false;
        this.selectSectionNode.active = true;
    }

    private initSelectSection(index: number) {
        this.sectionNameLabel.string = fingerGameConfig.fingerSets[index].name;
        this.sectionDescriptionLabel.string = fingerGameConfig.fingerSets[index].description;
        const setConfig = fingerGameConfig.fingerSets[index];
        
        // 清空节项目容器
        this.sectionListContainer.removeAllChildren();
        
        let heightCount = 0;
        setConfig.sections.forEach((sectionConfig, sectionIndex) => {
            const sectionItemNode = instantiate(this.sectionItemPrefab);
            sectionItemNode.setParent(this.sectionListContainer);
            sectionItemNode.getComponent(FingerGameSectionItem)?.setData(sectionConfig, sectionIndex);
            sectionItemNode.setPosition(0, -sectionIndex * 246);
            heightCount += 246;
            
            // 为节项目添加点击事件
            sectionItemNode.on(Button.EventType.CLICK, () => {
                this.onClickSectionItem(sectionIndex);
            });
        });

        this.sectionCountLabel.string = "选集（" + setConfig.sections.length.toString() + "）";

        let pageTransform = this.sectionPageContainer.getComponent(UITransform);
        let size = new Size(pageTransform.width, heightCount - this.sectionListContainer.position.y);
        this.sectionPageContainer.getComponent(UITransform).setContentSize(size);
    }

    onClickSectionItem(sectionIndex: number) {
        // 关闭当前界面
        UIManager.getInstance().hidePanel(FingerGameSelectSetPanel.NAME);
        
        // 通过事件管理器发送选择事件，传递套数和节数参数
        EventManager.getInstance().emit('FINGER_GAME_SECTION_SELECTED', {
            setIndex: this._currentSetIndex,
            sectionIndex: sectionIndex
        });
    }
}



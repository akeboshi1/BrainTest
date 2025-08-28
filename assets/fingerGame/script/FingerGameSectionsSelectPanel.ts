import { _decorator, Component, instantiate, Node, Prefab } from 'cc';
import { BasePanel } from '../../resources/scripts/Core/UI/BasePanel';
import { SectionConfig } from '../config/fingerGameConfig';
import { SectionSelectItem } from './SectionSelectItem';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { FingerGameModel, FingerGameModelEvent } from './FingerGameModel';
import { GameType } from '../../resources/scripts/Core/Scene/SceneModel/BaseGameModel';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
const { ccclass, property } = _decorator;

@ccclass('FingerGameSectionsSelectPanel')
export class FingerGameSectionsSelectPanel extends BasePanel {
    public static NAME = 'FingerGameSectionsSelectPanel';

    @property(Node)
    private itemContainer: Node = null;

    @property(Prefab)
    private itemPrefab: Prefab = null;

    private _model: FingerGameModel = null;
    private _sectionDatas: SectionConfig[] = [];

    start() {

    }

    restore(data: {sectionDatas: SectionConfig[], model: FingerGameModel}) {
        this._model = data.model;
        this._sectionDatas = data.sectionDatas;
        for (let i = 0; i < data.sectionDatas.length; i++) {
            const item = instantiate(this.itemPrefab);
            item.setParent(this.itemContainer);
            item.getComponent(SectionSelectItem).setData(data.sectionDatas[i], i, this.onClickStart.bind(this));
        }
    }

    onClickStart(index: number) {
        this._model.emit(FingerGameModelEvent.SELECT_EXPERIENCE_SECTION, this._sectionDatas[index]);
        UIManager.getInstance().hidePanel(FingerGameSectionsSelectPanel.name);
    }

    onClickBack() {
        UIManager.getInstance().hidePanel(FingerGameSectionsSelectPanel.NAME);

        let restoreData = SceneManager.getInstance().getRestoreData();
        if (restoreData && restoreData.gametype === GameType.GAME_CENTER) {
            SceneManager.getInstance().backToGameCenter();
        } else {
            SceneManager.getInstance().backToHall();
        }
    }
}



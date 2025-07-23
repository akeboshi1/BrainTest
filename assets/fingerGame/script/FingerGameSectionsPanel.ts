import { _decorator, Component, instantiate, Node, Prefab } from 'cc';
import { BasePanel } from '../../resources/scripts/Core/UI/BasePanel';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { SectionConfig } from '../config/fingerGameConfig';
import { SectionItem } from './SectionItem';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
import { GameType } from '../../resources/scripts/Core/Scene/SceneModel/BaseGameModel';
const { ccclass, property } = _decorator;

@ccclass('FingerGameSectionsPanel')
export class FingerGameSectionsPanel extends BasePanel {

    public static NAME = 'FingerGameSectionsPanel';

    @property(Node)
    private itemContainer: Node = null;

    @property(Prefab)
    private itemPrefab: Prefab = null;


    start() {

    }

    restore(data: SectionConfig[]) {
        for (let i = 0; i < data.length; i++) {
            const item = instantiate(this.itemPrefab);
            item.setParent(this.itemContainer);
            item.getComponent(SectionItem).setData(data[i]);
        }
    }

    onClickGoNext() {
        UIManager.getInstance().hidePanel(FingerGameSectionsPanel.NAME);
    }

    onClickBack() {
        UIManager.getInstance().hidePanel(FingerGameSectionsPanel.NAME);

        let restoreData = SceneManager.getInstance().getRestoreData();
        if (restoreData && restoreData.gametype === GameType.GAME_CENTER) {
            SceneManager.getInstance().backToGameCenter();
        } else {
            SceneManager.getInstance().backToHall();
        }
    }
}



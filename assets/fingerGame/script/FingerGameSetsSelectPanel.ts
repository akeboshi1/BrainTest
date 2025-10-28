import { _decorator, instantiate, Node, Prefab } from 'cc';
import { BasePanel } from '../../resources/scripts/Core/UI/BasePanel';
import { IFingerSet } from './FingerGameProtocol';
import { FingerGameModel, FingerGameModelEvent } from './FingerGameModel';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
import { SetSelectItem } from './SetSelectItem';
import { fingerGameConfig, SetConfig } from '../config/fingerGameConfig';
const { ccclass, property } = _decorator;

@ccclass('FingerGameSetsSelectPanel')
export class FingerGameSetsSelectPanel extends BasePanel {
    public static NAME = 'FingerGameSetsSelectPanel';

    @property(Node)
    private itemContainer: Node = null;

    @property(Prefab)
    private itemPrefab: Prefab = null;

    private _model: FingerGameModel = null;
    private _fingerSets: IFingerSet[] = [];
    private _currentSetIndex: number = -1;

    onEnable(): void {
        
    }

    onDisable(): void {
        if(this._model){
            this._model.off(FingerGameModelEvent.START_TASK_FINISHED, this.onGetTaskIDFinished, this);
        }
    }

    restore(data: { fingerSets: IFingerSet[], model: FingerGameModel }) {
        this._model = data.model;
        this._model.on(FingerGameModelEvent.START_TASK_FINISHED, this.onGetTaskIDFinished, this);
        
        this._fingerSets = data.fingerSets;
        data.fingerSets.forEach((set, index) => {
            let setData = fingerGameConfig.fingerSets[index];
            this.createSetItem(index, setData);
        });
    }

    createSetItem(setIndex: number, setData: SetConfig) {
        const item = instantiate(this.itemPrefab);
        item.setParent(this.itemContainer);
        item.getComponent(SetSelectItem).setData(setData, setIndex, this.onChoosenSet.bind(this, setIndex));
    }

    onChoosenSet(index: number) {
        this._currentSetIndex = index;
        this._model.getTaskID(this._fingerSets[index].id);
    }

    onGetTaskIDFinished(data: any) {
        this._model.emit(FingerGameModelEvent.SKEWERSGAME_NEXT, this._currentSetIndex);
        UIManager.getInstance().hidePanel(FingerGameSetsSelectPanel.NAME);
    }

    onClickBack() {
        UIManager.getInstance().hidePanel(FingerGameSetsSelectPanel.NAME);
        SceneManager.getInstance().backToHall();
    }
}



import { _decorator, NodeEventType, Node, Prefab } from 'cc';
import { BasePanel } from '../../resources/scripts/Core/UI/BasePanel';
import { IFingerSet } from './FingerGameProtocol';
import { FingerGameModel, FingerGameModelEvent } from './FingerGameModel';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
import { SetSelectItem } from './SetSelectItem';
import {fingerGameConfig, SetConfig, SetIndexConfig} from '../config/fingerGameConfig';
import {IVListItemInfo, VList} from "db://assets/resources/scripts/Core/Component/VList";
const { ccclass, property } = _decorator;

@ccclass('FingerGameSetsSelectPanel')
export class FingerGameSetsSelectPanel extends BasePanel {
    public static NAME = 'FingerGameSetsSelectPanel';

    private _model: FingerGameModel = null;
    private _fingerSets: IFingerSet[] = [];
    private _currentSetIndex: number = -1;
    private _isVListInited: boolean = false;

    @property(VList)
    itemContainer: VList;

    onEnable(): void {
        
    }

    onDisable(): void {
        if(this._model){
            this._model.off(FingerGameModelEvent.START_TASK_FINISHED, this.onGetTaskIDFinished, this);
        }
    }

    restore(data: { fingerSets: IFingerSet[], model: FingerGameModel }) {
        // 移除旧的监听，避免重复绑定
        if (this._model) {
            this._model.off(FingerGameModelEvent.START_TASK_FINISHED, this.onGetTaskIDFinished, this);
        }
        
        this._model = data.model;
        this._model.on(FingerGameModelEvent.START_TASK_FINISHED, this.onGetTaskIDFinished, this);
        
        this._fingerSets = data.fingerSets;
        let dataList: SetIndexConfig[] = [];
        
        // 清空并重新填充数据，避免重复
        data.fingerSets.forEach((set, index) => {
                let setData = fingerGameConfig.fingerSets[index];
                let indexConfig: SetIndexConfig = {
                    config: setData,
                    index,
                };
                dataList.push(indexConfig);
        });

        // 只在首次初始化 VList
        if (!this._isVListInited) {
            let self = this;
            this.itemContainer.init({
                onData: (info: IVListItemInfo<SetIndexConfig>) => {
                    info.node.getComponent(SetSelectItem).setData(info.data.config, info.data.index, self.onChoosenSet.bind(self, info.data.index));
                }
            })
            this.node.on(NodeEventType.SIZE_CHANGED, this.updateView, this);
            this._isVListInited = true;
        }
        this.itemContainer.setData(dataList);
    }

    private updateView(){

    }


    // createSetItem(setIndex: number, setData: SetConfig) {
    //     const item = instantiate(this.itemPrefab);
    //     item.setParent(this.itemContainer);
    //     item.getComponent(SetSelectItem).setData(setData, setIndex, this.onChoosenSet.bind(this, setIndex));
    // }

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



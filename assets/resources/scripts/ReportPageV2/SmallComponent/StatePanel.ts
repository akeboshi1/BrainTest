import { _decorator, Component, Node } from 'cc';
import { BasePanel } from '../../Core/UI/BasePanel';
import { UIManager } from '../../Core/Manager/UI/UIManager';
const { ccclass, property } = _decorator;

@ccclass('StatePanel')
export class StatePanel extends BasePanel {
    public static NAME:string = 'StatePanel';
    start() {

    }

    update(deltaTime: number) {
        
    }
    backToParent(){
        UIManager.getInstance().hidePanel(StatePanel.NAME);
    }
}



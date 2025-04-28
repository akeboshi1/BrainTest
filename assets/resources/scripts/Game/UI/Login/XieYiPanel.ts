import { _decorator, Component, Node } from 'cc';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { UseragreePanel } from '../Alert/UseragreePanel';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
const { ccclass, property } = _decorator;

@ccclass('XieYiPanel')
export class XieYiPanel extends BasePanel {

    start() {

    }

    update(deltaTime: number) {
        
    }
    backToPrant(){
        UIManager.getInstance().hidePanel(XieYiPanel.NAME);
    }
}



import { _decorator, Component, Node } from 'cc';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { PersonalCenterManager } from '../../PersonalCenterManager/PersonalCenterManager';
import { BasePanel } from '../../../Core/UI/BasePanel';
const { ccclass, property } = _decorator;


@ccclass('GenerateReport')

export class GenerateReport extends BasePanel {
    public static NAME = 'GenerateReport';
    start() {
        PersonalCenterManager.getInstance().getPersonalReport();
    
    }

    update(deltaTime: number) {
        
    }
}



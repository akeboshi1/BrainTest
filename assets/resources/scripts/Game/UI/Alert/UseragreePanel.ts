import { _decorator, Component, Node } from 'cc';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { XieYiPanel } from '../Login/XieYiPanel';
import { BundleName } from '../../../Core/Manager/Load/BundleName';
import AlertManager from '../../../Core/Manager/Alert/AlertManager';
const { ccclass, property } = _decorator;

@ccclass('UseragreePanel')
export class UseragreePanel extends Component {
   
    start() {

    }

    update(deltaTime: number) {
        
    }

    onClick(param: any) {
        console.log("Clicked");
        console.log(param);
        UIManager.getInstance().registerPanel(XieYiPanel.NAME, BundleName.RESOURCES, '/prefab/XieYiPanel', XieYiPanel);
        UIManager.getInstance().showPanel(XieYiPanel.NAME);
        AlertManager.getInstance().closeCurrentAlert();
    }
}



import { _decorator, Component, Node } from 'cc';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { XieYiPanel } from '../Login/XieYiPanel';
import { BundleName } from '../../../Core/Manager/Load/BundleName';
import {AlertManager} from '../../../Core/Manager/Alert/AlertManager';
const { ccclass, property } = _decorator;

@ccclass('UseragreePanel')
export class UseragreePanel extends Component {
   
    start() {

    }

    update(deltaTime: number) {
        
    }
    
    handleXieyiClick() {
        let xieyiFlagUrl="https://colapai.xinjiaxianglao.com/xieyi.html"
        UIManager.getInstance().registerPanel(XieYiPanel.NAME, BundleName.RESOURCES, '/prefab/XieYiPanel', XieYiPanel);
        UIManager.getInstance().showPanel(XieYiPanel.NAME,{
            url:xieyiFlagUrl
        });
        AlertManager.getInstance().closeCurrentAlert();
    }
    handlePrivacyClick(){
        let privacyUrl="https://colapai.xinjiaxianglao.com/privacy.html"
        UIManager.getInstance().registerPanel(XieYiPanel.NAME, BundleName.RESOURCES, '/prefab/XieYiPanel', XieYiPanel);
        UIManager.getInstance().showPanel(XieYiPanel.NAME,{
            url:privacyUrl
        });
        AlertManager.getInstance().closeCurrentAlert();
    }
}



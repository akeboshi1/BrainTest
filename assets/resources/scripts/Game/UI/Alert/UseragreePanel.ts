import { _decorator, Component, Node } from 'cc';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { BundleName } from '../../../Core/Manager/Load/BundleName';
import { TreatyView } from '../../../TreatyV2/TreatyView';
import {XieYiPanel} from "db://assets/resources/scripts/Game/UI/Login/XieYiPanel";
const { ccclass, property } = _decorator;

@ccclass('UseragreePanel')
export class UseragreePanel extends Component {
   
    start() {

    }

    update(deltaTime: number) {
        
    }
    
    handleXieyiClick() {
        // UIManager.getInstance().registerPanel(TreatyView.NAME, BundleName.RESOURCES, '/prefabV2/treatyPrefab', TreatyView);
        // UIManager.getInstance().showPanel(TreatyView.NAME,{
        //     flag:"XieYi"
        // });
        UIManager.getInstance().registerPanel(XieYiPanel.NAME, BundleName.RESOURCES, '/prefab/XieYiPanel', XieYiPanel);
        UIManager.getInstance().showPanel(XieYiPanel.NAME,{
            url:"https://colapai.xinjiaxianglao.com/xieyi.html"
        });
    }
    handlePrivacyClick(){
        // UIManager.getInstance().registerPanel(TreatyView.NAME, BundleName.RESOURCES, '/prefabV2/treatyPrefab', TreatyView);
        // UIManager.getInstance().showPanel(TreatyView.NAME,{
        //     flag:"Privacy"
        // });
        UIManager.getInstance().registerPanel(XieYiPanel.NAME, BundleName.RESOURCES, '/prefab/XieYiPanel', XieYiPanel);
        UIManager.getInstance().showPanel(XieYiPanel.NAME,{
            url:"https://colapai.xinjiaxianglao.com/privacy.html"
        });
    }
}



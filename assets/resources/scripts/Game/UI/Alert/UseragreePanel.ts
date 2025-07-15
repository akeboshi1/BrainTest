import { _decorator, Component, Node } from 'cc';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { BundleName } from '../../../Core/Manager/Load/BundleName';
import { TreatyView } from '../../../TreatyV2/TreatyView';
const { ccclass, property } = _decorator;

@ccclass('UseragreePanel')
export class UseragreePanel extends Component {
   
    start() {

    }

    update(deltaTime: number) {
        
    }
    
    handleXieyiClick() {
        UIManager.getInstance().registerPanel(TreatyView.NAME, BundleName.RESOURCES, '/prefabV2/treatyPrefab', TreatyView);
        UIManager.getInstance().showPanel(TreatyView.NAME,{
            flag:"XieYi"
        });
    }
    handlePrivacyClick(){
        UIManager.getInstance().registerPanel(TreatyView.NAME, BundleName.RESOURCES, '/prefabV2/treatyPrefab', TreatyView);
        UIManager.getInstance().showPanel(TreatyView.NAME,{
            flag:"Privacy"
        });
    }
}



import { _decorator, Component, Node } from 'cc';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { BundleName } from '../Core/Manager/Load/BundleName';
import { BasePanel } from '../Core/UI/BasePanel';
import { TreatyView } from '../TreatyV2/TreatyView';
import {XieYiPanel} from "db://assets/resources/scripts/Game/UI/Login/XieYiPanel";
const { ccclass, property } = _decorator;

@ccclass('MySetView')
export class MySetView extends BasePanel {
    public static NAME = 'MySetView';
    start() {

    }
    handleTreatClick(){
        // let xieyiFlagUrl="https://colapai.xinjiaxianglao.com/xieyi.html"
        // UIManager.getInstance().registerPanel(XieYiPanel.NAME, BundleName.RESOURCES, '/prefab/XieYiPanel', XieYiPanel);
        // UIManager.getInstance().showPanel(XieYiPanel.NAME,{
        //     url:xieyiFlagUrl
        // });
        // AlertManager.getInstance().closeCurrentAlert();
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

    showXieYi() {
        UIManager.getInstance().registerPanel(XieYiPanel.NAME, BundleName.RESOURCES, '/prefab/XieYiPanel', XieYiPanel);
        UIManager.getInstance().showPanel(XieYiPanel.NAME,{
             url:"https://beian.miit.gov.cn/"
        });
    }


    backToParent(){
        UIManager.getInstance().hidePanel(MySetView.NAME);
    }

    update(deltaTime: number) {
        
    }
}



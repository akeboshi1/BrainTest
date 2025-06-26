import { _decorator, Component, Node } from 'cc';
import { AlertManager } from '../Core/Manager/Alert/AlertManager';
import { XieYiPanel } from '../Game/UI/Login/XieYiPanel';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { BundleName } from '../Core/Manager/Load/BundleName';
import { BasePanel } from '../Core/UI/BasePanel';
const { ccclass, property } = _decorator;

@ccclass('MySetView')
export class MySetView extends BasePanel {
    public static NAME = 'MySetView';
    start() {

    }
    handleTreatClick(){
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
    backToParent(){
        UIManager.getInstance().hidePanel(MySetView.NAME);
    }

    update(deltaTime: number) {
        
    }
}



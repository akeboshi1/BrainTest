import { _decorator, Component, Node } from 'cc';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { BundleName } from '../Core/Manager/Load/BundleName';
import { BasePanel } from '../Core/UI/BasePanel';
import { TreatyView } from '../TreatyV2/TreatyView';
import {XieYiPanel} from "db://assets/resources/scripts/Game/UI/Login/XieYiPanel";
import {VerifyPanel} from "db://assets/resources/scripts/Game/UI/Login/VerifyPanel";
import {AlertData, AlertManager} from "db://assets/resources/scripts/Core/Manager/Alert/AlertManager";
import {LoginManager} from "db://assets/resources/scripts/Core/Manager/LoginManager/LoginManager";
import {EventManager} from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
import {SocketData} from "db://assets/resources/scripts/Core/Manager/Net/SocketData";
import {SocketManager} from "db://assets/resources/scripts/Core/Manager/Net/SocketManager";
const { ccclass, property } = _decorator;

@ccclass('MySetView')
export class MySetView extends BasePanel {
    public static NAME = 'MySetView';
    start() {

    }
    handleTreatClick(){
        UIManager.getInstance().registerPanel(XieYiPanel.NAME, BundleName.RESOURCES, '/prefab/XieYiPanel', XieYiPanel);
        UIManager.getInstance().showPanel(XieYiPanel.NAME,{
            url:"https://colapai.xinjiaxianglao.com/xieyi.html"
        });
        // UIManager.getInstance().registerPanel(TreatyView.NAME, BundleName.RESOURCES, '/prefabV2/treatyPrefab', TreatyView);
        // UIManager.getInstance().showPanel(TreatyView.NAME,{
        //     flag:"XieYi"
        // });
    }


    handlePrivacyClick(){
        UIManager.getInstance().registerPanel(XieYiPanel.NAME, BundleName.RESOURCES, '/prefab/XieYiPanel', XieYiPanel);
        UIManager.getInstance().showPanel(XieYiPanel.NAME,{
            url:"https://colapai.xinjiaxianglao.com/privacy.html"
        });
        // UIManager.getInstance().registerPanel(TreatyView.NAME, BundleName.RESOURCES, '/prefabV2/treatyPrefab', TreatyView);
        // UIManager.getInstance().showPanel(TreatyView.NAME,{
        //     flag:"Privacy"
        // });
    }

    showXieYi() {
        UIManager.getInstance().registerPanel(XieYiPanel.NAME, BundleName.RESOURCES, '/prefab/XieYiPanel', XieYiPanel);
        UIManager.getInstance().showPanel(XieYiPanel.NAME,{
             url:"https://beian.miit.gov.cn/"
        });
    }


    onClickDeletAccount(){
        const alertData: AlertData = new AlertData();
        alertData.title = "注销确认";
        alertData.message = "请您知情并理解，注销账号是不可逆的行为，当注销账号后，我们将停止为你提供任何服务并删除有关你账号的一切信息或对相关信息进行匿名化处理，因法律法规规定需要留存个人信息的，我们承诺将其单独存储，并不会将该信息用于日常业务活动中。";
        alertData.cancelButtonVisible = true;
        alertData.cancelButtonText = "取消";
        alertData.confirmButtonText = "确定注销";
        alertData.confirmCb = () => {
            EventManager.getInstance().on(LoginManager.sign_out,this.signOutCallBack,this,true);
            let socketData = new SocketData({action:LoginManager.sign_out});
            SocketManager.getInstance().send(socketData);
        };
        alertData.cancelCb = () => {
            // 取消操作，不需要做任何处理
        };
        AlertManager.getInstance().showAlert(alertData);
    }

    private signOutCallBack(data){
        if(data.status == 0){
            AlertManager.getInstance().showSocketAlert(data.message);
        }else{
            LoginManager.getInstance().loginout();
        }
    }


    backToParent(){
        UIManager.getInstance().hidePanel(MySetView.NAME);
    }

    update(deltaTime: number) {
        
    }
}



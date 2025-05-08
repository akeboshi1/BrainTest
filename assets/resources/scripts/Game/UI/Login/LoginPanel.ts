import { _decorator, Toggle, Node, Prefab} from 'cc';
import {BasePanel} from "../../../Core/UI/BasePanel";
import {UIManager} from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import {FrameComponent} from "db://assets/resources/scripts/Core/Component/FrameComponent";
import AlertManager, {AlertData} from "db://assets/resources/scripts/Core/Manager/Alert/AlertManager";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";
import { PhoneLoginPanel } from './PhoneLoginPanel';
import {UseragreePanel} from "db://assets/resources/scripts/Game/UI/Alert/UseragreePanel";
import { BundleName } from '../../../Core/Manager/Load/BundleName';
import { XieYiPanel } from './XieYiPanel';
const { ccclass, property } = _decorator;

@ccclass('LoginPanel')
export class LoginPanel extends BasePanel {

    @property(Node)
    loginBtn:Node;

    @property(Toggle)
    toggle:Toggle;

    @property(Node)
    roleContainer:Node;

    @property(FrameComponent)
    roleFrameComponent:FrameComponent;

    @property(Prefab)
    xieyiPrefab:Prefab;
    
    public static NAME: string = "LoginPanel";

    constructor() {
        super();
        this.name = LoginPanel.NAME;
    }

    onLoad() {
        this.roleFrameComponent.playAnimation("idle",30);
    }

    start(){
    }

    update(deltaTime: number) {

    }

    onDisable(): void {
    }

    onDestroy() {
      super.onDestroy();
    }

    /**
     * 点击协议显示协议面板
     */

    public loginClick(){
        if(!this.toggle.isChecked){
            let ad:AlertData = new AlertData();
            ad.title = "提示";
            ad.cancelButtonVisible=true;
            ad.cancelButtonText="不接受"
            ad.confirmButtonText="接受"
            ad.contentClickCb = this.showXieYi.bind(this);
            AlertManager.getInstance().showUserAgreeAlert(ad);
            ad.confirmCb = this.confirmHandler.bind(this);
            ad.cancelCb=this.cancelHandler.bind(this);
            return;
        }
        UIManager.getInstance().showPanel(PhoneLoginPanel.NAME);
    }
    cancelHandler(){
        AlertManager.getInstance().closeCurrentAlert();
    }
    // 显示协议
    showXieYi(){
        let xieyiFlagUrl="https://colapai.xinjiaxianglao.com/xieyi.html"
        UIManager.getInstance().registerPanel(XieYiPanel.NAME, BundleName.RESOURCES, '/prefab/XieYiPanel', XieYiPanel);
        UIManager.getInstance().showPanel(XieYiPanel.NAME,{
            url:xieyiFlagUrl
        });
    }
    showPrivacy(){
        let privacyUrl="https://colapai.xinjiaxianglao.com/privacy.html"
        UIManager.getInstance().registerPanel(XieYiPanel.NAME, BundleName.RESOURCES, '/prefab/XieYiPanel', XieYiPanel);
        UIManager.getInstance().showPanel(XieYiPanel.NAME,{
            url:privacyUrl
        });
    }

    private confirmHandler() {
        //todo
        DebugLog.instance.log("请点击确认协议");
        this.toggle.isChecked = true;
    }


}



import { _decorator, Toggle, Node} from 'cc';
import {BasePanel} from "../../../Core/UI/BasePanel";
import {UIManager} from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import {FrameComponent} from "db://assets/resources/scripts/Core/Component/FrameComponent";
import AlertManager, {AlertData} from "db://assets/resources/scripts/Core/Manager/Alert/AlertManager";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";
import { PhoneLoginPanel } from './PhoneLoginPanel';
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
    public xieyiClick() {
        let ad:AlertData = new AlertData();
        ad.title = "请查看具体协议";
        ad.message = "阅读并同意《电信服务协议》和\n《用户协议》和《隐私协议》";
        ad.confirmButtonText = "同意并继续";
        ad.cancelButtonVisible = true;
        ad.confirmCb = this.confirmHandler.bind(this);
        AlertManager.getInstance().showAlert(ad);
    }

    public loginClick(){
        if(!this.toggle.isChecked){
            let ad:AlertData = new AlertData();
            ad.title = "提示";
            ad.message = "请确认同意协议";
            AlertManager.getInstance().showAlert(ad);
            ad.cancelButtonVisible = false;
            ad.confirmCb = this.confirmHandler.bind(this);
            return;
        }
        UIManager.getInstance().showPanel(PhoneLoginPanel.NAME);
    }

    private confirmHandler() {
        //todo
        DebugLog.instance.log("请点击确认协议");
        this.toggle.isChecked = true;
    }


}



import { _decorator, Toggle, Node,VideoPlayer,find } from 'cc';
import {BasePanel} from "../../../Core/UI/BasePanel";
import {EventManager} from "../../../Core/Manager/Event/EventManager";
import {LoginManager} from "../../../Core/Manager/LoginManager/LoginManager";
import {UIManager} from "db://assets/scripts/Core/Manager/UI/UIManager";
import {FrameComponent} from "db://assets/scripts/Core/Component/FrameComponent";
import AlertManager, {AlertData} from "db://assets/scripts/Core/Manager/Alert/AlertManager";
import {DebugLog} from "db://assets/scripts/Core/Util/DebugLog";
import { LoginPopUpPanel } from './LoginPopUpPanel';
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
        EventManager.getInstance().off(UIManager.BACK_TO_PARENT,this);
    }

    onDestroy() {

    }

    /**
     * 点击协议显示协议面板
     */
    public xieyiClick() {
        EventManager.getInstance().on(UIManager.BACK_TO_PARENT,this.backClick,this);
        UIManager.getInstance().showPanel(LoginPopUpPanel.NAME,{switchView:true});
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
        EventManager.getInstance().on(UIManager.BACK_TO_PARENT,this.backClick,this);
        UIManager.getInstance().showPanel(PhoneLoginPanel.NAME);
    }

    private backClick(){
        EventManager.getInstance().off(UIManager.BACK_TO_PARENT,this);
    }

    private confirmHandler() {
        //todo
        DebugLog.instance.log("请点击确认协议");
    }


}



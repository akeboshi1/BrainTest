import { _decorator, Component, EditBox, Node, Toggle } from 'cc';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { TreatyView } from '../../../TreatyV2/TreatyView';
import { BundleName } from '../../../Core/Manager/Load/BundleName';
import { AlertData, AlertManager } from '../../../Core/Manager/Alert/AlertManager';
import { LoginManager } from '../../../Core/Manager/LoginManager/LoginManager';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { SceneManager } from '../../../Core/Manager/Scene/SceneManager';
import md5 from "./md5.js";
import { Md5 } from '../../../Core/Util/md5';
const { ccclass, property } = _decorator;

@ccclass('OrganizationPanel')
export class OrganizationPanel extends Component {
    @property(Node)
    institutionCode:Node;
    @property(Node)
    userCode:Node;
    @property(Node)
    password:Node;
    @property(Node)
    commitBtn:Node;
    @property(Toggle)
    toggle:Toggle;
    @property(Node)
    tips:Node;
    private institutionCodeValue:string = "";
    private userCodeValue:string = "";
    private passwordValue:string = "";
    start() {

    }
    onEnable(){
        EventManager.getInstance().on(LoginManager.LoginByInstitutionResult, this.onLoginByInstitutionResult, this);
    }
    onDisable(){
        EventManager.getInstance().off(LoginManager.LoginByInstitutionResult,  this);
    }
    onLoginByInstitutionResult(){
        SceneManager.getInstance().backToHall();
    }
    showXieYi() {
        UIManager.getInstance().registerPanel(TreatyView.NAME, BundleName.RESOURCES, '/prefabV2/treatyPrefab', TreatyView);
        UIManager.getInstance().showPanel(TreatyView.NAME,{
            flag:"XieYi"
        });
    }
    showPrivacy() {
        UIManager.getInstance().registerPanel(TreatyView.NAME, BundleName.RESOURCES, '/prefabV2/treatyPrefab', TreatyView);
        UIManager.getInstance().showPanel(TreatyView.NAME,{
            flag:"Privacy"
        });
    }
    private toggleClickHandler() {
        this.tips.active = this.toggle.isChecked;
    }
    institutionCodeChange(){
        let institutionCode = this.institutionCode.getComponent(EditBox);
        this.institutionCodeValue = institutionCode.string;
    }

    userCodeChange(){
        let userCode = this.userCode.getComponent(EditBox);
        this.userCodeValue = userCode.string;
    }
    passwordChange(){
        let password = this.password.getComponent(EditBox);
        this.passwordValue = password.string;
    }
    private confirmHandler() {
        this.toggle.isChecked = true;
        this.tips.active = false;
        // LoginManager.getInstance().requestLoginByInstitution(this.institutionCodeValue,this.userCodeValue,this.passwordValue);
    }
    commitBtnClick(){
        if (!this.toggle.isChecked) {
            let ad: AlertData = new AlertData();
            ad.title = "提示";
            ad.cancelButtonVisible = true;
            ad.cancelButtonText = "不接受"
            ad.confirmButtonText = "接受"
            ad.contentClickCb = this.showXieYi.bind(this);
            AlertManager.getInstance().showUserAgreeAlert(ad);
            ad.confirmCb = this.confirmHandler.bind(this);
            ad.cancelCb = this.cancelHandler.bind(this);
            return;
        }
        let md5Value = Md5.hashStr(this.passwordValue);
        LoginManager.getInstance().requestLoginByInstitution(this.institutionCodeValue,this.userCodeValue,md5Value);

    }

    cancelHandler(){
        
    }

    update(deltaTime: number) {
        
    }
}



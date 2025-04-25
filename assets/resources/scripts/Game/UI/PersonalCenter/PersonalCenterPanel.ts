import { _decorator, Label,profiler,Node} from 'cc';
import { EventManager } from '../../../Core/Manager/Event/EventManager';
import { PersonalCenterManager } from '../../PersonalCenterManager/PersonalCenterManager';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { UserInfoPanel } from './UserInfoPanel';
import { BundleName } from '../../../Core/Manager/Load/BundleName';
import { GenerateReport } from './GenerateReport';
import { LoginManager } from '../../../Core/Manager/LoginManager/LoginManager';
import FeatureTogglesSetting, { FeatureToggle } from '../../../FeatureTogglesSetting';

const { ccclass, property } = _decorator;

@ccclass('PersonalCenterPanel')
export class PersonalCenterPanel extends BasePanel {
    public static NAME: string = "PersonalCenterPanel";

    @property(Label)
    userName: Label = null;

    @property(Label)
    phoneNum: Label = null;

    @property(Node)
    vipNode: Node = null;

    @property(Node)
    kefuNode: Node = null;

    @property(Node)
    reportNode: Node = null;


    onEnable() {
        EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, this.getUserInfoCallBack, this);
        PersonalCenterManager.getInstance().requestUserInfo();
        this.initFeature();
    }

    initFeature(){
        this.vipNode.active = FeatureTogglesSetting.getInstance().getToggleValue(FeatureToggle.PersonalCenterVip);
        this.kefuNode.active = FeatureTogglesSetting.getInstance().getToggleValue(FeatureToggle.PersonalCenterKefu);
        this.reportNode.active = FeatureTogglesSetting.getInstance().getToggleValue(FeatureToggle.PersonalCenterReporter);
    }

    onDisable(): void {
        EventManager.getInstance().off(PersonalCenterManager.getUserInfoCallBack, this);
    }

    getUserInfoCallBack(data: any) {
        let userData = PersonalCenterManager.getInstance().userInfoData;
        let phoneNum = LoginManager.getInstance().phoneNum;
        if (userData.full_name) {
            this.setPhoneNum(phoneNum);
            this.setPersonalCenterTitle(userData.full_name.toString());
        } else {
            this.setPersonalCenterTitle("未设置昵称");
        }
    }
    setPhoneNum(title: string) {
        this.phoneNum.string = title;
    }
    setPersonalCenterTitle(title: string) {
        this.userName.string = title;
    }

    openMemoryNode(){
        if(profiler.isShowingStats()){
            profiler.hideStats();
        }else{
            profiler.showStats();
        }
    }

    backToParent() {
        UIManager.getInstance().hidePanel(PersonalCenterPanel.NAME);
    }

    update(deltaTime: number) {

    }

    showUserInfo() {
        UIManager.getInstance().registerPanel(UserInfoPanel.NAME, BundleName.RESOURCES, "prefab/personalCenter/UserInfoPanel", UserInfoPanel);
        UIManager.getInstance().showPanel(UserInfoPanel.NAME);
    }

    showReport() {

        UIManager.getInstance().registerPanel(GenerateReport.NAME, BundleName.RESOURCES, "prefab/personalCenter/GenerateReport", GenerateReport);
        UIManager.getInstance().showPanel(GenerateReport.NAME);
    }

    onClickLogOut() {
       LoginManager.getInstance().loginout();
    }
}



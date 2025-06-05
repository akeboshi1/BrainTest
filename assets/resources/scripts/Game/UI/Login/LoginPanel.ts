import { _decorator, Toggle, Node, Prefab,EditBox,Button,Sprite,resources,SpriteFrame} from 'cc';
import {BasePanel} from "../../../Core/UI/BasePanel";
import {UIManager} from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import AlertManager, {AlertData} from "db://assets/resources/scripts/Core/Manager/Alert/AlertManager";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";
import { BundleName } from '../../../Core/Manager/Load/BundleName';
import { XieYiPanel } from './XieYiPanel';
import {LoginManager} from "db://assets/resources/scripts/Core/Manager/LoginManager/LoginManager";
import {EventManager} from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
import {LoginPopUpPanel} from "db://assets/resources/scripts/Game/UI/Login/LoginPopUpPanel";
const { ccclass, property } = _decorator;

@ccclass('LoginPanel')
export class LoginPanel extends BasePanel {

    @property(Node)
    loginBtn:Node;

    @property(Toggle)
    toggle:Toggle;

    // @property(Node)
    // roleContainer:Node;

    // @property(FrameComponent)
    // roleFrameComponent:FrameComponent;

    @property(EditBox)
    phoneNumberEdit: EditBox;

    @property(Button)
    cleanNumberBtn:Button;


    @property(Prefab)
    xieyiPrefab:Prefab;
    
    public static NAME: string = "LoginPanel";

    constructor() {
        super();
        this.name = LoginPanel.NAME;
    }

    onLoad() {
        // this.roleFrameComponent.playAnimation("idle",30);
    }

    start() {
        if (this.phoneNumberEdit.node) {
            this.phoneNumberEdit.node.on(Node.EventType.TOUCH_END, this.checkBoxHandler, this);
        }
    }

    onDisable() {
        if (this.phoneNumberEdit.node) this.phoneNumberEdit.node.off(Node.EventType.TOUCH_END, this.checkBoxHandler);
    }
    onDestroy() {
      super.onDestroy();
    }

    private checkBoxHandler(evt: Event) {
        this.phoneNumberEdit.setFocus();
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
        const phoneNum = this.phoneNumberEdit.string;
        LoginManager.getInstance().phoneNum = phoneNum;

        // 添加监听
        let self = this;
        EventManager.getInstance().on('login.send_mp_code', (data) => {
            if (data['status'] == 0) {
                // 请求失败，不进行操作
                return;
            }
            // 请求成功，显示验证码面板
            UIManager.getInstance().showPanel(LoginPopUpPanel.NAME, { switchView: false });
        }, this, true);

        // 发送验证码请求
        LoginManager.getInstance().requestSendMpCode(phoneNum);
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

    /**
     * editbox change
     */
    public textChange() {
        let btnSprite = this.loginBtn.getComponent(Sprite);
        let url = "";
        if (this.phoneNumberEdit.string.length > 0) {
           url = "textureV2/component/componentnormalbg/spriteFrame";
        } else {
            url = "textureV2/component/componentbg/spriteFrame";
        }
        resources.load(url, SpriteFrame,(err,sp)=>{
            if(err){
                DebugLog.instance.error(err);
                return;
            }
            btnSprite.spriteFrame  = sp;
        });
    }

    public cleanNumber() {
        this.phoneNumberEdit.string = "";
        this.textChange();
    }


}



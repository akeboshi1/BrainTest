import { _decorator, Component, Node,Label,Button,EditBox } from 'cc';
import {BasePanel} from "../../../Core/UI/BasePanel";
import {DebugLog} from "db://assets/scripts/Core/Util/DebugLog";
import {SocketManager} from "db://assets/scripts/Core/Manager/Net/SocketManager";
import {EventManager} from "db://assets/scripts/Core/Manager/Event/EventManager";
const { ccclass, property } = _decorator;

@ccclass('LoginPopUpPanel')
export class LoginPopUpPanel extends BasePanel{

    //==== XieyiView
    @property(Node)
    XieyiView:Node;

    @property(Label)
    XieyiTitleTxt:Label;

    @property(Label)
    XieyiDescTxt:Label;

    @property(Button)
    AgreeButton:Button;

    @property(Button)
    CancelButton:Button;

    //==== PhoneView

    @property(Node)
    PhoneView:Node;

    @property(Label)
    PhoneViewTitle:Label;

    @property(Label)
    PhoneDescTxt:Label;

    @property(EditBox)
    num0:EditBox;

    @property(EditBox)
    num1:EditBox;

    @property(EditBox)
    num2:EditBox;

    @property(EditBox)
    num3:EditBox;

    private login_send_mp_code:string="login.send_mp_code";
    private login_login_by_mp:string ="login.login_by_mp";

    constructor() {
        super();
        LoginPopUpPanel.NAME = "LoginPopUpPanel";
    }

    onLoad() {

    }

    start() {
        this._switchView();
    }

    onEnable(){
        this.addListener();
    }

    onDisable(){
        this.removeListener();
    }

    bgClick(){
        this.hidePanel();
    }

    agreeClick(){
        SocketManager.getInstance().send({"action": "login.send_mp_code", "data": {"mp_no": "12345678901"}});
        this._switchView(true);
    }

    cancelClick(){
        this.hidePanel()
    }

    private _switchView(isPhoneView:boolean=false){
       this.XieyiView.active= !isPhoneView;
       this.PhoneView.active = isPhoneView;
       if(isPhoneView){
           this._initPhoneView();
       }else{
           this._initXieyiView();
       }
    }

    private _initPhoneView(){
        this.num0.string = "1";
        this.num1.string = "2";
        this.num2.string = "3";
        this.num3.string = "4";

        SocketManager.getInstance().send({"action": "login.login_by_mp", "data": {"mp_no": "12345678901", "code": "1234"}});
    }

    private _initXieyiView(){

    }

    private addListener(){
        EventManager.getInstance().on(this.login_send_mp_code,this.login_send_mp_codeHandler,this);
        EventManager.getInstance().on(this.login_login_by_mp,this.login_login_by_mpHandler,this);
    }

    private removeListener(){
        EventManager.getInstance().off(this.login_send_mp_code,this);
        EventManager.getInstance().off(this.login_login_by_mp,this);
    }

    private login_send_mp_codeHandler(data,context){
        DebugLog.instance.log(data.message);
    }

    private login_login_by_mpHandler(data,context){
        DebugLog.instance.log(data.message);
    }



}
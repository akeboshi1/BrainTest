import { _decorator, Component, Node,Label,Button,EditBox } from 'cc';
import {BasePanel} from "../../../Core/UI/BasePanel";
import {DebugLog} from "../../../Core/Util/DebugLog";
import {EventManager} from "../../../Core/Manager/Event/EventManager";
import {UIManager} from "../../../Core/Manager/UI/UIManager";
import {SocketData} from "../../../Core/Manager/Net/SocketData";
import {LoginPanel} from "../../../Game/UI/Login/LoginPanel";
import {TaskManager} from "../../../Game/Task/TaskManager";
import {LoginManager} from "../../../Core/Manager/LoginManager/LoginManager";
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";
import {SkewersManager} from "db://assets/scripts/Game/Task/Skewers/SkewersManager";
import { SceneManager } from '../../../Core/Manager/Scene/SceneManager';
import {UserData} from "db://assets/scripts/Core/Data/UserData";

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
    PhoneNumberTxt:Label;

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

    @property({type:[EditBox]})
    numBox:EditBox[]=[];

    /**
     * 手机验证码下发
     * @private
     */
    private login_send_mp_code:string="login.send_mp_code";

    /**
     * 手机登录（验证)
     * @private
     */
    private login_login_by_mp:string ="login.login_by_mp";

    private phoneNumber:string = "13611613393";
    private phoneCode:string="1234";

    constructor() {
        super();
        LoginPopUpPanel.NAME = "LoginPopUpPanel";
        this.name = LoginPopUpPanel.NAME;
    }

    onLoad() {

    }

    start() {

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
        this.phoneNumber = Global.userData.phoneNumber;
        EventManager.getInstance().on(this.login_send_mp_code,this.requestCodeCallBack,this);
        LoginManager.getInstance().request(this.login_send_mp_code, {"mp_no": this.phoneNumber});
    }

    cancelClick(){
        UIManager.getInstance().showView(LoginPanel.NAME,this.node.parent);
        this.hidePanel();
    }

    public switchView(isPhoneView:boolean=false){
       this.XieyiView.active= !isPhoneView;
       this.PhoneView.active = isPhoneView;
       if(isPhoneView){
           this._initPhoneView();
       }else{
           this._initXieyiView();
       }
    }

    public updateView(isPhoneView:boolean=false){
        this.XieyiView.active= !isPhoneView;
        this.PhoneView.active = isPhoneView;
        if(isPhoneView){
            this._updatePhoneView();
        }else{
            this._updateXieyiView();
        }
    }

    private _initPhoneView(){
        this.agreeClick();
    }

    private _updatePhoneView(){
        let numbers: number[] = this.phoneCode.split("").map(Number);
        let len = numbers.length;
        for(let i=0;i<len;i++){
            let editBox = this.numBox[i];
            if(editBox == null)continue;
            editBox.string = numbers[i]+"";
        }
         this.PhoneNumberTxt.string = this.phoneNumber;
// this.num0.string = "1";
// this.num1.string = "2";
// this.num2.string = "3";
// this.num3.string = "4";
        EventManager.getInstance().on(this.login_login_by_mp,this.requestLoginCallBack,this);
        LoginManager.getInstance().request(this.login_login_by_mp, {"mp_no": this.phoneNumber, "code": this.phoneCode});
    }

    private _initXieyiView(){

    }

    private _updateXieyiView(){}

    private addListener(){
    //     EventManager.getInstance().on(this.login_send_mp_code,this.requestCodeCallBack,this);
    //     EventManager.getInstance().on(this.login_login_by_mp,this.requestLoginCallBack,this);
    }
    //
    private removeListener(){
    //     EventManager.getInstance().off(this.login_send_mp_code,this);
    //     EventManager.getInstance().off(this.login_login_by_mp,this);
    }

    private requestLoginCallBack(data,context){
        EventManager.getInstance().off(this.login_login_by_mp,this);
        DebugLog.instance.log(data);
        if(data['status']==0){
            DebugLog.instance.error(`请求${data['action']}失败，请重新再试`);
            return;
        }

        if(data['data']['mp_no'] != this.phoneNumber){
            DebugLog.instance.error(`${data['data']['mp_no']} 手机号不匹配`);
            return;
        }
        Global.userData.token = data.data['token'];
        DebugLog.instance.log(`${data} ====`);
        Global.userData.tokenExpires = data.data['expires'];
        context.PhoneDescTxt.string="登录成功！！！";

        // test
        // TaskManager.getInstance().start();

        // test chat 打开游戏大厅scene
        SceneManager.getInstance().backToHall();
        // UIManager.getInstance().hideView(LoginPopUpPanel.NAME);
    }

    private requestCodeCallBack(data,context){
        EventManager.getInstance().off(this.login_send_mp_code,this);
        DebugLog.instance.log(data);
        if(data['status']==0){
            DebugLog.instance.error(`请求${data['action']}失败，${data.message}`);
            // test code
            this.phoneCode = "1234";
            context.switchView(true);
            return;
        }

        this.phoneNumber = data['data']['mp_no'];
        this.phoneCode = data['data']['code'];
        context.updateView(true);
    }



}
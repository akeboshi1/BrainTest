import { _decorator, Component, Node,Label,Button } from 'cc';
import {BasePanel} from "../../../Core/UI/BasePanel";
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

    @property(Node)
    PhoneGroupNode:Node;


    constructor() {
        super();
        LoginPopUpPanel.NAME = "LoginPopUpPanel";
    }

    onLoad() {
        this.XieyiView.active = true;
    }

    bgClick(){
        this.hidePanel();
    }

    agreeClick(){

    }

    cancelClick(){
        this.hidePanel()
    }



}
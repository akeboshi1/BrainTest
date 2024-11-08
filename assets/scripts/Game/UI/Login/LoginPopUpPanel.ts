import { _decorator, Component, Node } from 'cc';
import {BasePanel} from "../../../Core/UI/BasePanel";
const { ccclass, property } = _decorator;

@ccclass('LoginPopUpPanel')
export class LoginPopUpPanel extends BasePanel{

    @property(Node)
    Xieyiview:Node;

    @property(Node)
    PhoneView:Node;



    constructor() {
        super();
        LoginPopUpPanel.NAME = "LoginPopUpPanel";
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
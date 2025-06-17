import {BasePanel} from "db://assets/resources/scripts/Core/UI/BasePanel";

import {_decorator, Label,Node, ScrollView } from "cc";
import { SceneManager } from "../../../Core/Manager/Scene/SceneManager";
const { ccclass, property } = _decorator;


@ccclass('VipPanel')
export class VipPanel extends BasePanel {

    //===== 通用
    @property(Node)
    backBtn: Node;

    @property(Label)
    titleLable:Label;

    @property(Label)
    descLabel:Label;

    @property(Label)
    detailLabel:Label;
    
    @property(Node)
    renewalBtn:Node;

    @property(Label)
    renewalBtnLabel:Label;

    @property(Node)
    childNode:Node;

    @property(ScrollView)
    scrollView:ScrollView;

    //===== 会员类型
    @property(Node)
    typeNode:Node;

    @property(Node)
    mouthBtn:Node

    @property(Label)
    mouthNameLabel:Label;

    @property(Label)
    mouthPriceLabel:Label;

    @property(Node)
    yearBtn:Node;

    @property(Label)
    yearNameLabel:Label;

    @property(Label)
    yearPriceLabel:Label;

    @property(Label)
    selectLabel:Label;

    //===== 权益
    @property(Node)
    quanyiNode:Node;


    public static NAME: string = "VipPanel";

    constructor() {
        super();
        this.name = VipPanel.NAME;
    }

    onLoad(): void {
    }

    start(){
    }

    onEnable(): void {
    }

    onDisable(): void {
    }

    onDestroy(): void {
    }

    backHandler(){
        SceneManager.getInstance().backToHall();
    }



}
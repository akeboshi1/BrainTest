import { _decorator, Sprite, Node,SpriteFrame,sp } from 'cc';
import {BasePanel} from "../../../Core/UI/BasePanel";
import {EventManager} from "../../../Core/Manager/Event/EventManager";
import {LoginManager} from "../../../Core/Manager/LoginManager/LoginManager";
import {LoaderManager} from "../../../Core/Manager/Load/LoaderManager";
import {Global} from "../../../Core/Manager/Config/Global";
import {UIManager} from "../../../Core/Manager/UI/UIManager";
import {LoginPopUpPanel} from "../../../Game/UI/Login/LoginPopUpPanel";
const { ccclass, property } = _decorator;

@ccclass('LoginPanel')
export class LoginPanel extends BasePanel {

    public spineActions:string[]=["angry","angry_walk","appear","happy","happy_walk","normal","normal_idle","smile","smile_walk","unhappy"];

    @property(Node)
    loginBtn:Node;

    @property(Node)
    toggle:Node;

    @property(Node)
    roleContainer:Node;

    @property(Sprite)
    roleSprite:Sprite;

    // @property({tooltip: "这是序列帧数组", type: [SpriteFrame]})
    // spriteFrames:SpriteFrame[] = [];

    @property({tooltip:"spine皮肤", type:sp.Skeleton })
    spine: sp.Skeleton | null = null;

    constructor() {
        super();
        LoginPanel.NAME ="LoginPanel";
        this.name = LoginPanel.NAME;
    }

    onLoad() {
        const eventName = LoginPanel.NAME;
        EventManager.getInstance().on(eventName,this.loadPanelComplete,this);
        EventManager.getInstance().emit(eventName,eventName);
        super.onLoad();


    }

    onEnable() {

    }

    onDisable() {

    }


    update(deltaTime: number) {

    }

    onDestroy() {

    }

    private changeSpineAction() {
        let spineIndex = Math.floor(Math.random()*this.spineActions.length);
        const actionName = this.spineActions[spineIndex];
        this.spine.setAnimation(0,actionName,true);
    }


    /**
     * 点击协议显示协议面板
     */
    public xieyiClick() {
        LoginManager.getInstance().showXieyi(this.node);
    }

    public loginClick(){
        LoginManager.getInstance().showPhoneView(this.node);
    }

    private loadPanelComplete(){
        EventManager.getInstance().off(LoginPanel.NAME,this);
    }

    public spineClick(){
        this.changeSpineAction();
    }
}



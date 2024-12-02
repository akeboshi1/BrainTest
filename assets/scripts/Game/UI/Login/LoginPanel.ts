import { _decorator, Sprite, Node,VideoPlayer,find } from 'cc';
import {BasePanel} from "../../../Core/UI/BasePanel";
import {EventManager} from "../../../Core/Manager/Event/EventManager";
import {LoginManager} from "../../../Core/Manager/LoginManager/LoginManager";
import {PhoneLoginPanel} from "db://assets/scripts/Game/UI/Login/PhoneLoginPanel";
import {UIManager} from "db://assets/scripts/Core/Manager/UI/UIManager";
const { ccclass, property } = _decorator;

@ccclass('LoginPanel')
export class LoginPanel extends BasePanel {

    public spineActions:string[]=["angry","angry_walk","appear","happy","happy_walk","normal","normal_idle","smile","smile_walk","unhappy"];

    public actions:string[]=["idle","speak"];
    @property(Node)
    loginBtn:Node;

    @property(Node)
    toggle:Node;

    @property(Node)
    roleContainer:Node;

    @property(Sprite)
    roleSprite:Sprite;

    @property(VideoPlayer)
    video:VideoPlayer;

    // @property({tooltip: "这是序列帧数组", type: [SpriteFrame]})
    // spriteFrames:SpriteFrame[] = [];

    // @property({tooltip:"spine皮肤", type:sp.Skeleton })
    // spine: sp.Skeleton | null = null;

    private canvas;
    constructor() {
        super();
        LoginPanel.NAME ="LoginPanel";
        this.name = LoginPanel.NAME;
    }

    onLoad() {
        const eventName = LoginPanel.NAME;
        EventManager.getInstance().on(eventName,this.loadPanelComplete,this);
        EventManager.getInstance().emit(eventName,eventName);



        // let canvas = find("Canvas");
        // canvas.on(Node.EventType.TOUCH_END,this.playVideo,this)
        // SpineManager.getInstance().init(this.spine);
    }

    start(){
        this.canvas = find("Canvas");
        this.canvas.on(Node.EventType.TOUCH_END,this.playVideo,this);
        //this.video.node.on(VideoPlayer.EventType.READY_TO_PLAY,this.playVideo,this);
    }

    private playVideo(){
        this.canvas.off(Node.EventType.TOUCH_END,this);
        this.video.play();
    }

    resume(){
        this.video.node.active = true;
    }

    onEnable() {
        this.video.node.active = true;
    }

    onDisable() {
      this.video.node.active = false;
    }


    update(deltaTime: number) {

    }

    onDestroy() {

    }



    /**
     * 点击协议显示协议面板
     */
    public xieyiClick() {
        this.video.node.active = false;
        EventManager.getInstance().on(UIManager.BACK_TO_PARENT,this.backClick,this);
        LoginManager.getInstance().showXieyi(this.node);
    }

    public loginClick(){
        this.video.node.active = false;
        EventManager.getInstance().on(UIManager.BACK_TO_PARENT,this.backClick,this);
        LoginManager.getInstance().showPhoneLoginPanel(this.node);
    }

    private backClick(){
        EventManager.getInstance().off(UIManager.BACK_TO_PARENT,this);
        this.video.node.active = true;
        this.video.play();
    }

    private loadPanelComplete(){
        EventManager.getInstance().off(LoginPanel.NAME,this);
    }



}



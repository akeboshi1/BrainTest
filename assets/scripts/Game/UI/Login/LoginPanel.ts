import { _decorator, Sprite, Node,SpriteFrame,instantiate } from 'cc';
import {BasePanel} from "../../../Core/UI/BasePanel";
import {EventManager} from "../../../Core/Manager/Event/EventManager";
import {LoaderManager} from "../../../Core/Manager/Load/LoaderManager";
import { DebugLog } from '../../../Core/Util/DebugLog';
import {SceneManager} from "../../../Core/Manager/Scene/SceneManager";
import {SocketManager} from "../../../Core/Manager/Net/SocketManager";
import {UIManager} from "../../../Core/Manager/UI/UIManager";
import {LoginPopUpPanel} from "db://assets/scripts/Game/UI/Login/LoginPopUpPanel";
import {timerComponent} from "db://assets/puzzleGame/scripts/timerComponent";
const { ccclass, property } = _decorator;

@ccclass('LoginPanel')
export class LoginPanel extends BasePanel {


    @property(Node)
    loginBtn:Node;

    @property(Node)
    toggle:Node;

    @property(Node)
    roleContainer:Node;

    @property(Sprite)
    roleSprite:Sprite;

    @property({tooltip: "这是序列帧数组", type: [SpriteFrame]})
    spriteFrames:SpriteFrame[] = [];

    private currentFrameIndex = 0;

    private changeInterval:number=0;

    constructor() {
        super();
        LoginPanel.NAME ="LoginPanel";
        this.name = LoginPanel.NAME;
    }

    start() {
        super.start();
    }

    onLoad() {
        const eventName = LoginPanel.NAME;
        EventManager.getInstance().on(eventName,this.loadPanelComplete,this);
        EventManager.getInstance().emit(eventName,eventName);
        super.onLoad();

        // 初始化计时器
        this.currentFrameIndex = 0;
        this.schedule(this.changeSpriteFrame, this.changeInterval);
    }

    update(deltaTime: number) {

    }

    onDestroy() {
        // 取消计时器
        this.unschedule(this.changeSpriteFrame);
    }

    private changeSpriteFrame() {
        // 更新 SpriteFrame
        if (this.spriteFrames.length === 0) return;

        this.roleSprite.spriteFrame = this.spriteFrames[this.currentFrameIndex];

        // 更新索引，循环播放
        this.currentFrameIndex = (this.currentFrameIndex + 1) % this.spriteFrames.length;
    }



    public loginClick(){
        let self =this;
        LoaderManager.getInstance().resourcesLoad("prefab/LoginPopUpPanel").then((resource)=>{
            const node = instantiate(resource);
            UIManager.getInstance().registerView(LoginPopUpPanel.NAME,node);
            const parendNode = self.node.parent;
            UIManager.getInstance().showView(LoginPopUpPanel.NAME,parendNode);
            UIManager.getInstance().hideView(LoginPanel.NAME);
        });
    }

    private loadPanelComplete(){
        EventManager.getInstance().off(LoginPanel.NAME,this);
    }
}



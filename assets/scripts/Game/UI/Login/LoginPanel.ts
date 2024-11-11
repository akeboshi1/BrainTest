import { _decorator, Component, Node,instantiate } from 'cc';
import {BasePanel} from "../../../Core/UI/BasePanel";
import {EventManager} from "../../../Core/Manager/Event/EventManager";
import {LoaderManager} from "../../../Core/Manager/Load/LoaderManager";
import { DebugLog } from '../../../Core/Util/DebugLog';
import {SceneManager} from "../../../Core/Manager/Scene/SceneManager";
import {SocketManager} from "../../../Core/Manager/Net/SocketManager";
import {UIManager} from "../../../Core/Manager/UI/UIManager";
import {LoginPopUpPanel} from "db://assets/scripts/Game/UI/Login/LoginPopUpPanel";
const { ccclass, property } = _decorator;

@ccclass('LoginPanel')
export class LoginPanel extends BasePanel {


    @property(Node)
    loginBtn:Node;

    constructor() {
        super();
        LoginPanel.NAME ="LoginPanel";
    }

    start() {
        super.start();
    }

    onLoad() {
        const eventName = LoginPanel.NAME;
        EventManager.getInstance().on(eventName,this.loadPanelComplete,this);
        EventManager.getInstance().emit(eventName,eventName);
        super.onLoad();
    }

    update(deltaTime: number) {
        
    }

    get name():string{
        return LoginPanel.NAME;
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



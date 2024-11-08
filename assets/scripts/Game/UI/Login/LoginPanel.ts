import { _decorator, Component, Node } from 'cc';
import {BasePanel} from "../../../Core/UI/BasePanel";
import {EventManager} from "../../../Core/Manager/Event/EventManager";
import {LoaderManager} from "../../../Core/Manager/Load/LoaderManager";
import { DebugLog } from '../../../Core/Util/DebugLog';
import {SceneManager} from "../../../Core/Manager/Scene/SceneManager";
import {SocketManager} from "../../../Core/Manager/Net/SocketManager";
import {UIManager} from "db://assets/scripts/Core/Manager/UI/UIManager";
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
        var json = JSON.stringify({"action": 5, "data": {
                "request_id": "123456",
                "username": "user",
                "password": "e10adc3949ba59abbe56e057f20f883e"
            }
        })
        SocketManager.getInstance().send(json);
        console.log('loginClick');
        UIManager.getInstance().hideView(LoginPanel.NAME);
        // LoaderManager.getInstance().assetBundleLoad('subBundle',"subBundle").then(()=>{
        //        DebugLog.instance.log("subBundle 111");
        //        SceneManager.getInstance().changeScene("ai",(data)=>{
        //           DebugLog.instance.log("loadScene success",data);
        //        });
        // });
    }

    private loadPanelComplete(){
        EventManager.getInstance().off(LoginPanel.NAME,this);
    }
}



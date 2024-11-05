import { _decorator, Component, Node } from 'cc';
import {BasePanel} from "db://assets/scripts/Core/BasePanel";
import {EventManager} from "db://assets/scripts/Core/Event/EventManager";
const { ccclass, property } = _decorator;

@ccclass('LoginPanel')
export class LoginPanel extends BasePanel {

    public static NAME = 'LoginPanel';


    @property(Node)
    loginBtn:Node;

    private socket;

    start() {

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

    public startClick(){
        this.loginBtn.active
        this.socket = new WebSocket("wss://test.paipai2.xinjiaxianglao.com/api/home");
        this.socket.onopen = () => {
            console.log('socket open');
        }
        this.socket.onclose = () => {
            console.log('socket close');
        }
        this.socket.onmessage = (data) => {
            console.log(data);
        }
        this.socket.onerror = (err) => {
            console.log(err);
        }
        console.log('clicked');
    }

    public loginClick(){
        var json = JSON.stringify({"action": 5, "data": {
                "request_id": "123456",
                "username": "user",
                "password": "e10adc3949ba59abbe56e057f20f883e"
            }
        })
        this.socket.send(json);
        console.log('loginClick');
    }

    private loadPanelComplete(){
        EventManager.getInstance().off(LoginPanel.NAME,this);
    }
}



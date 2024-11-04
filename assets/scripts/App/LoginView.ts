import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LoginView')
export class LoginView extends Component {

    @property(Node)
    loginBtn:Node;

    private socket;

    start() {

    }

    update(deltaTime: number) {
        
    }

    public startClick(){
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
}



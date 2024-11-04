import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LoginView')
export class LoginView extends Component {

    @property(Node)
    loginBtn:Node;

    start() {

    }

    update(deltaTime: number) {
        
    }

    public startClick(){
        console.log('clicked');
    }

    public loginClick(){
        console.log('loginClick');
    }
}



import { _decorator, Component,Camera,game } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('App')
export class App extends Component {

    @property(Camera)
    camera: Camera;

    start() {
        // 将调试信息隐藏

    }

    update(deltaTime: number) {
        
    }
}



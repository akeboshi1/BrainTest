import { _decorator, Component,Camera,profiler } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('App')
export class App extends Component {

    @property(Camera)
    camera: Camera;

    onLoad(){
        // 将调试信息隐藏
        profiler.hideStats();
        console.log('onLoad');
    }

    start() {
    }

    update(deltaTime: number) {
        
    }
}



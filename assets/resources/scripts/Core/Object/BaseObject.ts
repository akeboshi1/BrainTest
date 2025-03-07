
import { _decorator, Component, profiler } from 'cc';
const { ccclass, property } = _decorator;

export class BaseObejct extends Component{


    constructor() {
        super();
    }

    onLoad(){
        // 将调试信息隐藏
        profiler.hideStats();
    }


}
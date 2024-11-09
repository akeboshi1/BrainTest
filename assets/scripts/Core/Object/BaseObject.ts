
import { _decorator, Component, profiler,tween,Vec3 } from 'cc';
import {SceneManager} from "../Manager/Scene/SceneManager";
import {UIManager} from "../Manager/UI/UIManager";
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
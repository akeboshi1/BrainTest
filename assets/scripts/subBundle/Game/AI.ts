import {_decorator,Component} from "cc";
import {BaseObejct} from "../../Core/Object/BaseObject";

const { ccclass, property } = _decorator;

@ccclass('AI')
export class AI extends BaseObejct{

    onLoad(){

    }

    start(){
        console.log("Submodule AI Start");
    }
}
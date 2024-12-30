import {Node} from "cc";
import {GuideManager, GuideState} from "db://assets/scripts/Core/Manager/Guide/GuideManager";

export class BaseGuide {
    public static NAME:string;
    protected _state:GuideState;

    constructor() {
        this._state = GuideState.Init;
    }

    public get state():GuideState{
        return this._state;
    }

    public set state(state:GuideState) {
        this._state = state;
    }

    public start(data:any = null){
       this._state = GuideState.processing;
    }

    public step(node:Node = null){

    }

    public pause(){
       this._state = GuideState.pause;
    }

    public resume(){
        this._state = GuideState.processing;
    }

    public end(){
       this._state = GuideState.complete;
    }
}
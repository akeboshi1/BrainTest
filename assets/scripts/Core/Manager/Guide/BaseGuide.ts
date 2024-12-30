import {Node} from "cc";
import {GuideState} from "db://assets/scripts/Core/Manager/Guide/GuideManager";
import {DebugLog} from "db://assets/scripts/Core/Util/DebugLog";

export class BaseGuide {
    public static NAME:string;
    protected _state:GuideState;

    constructor() {
        this._state = GuideState.Init;
    }

    public get name():string{
        return BaseGuide.NAME;
    }

    public set name(value:string){

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
        DebugLog.instance.log(`${this.name} 引导暂停`);
    }

    public resume(){
        this._state = GuideState.processing;
        DebugLog.instance.log(`${this.name} 引导恢复`);
    }

    public end(event=null){
       this._state = GuideState.complete;


    }
}
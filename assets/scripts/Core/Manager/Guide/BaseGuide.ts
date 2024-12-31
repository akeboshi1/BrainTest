import {Node} from "cc";
import {GuideState} from "db://assets/scripts/Core/Manager/Guide/GuideManager";
import {DebugLog} from "db://assets/scripts/Core/Util/DebugLog";

export class BaseGuide {
    public static NAME:string;
    protected _state:GuideState;

    protected constructor() {
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

    public start(data:any = null,name:string = null){
       this._state = GuideState.processing;
       this.name = name;
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
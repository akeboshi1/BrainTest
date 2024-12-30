import {Node,Sprite,UITransform,find,instantiate} from "cc";
import {BaseManager} from "db://assets/scripts/Core/Manager/BaseManager";
import {BaseGuide} from "db://assets/scripts/Core/Manager/Guide/BaseGuide";
import {LoaderManager} from "db://assets/scripts/Core/Manager/Load/LoaderManager";
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";
import {GuideFindingGuide} from "db://assets/scripts/Core/Manager/Guide/game/FindingGuide";
import {DebugLog} from "db://assets/scripts/Core/Util/DebugLog";

export enum GuideState{
    Init,
    processing,
    pause,
    complete
}


export class GuideManager extends BaseManager{
    private static _instance: GuideManager;
    public static getInstance() {
        if(!GuideManager._instance) {
            GuideManager._instance = new GuideManager();
        }
        return GuideManager._instance;
    }

    private _handNode:Node = null;

    /**
     * 手型特效
     */
    public get handNode():Node{
        return this._handNode;
    };

    public set handNode(value:Node){
        this._handNode = value;
    }

    private _map:Map<string,BaseGuide> = new Map();

    public init(){
        let self = this;
        LoaderManager.getInstance().resourcesLoadPrefab(Global.RES_Root + "prefab/hand/handPrefab").then((res)=>{
             self.handNode = instantiate(res);
             self._initGuideData();
        });
    }

    private _initGuideData():void{
        this._map.set(GuideFindingGuide.NAME,new GuideFindingGuide());
    }


    public start(name:string,data = null):BaseGuide {
        let guide = this._map.get(name);
        if(!guide){
            DebugLog.instance.error(`${name} 引导不存在`);
            return null;
        }

        guide.start(data);
        return guide;
    }

    public pause(name:string):BaseGuide{
       let guide = this._map.get(name);
       if(!guide){
           return null;
       }
       guide.pause();
       return guide;
    }

    public resume(name:string):BaseGuide{
        let guide = this._map.get(name);
        if(!guide){
            return null;
        }
        guide.resume();
        return guide;
    }

    public end(name:string):BaseGuide {
        let guide = this._map.get(name);
        if(!guide){
            DebugLog.instance.error(`${name} 引导不存在`);
            return null;
        }
        guide.end();
        return guide;
    }
}
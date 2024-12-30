import {Node,Sprite,UITransform,Prefab,instantiate} from "cc";
import {BaseManager} from "db://assets/scripts/Core/Manager/BaseManager";
import {BaseGuide} from "db://assets/scripts/Core/Manager/Guide/BaseGuide";
import {LoaderManager} from "db://assets/scripts/Core/Manager/Load/LoaderManager";
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";
import {FindingGuide} from "db://assets/scripts/Core/Manager/Guide/game/FindingGuide";
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
    private _curGuide:BaseGuide = null;
    public handPrefab:Prefab = null;
    /**
     * 手型特效
     */
    public get handNode():Node{
        if(this._handNode == null){
            this._handNode = instantiate(this.handPrefab);
        }
        return this._handNode;
    };

    public set handNode(value:Node){
        this._handNode = value;
    }

    public get curGuide():BaseGuide{
        return this._curGuide;
    }

    public getGuide(name):BaseGuide{
        return this._map.get(name);
    }
    private _map:Map<string,BaseGuide> = new Map();

    public init(){
        let self = this;
        LoaderManager.getInstance().resourcesLoadPrefab(Global.RES_Root + "prefab/hand/handPrefab").then((res)=>{
             self.handPrefab = res;
             self.handNode = instantiate(res);
             self._initGuideData();
        });
    }

    private _initGuideData():void{
        this._map.set(FindingGuide.NAME,new FindingGuide());
    }


    public start(name:string,data = null):BaseGuide {
        let guide = this._map.get(name);
        if(!guide){
            DebugLog.instance.error(`${name} 引导不存在`);
            return null;
        }
        guide.start(data,name);
        this._curGuide = guide;
        this._curGuide.name = name;
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
        this.handNode = null;
        let guide = this._map.get(name);
        if(!guide){
            DebugLog.instance.error(`${name} 引导不存在`);
            return null;
        }
        this._curGuide = null;
        return guide;
    }

    public destory() {
        this._map.clear();
        this._curGuide = null;
    }

    /**
     * 强制退出游戏
     */
    public quitGame(){
       if(this._curGuide){
           GuideManager._instance.end(this._curGuide.name);
       }
    }
}
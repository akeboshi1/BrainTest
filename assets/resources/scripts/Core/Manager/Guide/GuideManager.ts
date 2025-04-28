import {Node,Sprite,UITransform,Prefab,instantiate, resources} from "cc";
import {BaseManager} from "db://assets/resources/scripts/Core/Manager/BaseManager";
import {BaseGuide} from "db://assets/resources/scripts/Core/Manager/Guide/BaseGuide";
import {FindingGuide} from "db://assets/resources/scripts/Core/Manager/Guide/game/FindingGuide";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";
import {GuideHand} from "db://assets/resources/scripts/Core/Manager/Guide/GuideHand";
import {CatchFishGuide} from "db://assets/resources/scripts/Core/Manager/Guide/game/CatchFishGuide";

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


    private _curGuide:BaseGuide = null;

    private _hand:GuideHand;


    public get curGuide():BaseGuide{
        return this._curGuide;
    }

    public getGuide(name):BaseGuide{
        return this._map.get(name);
    }

    public get guideHand():GuideHand{
        return this._hand;
    }

    public get handNode():Node{
        return this._hand.node;
    }
    private _map:Map<string,BaseGuide> = new Map();

    public init(){
        let self = this;

        resources.load("prefab/hand/handPrefab",Prefab,(err,resource)=>{
            if(err){
                DebugLog.instance.error('加载引导手柄失败:', err);
                return;
            }
            self._hand = new GuideHand(resource);
            self._hand.init();
            self._initGuideData();
        });
    }

    private _initGuideData():void{
        this._map.set(FindingGuide.NAME,new FindingGuide());
        this._map.set(CatchFishGuide.NAME,new CatchFishGuide());
    }


    public start(name:string,data = null):BaseGuide {
        let guide = this._map.get(name);
        if(!guide){
            DebugLog.instance.error(`${name}`+"引导不存在");
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
        GuideManager.getInstance().guideHand.end();
        let guide = this._map.get(name);
        if(!guide){
            DebugLog.instance.error(`${name}`+"引导不存在");
            return null;
        }
        return guide;
    }

    public destory() {
        if(this._curGuide){
            this.end(this._curGuide.name);
        }
        this._map.clear();
        this._curGuide = null;
        this._hand = null;
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
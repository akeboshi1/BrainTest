import {Prefab,Node,instantiate,tween,Vec3} from "cc";
export class GuideHand {

    private _handPrefab:Prefab;

    private _handNode :Node = null;

    private _tween;
    constructor(prefab:Prefab) {
         this._handPrefab = prefab;
    }

    init(){
        this._handNode = instantiate(this._handPrefab);
        this._handNode.setScale(0,0,0);
    }

    /**
     * 手型特效
     */
    public get node():Node{
        if(this._handNode == null){
            this._handNode = instantiate(this._handPrefab);
        }
        return this._handNode;
    };

    public set node(value:Node){
        this._handNode = value;
    }

    public start(pos:Vec3){
        if(this._tween)this._tween.stop();
        this._tween = tween(this._handNode)
            .to(0.5,{scale:new Vec3(1,1,1)},{ easing: 'cubicOut' })
            .to(0.2,{position: pos}, { easing: 'cubicOut' })
            .start();
    }

    public move(pos:Vec3){
        if(this._tween)this._tween.stop();
        this._tween = tween(this._handNode)
             .to(0.8,{position: pos}, { easing: 'cubicOut' })
             .start();
    }

    public end(){
        if(this._tween){
            this._tween.stop();
            this._tween = null;
        }
        this._handNode = null;
    }



}
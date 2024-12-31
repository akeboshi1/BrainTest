import {Prefab,Node,instantiate,tween,Vec3,Label,UITransform,Size} from "cc";
export class GuideHand {

    private _handPrefab:Prefab;

    private _handNode :Node = null;

    private _label:Label;

    private _bgTranform:UITransform = null;

    private _labelTranform:UITransform = null;

    private _tween;
    constructor(prefab:Prefab) {
         this._handPrefab = prefab;
    }

    init(){
        this._handNode = instantiate(this._handPrefab);
        this._handNode.setScale(0,0,0);
        this._label = this._handNode.getChildByName("node").getChildByName("Label").getComponent(Label);
        this._labelTranform =  this._handNode.getChildByName("node").getChildByName("Label").getComponent(UITransform);
        this._bgTranform = this._handNode.getChildByName("node").getChildByName("bg").getComponent(UITransform);
    }

    public set string(value:string){
        this._label.string = value;
    }

    /**
     * 手型特效
     */
    public get node():Node{
        if(this._handNode == null){
            this.init();
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
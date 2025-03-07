import {Prefab,Node,instantiate,tween,Vec3,Label,UITransform,Color,Sprite} from "cc";
export class GuideHand {

    private _handPrefab:Prefab;

    private _handNode :Node = null;

    private _handSprite:Sprite = null;

    private _hint:Node = null;

    private _label:Label;

    private _bgTranform:UITransform = null;

    private _labelTranform:UITransform = null;

    private _tween;
    private _breathingTween;
    constructor(prefab:Prefab) {
         this._handPrefab = prefab;
    }

    init(){
        this._handNode = instantiate(this._handPrefab);
        this._handNode.setScale(0,0,0);
        this._hint = this._handNode.getChildByName("node").getChildByName("hint");
        this._handSprite = this._handNode.getChildByName("node").getChildByName("hand").getComponent(Sprite);
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


    breathingEffect() {
        const minScale = 0.8;
        const maxScale = 2.0;
        const duration = 0.8;

        // 颜色数组
        const colors = [
            new Color(255, 0, 0),   // 红色
            new Color(0, 255, 0),   // 绿色
            new Color(0, 0, 255),   // 蓝色
            new Color(255, 255, 0), // 黄色
        ];

        // 创建呼吸效果的 tween 动画
         this._breathingTween = tween(this._hint)
             .to(duration, { scale: new Vec3(maxScale, maxScale, maxScale) }) // 放大
             .to(duration, { scale: new Vec3(minScale, minScale, minScale) }) // 缩小
             .union()
             .repeatForever()
             .start();
    }

    public start(pos:Vec3){
        if(this._tween)this._tween.stop();

        this._tween = tween(this._handNode)
            .to(0.5,{scale:new Vec3(1,1,1)},{ easing: 'cubicOut' })
            .to(0.2,{position: pos}, { easing: 'cubicOut' })
            .start();
        this.breathingEffect();
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
        if(this._breathingTween){
            this._breathingTween.stop();
            this._breathingTween = null;
        }
        this._handNode = null;
    }



}
import {Prefab,instantiate,Node,Sprite,Label,SpriteFrame,Vec3,Button,tween} from 'cc';
import {DebugLog} from "db://assets/scripts/Core/Util/DebugLog";
import {EventManager} from "db://assets/scripts/Core/Manager/Event/EventManager";
export class Fish {
    public static FishClick:string="FishClick";
    private _fishPrefab:Prefab;
    private _fish:Node;
    private _fishSprite:Sprite;
    private _label:Label;
    private _button:Button;

    private _data:string;

    public currentIndex = -1;
    public curTween;
    public positionYIndex = -1;
    public pause:boolean = false;
    constructor(prefab:Prefab){
        this._fishPrefab = prefab;
        this.create();
    }
    create(){
        this._fish = instantiate(this._fishPrefab);
        this._fishSprite = this._fish.getChildByName("fish").getComponent(Sprite);
        this._label = this._fish.getChildByName("label").getComponent(Label);
        this._button = this._fish.getComponent(Button);

    }

    getFishNode():Node{
        return this._fish;
    }

    setParent(parent:Node){
        this._fish.parent = parent;
    }
    
    setPosition(x:number,y:number){
        this._fish.setPosition(x,y);
    }

    setSpriteFrame(spriteFrame:SpriteFrame){
        if(this._fishSprite){
            this._fishSprite.spriteFrame = spriteFrame;
        }
    }

    setQuestion(question){
        this._button.node.off('click', this.clickHandler, this);
        this._button.node.on('click', this.clickHandler, this);
        this._data = question;
        this._label.string = question.question;
        let answers:string[] = question.options;
        this.currentIndex = answers.indexOf(question.correctAnswer);
    }

    clickHandler(event: Event = null) {
        // 在这里处理点击事件
        DebugLog.instance.log("点击了鱼，问题为：" + this._data);
        EventManager.getInstance().emit(Fish.FishClick,this);
    }

    getData():any{
        return this._data;
    }

    get position(){
        return this._fish.getPosition();
    }

    get worldPosition(){
        return this._fish.getWorldPosition();
    }

    setSelect(color,scale){
        // this._fishSprite.color = color;
        this.setScale(scale);
    }

    setScale(_scale:number=1){
        this._fish.scale = new Vec3(_scale,_scale,_scale);
    }

    set position(vec3:Vec3){
        this._fish.setPosition(vec3);
    }

    destroy():void{
       if(this._fish){
           this._fish.destroy();
       }
    }
}
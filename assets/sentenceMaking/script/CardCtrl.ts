import { _decorator, Color, Component, Label, Node, Sprite } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CardCtrl')
export class CardCtrl extends Component {
    @property(Node)
    showNode:Node;

    @property(Label)
    label:Label;

    @property(Sprite)
    sp:Sprite;

    private id:number;
    private locked:boolean = false;

    start() {

    }

    update(deltaTime: number) {
        
    }

    setLabel(v:string){
        this.label.string = v;
    }

    setid(id:number){
        this.id = id;
    }

    getid():number{
        return this.id;
    }

    lock(){
        this.locked = true;
    }

    unlock(){
        this.locked = false;
    }

    isLocked():boolean{
        return this.locked;
    }

    setWrong(){
        this.sp.color = new Color(255,139,139);
    }

    setNormal(){
        this.sp.color = new Color(255,255,255);
    }
}



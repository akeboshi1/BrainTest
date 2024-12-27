import { _decorator, Component, Label, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('CardCtrl')
export class CardCtrl extends Component {
    @property(Node)
    showNode:Node;

    @property(Label)
    label:Label;

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
}



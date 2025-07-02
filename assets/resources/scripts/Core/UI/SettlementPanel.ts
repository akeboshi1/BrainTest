import {Node,Label,_decorator,v3,Vec3,tween, UI} from 'cc';
import {BasePanel} from "db://assets/resources/scripts/Core/UI/BasePanel";
import { UIManager } from '../Manager/UI/UIManager';
const { ccclass, property } = _decorator;

@ccclass('SettlementPanel')
export class SettlementPanel extends BasePanel{


    private result: boolean = null;

    private residueTime:number = 0;

    @property(Node)
    private btn1Node: Node = null;
    @property(Node)
    private btn2Node: Node = null;

    private getOver: boolean = false;

    @property(Node)
    private loseTitle: Node = null;

    @property(Node)
    private winTitle:Node = null;

    @property(Label)
    private titlelabel:Label = null;

    @property(Label)
    private progressLabel:Label = null;

    public againHandler: Function = null;

    public nextHandler: Function = null;

    public static NAME: string = 'GuidePanel';

    constructor(){
        super();
    }

    restore(data){
        if(data !=null){
            this.result = data.result;
            this.againHandler = data.againHandler;
            this.nextHandler = data.nextHandler;
        }
    }

    start(){
       this.initEnd();
    }

    public initEnd() {
        if (this.result) {
            this.btn1Node.active = false;
            this.loseTitle.active = false;
            this.winTitle.active = true;
            this.winTitle.setPosition(-200, 0, 0);
            SettlementPanel.bezierTo(this.winTitle, 0.5, v3(-200, 200, 0), v3(-100, 400, 0), v3(0, 200, 0), {}).start();
            this.titlelabel.string = "恭喜通关";
            this.titlelabel.node.setPosition(-200, 0, 0);
            SettlementPanel.bezierTo(this.titlelabel.node, 0.5, v3(-200, 0, 0), v3(-100, 200, 0), v3(0, 0, 0), {}).start();
        } else {
            this.btn1Node.active = true;
            this.loseTitle.active = true;
            this.winTitle.active = false;
            this.titlelabel.string = "请再接再厉";
        }
    }

    public onClickNext() {
        if(this.nextHandler)this.nextHandler();
        this.closeEnd();
    }

    public onClickAgain() {
        if(this.againHandler)this.againHandler();
        this.closeEnd();
    }

    public closeEnd() {
        UIManager.getInstance().hidePanel(SettlementPanel.NAME);
    }


    public static bezierTo(target:any,duration:number,c1:Vec3,c2:Vec3,to:Vec3,opts:any){
        opts = opts || Object.create(null);
        let twoBezier = (t:number,p1:Vec3,cp:Vec3,p2:Vec3)=>{
            let x=(1-t)*(1-t)*p1.x+2*t*(1-t)*cp.x+t*t* p2.x;
            let y=(1-t)*(1-t)*p1.y+2*t*(1-t)*cp.y+t*t* p2.y;
            let z=(1-t)*(1-t)*p1.z+2*t*(1-t)*cp.z+t*t*p2.z;
            return v3(x,y,z);
        }
        opts.onUpdate = (arg:Vec3,ratio:number)=>{
            target.position= twoBezier(ratio,c1,c2,to);
        };
        return tween(target).to(duration,{},opts);
    }


    public getCirclePoints(r: number, pos: Vec3, count: number, randomScope: number = 60): Vec3[] {
        let points = [];
        let radians = (Math.PI / 180) * Math.round(360 / count);
        for (let i = 0; i < count; i++) {
            let x = pos.x + r * Math.sin(radians * i);
            let y = pos.y + r * Math.cos(radians * i);
            points.unshift(v3(x + Math.random() * randomScope, y + Math.random() * randomScope, 0));
        }
        return points;
    }
}
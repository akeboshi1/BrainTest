import {_decorator,Sprite,Prefab,Vec3,Node,NodePool,instantiate,Label,director,v3,v2,tween,UITransform} from "cc";
import HomeView from "./HomeView";
import LayerPanel, {UrlInfo} from "../../Common/manage/Layer/LayerPanel";
import Tools from "../../Common/Tools";
import PanelMgr, {Layer} from "../../Common/manage/PanelMgr";
import CacheMgr from "../../Common/manage/CacheMgr";
import GameConfig from "../Game/GameConfig";
import Constant from "../../Common/Constant";
import AudioMgr from "../../Common/manage/AudioMgr";
import FindingGlobal from "db://assets/finding/script/Common/FindingGlobal";
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";

const {ccclass, property} = _decorator;

@ccclass
export default class EndView extends LayerPanel {
    public static getUrl(): UrlInfo {
        return {
            bundle: "endView",
            name: "View/endView/prefab/endView"
        }
    }

    private result: boolean = null;

    private residueTime:number = 0;

    private btn1Node: Node = null;
    private btn2Node: Node = null;

    private effectNode: Node = null;

    private getOver: boolean = false;

    private loseTitle: Node = null;

    private winTitle:Node = null;

    private winImage:Node = null;

    private loseImage:Node = null;

    hide() {
    }

     initUI():Promise<void> {
        return new Promise(resolve => {
            this.btn1Node = this.getNode("result/btnGroup/btn1");
            this.btn2Node = this.getNode("result/btnGroup/btn2");
            this.loseTitle = this.getNode("result/title");
            this.winTitle = this.getNode("result/titleImage");
            this.winImage = this.getNode("result/success");
            this.loseImage = this.getNode("result/lose");
            this.winTitle.active = this.winImage.active = false;
            this.loseTitle.active =this.loseImage.active =  false;
            this.effectNode = this.getNode("result/particle");
            this.effectNode.active = false;
            resolve();
        })
    }

    show(param: any): void {
        this.result = param.isWin;
        this.residueTime = param.residue
        GameConfig.customTime = GameConfig.allTime;
        this.initEnd();
    }

    public initEnd() {
        if (this.result) {
            this.winTitle.active = this.winImage.active = true;
            this.loseTitle.active =this.loseImage.active =  false;
            this.btn1Node.active = false;
            // LoadMgr.loadSprite(this.btn2Sprite, "sub/image/view/endView/btn_no").then();
            AudioMgr.play("sub/audio/view/game/win", 1, false).then();
        } else {
            this.winTitle.active = this.winImage.active = false;
            this.loseTitle.active =this.loseImage.active =  true;
            this.btn1Node.active = true;
            // LoadMgr.loadSprite(this.btn2Sprite, "sub/image/view/endView/btn_startOver").then();
            // this.onTouch(this.btn2Node, this.onClickAgain)
            AudioMgr.play("sub/audio/view/game/lose", 1, false).then()
        }
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

    public onClickNext() {
        CacheMgr.checkpoint ++;
        Global.isAgain = false;
        this.closeEnd();
    }

    public onClickAgain() {
        Global.isAgain = true;
        this.closeEnd();
    }

    public onClickDouble() {
        if (this.getOver) return
        this.getOver = true;
        Tools.handleVideo(Constant.VIDEO_TYPE.GET_DOUBLE).then((res) =>{
            if (res){
                GameConfig.customTime = GameConfig.allTime * 2;
                this.closeEnd()
            }
        })
    }

    public closeEnd() {
        this.offTouch(this.btn1Node);
        this.offTouch(this.btn2Node);
        if (this.residueTime > 0) {
            if (!this.result && !Global.isAgain) {
                // CacheMgr.checkpoint = CacheMgr.checkpoint + 1;
            }
        }
        PanelMgr.INS.openPanel({
                layer: Layer.gameLayer,
                panel: HomeView
        }).then(()=>{

                PanelMgr.INS.closePanel(EndView);
       });

    }

    public openHome() {

            PanelMgr.INS.openPanel({
                layer: Layer.gameLayer,
                panel: HomeView,
            }).then(()=>{
                PanelMgr.INS.closePanel(EndView);
            });

    }
}

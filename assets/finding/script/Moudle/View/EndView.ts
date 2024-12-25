import {_decorator,Sprite,Prefab,Vec3,Node,NodePool,instantiate,Label,director,v3,v2,tween,UITransform} from "cc";
import HomeView from "./HomeView";
import LayerPanel, {UrlInfo} from "../../Common/manage/Layer/LayerPanel";
import Tools from "../../Common/Tools";
import PanelMgr, {Layer} from "../../Common/manage/PanelMgr";
import LoadMgr from "../../Common/manage/LoadMgr";
import CacheMgr from "../../Common/manage/CacheMgr";
import GameConfig from "../Game/GameConfig";
import Constant from "../../Common/Constant";
import AudioMgr from "../../Common/manage/AudioMgr";

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

    // private coinNode: Node = null;
    private btn1Node: Node = null;
    private btn2Node: Node = null;
    private btn2Sprite: Sprite = null;
    private winCoin: number = 0;

    // private coinPool: NodePool = null;
    //
    // private coinPrefab: Prefab = null;

    private startPos: Vec3 = null;
    private endPos: Vec3 = null;

    private effectNode: Node = null;

    private residueTime: number = null;

    private getOver: boolean = false;

    private loseTitle: Node = null;

    hide() {
    }

    initUI() {
        //this.coinNode = this.getNode("result/coin");
        this.btn1Node = this.getNode("result/btn1");
        this.btn2Node = this.getNode("result/btn2");
        this.loseTitle = this.getNode("result/title")
        this.btn2Sprite = this.btn2Node.getComponent(Sprite);
        this.effectNode = this.getNode("result/particle");
        this.effectNode.active = false;
        //this.coinPool = new NodePool();
        // LoadMgr.loadPrefab("sub/prefab/game/coin").then((prefab: Prefab) => {
        //     this.coinPrefab = prefab;
        // })
    }

    show(param: any): void {
        this.residueTime = param.residueTime;
        this.result = param.isWin;
        let residueTime = param.residue
        if (residueTime > 0) {
            if (param.isWin) {
                CacheMgr.checkpoint = CacheMgr.checkpoint + 1
            }
        }
        GameConfig.customTime = GameConfig.allTime;
        this.initEnd();
    }

    // public initPool(count: number = 20) {
    //     for (let i = 0; i < count; i++) {
    //         let coin = instantiate(this.coinPrefab);
    //         this.coinPool.put(coin);
    //     }
    // }

    public initEnd() {
        if (this.result) {
            //this.coinNode.active = true;
            this.loseTitle.active = false;
            //let coinLabel: Label = this.coinNode.getChildByName("count").getComponent(Label);
            this.winCoin = Math.ceil(this.residueTime);
            //let coinPos = this.coinNode.getPosition();
            let scene = director.getScene();
            let gameInfoView = scene.children[0].getChildByName("gameInfoLayer");
            let selfCoin = gameInfoView.getChildByName("gameInfoView").getChildByName("gold");
            // let coinParentUITransform = this.coinNode.parent.getComponent(UITransform);
            // let coinWorldPos = coinParentUITransform.convertToWorldSpaceAR(coinPos);
            // let coinUITransform = this.node.getComponent(UITransform);
            // let coinNodePos = coinUITransform.convertToNodeSpaceAR(coinWorldPos);
            // let selfCoinNodePos = selfCoin.getPosition()
            // this.startPos = coinNodePos;
            // this.endPos = selfCoinNodePos;
            // this.scheduleOnce(() => {
            //     this.flyCoin(coinNodePos, selfCoinNodePos);
            // }, 0.5)
            // coinLabel.string = this.winCoin + "";
            LoadMgr.loadSprite(this.btn2Sprite, "sub/image/view/endView/btn_no").then();
            // this.scheduleOnce(() => {
            //     this.onTouch(this.btn2Node, this.onClickNext);
            // }, 1)
            // this.effectNode.active = true;
            AudioMgr.play("sub/audio/view/game/win", 1, false).then();
        } else {
            // this.coinNode.active = false;
            this.loseTitle.active = true;
            LoadMgr.loadSprite(this.btn2Sprite, "sub/image/view/endView/btn_startOver").then();
            this.onTouch(this.btn2Node, this.onClickAgain)
            AudioMgr.play("sub/audio/view/game/lose", 1, false).then()
        }
    }

    public flyCoin(startPos, endPos, callback?: Function) {
        // let randomCount = Math.random() * 15 + 10;
        let count = Math.ceil(this.winCoin / 10);
        this.playCoinFlyAnim(count, startPos, endPos, callback);
    }

    public playCoinFlyAnim(count: number, stPos: Vec3, edPos: Vec3, callback?: Function, r: number = 130,) {
        // const poolSize = this.coinPool.size();
        // const reCreateCoinCount = poolSize > count ? 0 : count - poolSize;
        // this.initPool(reCreateCoinCount);
        //
        // // 生成圆，并且对圆上的点进行排序
        // let points = this.getCirclePoints(r, stPos, count);
        // let coinNodeList = points.map(pos => {
        //     let coin = this.coinPool.get();
        //     coin.setPosition(stPos);
        //     this.node.addChild(coin);
        //     return {
        //         node: coin,
        //         stPos: stPos,
        //         mdPos: pos,
        //         edPos: edPos,
        //         dis: (pos as any).sub(edPos).mag()
        //     };
        // });
        // coinNodeList = coinNodeList.sort((a, b) => {
        //     if (a.dis - b.dis > 0) return 1;
        //     if (a.dis - b.dis < 0) return -1;
        //     return 0;
        // });
        // let isPlay = false;
        // // 执行金币落袋的动画
        // coinNodeList.forEach((item, idx) => {
        //     //贝塞尔左右
        //     let leftRight = idx % 2;
        //     let flyY = 300;
        //     let flyX;
        //     if (leftRight == 0) {
        //         flyX = 300;
        //     } else {
        //         flyX = -300;
        //     }
        //     tween(item.node)
        //         .to(0.3, {position:new Vec3( item.mdPos.x, item.mdPos.y)})
        //         .call(() => {
        //             if (!isPlay) {
        //                 isPlay = true;
        //                 AudioMgr.play("view/game/boomCoin").then();
        //             }
        //         })
        //         .delay(idx * 0.05)
        //         .bezierTo(0.5, v2(flyX, flyY), v2(flyX, flyY), v2(item.edPos.x, item.edPos.y))
        //         // .to(0.5, {x: item.edPos.x, y: item.edPos.y})
        //         .call(() => {
        //             this.coinPool.put(item.node);
        //             if (idx == coinNodeList.length - 1) {
        //                 if (callback) {
        //                     let callObj = this;
        //                     callback.call(callObj);
        //                 }
        //             }
        //             AudioMgr.play("view/game/getCoin").then();
        //         })
        //         .start();
        // });
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

    public onClickDoubleCoin() {
        if (this.getOver) return
        this.getOver = true;
        Tools.handleVideo(Constant.VIDEO_TYPE.GET_DOUBLE).then((res) =>{
            if (res){
                this.flyCoin(this.startPos, this.endPos, this.closeEnd)
            }
        })
    }

    public onClickNext() {
        this.closeEnd();
        // let isCanPlay = Tools.changeStamina(-1);
        // if (isCanPlay) {
        //     this.closeEnd();
        // } else {
        //     this.openHome();
        // }
    }

    public onClickAgain() {
        this.closeEnd();
        // let isCanPlay = Tools.changeStamina(-1);
        // if (isCanPlay) {
        //     this.closeEnd();
        // } else {
        //     this.openHome();
        // }
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
        setTimeout(() => {
            PanelMgr.INS.openPanel({
                layer: Layer.gameLayer,
                panel: HomeView,
                call: ()=>{
                    PanelMgr.INS.closePanel(EndView);
                }
            })
        }, 500)
    }

    public openHome() {
        setTimeout(() => {
            PanelMgr.INS.openPanel({
                layer: Layer.gameLayer,
                panel: HomeView,
                call: ()=>{
                    PanelMgr.INS.closePanel(EndView);
                }
            })
        }, 500)
    }
}

import LayerPanel, {UrlInfo} from "../../Common/manage/Layer/LayerPanel";
import PanelMgr, {Layer} from "../../Common/manage/PanelMgr";
import GameView from "./GameView";
import GameInfoView from "./GameInfoView";
import LoadMgr from "../../Common/manage/LoadMgr";
import CacheMgr from "../../Common/manage/CacheMgr";
import GameConfig from "../Game/GameConfig";
import {_decorator, Node, Sprite, SpriteFrame, Texture2D} from "cc";
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";
import {GameCenterManager} from "db://assets/scripts/Game/GameCenter/GameCenterManager";
import {TimeUtil} from "db://assets/scripts/Core/Util/TimeUtil";
import {LoaderManager} from "db://assets/scripts/Core/Manager/Load/LoaderManager";
import {TaskType} from "db://assets/scripts/Game/Task/TaskData";
import FindingGlobal from "db://assets/finding/script/Common/FindingGlobal";

const {ccclass} = _decorator;
@ccclass
export default class HomeView extends LayerPanel {
    public static getUrl(): UrlInfo {
        return {
            bundle: "homeView",
            name: "View/homeView/prefab/homeView",
        }
    }

    private pictureBGNode:Node = null;

    private pictureNode: Node = null;

    private logoNode:Node = null;

    private beClick: boolean = false;

    private bundleName:string = "finding";

    initUI():Promise<void> {
        return new Promise(resolve => {
            PanelMgr.INS.openPanel({
                panel: GameInfoView,
                layer: Layer.gameInfoLayer
            }).then(()=>{
                this.pictureNode = this.getNode("bg/picture");
                this.pictureBGNode = this.getNode("bg");
                this.logoNode = this.getNode("logo");
                let logoSprite = this.logoNode.getComponent(Sprite);
                if(Global.isSkewersGame){
                    LoaderManager.getInstance().resourcesLoadFrame("texture/game/logo/judgment").then((spiteFrame)=>{
                        logoSprite.spriteFrame = spiteFrame;
                    });
                }else{
                    LoaderManager.getInstance().loadABRes("scene/loading/image/logo",this.bundleName).then((res)=>{
                        const texture = new Texture2D();
                        texture.image = res;
                        const spriteFrame = new SpriteFrame();
                        spriteFrame.texture = texture;
                        logoSprite.spriteFrame = spriteFrame;
                    });
                }
                FindingGlobal.skewersGameList = GameConfig.level_order;
                this.pictureNode.active = false;
                return resolve();
            });
        })

    }

    private randomSkewerGame():number{
        // 评测第一关(带引导)
        if(Global.userData.curSkewerGameData.hasGuid()) {
            return 0;
        }
        FindingGlobal.curSkewersGameIndex = Math.floor(Math.random() * FindingGlobal.skewersGameList.length);
        return FindingGlobal.skewersGameList[FindingGlobal.curSkewersGameIndex-1];
    }


    show(param: any): void {
        let pictureSprite = this.pictureNode.getComponent(Sprite);
        pictureSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.pictureBGNode.active = false;
        let checkPoint=0;
        if(Global.isAgain){
            checkPoint = CacheMgr.checkpoint;
        }else{
            checkPoint = Global.isSkewersGame?this.randomSkewerGame():CacheMgr.checkpoint==0?CacheMgr.checkpoint = GameCenterManager.getInstance().currentGame.level:CacheMgr.checkpoint;
        }
        if (checkPoint == 0) {
            CacheMgr.checkpoint = 1;
            checkPoint = 1;
            FindingGlobal.curSkewersGameIndex = 1;
        }
        let loopLevel = checkPoint % GameConfig.allCheckPoint;
        if (loopLevel == 0) {
            loopLevel = GameConfig.allCheckPoint;
        }
        let custom = GameConfig.level_order[loopLevel - 1];
        let imageName = GameConfig.image_name.get(custom);

        let way = () => {
            let url = "level" + custom+"/image/"+imageName+"_1_32";
            LoadMgr.loadSprite(pictureSprite, url).then(()=>{
                this.pictureBGNode.active = true;
            });
        }
        way();

        // this.onTouch(this.getNode("next"), () => {
        //     if (this.beClick) return;
        //     this.beClick = true;
        //     let way2 = () => {
        //         PanelMgr.INS.openPanel({
        //             layer: Layer.gameLayer,
        //             panel: GameView,
        //             call: () => {
        //                 PanelMgr.INS.closePanel(HomeView, true)
        //             }
        //         })
        //     }
        //     way2();
        // })
    }

    private nextHandler(){
        if (this.beClick) return;
        this.beClick = true;
        this.way2();
    }

    private way2():Promise<void>{
        return new Promise(async () => {
            await TimeUtil.delay(500);
            PanelMgr.INS.openPanel({
                layer: Layer.gameLayer,
                panel: GameView
            }).then(()=>{
                this.beClick = false;
                this.pictureNode.getComponent(Sprite).spriteFrame = null;
                PanelMgr.INS.closePanel(HomeView, false)
            })
        })
    }

    public loadBundle(checkPoint): boolean {
        return LoadMgr.judgeBundleLoad("level" + checkPoint);
    }

    hide() {
        this.pictureNode.active = false;
    }
}

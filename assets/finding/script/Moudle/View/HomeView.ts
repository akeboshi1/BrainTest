import LayerPanel, {UrlInfo} from "../../Common/manage/Layer/LayerPanel";
import PanelMgr, {Layer} from "../../Common/manage/PanelMgr";
import GameView from "./GameView";
import GameInfoView from "./GameInfoView";
import LoadMgr from "../../Common/manage/LoadMgr";
import Tools from "../../Common/Tools";
import CacheMgr from "../../Common/manage/CacheMgr";
import GameConfig from "../Game/GameConfig";
import {_decorator,Node,instantiate,Prefab,Sprite} from "cc";
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";
import {GameCenterManager} from "db://assets/scripts/Game/GameCenter/GameCenterManager";

const {ccclass} = _decorator;
@ccclass
export default class HomeView extends LayerPanel {
    public static getUrl(): UrlInfo {
        return {
            bundle: "homeView",
            name: "View/homeView/prefab/homeView",
        }
    }

    private pictureNode: Node = null;

    private beClick: boolean = false;

    initUI():Promise<void> {
        return new Promise(resolve => {
            PanelMgr.INS.openPanel({
                panel: GameInfoView,
                layer: Layer.gameInfoLayer
            }).then(()=>{
                this.pictureNode = this.getNode("bg/picture")
                return resolve();
            });
        })

    }


    show(param: any): void {
        let checkPoint=0;
        if(Global.isAgain){
            checkPoint = CacheMgr.checkpoint;
        }else{
            checkPoint = Global.isSkewersGame?Global.userData.curSkewerGameData.seq:CacheMgr.checkpoint==0?CacheMgr.checkpoint = GameCenterManager.getInstance().currentGame.level:CacheMgr.checkpoint;
        }
        if (checkPoint == 0) {
            CacheMgr.checkpoint = 1;
            checkPoint = 1;
        }
        let loopLevel = checkPoint % GameConfig.allCheckPoint;
        if (loopLevel == 0) loopLevel = GameConfig.allCheckPoint;
        let custom = GameConfig.level_order[loopLevel - 1]
        let pictureSprite = this.pictureNode.getComponent(Sprite);
        pictureSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        let way = () => {
            let url = "level" + custom+"/image/bg";
            LoadMgr.loadSprite(pictureSprite, url).then();
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
        return new Promise(resolve => {
            PanelMgr.INS.openPanel({
                layer: Layer.gameLayer,
                panel: GameView
            }).then(()=>{
                this.beClick = false;
                PanelMgr.INS.closePanel(HomeView, false)
            })
        })
    }

    public loadBundle(checkPoint): boolean {
        return LoadMgr.judgeBundleLoad("level" + checkPoint);
    }

    hide() {

    }
}

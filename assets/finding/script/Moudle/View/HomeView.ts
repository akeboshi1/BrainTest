import LayerPanel, {UrlInfo} from "../../Common/manage/Layer/LayerPanel";
import PanelMgr, {Layer} from "../../Common/manage/PanelMgr";
import GameView from "./GameView";
import GameInfoView from "./GameInfoView";
import CacheMgr from "../../Common/manage/CacheMgr";
import GameConfig from "../Game/GameConfig";
import {_decorator, assetManager, director, Node, Sprite, SpriteFrame, resources} from "cc";
import {TimeUtil} from "db://assets/resources/scripts/Core/Util/TimeUtil";
import FindingGlobal from "db://assets/finding/script/Common/FindingGlobal";
import { Global } from "db://assets/resources/scripts/Core/Manager/Config/Global";
import {GameType} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { DebugLog } from "db://assets/resources/scripts/Core/Util/DebugLog";
import { BundleName } from "db://assets/resources/scripts/Core/Manager/Load/BundleName";
import AudioMgr from "../../Common/manage/AudioMgr";

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

    guideView:Node = null;

    private beClick: boolean = false;

    protected bundleName:string = "finding";

    initUI():Promise<void> {
        this.sceneModel = (director.getScene() as unknown as {sceneModel}).sceneModel;
        return new Promise(resolve => {
            PanelMgr.INS.openPanel({
                panel: GameInfoView,
                layer: Layer.gameInfoLayer
            }).then(()=>{
                this.pictureNode = this.getNode("bg/picture");
                this.pictureBGNode = this.getNode("bg");
                this.logoNode = this.getNode("logo");
                this.guideView = this.getNode("guideNode");
                let logoSprite = this.logoNode.getComponent(Sprite);
                const bundle = assetManager.getBundle(this.bundleName);
                if(this.sceneModel.gameType == GameType.SKEWERS){
                    resources.load("texture/game/logo/judgment/spriteFrame",SpriteFrame,(err,sp)=>{
                        if(err){
                            DebugLog.instance.error(err);
                            return;
                        }
                        logoSprite.spriteFrame = sp;
                    });
                }else{
                    bundle.load("scene/loading/image/logo/spriteFrame",SpriteFrame,(err,sp)=>{
                        if(err){
                            DebugLog.instance.error(err);
                            return;
                        }
                        logoSprite.spriteFrame = sp;
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
        // if(Global.userData.curSkewerGameData.hasGuid()) {
        //     return 0;
        // }
   
        FindingGlobal.curSkewersGameIndex = Global.userData.curSkewerGameData.getCurTrainData().level>GameConfig.allCheckPoint?  
        Global.userData.curSkewerGameData.getCurTrainData().level % GameConfig.allCheckPoint:Global.userData.curSkewerGameData.getCurTrainData().level; 

        return FindingGlobal.skewersGameList[FindingGlobal.curSkewersGameIndex-1];
    }


    show(param: any): void {
        AudioMgr.backMusic()
        let pictureSprite = this.pictureNode.getComponent(Sprite);
        pictureSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.pictureBGNode.active = false;
        let checkPoint=0;
        if(this.sceneModel.gameType === GameType.SKEWERS){
            checkPoint = !Global.isAgain ?this.randomSkewerGame():(this.sceneModel as any).level;
            FindingGlobal.skewersGameLevel = checkPoint;
        }else{
            checkPoint = (this.sceneModel as any).level;
            FindingGlobal.gameCenterGameLevel = checkPoint;
        }

        if (checkPoint == 0) {
            // CacheMgr.checkpoint = 1;
            checkPoint = 1;
            FindingGlobal.gameCenterGameLevel = checkPoint;
            FindingGlobal.curSkewersGameIndex = 1;
        }
        let loopLevel = checkPoint % GameConfig.allCheckPoint;
        if (loopLevel == 0) {
            loopLevel = GameConfig.allCheckPoint;
        }
      
        let custom = GameConfig.level_order[loopLevel - 1];
        let imageName = GameConfig.image_name.get(custom);
        let way = () => {
            let url = "level" + custom+"/image/"+imageName+"_1_32/spriteFrame";

            const bundle = assetManager.getBundle(BundleName.FINGING);
            bundle.load(url,SpriteFrame,(err:Error,spriteFrame:SpriteFrame)=>{
                if(err){
                    DebugLog.instance.error(err);
                }
                DebugLog.instance.error("url",url);
                pictureSprite.spriteFrame = spriteFrame;
                pictureSprite.node.active = true;
                this.pictureBGNode.active = true;
            });
        }
        way();
    }

    nextHandler(){
        if (this.beClick) return;
        this.beClick = true;
        this.way2();
    }

    showGuide(){
       super.showGuide();
    }

    hideGuide(){
        super.hideGuide();
        this.way3();
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
            }).catch((err)=>{
                DebugLog.instance.error(err);
            });
        })
    }

    private way3():Promise<void>{
        this.beClick = false;
        this.pictureNode.getComponent(Sprite).spriteFrame = null;
        PanelMgr.INS.closePanel(HomeView, false);
        return new Promise(async () => {
            PanelMgr.INS.openPanel({
                layer: Layer.gameLayer,
                panel: GameView
            }).then(()=>{

            }).catch((err)=>{
                DebugLog.instance.error(err);
            });
        })
    }

    hide() {
        this.pictureNode.active = false;
    }
}

import { _decorator, Component, director } from "cc";
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import PanelMgr, { Layer } from "../Common/manage/PanelMgr";
import HomeView from "../Moudle/View/HomeView";
import GameView from "../Moudle/View/GameView";
import { GameType } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import FindingGlobal from "../Common/FindingGlobal";
import Emit from "../Common/manage/Emit/Emit";
import { EventCode } from "../Common/manage/Emit/EmitData";
import AudioMgr from "../Common/manage/AudioMgr";
import GameConfig from "../Moudle/Game/GameConfig";
import { Global } from "db://assets/resources/scripts/Core/Manager/Config/Global";
//
// macro.CLEANUP_IMAGE_CACHE = false;
// dynamicAtlasManager.enabled = true;

const { ccclass, property } = _decorator;

@ccclass
export class Game extends BaseScene<IBaseGameChild> {
    //Game实例
    public static Ins: Game = null;
    private BannerInit: boolean = false;
    // 添加GameView引用
    protected curView: BaseScene<IBaseGameChild> = null;

    onLoad() {
        Emit.instance().on(EventCode.PanelMgrInitOK, this.do_after_panelMgr_initOK, this)
    }

    start() {
        super.start();
        Game.Ins = this;
        // 初始化FindingGlobal的事件监听器
        FindingGlobal.initEventListeners();
        
        // 监听PanelMgr初始化完成事件
        Emit.instance().on(EventCode.PanelMgrInitOK, () => {
            this.do_after_panelMgr_initOK();
        }, this);
    }

    setGameViewRef(view: GameView) {
        this.curView = view;
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


    //PanelMgr 初始化完成之后执行的方法
    do_after_panelMgr_initOK() {
        // 判断当前游戏是否是串烧游戏
        this.sceneModel = (director.getScene() as unknown as {sceneModel}).sceneModel;
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            FindingGlobal.skewersGameList = GameConfig.level_order;
            AudioMgr.backMusic()
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


            // 如果是串烧游戏，直接打开GameView
            PanelMgr.INS.openPanel({
                layer: Layer.gameLayer,
                panel: GameView,
            })
        } else {
            // 如果不是串烧游戏，走正常流程打开HomeView
            // 确保非串烧游戏使用正确的进度
            let checkPoint = FindingGlobal.gameCenterGameLevel > 0 ? FindingGlobal.gameCenterGameLevel : (this.sceneModel as any).level;
            if (checkPoint == 0) {
                checkPoint = 1;
            }
            FindingGlobal.gameCenterGameLevel = checkPoint;
            
            PanelMgr.INS.openPanel({
                layer: Layer.gameLayer,
                panel: HomeView,
            })
        }
    }
}

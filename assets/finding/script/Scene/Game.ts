import PanelMgr, { Layer, View } from "../Common/manage/PanelMgr";
import Emit from "../Common/manage/Emit/Emit";
import { EventCode } from "../Common/manage/Emit/EmitData";
import HomeView from "../Moudle/View/HomeView";
import { _decorator, Component, JsonAsset, Node } from "cc";
import AudioMgr from "../Common/manage/AudioMgr";
import GameView from "../Moudle/View/GameView";
import {IBaseGameChild} from "db://assets/scripts/Core/Scene/SceneModel/BaseGameModel";
import {BaseScene} from "db://assets/scripts/Core/Scene/BaseScene";
import CacheMgr from "db://assets/finding/script/Common/manage/CacheMgr";
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
        AudioMgr.backMusic()
        Emit.instance().on(EventCode.PanelMgrInitOK, this.do_after_panelMgr_initOK, this)
    }

    start(): void {
        super.start();
        Game.Ins = this;
    }

    setGameViewRef(view: GameView) {
        this.curView = view;
    }


    


    //PanelMgr 初始化完成之后执行的方法
    do_after_panelMgr_initOK() {
        PanelMgr.INS.openPanel({
            layer: Layer.gameLayer,
            panel: HomeView,
        })
    }
}

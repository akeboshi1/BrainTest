// cc.macro.CLEANUP_IMAGE_CACHE = false;
import PanelMgr, {Layer, View} from "../Common/manage/PanelMgr";
import Emit from "../Common/manage/Emit/Emit";
import {EventCode} from "../Common/manage/Emit/EmitData";
import HomeView from "../Moudle/View/HomeView";
import Global from "../Common/Global";
import {macro,dynamicAtlasManager,_decorator,Component,JsonAsset,Node} from "cc";
import AudioMgr from "../Common/manage/AudioMgr";

macro.CLEANUP_IMAGE_CACHE = false;
dynamicAtlasManager.enabled = true;
const {ccclass, property} = _decorator;

@ccclass
export default class Game extends Component {
    // @property(JsonAsset)
    // gameBox: JsonAsset = null;
    // @property(Node)
    // banner: Node = null

    //Game实例
    public static Ins: Game = null;
    private BannerInit: boolean = false

    onLoad() {
        AudioMgr.backMusic()
        Game.Ins = this
        // WechatApi.bottomAdv.init();
        // if (!PanelMgr.INS) {
        //     Emit.instance().on(EventCode.PanelMgrInitOK, this.do_after_panelMgr_initOK, this)
        // } else {
        //     this.do_after_panelMgr_initOK()
        // }
        Emit.instance().on(EventCode.PanelMgrInitOK, this.do_after_panelMgr_initOK, this)

        // if (Global.exportInfo.length == 0) {
        //     Global.exportInfo = this.gameBox.json.data;
        // }
    }

    //PanelMgr 初始化完成之后执行的方法
    do_after_panelMgr_initOK() {
        PanelMgr.INS.openPanel({
            layer: Layer.gameLayer,
            panel: HomeView,
        })
        // if (this.BannerInit) {
        //     PanelMgr.INS.openPanel({
        //         layer: Layer.gameLayer,
        //         panel: HomeView,
        //     })
        // } else {
        //     Emit.instance().on(EventCode.BannerBoxInitOver, () => {
        //         this.BannerInit = true
        //         PanelMgr.INS.openPanel({
        //             layer: Layer.gameLayer,
        //             panel: HomeView,
        //         })
        //     }, this)
        // }
    }

    //展示底部广告
    showBottomAdv() {
        //this.banner.parent.active = true
    }

    //隐藏底部广告
    hideBottomAdv() {
        //this.banner.parent.active = false
    }
}

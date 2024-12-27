import PanelMgr, {Layer, View} from "../Common/manage/PanelMgr";
import Emit from "../Common/manage/Emit/Emit";
import {EventCode} from "../Common/manage/Emit/EmitData";
import HomeView from "../Moudle/View/HomeView";
import {_decorator,Component,JsonAsset,Node} from "cc";
import AudioMgr from "../Common/manage/AudioMgr";
//
// macro.CLEANUP_IMAGE_CACHE = false;
// dynamicAtlasManager.enabled = true;
const {ccclass, property} = _decorator;

@ccclass
export default class Game extends Component {
    //Game实例
    public static Ins: Game = null;
    private BannerInit: boolean = false

    onLoad() {
        AudioMgr.backMusic()
        Game.Ins = this
        Emit.instance().on(EventCode.PanelMgrInitOK, this.do_after_panelMgr_initOK, this)
    }

    //PanelMgr 初始化完成之后执行的方法
    do_after_panelMgr_initOK() {
        PanelMgr.INS.openPanel({
            layer: Layer.gameLayer,
            panel: HomeView,
        })
    }
}

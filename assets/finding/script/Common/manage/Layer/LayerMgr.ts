import {Node} from "cc"
export default class LayerMgr {
    //这里是初始化三个父节点而已 ，实在Main中调用的，之后可以用于 UIMgr openUI 的参数
    public static init(param: any) {
        this.gameLayer = param.gameLayer;
        this.boxLayer = param.boxLayer;
        this.bannerLayer = param.bannerLayer;
        this.chestLayer = param.chestLayer;
        this.gameInfoLayer = param.gameInfoLayer;
        this.gameBoxLayer = param.gameBoxLayer;
        this.sliderLayer = param.sliderLayer;
    }

    public static gameLayer: Node = null;

    public static boxLayer: Node = null;

    public static bannerLayer: Node = null;

    public static chestLayer: Node = null;

    public static gameInfoLayer: Node = null;

    public static gameBoxLayer: Node = null

    public static sliderLayer: Node = null
}

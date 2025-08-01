import GameLogMgr from "./GameLogMgr";
import Emit from "./Emit/Emit";
import {EventCode} from "./Emit/EmitData";
import LayerPanel, {UrlInfo} from "./Layer/LayerPanel";
import Global from "../FindingGlobal";
import Tools from "../Tools";
import CacheMgr from "./CacheMgr";
import Constant from "../Constant";
import {_decorator,Node,Component,instantiate,Prefab, assetManager} from "cc"
import {BundleName} from "db://assets/resources/scripts/Core/Manager/Load/BundleName";

const {ccclass, property} = _decorator;
@ccclass
export default class PanelMgr extends Component {
    public static INS: PanelMgr
    @property(
        {
            type: [Node],
            tooltip: "只要将Game中的场景layer按照顺序赋值即可， 如果存在修改，需要到PannerMgr.ts中修改枚举变量 Layer,也是需要按照绑定顺序"
        }
    )
    public layers: Node[] = []

    //当前正在Loading 的面板
    private LoadingList: Map<string, number> = new Map<string, number>()
    //当前打开的面板数组
    private openList: Map<string, Node> = new Map<string, Node>()
    //当前关闭但是未摧毁的面板，存储在这里，下次打开该面板的时候，就会使用这里的面板
    private hideList: Map<string, Node> = new Map<string, Node>()

    onLoad() {
        PanelMgr.INS = this;
    }

    start(){

    }


    /**
     * @param param{
     *     layer : 在哪一个容器打开页面
     *     panel: 打开面板
     *     call : 打开成功回调 可选
     *     param: 传递给下一个面板的参数
     * }
     */
    openPanel(param: openParam):Promise<void> {
        return new Promise((resolve, reject)=>{
            let layer = this.layers[param.layer]

            if (!layer) {
                GameLogMgr.error("openPanel layer 为空 ,打开失败. ", layer)
                reject("openPanel layer 为空 ,打开失败. ");
                return
            }

            //加载分包
            let urlInfo = param.panel.getUrl()
            let config = Global.config.panel_config[urlInfo.name]

            if (urlInfo.name == "homeView" && Global.LoginFlag) {
                Global.LoginFlag = false
                config = Global.config.panel_config["loginView"]
            }
            //检测是否已经再加载了
            if (this.LoadingList.has(urlInfo.name)) {
                GameLogMgr.warn("面板", urlInfo.name, "已经在加载中，重复加载失败")
                reject("已经在加载中，重复加载失败");
                return;
            }

            if (this.openList.has(param.panel.getUrl().name)) {
                GameLogMgr.warn("不允许重复打开", param.panel)
                reject("不允许重复打开");
                return;
            }
            this.LoadingList.set(urlInfo.name, 1) //添加一个加载标识， 防止重复添加
            let panel: Node = null;
            let self = this;
            //判断有没有旧的panel可用，有的话就不重新实例化了
            if (this.hideList.has(urlInfo.name)) {
                panel = this.hideList.get(urlInfo.name)
                panel.parent = layer
                panel.active = false
                this.scheduleOnce(() => {
                    self.openList.set(urlInfo.name, panel)
                    self.showPanel(panel, param.param, config)
                    self.LoadingList.delete(urlInfo.name)
                    if (self.LoadingList.size == 0) {
                    //todo mask
                    }
                    resolve();
                }, 0)
            } else {
                const bundle = assetManager.getBundle(BundleName.FINGING);  
                bundle.load(urlInfo.name, Prefab, (err: Error, prefab: Prefab) => {
                    if (err) {
                        GameLogMgr.error("openPanel 加载失败", err);
                        reject(err);
                        return;
                    }
                    panel = instantiate(prefab);
                    panel.parent = layer;
                    panel.active = false;
                    self.openList.set(urlInfo.name, panel);
                    const layerpanel = panel.getComponent(LayerPanel) as LayerPanel;
                    layerpanel.initUI().then(()=>{
                        self.showPanel(panel, param.param, config);
                        self.LoadingList.delete(urlInfo.name);
                        resolve();
                    });
                });
            }
        })
    }

    public preloadPanel(){

    }

    private showPanel(panel: Node, param: any, config: any) {
        let script = panel.getComponent(LayerPanel)
        script.show(param)
        panel.active = true
    }

    /**
     *
     * @param panel 需要关闭的面板
     * @param destroy 是否需要彻底销毁这个面板
     */
    closePanel(panel: typeof LayerPanel, destroy = true) {
        let node = this.openList.get(panel.getUrl().name)
        if (!node) {
            GameLogMgr.warn("close Panel ", panel.getUrl(), " error  : 该面板尚未打开!")
            return
        }

        // node.getComponent(LayerPanel).hideGameBox()

        node.getComponent(LayerPanel).hide() //这里可以做清除代码

        // node.getComponent(LayerPanel).unscheduleAllCallbacks() //取消所有定时器
        if (panel.getUrl().name == "endView") { //如果是endView的化 ，需要同步数据
            CacheMgr.updateData();
        }

        node.parent = null
        this.openList.delete(panel.getUrl().name)
        if (destroy) {
            node.getComponent(LayerPanel).onDestroyDo() //这里可以做清除代码
            node.destroy()
        } else {
            this.hideList.set(panel.getUrl().name, node)
        }
    }

    getPanel(panel: typeof LayerPanel): Node {
        return this.openList.get(panel.getUrl().name)
    }

    //处理Panel配置
    // handlePanelConfig(config) {
    //     PanelMgr.INS.closePanel(SliderBox)
    //     return new Promise((resolve, reject) => {
    //         Tools.openBox(config.export_show[0]).then(() => {
    //             return Tools.openBox(config.export_show[1]);
    //         }).then(() => {
    //             return Tools.openBox(config.export_show[2]);
    //         }).then(() => {
    //             return Tools.openBox(config.export_show[3]);
    //         }).then(() => {
    //             //判断宝箱
    //             return Tools.openTrea(config.chest_probability);
    //         }).then(() => {
    //             //判断强拉视频
    //             return new Promise((resolve, reject) => {
    //                 if (Tools.checkPer(config.video_probability) && !Global.config.adv_unit_conf.video_auto_play) {
    //                     Tools.handleVideo(Constant.VIDEO_TYPE.ENFORCE).then(() => {
    //                         resolve(true)
    //                     })
    //                 } else {
    //                     resolve(true)
    //                 }
    //             })
    //         }).then(() => {
    //             // if (Tools.checkPer(config.banner_probability)) {
    //             //     WechatApi.bottomAdv.show()
    //             // } else {
    //             //     WechatApi.bottomAdv.hide()
    //             // }
    //             if (config.slider > 0) {
    //                 PanelMgr.INS.openPanel({
    //                     layer: Layer.sliderLayer,
    //                     panel: SliderBox,
    //                     param: {
    //                         code: config.slider
    //                     }
    //                 })
    //             }
    //             return resolve(true)
    //         });
    //     })
    // }

    // handlePanelMorePlay(config) {
    //     Tools.openBox(config[0]).then(() => {
    //         return Tools.openBox(config[1]);
    //     }).then(() => {
    //         return Tools.openBox(config[2]);
    //     }).then(() => {
    //         return Tools.openBox(config[3]);
    //     })
    // }

}

export enum Layer {
    gameLayer,
    gameInfoLayer,
    sliderLayer,
    chestLayer,
}

export enum View {
    endView,
    gameView,
    homeView,
}

export enum Box {
    fourBox = 10,
    oneBox,
}

export interface openParam {
    layer: Layer,
    panel: typeof LayerPanel,
    call?: Function,
    param?: any
}

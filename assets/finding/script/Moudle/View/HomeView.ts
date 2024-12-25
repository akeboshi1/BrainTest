import LayerPanel, {UrlInfo} from "../../Common/manage/Layer/LayerPanel";
import PanelMgr, {Layer} from "../../Common/manage/PanelMgr";
import GameView from "./GameView";
import GameInfoView from "./GameInfoView";
import LoadMgr from "../../Common/manage/LoadMgr";
import Tools from "../../Common/Tools";
import CacheMgr from "../../Common/manage/CacheMgr";
import GameConfig from "../Game/GameConfig";
import {_decorator,Node,instantiate,Prefab,Sprite} from "cc";

const {ccclass} = _decorator;
@ccclass
export default class HomeView extends LayerPanel {
    public static getUrl(): UrlInfo {
        return {
            bundle: "homeView",
            name: "View/homeView/prefab/homeView",
        }
    }

    private btn_setting: Node = null;

    private btn_shop: Node = null;

    private btn_signIn: Node = null;

    private pictureNode: Node = null;

    private beClick: boolean = false;

    initUI() {
        PanelMgr.INS.openPanel({
            panel: GameInfoView,
            layer: Layer.gameInfoLayer
        })
        this.btn_setting = this.getNode("setting");
        this.btn_shop = this.getNode("shop");
        this.btn_signIn = this.getNode("signIn");
        this.pictureNode = this.getNode("bg/picture")
    }


    show(param: any): void {
        // this.onTouch(this.btn_setting, () => {
        //     LoadMgr.loadPrefab("game/settingBox").then((prefab: Prefab) => {
        //         let node: Node = instantiate(prefab);
        //         this.node.addChild(node);
        //     })
        // })
        // this.onTouch(this.btn_shop, () => {
        //     LoadMgr.loadPrefab("game/shop").then((prefab: Prefab) => {
        //         let node: Node = instantiate(prefab);
        //         this.node.addChild(node);
        //     })
        // })
        // this.onTouch(this.btn_signIn, () => {
        //     LoadMgr.loadPrefab("game/signIn").then((prefab: Prefab) => {
        //         let node: Node = instantiate(prefab);
        //         this.node.addChild(node);
        //     })
        // })
        let checkPoint = CacheMgr.checkpoint;
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
            // LoadMgr.getBundle("level" + custom)
            LoadMgr.loadSprite(pictureSprite, url).then();
        }
        // if (!this.loadBundle(custom)) {
        //     LoadMgr.loadBundle_Single("level" + custom).then(() => {
        //         way();
        //     })
        // } else {
            way();
        // }

        this.onTouch(this.getNode("next"), () => {
            if (this.beClick) return;
            this.beClick = true;
            let way2 = () => {
                PanelMgr.INS.openPanel({
                    layer: Layer.gameLayer,
                    panel: GameView,
                    call: () => {
                        PanelMgr.INS.closePanel(HomeView, true)
                    }
                })
            }
            // if (!this.loadBundle(custom)) {
            //     LoadMgr.loadBundle_Single("level" + custom).then(() => {
            //         way2();
            //     })
            // } else {
                way2();
            // }
        })
    }

    public loadBundle(checkPoint): boolean {
        return LoadMgr.judgeBundleLoad("level" + checkPoint);
    }

    hide() {

    }
}

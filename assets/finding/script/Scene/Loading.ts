import Tools from "../Common/Tools";
import TestMgr from "../Common/Test";
import LoadMgr from "../Common/manage/LoadMgr";
import { _decorator, Node, tween, director, Sprite, v3, Texture2D, SpriteFrame } from "cc";
import { LoaderManager } from "db://assets/resources/scripts/Core/Manager/Load/LoaderManager";
import {BaseScene} from "db://assets/resources/scripts/Core/Scene/BaseScene";
import {GameType, IBaseGameChild} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import CacheMgr from "db://assets/finding/script/Common/manage/CacheMgr";
const { ccclass, property } = _decorator;

@ccclass
export class Loading extends BaseScene<IBaseGameChild> {

    @property(Node)
    logoNode: Node = null;

    @property(Node)
    mask: Node = null;

    protected bundleName: string = 'finding';

    private tween = null;

    start() {
        super.start();
        let logoSprite = this.logoNode.getComponent(Sprite);
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            LoaderManager.getInstance().resourcesLoadFrame("texture/game/logo/judgment").then((spiteFrame) => {
                logoSprite.spriteFrame = spiteFrame;
            });
        } else {
            LoaderManager.getInstance().loadABRes("scene/loading/image/logo", this.bundleName).then((res) => {
                const texture = new Texture2D();
                texture.image = res;
                const spriteFrame = new SpriteFrame();
                spriteFrame.texture = texture;
                logoSprite.spriteFrame = spriteFrame;
            });
        }
        this._initSystemEvent();

        this.mask.scale = v3(0, 1, 1);

        CacheMgr.hard = 1;

        //假的进度条
        this.tween = tween(this.mask)
            .to(5, { scale: v3(1, 1, 1) }, { easing: "quadOut" })
            .start();
        let i = 0;

        director.preloadScene("Game");
        LoadMgr.init_bundleMgr()

        TestMgr.start("加载总时长")
        let self = this;
        let num = Tools.model_initModel(() => {
            // i++
            // if (i === num) {
            TestMgr.end("加载总时长")
            this.tween.stop();
            tween(this.mask)
                .to(0.2, { scale: v3(1, 1, 1) }, { easing: 'quadOut' })
                .call(() => {
                    let sceneModel = self.sceneModel;
                    director.loadScene('Game',(err,scene)=>{
                        (scene as any).sceneModel = sceneModel;
                        // (scene as any).sceneModel.scene = scene as any;
                    });
                })
                .start();
            // }
        });
    }

    // protected onLoad() {
    //     this._initSystemEvent();

    //     this.mask.scale = v3(0, 1, 1);

        

    //     //假的进度条
    //     this.tween = tween(this.mask)
    //         .to(5, { scale: v3(1, 1, 1) }, { easing: "quadOut" })
    //         .start();
    //     let i = 0;

    //     director.preloadScene("Game");
    //     LoadMgr.init_bundleMgr()

    //     TestMgr.start("加载总时长")
    //     let self = this;
    //     let num = Tools.model_initModel(() => {
    //         // i++
    //         // if (i === num) {
    //         TestMgr.end("加载总时长")
    //         this.tween.stop();
    //         tween(this.mask)
    //             .to(0.2, { scale: v3(1, 1, 1) }, { easing: 'quadOut' })
    //             .call(() => {
    //                 director.loadScene('Game',(err,scene)=>{
    //                     (scene as any).sceneModel = self.sceneModel;
    //                     (scene as any).sceneModel.scene = scene as any;
    //                 });
    //             })
    //             .start();
    //         // }
    //     });
    // }

    _initSystemEvent() {

    }
}

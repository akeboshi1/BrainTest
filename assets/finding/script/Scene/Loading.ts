import Tools from "../Common/Tools";
import TestMgr from "../Common/Test";
import { _decorator, Node, tween, director, Sprite, v3, assetManager, SpriteFrame, resources } from "cc";
import {BaseScene} from "db://assets/resources/scripts/Core/Scene/BaseScene";
import {GameType, IBaseGameChild} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import CacheMgr from "db://assets/finding/script/Common/manage/CacheMgr";
import { DebugLog } from "db://assets/resources/scripts/Core/Util/DebugLog";
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
            resources.load("texture/game/logo/judgment/spriteFrame", SpriteFrame,(err,sp)=>{
                if(err){
                    DebugLog.instance.error(err);
                    return;
                }
                logoSprite.spriteFrame = sp;
            });
        } else {
            const bundle = assetManager.getBundle(this.bundleName);
            bundle.load("scene/loading/image/logo/spriteFrame", SpriteFrame,(err,sp)=>{
                if(err){
                    DebugLog.instance.error(err);
                    return;
                }
                logoSprite.spriteFrame = sp;
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

    _initSystemEvent() {

    }
}

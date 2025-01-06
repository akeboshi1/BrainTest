import Tools from "../Common/Tools";
import TestMgr from "../Common/Test";
import LoadMgr from "../Common/manage/LoadMgr";
import { _decorator,Component,Node,tween,director,Sprite,v3,Texture2D,SpriteFrame } from "cc";
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";
import {LoaderManager} from "db://assets/scripts/Core/Manager/Load/LoaderManager";
const {ccclass, property} = _decorator;

@ccclass
export default class Loading extends Component {

    @property(Node)
    logoNode: Node = null;

    @property(Node)
    mask: Node = null;

    private bundleName: string = 'finding';

    private tween = null;

    protected onLoad() {
        this._initSystemEvent();

        this.mask.scale = v3(0,1,1);

        let logoSprite = this.logoNode.getComponent(Sprite);
        if(Global.isSkewersGame){
            LoaderManager.getInstance().resourcesLoadFrame("texture/game/logo/judgment").then((spiteFrame)=>{
                logoSprite.spriteFrame = spiteFrame;
            });
        }else{
            LoaderManager.getInstance().loadABRes("scene/loading/image/logo",this.bundleName).then((res)=>{
                const texture = new Texture2D();
                texture.image = res;
                const spriteFrame = new SpriteFrame();
                spriteFrame.texture = texture;
                logoSprite.spriteFrame = spriteFrame;
            });
        }

        //假的进度条
        this.tween = tween(this.mask)
            .to(5, {scale: v3(1,1,1)}, {easing: "quadOut"})
            .start();
        let i = 0;

        director.preloadScene("Game");
        LoadMgr.init_bundleMgr()

        TestMgr.start("加载总时长")
        let num = Tools.model_initModel(() => {
            // i++
            // if (i === num) {
                TestMgr.end("加载总时长")
                this.tween.stop();
                tween(this.mask)
                    .to(0.2, {scale: v3(1,1,1)}, {easing: 'quadOut'})
                    .call(() => {
                        director.loadScene('Game');
                    })
                    .start();
            // }
        });
    }

    _initSystemEvent() {

    }
}

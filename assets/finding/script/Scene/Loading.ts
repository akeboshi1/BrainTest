import Tools from "../Common/Tools";
import TestMgr from "../Common/Test";
import LoadMgr from "../Common/manage/LoadMgr";
import { _decorator,Component,Node,tween,director,Vec3,v3 } from "cc";
const {ccclass, property} = _decorator;

@ccclass
export default class Loading extends Component {

    @property(Node)
    round: Node = null;

    @property(Node)
    mask: Node = null;

    private tween = null;

    protected onLoad() {
        this._initSystemEvent();

        this.mask.scale = v3(0,1,1);

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

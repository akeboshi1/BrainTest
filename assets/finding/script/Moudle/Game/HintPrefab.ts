import {_decorator,tween,UITransform,Component,Vec3} from "cc";
import AudioMgr from "../../Common/manage/AudioMgr";

const {ccclass, property} = _decorator;

@ccclass
export default class HintPrefab extends Component {
    start() {
        let uitransform = this.getComponent(UITransform);
        this.node.setScale(new Vec3(0,0,0));
        tween(this.node)
            .to(0.5, {scale: new Vec3(1.2,1.2)})
            .to(0.1, {scale: new Vec3(1,1)})
            .call(() => {
                this.scheduleOnce(() => {
                    this.node.destroy();
                }, 1)
            })
            .start();
    }

    playSound(url) {
        AudioMgr.play(url, 1, false).then();
    }

    onDestroy() {

    }
}

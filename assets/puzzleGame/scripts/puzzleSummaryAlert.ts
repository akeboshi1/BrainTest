import { _decorator, Component, Node, Tween, tween, UITransform, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('puzzleSummaryAlert')
export class puzzleSummaryAlert extends Component {
    @property(Node)
    successLabel: Node;
    @property(Node)
    failLabel: Node;

    @property(Node)
    buttonRetry: Node;
    @property(Node)
    buttonJumpLevel: Node;
    @property(Node)
    buttonNextLevel: Node;

    @property(Node)
    animNode: Node;

    start() {

    }

    update(deltaTime: number) {
        
    }

    initByResult(result:boolean){
        this.successLabel.active = result;
        this.failLabel.active = !result;

        this.buttonRetry.active = !result;
        this.buttonJumpLevel.active = !result;
        this.buttonNextLevel.active = result;
    }

    fadeIn(){
        // 先设置初始缩放为极小值，这里设置为 (0.1, 0.1, 0.1)，表示几乎不可见
        const initialScale = new Vec3(0.1, 0.1, 0.1);
        this.animNode.setScale(initialScale);
        this.animNode.active = true;

        const tween = new Tween(this.animNode);
        tween.to(0.5, {scale: new Vec3(1, 1, 1)}).start();
    }

    fadeOutAndClose(){
        const tween = new Tween(this.animNode);
        // 在一定时间内（这里设置为0.5秒）将缩放比例缩小到极小值 (0.1, 0.1, 0.1)
        tween.to(0.5, {scale: new Vec3(0.1, 0.1, 0.1)}).call(() => {
            this.node.active = false;
        }).start();
    }
}



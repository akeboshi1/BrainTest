import { _decorator, Component, Node, Tween, Label, UITransform, Vec3 } from 'cc';
import {Global} from "../../scripts/Core/Manager/Config/Global";
import {SkewersManager} from "../../scripts/Game/Task/Skewers/SkewersManager";
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

    @property(Label)
    nextLabel: Label;

    start() {

    }

    update(deltaTime: number) {
        
    }

// 根据结果初始化界面
    initByResult(result:boolean){
        // 如果结果为真，则激活成功标签，否则激活失败标签
        this.successLabel.active = result;
        this.failLabel.active = !result;

        // 如果不是串烧游戏，则根据结果激活重试、跳转关卡和下一关按钮
        if(!Global.isSkewersGame){
            // 全部通关
            if(SkewersManager.getInstance().isRunOver()){
                this.buttonRetry.active = !result;
                this.buttonJumpLevel.active = !result;
                this.buttonNextLevel.active = result;
                this.nextLabel.string = "全部通关";
            }
            else{
                this.buttonRetry.active = !result;
                this.buttonJumpLevel.active = !result;
                this.buttonNextLevel.active = result;
                this.nextLabel.string = "下一关";
            }

        }else{
            this.buttonJumpLevel.active = false;
            this.buttonRetry.active = false;
            this.buttonNextLevel.active=true;
            // 全部通关
            if(SkewersManager.getInstance().isRunOver()){
                this.nextLabel.string = "全部通关";
            }else{
                // 直接进入下一关
                this.nextLabel.string = "下一关";
            }
        }
    }

    // 淡入动画
    fadeIn(){
        // 先设置初始缩放为极小值，这里设置为 (0.1, 0.1, 0.1)，表示几乎不可见
        const initialScale = new Vec3(0.1, 0.1, 0.1);
        this.animNode.setScale(initialScale);
        this.animNode.active = true;

        const tween = new Tween(this.animNode);
        // 在0.5秒内将缩放比例从初始值 (0.1, 0.1, 0.1) 缩放到 (1, 1, 1)
        tween.to(0.5, {scale: new Vec3(1, 1, 1)}).start();
    }

    // 淡出动画并关闭界面
    fadeOutAndClose(){
        const tween = new Tween(this.animNode);
        // 在一定时间内（这里设置为0.5秒）将缩放比例缩小到极小值 (0.1, 0.1, 0.1)
        tween.to(0.5, {scale: new Vec3(0.1, 0.1, 0.1)}).call(() => {
            this.node.active = false;
        }).start();
    }
}



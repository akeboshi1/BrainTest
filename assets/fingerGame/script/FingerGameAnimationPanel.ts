import { _decorator, Component, Node, Prefab, tween, Vec3 } from 'cc';
import { BasePanel, PanelState } from '../../resources/scripts/Core/UI/BasePanel';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
const { ccclass, property } = _decorator;

@ccclass('FingerGameAnimationPanel')
export class FingerGameAnimationPanel extends BasePanel {
    static NAME: string = "FingerGameAnimationPanel";


    @property(Node)
    private cupNode: Node = null;

    @property(Node)
    private rotateBackLightNode: Node = null;

    @property(Node)
    private star1:Node = null;    

    @property(Node)
    private star2:Node = null;

    @property(Node)
    private star3:Node = null;

    start() {
        this.startLoopAnimation();
    }

    startLoopAnimation(){
        // 1. _rotateBackLightNode 逆时针旋转
        this.startBackLightRotation();
        
        // 2. _cupNode 奖杯摇晃效果
        this.startCupShake();
        
        // 3. 星星旋转和缩放动画
        this.startStarAnimations();
    }

    private startBackLightRotation() {
        if (!this.rotateBackLightNode) return;
        
        tween(this.rotateBackLightNode)
            .by(3, { angle: -360 }, { easing: 'linear' })
            .repeatForever()
            .start();
    }

    private startCupShake() {
        if (!this.cupNode) return;
        
        // 创建摇晃序列，使用sequence确保整个序列循环
        const shakeSequence = tween(this.cupNode)
            .sequence(
                tween()
                    .to(0.5, { angle: 5 }, { easing: 'sineOut' })
                    .to(0.5, { angle: -5 }, { easing: 'sineInOut' })
                    .to(0.5, { angle: 3 }, { easing: 'sineOut' })
                    .to(0.5, { angle: -3 }, { easing: 'sineInOut' })
                    .to(0.5, { angle: 0 }, { easing: 'sineOut' })
                    .delay(2) // 停顿2秒后继续
            )
            .repeatForever();
        
        shakeSequence.start();
    }

    private startStarAnimations() {
        // 星星1：顺时针旋转 + 缩放动画
        this.startStarAnimation(this.star1, 1, 2.5, 0.8);
        
        // 星星2：逆时针旋转 + 缩放动画
        this.startStarAnimation(this.star2, -1, 3.0, 1.2);
        
        // 星星3：顺时针旋转 + 缩放动画
        this.startStarAnimation(this.star3, 1, 2.0, 1.5);
    }

    private startStarAnimation(starNode: Node, direction: number, rotationSpeed: number, scaleInterval: number) {
        if (!starNode) return;
        
        // 旋转动画
        tween(starNode)
            .by(rotationSpeed, { angle: 360 * direction }, { easing: 'linear' })
            .repeatForever()
            .start();
        
        // 缩放动画 - 使用sequence确保整个缩放序列循环
        const scaleSequence = tween(starNode)
            .sequence(
                tween()
                    .to(0.3, { scale: new Vec3(1.3, 1.3, 1) }, { easing: 'quartOut' })
                    .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'quartIn' })
                    .delay(scaleInterval)
            )
            .repeatForever();
        
        scaleSequence.start();
    }

    // 显示面板
    async showPanel() {
        if (!this.isValidNode()) {
            DebugLog.instance.warn('节点已销毁，终止显示动画');
            return;
        }
        await new Promise<void>((resolve, reject) => {
            // 设置初始缩放为0.01
            this.node.setScale(0.01, 0.01, 1);
            // 使用逐渐变快的曲线效果
            tween(this.node)
                .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'quartOut' })
                .call(() => {
                    this.state = PanelState.SHOW;
                    resolve();
                })
                .start();
        });
    }

    // 隐藏面板
    async hidePanel() {
        if (!this.isValidNode()) {
            DebugLog.instance.warn('节点已销毁，终止隐藏动画');
            return;
        }
        await new Promise<void>((resolve, reject) => {
            // 使用逐渐变慢的曲线效果（与show相反）
            tween(this.node)
                .to(0.3, { scale: new Vec3(0.01, 0.01, 1) }, { easing: 'quartIn' })
                .call(() => {
                    this.state = PanelState.HIDE;
                    resolve();
                })
                .start();
        });
    }
}



/**
 * 动画效果类
 */
import{tween,Vec3,Vec2,Node,UITransform,view,UIOpacity} from "cc"
// import easeInOut = easeInOut;
import GameLog from "./GameLogMgr";
// import Tween = Tween;
// import tween = tween;

export default class ActionMgr {

    //疯狂抖动手指
    public static shakeHand(node: Node) {
        tween(node)
            .by(0.05, {position:new Vec3(node.position.x,node.position.y+20,node.position.z)})
            .by(0.05, {position:new Vec3(node.position.x,node.position.y-20,node.position.z)})
            .union()
            .repeatForever()
            .start()
    }


    public static scaleNode(node: Node, scale: number, time = 0.5) {
        let uiTransform = node.getComponent(UITransform);
        try {
            tween(node)
                .to(0, {scale: new Vec3(scale,scale,scale), position:new Vec3(node.position.x,-uiTransform.height * (1 - scale),node.position.z) })
                .to(time, {scale: new Vec3(1,1,1), position:new Vec3(node.position.x,0,node.position.z)})
                .start()
        } catch (e) {
            node.setScale(new Vec3(1,1,1));
            node.setPosition(new Vec3(node.position.x,0,node.position.z));
            GameLog.log('shake动画异常', e);
        }
    }

    public static moveUpDownForever(node: Node, runTime = 0.2, diff = 10) {
        let _tween = tween(node);
        _tween.sequence(
            tween().by(runTime, {position:new Vec3(0, diff)}),
            tween().by(runTime, {position:new Vec3(0, -diff)}),
        )
        .repeatForever().
        start();
    }

    /**
     * 旋转节点
     * @param node
     * @param duration
     */
    public static rotate(node: Node, duration = 3) {
        try {
            let _tween = tween(node);
            _tween.sequence(
                tween().to(duration, {angle:180}),
                tween().to(duration, {angle:360}),
            )
            .repeatForever().start();

        } catch (e) {
            GameLog.error('shakeNode异常', e, node);

        }
    }


    /**
     * 放大缩小 node
     * @param node
     * @param timeRun
     * @param timeStop
     * @param scale
     * @param count
     * @param endScale
     * @constructor
     */
    public static scaleStop(node: Node, timeRun = 0.1, timeStop = 10, scale = 0.3, count = 1, endScale = 1) {
        try {
            if (!node) {
                return;
            }
            node.setScale(new Vec3(endScale, endScale, endScale));
            // node.scale = endScale;
            tween(node)
                .repeatForever(
                    tween()
                        .repeat(count,
                            tween()
                                .to(timeRun, {scale: 1 + scale}, {easing: "smooth"})
                                .to(timeRun, {scale: endScale}, {easing: "smooth"})
                        )
                        .to(timeRun, {angle: 0})
                        .delay(timeStop)
                )
                .start()


        } catch (e) {
            GameLog.error('shakeNode异常', e, node);

        }
    }

    public static shakeNode(node: Node, timeRun = 0.3, dstAngle: number = 10, count: number = 5) {
        tween(node)
            .repeat(count,
                tween()
                    .to(timeRun, {angle: -dstAngle})
                    .to(timeRun, {angle: dstAngle})
            ).to(timeRun, {angle: 0}).start();
    }

    /**
     * 摇动node
     * @param node
     * @param duration
     * @param dstAngle
     * @constructor
     */
    public static shakeNodeForever(node: Node, duration = 4, dstAngle = 10) {
        try {
            tween(node).sequence(
                tween().to(duration, {angle:-dstAngle}),
                tween().to(duration, {angle:dstAngle}),
            )
            .repeatForever().start();

        } catch (e) {
            GameLog.error('shakeNode异常', e, node);

        }
    }

    /**
     * node晃动后停止，一段时间后继续晃动
     * @param node 动作的节点
     * @param timeRun 单次晃动到左右任一边的时间
     * @param timeStop 停止的时间
     * @param dstAngle 晃动的角度
     * @param shakeCount 晃动的次数
     */
    public static shakeStop(node: Node, timeRun = 0.1, timeStop = 10, dstAngle = 10, shakeCount = 5) {
        try {
            tween(node)
                .repeatForever(
                    tween()
                        .delay(timeStop)
                        .repeat(shakeCount,
                            tween()
                                .to(timeRun, {angle: -dstAngle})
                                .to(timeRun, {angle: dstAngle})
                        )
                        .to(timeRun, {angle: 0})
                )
                .start()

        } catch (e) {

            GameLog.error('shakeStop异常', e, node);
        }
    }

    public static scaleMove(node: Node, delayTime: number = 3, repeatCount: number = 2,) {
        tween(node)
            .repeatForever(
                tween()
                    .delay(delayTime)
                    .repeat(repeatCount,
                        tween()
                            .to(0.3, {scale: 1.1})
                            .to(0, {scale: 1})
                            .to(0.3, {scale: 1.2})
                            .to(0, {scale: 1})
                    )
                // .repeat(repeatCount,
                //     tween()
                // )
            )
            .start();
    }

    /**
     * 界面缩放进入
     * @param node
     * @param duration
     */
    public static moveBigIn(node: Node, duration = 0.3) {
        if (!node) {
            return false;
        }
        try {
            node.setScale(new Vec3(2,2,2));
            tween(node)
                .to(duration, {scale: new Vec3(1,1,1)}, { easing: 'sineInOut'}) //easeInOut(1)
                .start();

        } catch (e) {
            node.setScale(new Vec3(1,1,1));
            GameLog.error('moveIn 异常', e, node);

        }
    }


    /**
     * 界面缩放进入
     * @param node
     * @param duration
     * @param beginSale
     */
    public static moveIn(node: Node, duration: number = 0.4, beginSale: number = 0) {
        node.setScale(new Vec3(beginSale,beginSale,beginSale));
        tween(node)
            .to(duration, {scale: new Vec3(1,1,1)}, {easing: 'backOut'})
            .start();
    }

    /**
     * 界面从上推下
     */
    public static moveTop(node: Node, time: number = 0.4) {
        let uiTransform = node.getComponent(UITransform);
        node.setPosition(new Vec3(node.position.x,uiTransform.height / 2,node.position.z));
        tween(node)
            .to(time,{position: new Vec3(node.position.x,0,node.position.z)}, {easing: "smooth"})
            .start()
    }

    /**
     * 界面缩放退出
     * @param node
     * @param duration
     * @param endScale
     */
    public static moveOut(node: Node, duration = 0.4, endScale = 0) {
        if (!node) {
            return false;
        }
        try {
            node.setScale(new Vec3(0,0,0));
            tween(node)
                .to(duration, {scale: new Vec3(endScale,endScale,endScale)}, {easing: 'linear'})
                .start();
        } catch (e) {
            node.setScale(0,0,0);
            GameLog.error('moveOut 异常', e, node);
        }
    }

    public static TWEEN_FROM_SIDE = {
        TOP: 1,
        DOWN: 2,
        LEFT: 3,
        RIGHT: 4
    };

    private static _moveSideNodePosition = {};

    /**
     * 从画布外进入, 不能重复调用
     * @param node 动作的节点
     * @param beginSide 界面进入的边
     * @param time 动作进行的时间/s
     * @param delay 动作延迟进行的时间/s
     */
    public static moveInSide(node: Node, beginSide = this.TWEEN_FROM_SIDE.TOP, time = 0.5, delay = 0) {
        if (!node) {
            return false;
        }
        if (!this._moveSideNodePosition.hasOwnProperty(node.uuid)) {
            this._moveSideNodePosition[node.uuid] = node.position.clone();
        }
        try {
            let resultPos = this._getSideResultPos(node, beginSide);
            node.position = resultPos;
            GameLog.log("节点", node.name, "界面外坐标为：", resultPos);
            tween(node)
                .delay(delay)
                .to(time, {position: this._moveSideNodePosition[node.uuid].clone()}, {easing: 'quartIn'})
                .start();
        } catch (e) {
            node.position = this._moveSideNodePosition[node.uuid].clone();
            GameLog.log("move In Side 异常", e, node);
        }

    }

    /**
     * 移出画布外, 不能重复调用
     * @param node 动作的节点
     * @param endSide 界面移出的边
     * @param time 动作进行的时间/s
     */
    public static moveOutSide(node: Node, endSide = this.TWEEN_FROM_SIDE.TOP, time = 0.5) {
        if (!node) {
            return false;
        }
        if (!this._moveSideNodePosition.hasOwnProperty(node.uuid)) {
            this._moveSideNodePosition[node.uuid] = node.position;
        }
        try {
            let resultPos = this._getSideResultPos(node, endSide);
            tween(node)
                .to(time, {position: resultPos}, {easing: 'quartIn'})
                .call(() => {
                    node.position = this._moveSideNodePosition[node.uuid].clone();
                    GameLog.log('end move out side', node.position);
                })
                .start();
        } catch (e) {
            node.position = this._moveSideNodePosition[node.uuid].clone();
            GameLog.log("move Out Side 异常", e, node);
        }

    }

    private static _getSideResultPos(node: Node, side) {
        //获取屏幕尺寸
        let winSize = view.getVisibleSize();
        let windowHeight = winSize.height;
        let windowWidth = winSize.width;
        GameLog.log("屏幕尺寸大小为：", windowHeight, windowWidth);
        //根据节点移动方向获取坐标
        let pos;
        let uiTransform = node.getComponent(UITransform);
        switch (side) {
            case ActionMgr.TWEEN_FROM_SIDE.TOP:
                pos = new Vec2(node.position.x, windowHeight + uiTransform.height);
                break;
            case ActionMgr.TWEEN_FROM_SIDE.DOWN:
                pos = new Vec2(node.position.x, -windowHeight - uiTransform.height);
                break;
            case ActionMgr.TWEEN_FROM_SIDE.LEFT:
                pos = new Vec2(-windowWidth - uiTransform.width, node.position.y);
                break;
            case ActionMgr.TWEEN_FROM_SIDE.RIGHT:
                pos = new Vec2(windowWidth + uiTransform.width, node.position.y);
                break;
        }
        return pos;
    }

    /**
     * 左右移动
     * @param node 运动的节点
     * @param direction 运动的方向
     * @param disMove 运动的距离
     * @param timeMove 运动的时间/s
     */
    public static moveLeftRight(node: Node, direction, disMove: number, timeMove: number) {
        try {
            let lessPos;
            let morePos;
            switch (direction) {
                case ActionMgr.TWEEN_FROM_SIDE.LEFT:
                case ActionMgr.TWEEN_FROM_SIDE.RIGHT:
                    lessPos = new Vec2(node.position.x - disMove, node.position.y);
                    morePos = new Vec2(node.position.x + disMove, node.position.y);
                    break;
                case ActionMgr.TWEEN_FROM_SIDE.TOP:
                case ActionMgr.TWEEN_FROM_SIDE.DOWN:
                    lessPos = new Vec2(node.position.x, node.position.y - disMove);
                    morePos = new Vec2(node.position.x, node.position.y + disMove);
                    break;
            }
            tween(node).sequence(
                tween().to(timeMove, lessPos),
                tween().to(timeMove, morePos)
            )
                .repeatForever().start();

        } catch (e) {
            GameLog.error('moveLeftRight异常', e, node);
        }
    }

    public static showGradually(node: Node, duration = 1, delay = 0, endOpacity = 255, starOpacity = 0) {
        let opacity = node.getComponent(UIOpacity);
        if(!opacity){
            node.addComponent(UIOpacity);
        }
        try {
            tween(opacity)
                .call(() => {
                    opacity.opacity = starOpacity;
                    node.active = true;
                })
                .delay(delay)
                tween(opacity).to(duration, {opacity:0})
                .start()
        } catch (e) {
            opacity.opacity = endOpacity;
            GameLog.error('showGradually异常', e, node);
        }
    }

    public static hideGradually(node: Node, duration = 1, delay = 0, endOpacity = 50) {
        let _opacity = node.getComponent(UIOpacity);
        if(!_opacity){
            node.addComponent(UIOpacity);
        }
        try {
            node.active = true;
            tween(node)
                .delay(delay)
                tween(_opacity).to(duration, {opacity: endOpacity}, {easing: 'quartIn'})
                .call(() => {
                    node.active = false;
                    _opacity.opacity = 255;
                })
                .start()

        } catch (e) {
            _opacity.opacity = endOpacity;
            GameLog.error('showGradually异常', e, node);
        }
    }
}

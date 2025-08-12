import {
    _decorator,
    Canvas,
    director,
    instantiate,
    Label,
    Node,
    Prefab,
    Sprite,
    SpriteFrame,
    tween,
    Tween,
    UITransform,
    v3,
    Vec3,
    resources,
    AudioClip,
    ProgressBar,
    EventTouch,
    Vec2,
    input,
    Input
} from 'cc';

import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { GameType, IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import {TimerCommonComponent} from "db://assets/resources/scripts/Game/UI/Common/TimerCommonComponent";
import {BundleName} from "db://assets/resources/scripts/Core/Manager/Load/BundleName";
import { FamaNode } from './FamaNode';
const { ccclass, property } = _decorator;


@ccclass('balance')
export class balance extends BaseScene<IBaseGameChild> {


    @property(Node)
    mainView:Node = null;

    @property(ProgressBar)
    progressBar: ProgressBar;


    @property(Label)
    guankaLabel: Label;

    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent = null;


    @property(Node)
    leftNode:Node;

    @property(Node)
    rightNode:Node;


    @property([Node])
    leftFamas:Node[] = [];

    @property([Node])
    rightFamas:Node[] = [];

    @property([FamaNode])
    answerFamas:FamaNode[] = [];


    private bgmClip: AudioClip;

    private _draggingNode: FamaNode = null;
    private _dragOffset: Vec2 = new Vec2();
    private _originalPosition: Vec3 = new Vec3();

    onLoad() {
        this.audioUrls = ["music/balance_bgm", "music/loseBalance", "music/balance","music/place"];
        this.bundleName = BundleName.BALANCE;
        let self = this;
        this.loadAudio().then(() => {
            if (!self.bgmClip) {
                self.bgmClip = self.playBgmAudio("music/balance_bgm", true);
            }
        });

        // 初始化拖拽功能
        this.initDragAndDrop();
        
        // 确保场景可以接收触摸事件
        this.node.on(Node.EventType.TOUCH_START, this.onSceneTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onSceneTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onSceneTouchEnd, this);
    }

    start(){
        super.start();
    }

    quitGame() {
        // console.log("返回大厅")
        super.quitGame({ parentNode: this.mainView, context: this });
    }

    resumeCallBack(context) {
        super.resumeCallBack(context);
    }

    exitCallBack(context: any): void {
        super.exitCallBack(context);
    }

    /**
     * 初始化拖拽功能
     */
    private initDragAndDrop() {
        // 为每个answerFama添加拖拽事件
        this.answerFamas.forEach((famaNode, index) => {
            if (famaNode && famaNode.node) {
                this.setupDragEvents(famaNode);
            }
        });
    }

    /**
     * 设置拖拽事件
     */
    private setupDragEvents(famaNode: FamaNode) {
        const node = famaNode.node;
        
        // 触摸开始事件
        node.on(Input.EventType.TOUCH_START, (event: EventTouch) => {
            this.onTouchStart(event, famaNode);
        }, this);

        // 触摸移动事件
        node.on(Input.EventType.TOUCH_MOVE, (event: EventTouch) => {
            this.onTouchMove(event, famaNode);
        }, this);

        // 触摸结束事件
        node.on(Input.EventType.TOUCH_END, (event: EventTouch) => {
            this.onTouchEnd(event, famaNode);
        }, this);

        // 触摸取消事件
        node.on(Input.EventType.TOUCH_CANCEL, (event: EventTouch) => {
            this.onTouchCancel(event, famaNode);
        }, this);
    }

    /**
     * 触摸开始事件处理
     */
    private onTouchStart(event: EventTouch, famaNode: FamaNode) {
        if (this._draggingNode) return; // 如果已经在拖拽中，忽略新的触摸

        this._draggingNode = famaNode;
        const touchPos = event.getUILocation();
        const nodePos = famaNode.node.getWorldPosition();
        
        // 计算触摸点与节点位置的偏移
        this._dragOffset.x = touchPos.x - nodePos.x;
        this._dragOffset.y = touchPos.y - nodePos.y;
        
        // 保存原始位置
        this._originalPosition.set(nodePos);
        
        // 可以在这里添加拖拽开始的视觉反馈
        this.onDragStart(famaNode);
    }

    /**
     * 触摸移动事件处理
     */
    private onTouchMove(event: EventTouch, famaNode: FamaNode) {
        if (this._draggingNode !== famaNode) return;

        const touchPos = event.getUILocation();
        
        // 计算新的节点位置（减去偏移量）
        const newX = touchPos.x - this._dragOffset.x;
        const newY = touchPos.y - this._dragOffset.y;
        
        // 更新节点位置
        famaNode.node.setWorldPosition(newX, newY, this._originalPosition.z);
        
        // 可以在这里添加拖拽中的逻辑
        this.onDragMove(famaNode, touchPos);
    }

    /**
     * 触摸结束事件处理
     */
    private onTouchEnd(event: EventTouch, famaNode: FamaNode) {
        if (this._draggingNode !== famaNode) return;

        const touchPos = event.getUILocation();
        
        // 可以在这里添加拖拽结束的逻辑
        this.onDragEnd(famaNode, touchPos);
        
        // 清理拖拽状态
        this._draggingNode = null;
    }

    /**
     * 触摸取消事件处理
     */
    private onTouchCancel(event: EventTouch, famaNode: FamaNode) {
        if (this._draggingNode !== famaNode) return;

        // 恢复原始位置
        famaNode.node.setWorldPosition(this._originalPosition);
        
        // 清理拖拽状态
        this._draggingNode = null;
        
        // 可以在这里添加拖拽取消的逻辑
        this.onDragCancel(famaNode);
    }

    /**
     * 拖拽开始回调
     */
    private onDragStart(famaNode: FamaNode) {
        // 可以在这里添加拖拽开始的视觉反馈
        // 例如：改变透明度、缩放等
        famaNode.node.setScale(1.1, 1.1, 1.1);
    }

    /**
     * 拖拽移动回调
     */
    private onDragMove(famaNode: FamaNode, touchPos: Vec2) {
        // 可以在这里添加拖拽中的逻辑
        // 例如：检查是否接近目标位置等
    }

    /**
     * 拖拽结束回调
     */
    private onDragEnd(famaNode: FamaNode, touchPos: Vec2) {
        // 恢复原始缩放
        famaNode.node.setScale(1, 1, 1);
        
        // 可以在这里添加拖拽结束的逻辑
        // 例如：检查是否放在正确位置、播放音效等
        this.checkDropPosition(famaNode, touchPos);
    }

    /**
     * 拖拽取消回调
     */
    private onDragCancel(famaNode: FamaNode) {
        // 恢复原始缩放
        famaNode.node.setScale(1, 1, 1);
    }

    /**
     * 检查拖拽结束位置
     */
    private checkDropPosition(famaNode: FamaNode, touchPos: Vec2) {
        // 这里可以添加检查逻辑，判断famaNode是否放在了正确的位置
        // 例如：检查是否与leftFamas或rightFamas中的某个位置重叠
        
        // 示例：检查是否放在左侧区域
        if (this.leftNode) {
            const leftBounds = this.leftNode.getComponent(UITransform);
            if (leftBounds) {
                const leftWorldPos = this.leftNode.getWorldPosition();
                const leftRect = {
                    x: leftWorldPos.x - leftBounds.width / 2,
                    y: leftWorldPos.y - leftBounds.height / 2,
                    width: leftBounds.width,
                    height: leftBounds.height
                };
                
                if (this.isPointInRect(touchPos, leftRect)) {
                    console.log("拖拽到左侧区域");
                    // 可以在这里添加相应的逻辑
                }
            }
        }
        
        // 示例：检查是否放在右侧区域
        if (this.rightNode) {
            const rightBounds = this.rightNode.getComponent(UITransform);
            if (rightBounds) {
                const rightWorldPos = this.rightNode.getWorldPosition();
                const rightRect = {
                    x: rightWorldPos.x - rightBounds.width / 2,
                    y: rightWorldPos.y - rightBounds.height / 2,
                    width: rightBounds.width,
                    height: rightBounds.height
                };
                
                if (this.isPointInRect(touchPos, rightRect)) {
                    console.log("拖拽到右侧区域");
                    // 可以在这里添加相应的逻辑
                }
            }
        }
    }

    /**
     * 检查点是否在矩形区域内
     */
    private isPointInRect(point: Vec2, rect: { x: number, y: number, width: number, height: number }): boolean {
        return point.x >= rect.x && 
               point.x <= rect.x + rect.width && 
               point.y >= rect.y && 
               point.y <= rect.y + rect.height;
    }

    /**
     * 清理拖拽事件
     */
    private cleanupDragEvents() {
        this.answerFamas.forEach((famaNode) => {
            if (famaNode && famaNode.node) {
                famaNode.node.off(Input.EventType.TOUCH_START);
                famaNode.node.off(Input.EventType.TOUCH_MOVE);
                famaNode.node.off(Input.EventType.TOUCH_END);
                famaNode.node.off(Input.EventType.TOUCH_CANCEL);
            }
        });
    }

    /**
     * 场景触摸开始事件
     */
    private onSceneTouchStart(event: EventTouch) {
        // 场景触摸开始事件处理
    }

    /**
     * 场景触摸移动事件
     */
    private onSceneTouchMove(event: EventTouch) {
        // 场景触摸移动事件处理
    }

    /**
     * 场景触摸结束事件
     */
    private onSceneTouchEnd(event: EventTouch) {
        // 场景触摸结束事件处理
    }

    onDestroy() {
        // 清理拖拽事件
        this.cleanupDragEvents();
        
        // 清理场景触摸事件
        this.node.off(Node.EventType.TOUCH_START, this.onSceneTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onSceneTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onSceneTouchEnd, this);
        
        super.onDestroy();
    }
}
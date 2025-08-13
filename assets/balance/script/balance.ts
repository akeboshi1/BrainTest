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
import { TimerCommonComponent } from "db://assets/resources/scripts/Game/UI/Common/TimerCommonComponent";
import { BundleName } from "db://assets/resources/scripts/Core/Manager/Load/BundleName";
import { FamaNode } from './FamaNode';
const { ccclass, property } = _decorator;


@ccclass('balance')
export class balance extends BaseScene<IBaseGameChild> {


    @property(Node)
    mainView: Node = null;

    @property(ProgressBar)
    progressBar: ProgressBar;


    @property(Label)
    guankaLabel: Label;

    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent = null;

    @property(Node)
    ganzi: Node;

    @property(Node)
    leftPanNode: Node;

    @property(Node)
    rightPanNode: Node;

    @property(Node)
    leftNode: Node;

    @property(Node)
    rightNode: Node;


    @property([Node])
    leftFamas: Node[] = [];

    @property([Node])
    rightFamas: Node[] = [];

    @property([FamaNode])
    answerFamas: FamaNode[] = [];

    @property([Node])
    answerNodes: Node[] = [];

    @property(Node)
    answerNode: Node;


    private bgmClip: AudioClip;

    private _draggingNode: FamaNode = null;
    private _dragOffset: Vec2 = new Vec2();
    private _originalPosition: Vec3 = new Vec3();
    private _leftPanOriginalPos: Vec3 = new Vec3();
    private _rightPanOriginalPos: Vec3 = new Vec3();

    // 添加难度相关属性
    gameDifficulty: number = 2; // 1: 简单, 2: 中等, 3: 困难

    // 难度配置
    private readonly DIFFICULTY_CONFIG = {
        1: { answerCount: 4, panCount: 2 },
        2: { answerCount: 6, panCount: 3 },
        3: { answerCount: 8, panCount: 4 }
    };

    onLoad() {
        this.audioUrls = ["music/balance_bgm", "music/loseBalance", "music/balance", "music/place"];
        this.bundleName = BundleName.BALANCE;
        let self = this;
        this.loadAudio().then(() => {
            if (!self.bgmClip) {
                self.bgmClip = self.playBgmAudio("music/balance_bgm", true);
            }
        });

        // 保存托盘的原始位置
        if (this.leftPanNode) {
            this._leftPanOriginalPos.set(this.leftPanNode.position);
        }
        if (this.rightPanNode) {
            this._rightPanOriginalPos.set(this.rightPanNode.position);
        }

        // 初始化拖拽功能
        this.initDragAndDrop();

        // 确保场景可以接收触摸事件
        this.node.on(Node.EventType.TOUCH_START, this.onSceneTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onSceneTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onSceneTouchEnd, this);
    }

    start() {
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
        // 根据难度设置可用的砝码数量
        this.setupDifficulty();
        
        // 为每个可用的answerFama添加拖拽事件
        this.answerFamas.forEach((famaNode, index) => {
            if (famaNode && famaNode.node && index < this.DIFFICULTY_CONFIG[this.gameDifficulty].answerCount) {
                this.setupDragEvents(famaNode);
            }
        });
    }

    /**
     * 根据难度设置游戏配置
     */
    private setupDifficulty() {
        const config = this.DIFFICULTY_CONFIG[this.gameDifficulty];
        
        // 设置可用的answerFamas数量
        this.answerFamas.forEach((famaNode, index) => {
            if (famaNode && famaNode.node) {
                if (index < config.answerCount) {
                    // 启用可用的砝码
                    famaNode.node.active = true;
                } else {
                    // 禁用不可用的砝码
                    famaNode.node.active = false;
                }
            }
        });

        // 设置可用的托盘位置数量
        this.leftFamas.forEach((famaNode, index) => {
            if (famaNode) {
                if (index < config.panCount) {
                    // 启用可用的托盘位置
                    famaNode.active = true;
                } else {
                    // 禁用不可用的托盘位置
                    famaNode.active = false;
                }
            }
        });

        this.rightFamas.forEach((famaNode, index) => {
            if (famaNode) {
                if (index < config.panCount) {
                    // 启用可用的托盘位置
                    famaNode.active = true;
                } else {
                    // 禁用不可用的托盘位置
                    famaNode.active = false;
                }
            }
        });

        console.log(`游戏难度: ${this.gameDifficulty}, 砝码数量: ${config.answerCount}, 托盘位置: ${config.panCount}`);
    }

    /**
     * 设置游戏难度
     */
    public setDifficulty(difficulty: number) {
        if (difficulty >= 1 && difficulty <= 3) {
            this.gameDifficulty = difficulty;
            this.setupDifficulty();
            this.initDragAndDrop();
        }
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

        // 检查是否放在正确位置
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
    * 将famaNode移动到answerNode
    */
    private moveFamaToAnswer(famaNode: FamaNode, touchPos: Vec2) {
        // 找到answerNodes中最接近触摸位置的节点
        const targetNode = this.findClosestAnswerNode(touchPos);

        if (targetNode) {
            // 将famaNode添加为targetNode的子节点
            targetNode.addChild(famaNode.node);

            // 将砝码放置到targetNode的中心位置（本地坐标0,0,0）
            famaNode.node.setPosition(0, 0, 0);
        } else {
            // 如果没有找到合适的位置，直接添加到answerNode
            this.answerNode.addChild(famaNode.node);
            famaNode.node.setPosition(0, 0, 0);
        }

        // 播放放置音效
        this.playAudio("music/place");

        // 检查天平平衡状态
        this.checkBalanceAndTilt();
    }

    /**
     * 找到answerNodes中最接近触摸位置的节点
     */
    private findClosestAnswerNode(touchPos: Vec2): Node | null {
        let closestNode: Node | null = null;
        let minDistance = Number.MAX_VALUE;

        for (const answerNode of this.answerNodes) {
            if (answerNode && answerNode.children.length === 0) {
                // 只考虑没有子节点的answerNode（未被使用的位置）
                // 计算触摸位置与answerNode位置的距离
                const answerNodeWorldPos = answerNode.getWorldPosition();
                const distance = Vec2.distance(touchPos, new Vec2(answerNodeWorldPos.x, answerNodeWorldPos.y));

                if (distance < minDistance) {
                    minDistance = distance;
                    closestNode = answerNode;
                }
            }
        }

        return closestNode;
    }
    /**
     * 检查拖拽结束位置
     */
    private checkDropPosition(famaNode: FamaNode, touchPos: Vec2) {
        // 检查是否放在answerNode上
        if (this.answerNode) {
            const answerBounds = this.answerNode.getComponent(UITransform);
            if (answerBounds) {
                const answerWorldPos = this.answerNode.getWorldPosition();
                const answerRect = {
                    x: answerWorldPos.x - answerBounds.width / 2,
                    y: answerWorldPos.y - answerBounds.height / 2,
                    width: answerBounds.width,
                    height: answerBounds.height
                };
                
                if (this.isPointInRect(touchPos, answerRect)) {
                    console.log("拖拽到answerNode");
                    this.moveFamaToAnswer(famaNode, touchPos);
                    return;
                }
            }
        }
        
        // 检查是否放在左侧砝码位置（只检查可用的位置）
        const config = this.DIFFICULTY_CONFIG[this.gameDifficulty];
        for (let i = 0; i < config.panCount; i++) {
            const leftFamaNode = this.leftFamas[i];
            if (leftFamaNode && leftFamaNode.active && leftFamaNode.children.length === 0) {
                const leftBounds = leftFamaNode.getComponent(UITransform);
                if (leftBounds) {
                    const leftWorldPos = leftFamaNode.getWorldPosition();
                    const leftRect = {
                        x: leftWorldPos.x - leftBounds.width / 2,
                        y: leftWorldPos.y - leftBounds.height / 2,
                        width: leftBounds.width,
                        height: leftBounds.height
                    };
                    
                    if (this.isPointInRect(touchPos, leftRect)) {
                        console.log(`拖拽到左侧砝码位置 ${i}`);
                        this.moveFamaToTarget(famaNode, leftFamaNode);
                        return;
                    }
                }
            }
        }
        
        // 检查是否放在右侧砝码位置（只检查可用的位置）
        for (let i = 0; i < config.panCount; i++) {
            const rightFamaNode = this.rightFamas[i];
            if (rightFamaNode && rightFamaNode.active && rightFamaNode.children.length === 0) {
                const rightBounds = rightFamaNode.getComponent(UITransform);
                if (rightBounds) {
                    const rightWorldPos = rightFamaNode.getWorldPosition();
                    const rightRect = {
                        x: rightWorldPos.x - rightBounds.width / 2,
                        y: rightWorldPos.y - rightBounds.height / 2,
                        width: rightBounds.width,
                        height: rightBounds.height
                    };
                    
                    if (this.isPointInRect(touchPos, rightRect)) {
                        console.log(`拖拽到右侧砝码位置 ${i}`);
                        this.moveFamaToTarget(famaNode, rightFamaNode);
                        return;
                    }
                }
            }
        }
        
        // 如果没有放在任何有效位置，恢复原始位置
        famaNode.node.setWorldPosition(this._originalPosition);
    }




    /**
     * 将famaNode移动到目标节点作为子节点
     */
    private moveFamaToTarget(famaNode: FamaNode, targetNode: Node) {
        // 将famaNode添加为targetNode的子节点
        targetNode.addChild(famaNode.node);

        // 将砝码放置到目标节点的中心位置（本地坐标0,0,0）
        famaNode.node.setPosition(0, 0, 0);

        // 播放放置音效
        this.playAudio("music/place");

        // 检查天平平衡状态
        this.checkBalanceAndTilt();

        // 可以在这里添加放置成功的视觉反馈
        // 例如：播放动画、改变颜色等
    }

    /**
     * 检查famaNode是否已经被放置
     */
    private isFamaPlaced(famaNode: FamaNode): boolean {
        // 检查节点是否已经是leftFamas或rightFamas中某个节点的子节点
        const parent = famaNode.node.parent;
        if (!parent) return false;

        // 检查是否在leftFamas中
        for (const leftFama of this.leftFamas) {
            if (leftFama && leftFama.children.includes(famaNode.node)) {
                return true;
            }
        }

        // 检查是否在rightFamas中
        for (const rightFama of this.rightFamas) {
            if (rightFama && rightFama.children.includes(famaNode.node)) {
                return true;
            }
        }

        return false;
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
     * 检查天平平衡状态并执行倾斜效果
     */
      private checkBalanceAndTilt() {
        const config = this.DIFFICULTY_CONFIG[this.gameDifficulty];
        
        // 计算左侧砝码总重量（只计算可用的托盘位置）
        let leftTotalWeight = 0;
        for (let i = 0; i < config.panCount; i++) {
            const leftFama = this.leftFamas[i];
            if (leftFama && leftFama.active && leftFama.children.length > 0) {
                const famaNode = leftFama.children[0].getComponent(FamaNode);
                if (famaNode) {
                    leftTotalWeight += famaNode.value;
                }
            }
        }

        // 计算右侧砝码总重量（只计算可用的托盘位置）
        let rightTotalWeight = 0;
        for (let i = 0; i < config.panCount; i++) {
            const rightFama = this.rightFamas[i];
            if (rightFama && rightFama.active && rightFama.children.length > 0) {
                const famaNode = rightFama.children[0].getComponent(FamaNode);
                if (famaNode) {
                    rightTotalWeight += famaNode.value;
                }
            }
        }

        console.log(`难度${this.gameDifficulty} - 左侧总重量: ${leftTotalWeight}kg, 右侧总重量: ${rightTotalWeight}kg`);

        // 根据重量差异执行倾斜效果
        if (leftTotalWeight > rightTotalWeight) {
            // 左边重，杆子向左倾斜
            this.tiltBalance(4);
        } else if (rightTotalWeight > leftTotalWeight) {
            // 右边重，杆子向右倾斜
            this.tiltBalance(-4);
        } else {
            // 平衡状态，杆子保持水平
            this.tiltBalance(0);
        }
    }

    /**
     * 执行天平倾斜动画
     */
    private tiltBalance(angle: number) {
        // 停止之前的动画
        Tween.stopAllByTarget(this.ganzi);
        Tween.stopAllByTarget(this.leftPanNode);
        Tween.stopAllByTarget(this.rightPanNode);

        // 杆子倾斜动画
        tween(this.ganzi)
            .to(0.5, { angle: angle }, { easing: 'sineOut' })
            .start();

        // 左侧托盘跟随动画
        if (angle > 0) {
            // 左边重时，左侧托盘下沉
            tween(this.leftPanNode)
                .to(0.5, { position: v3(this._leftPanOriginalPos.x, this._leftPanOriginalPos.y - 20, 0) }, { easing: 'sineOut' })
                .start();

            // 右侧托盘上浮
            tween(this.rightPanNode)
                .to(0.5, { position: v3(this._rightPanOriginalPos.x, this._rightPanOriginalPos.y + 20, 0) }, { easing: 'sineOut' })
                .start();
        } else if (angle < 0) {
            // 右边重时，右侧托盘下沉
            tween(this.rightPanNode)
                .to(0.5, { position: v3(this._rightPanOriginalPos.x, this._rightPanOriginalPos.y - 20, 0) }, { easing: 'sineOut' })
                .start();

            // 左侧托盘上浮
            tween(this.leftPanNode)
                .to(0.5, { position: v3(this._leftPanOriginalPos.x, this._leftPanOriginalPos.y + 20, 0) }, { easing: 'sineOut' })
                .start();
        } else {
            // 平衡状态，托盘回到原始位置
            tween(this.leftPanNode)
                .to(0.5, { position: this._leftPanOriginalPos }, { easing: 'sineOut' })
                .start();

            tween(this.rightPanNode)
                .to(0.5, { position: this._rightPanOriginalPos }, { easing: 'sineOut' })
                .start();
        }

        // 让砝码跟随托盘一起浮动
        this.updateFamaPositions(angle);
    }

    /**
     * 更新砝码位置，让砝码跟随托盘一起浮动
     */
    private updateFamaPositions(angle: number) {
        // 更新左侧砝码位置
        for (const leftFama of this.leftFamas) {
            if (leftFama && leftFama.children.length > 0) {
                const famaNode = leftFama.children[0];
                if (famaNode) {
                    if (angle > 0) {
                        // 左边重时，左侧砝码下沉
                        tween(famaNode)
                            .to(0.5, { position: v3(0, -20, 0) }, { easing: 'sineOut' })
                            .start();
                    } else if (angle < 0) {
                        // 右边重时，左侧砝码上浮
                        tween(famaNode)
                            .to(0.5, { position: v3(0, 20, 0) }, { easing: 'sineOut' })
                            .start();
                    } else {
                        // 平衡状态，砝码回到中心位置
                        tween(famaNode)
                            .to(0.5, { position: v3(0, 0, 0) }, { easing: 'sineOut' })
                            .start();
                    }
                }
            }
        }

        // 更新右侧砝码位置
        for (const rightFama of this.rightFamas) {
            if (rightFama && rightFama.children.length > 0) {
                const famaNode = rightFama.children[0];
                if (famaNode) {
                    if (angle > 0) {
                        // 左边重时，右侧砝码上浮
                        tween(famaNode)
                            .to(0.5, { position: v3(0, 20, 0) }, { easing: 'sineOut' })
                            .start();
                    } else if (angle < 0) {
                        // 右边重时，右侧砝码下沉
                        tween(famaNode)
                            .to(0.5, { position: v3(0, -20, 0) }, { easing: 'sineOut' })
                            .start();
                    } else {
                        // 平衡状态，砝码回到中心位置
                        tween(famaNode)
                            .to(0.5, { position: v3(0, 0, 0) }, { easing: 'sineOut' })
                            .start();
                    }
                }
            }
        }
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
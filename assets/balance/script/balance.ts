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
import { BalanceQuestionGenerator, BalanceQuestion } from './BalanceQuestionGenerator';
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

    // 当前题目
    private currentQuestion: BalanceQuestion = null;

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

        // 检查answerNode是否正确设置
        if (!this.answerNode) {
            console.warn("answerNode未设置，使用默认的answerNode");
            // 如果没有设置answerNode，使用第一个answerNodes作为默认值
            if (this.answerNodes && this.answerNodes.length > 0) {
                this.answerNode = this.answerNodes[0];
            }
        }

        // 初始化拖拽功能
        this.initDragAndDrop();

        // 确保场景可以接收触摸事件
        this.node.on(Node.EventType.TOUCH_START, this.onSceneTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onSceneTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onSceneTouchEnd, this);

        // 输出调试信息
        console.log(`Balance场景加载完成，当前难度: ${this.gameDifficulty}`);
        console.log(`answerNode: ${this.answerNode ? this.answerNode.name : 'null'}`);
        console.log(`answerFamas数量: ${this.answerFamas.length}`);
        console.log(`answerNodes数量: ${this.answerNodes.length}`);
    }

    start() {
        super.start();
        this.generateQuestion();
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
            // 重新生成题目
            this.generateQuestion();
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
            
            console.log(`砝码已返回到answerNode位置: ${targetNode.name}`);
        } else {
            // 如果没有找到合适的位置，尝试找到原始的answerNode位置
            const originalIndex = this.findOriginalAnswerNodeIndex(famaNode);
            if (originalIndex >= 0 && originalIndex < this.answerNodes.length) {
                const originalNode = this.answerNodes[originalIndex];
                originalNode.addChild(famaNode.node);
                famaNode.node.setPosition(0, 0, 0);
                console.log(`砝码已返回到原始位置: ${originalNode.name}`);
            } else {
                // 最后的选择，添加到默认的answerNode
                this.answerNode.addChild(famaNode.node);
                famaNode.node.setPosition(0, 0, 0);
                console.log(`砝码已添加到默认answerNode: ${this.answerNode.name}`);
            }
        }

        // 播放放置音效
        this.playAudio("music/place");

        // 检查天平平衡状态
        this.checkBalanceAndTilt();
    }

    /**
     * 找到砝码的原始answerNode位置索引
     */
    private findOriginalAnswerNodeIndex(famaNode: FamaNode): number {
        // 遍历answerFamas数组，找到对应的索引
        for (let i = 0; i < this.answerFamas.length; i++) {
            if (this.answerFamas[i] === famaNode) {
                return i;
            }
        }
        return -1;
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
            if (leftFamaNode && leftFamaNode.active) {
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
                        // 如果该位置已有砝码，先移除它
                        if (leftFamaNode.children.length > 0) {
                            const existingFama = leftFamaNode.children[0];
                            leftFamaNode.removeChild(existingFama);
                            // 将原来的砝码放回answerNode
                            this.moveFamaToAnswer(existingFama.getComponent(FamaNode), touchPos);
                        }
                        this.moveFamaToTarget(famaNode, leftFamaNode);
                        return;
                    }
                }
            }
        }
        
        // 检查是否放在右侧砝码位置（只检查可用的位置）
        for (let i = 0; i < config.panCount; i++) {
            const rightFamaNode = this.rightFamas[i];
            if (rightFamaNode && rightFamaNode.active) {
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
                        // 如果该位置已有砝码，先移除它
                        if (rightFamaNode.children.length > 0) {
                            const existingFama = rightFamaNode.children[0];
                            rightFamaNode.removeChild(existingFama);
                            // 将原来的砝码放回answerNode
                            this.moveFamaToAnswer(existingFama.getComponent(FamaNode), touchPos);
                        }
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
        // 如果砝码已经在某个托盘上，先移除它
        if (this.isFamaPlaced(famaNode)) {
            const currentParent = famaNode.node.parent;
            if (currentParent) {
                currentParent.removeChild(famaNode.node);
                console.log(`砝码 ${famaNode.value}kg 已从 ${currentParent.name} 移除`);
            }
        }

        // 将famaNode添加为targetNode的子节点
        targetNode.addChild(famaNode.node);

        // 将砝码放置到目标节点的中心位置（本地坐标0,0,0）
        famaNode.node.setPosition(0, 0, 0);

        // 播放放置音效
        this.playAudio("music/place");

        // 检查天平平衡状态
        this.checkBalanceAndTilt();

        console.log(`砝码 ${famaNode.value}kg 已放置到 ${targetNode.name}`);

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
            
            // 检查是否完成游戏
            this.checkGameCompletion();
        }
    }

    /**
     * 检查游戏是否完成
     */
    private checkGameCompletion() {
        if (!this.currentQuestion) return;

        const config = this.DIFFICULTY_CONFIG[this.gameDifficulty];
        let isCompleted = true;

        // 检查是否所有可用的砝码都被放置
        for (let i = 0; i < config.answerCount; i++) {
            const famaNode = this.answerFamas[i];
            if (famaNode && famaNode.node && famaNode.node.active) {
                // 检查砝码是否被放置到托盘上
                const isPlaced = this.isFamaPlaced(famaNode);
                if (!isPlaced) {
                    isCompleted = false;
                    break;
                }
            }
        }

        if (isCompleted) {
            console.log("恭喜！游戏完成！");
            this.onGameCompleted();
        }
    }

    /**
     * 游戏完成回调
     */
    private onGameCompleted() {
        // 播放成功音效
        this.playAudio("music/balance");
        
        // 显示成功提示
        if (this.guankaLabel) {
            this.guankaLabel.string = "恭喜完成！";
        }
        
        // 延迟后重新开始游戏，生成新题目
        this.scheduleOnce(() => {
            this.restartGame();
        }, 2);
    }

    /**
     * 重新开始游戏
     */
    public restartGame() {
        // 重置所有砝码位置
        this.resetAllFamas();
        
        // 生成新题目（从题库中随机选择）
        this.generateQuestion();
        
        // 重置天平状态
        this.tiltBalance(0);
        
        // 更新关卡标签
        if (this.guankaLabel) {
            this.guankaLabel.string = `关卡: ${this.gameDifficulty}`;
        }
        
        console.log("游戏已重新开始，生成了新题目");
    }

    /**
     * 重置所有砝码位置
     */
    private resetAllFamas() {
        // 重置托盘上的砝码，让它们回到answerNodes中对应的位置
        this.answerFamas.forEach((famaNode, index) => {
            if (famaNode && famaNode.node) {
                // 如果砝码在托盘上，将其放回对应的answerNode位置
                if (this.isFamaPlaced(famaNode)) {
                    famaNode.node.removeFromParent();
                    
                    // 将砝码放回对应的answerNode位置
                    if (index < this.answerNodes.length) {
                        const targetNode = this.answerNodes[index];
                        if (targetNode) {
                            targetNode.addChild(famaNode.node);
                            famaNode.node.setPosition(0, 0, 0); // 相对于targetNode的本地坐标
                            console.log(`砝码 ${index} 已重置到位置: ${targetNode.name}`);
                        }
                    } else {
                        // 如果没有对应的answerNode，添加到默认的answerNode
                        if (this.answerNode) {
                            this.answerNode.addChild(famaNode.node);
                            famaNode.node.setPosition(0, 0, 0);
                            console.log(`砝码 ${index} 已重置到默认位置: ${this.answerNode.name}`);
                        }
                    }
                }
            }
        });

        // 清空托盘
        this.leftFamas.forEach((famaNode) => {
            if (famaNode) {
                famaNode.removeAllChildren();
            }
        });

        this.rightFamas.forEach((famaNode) => {
            if (famaNode) {
                famaNode.removeAllChildren();
            }
        });

        console.log("托盘上的砝码已重置到对应的answerNode位置");
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

    /**
     * 生成题目
     */
    private generateQuestion() {
        // 使用静态方法生成题目
        this.currentQuestion = BalanceQuestionGenerator.generateQuestion(this.gameDifficulty);
        
        // 更新关卡标签
        if (this.guankaLabel) {
            this.guankaLabel.string = `关卡: ${this.gameDifficulty}`;
        }
        
        // 根据难度设置可用的砝码数量
        const config = this.DIFFICULTY_CONFIG[this.gameDifficulty];
        
        // 设置砝码的值和可见性，但不改变它们的位置
        this.answerFamas.forEach((famaNode, index) => {
            if (famaNode && famaNode.node) {
                if (index < config.answerCount) {
                    // 启用可用的砝码
                    famaNode.node.active = true;
                    // 设置砝码的值
                    if (this.currentQuestion && this.currentQuestion.answer[index] !== undefined) {
                        famaNode.setValue(this.currentQuestion.answer[index]);
                    }
                } else {
                    // 禁用不可用的砝码
                    famaNode.node.active = false;
                }
            }
        });

        console.log(`=== 新题目生成 ===`);
        console.log(`题目描述: ${this.currentQuestion.description}`);
        console.log(`答案数组: ${this.currentQuestion.answer.join(', ')}`);
        console.log(`左侧数字: ${this.currentQuestion.leftNumbers.join(' + ')} = ${this.currentQuestion.leftSum}`);
        console.log(`右侧数字: ${this.currentQuestion.rightNumbers.join(' + ')} = ${this.currentQuestion.rightSum}`);
        console.log(`可用的砝码数量: ${config.answerCount}`);
        console.log(`砝码保持在原位置，只更新了值和可见性`);
        console.log(`==================`);
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
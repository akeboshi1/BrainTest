import { _decorator, Node, Label, RichText, Sprite, SpriteFrame, assetManager, Vec3, tween, ParticleSystem2D, ParticleAsset, UITransform } from 'cc';
import { TimerCommonComponent } from "db://assets/resources/scripts/Game/UI/Common/TimerCommonComponent";
import { UIManager } from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import { SettlementPanel } from "db://assets/resources/scripts/Core/UI/SettlementPanel";
import { BundleName } from "db://assets/resources/scripts/Core/Manager/Load/BundleName";
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { FindYourSisterModel, ImageData } from './FindYourSisterModel';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
const { ccclass, property } = _decorator;

@ccclass('Main')
export class Main extends BaseScene<IBaseGameChild> {

    @property(Node)
    mainView: Node = null;

    @property(RichText)
    questionLabel: RichText = null;

    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent = null;

    @property(Node)
    cardPool: Node;

    @property(Node)
    questionNode: Node = null;

    @property(Node)
    goodNode: Node = null;

    private itemNodes: Node[] = [];

    private questionNodes: Node[] = [];

    /** 当前显示的questionNode数量 */
    private currentQuestionNodeCount: number = 0;

    /** 记录已经设置了item图片的questionNode索引（这些节点不应该被替换为yes） */
    private questionNodesWithItemImage: Set<number> = new Set();

    private model: FindYourSisterModel = null;

    /** 存储每个item对应的ImageData数据 */
    private itemDataMap: Map<number, ImageData> = new Map();

    /** 当前游戏的需求数据（二维数组，每个子数组是一个组，每组1-5个元素） */
    private questionDatas: string[][] = [];

    /** 已点击过的item索引集合，避免重复点击 */
    private clickedItems: Set<number> = new Set();

    /** 当前所有图片数据（用于随机获取） */
    private allImageDatas: ImageData[] = [];

    /** 不同难度对应的倒计时时间（秒） */

    private readonly TIME_LIMITS: number[] = [40, 50, 60]; // 难度1: 40s, 难度2: 50s, 难度3: 60s

    protected bundleName: string = BundleName.FINDYOURSISTER;

    protected audioUrls = ['music/bgm', "music/win", "music/fail", "music/click", "music/correct", "music/huanhu"];

    onLoad(): void {
        this.loadAudio().then(() => {
            this.playBgmAudio("music/bgm", true);
        });

        this.model = FindYourSisterModel.getInstance();
        this.model.setHardIndex(2);

        // 注册结算面板
        UIManager.getInstance().registerPanel(SettlementPanel.NAME, BundleName.RESOURCES, "prefab/settlementPanel/settlementPanel", SettlementPanel);

    }


    start() {
        super.start();

        let itemLen = this.model.DIFFICULTY_COUNTS[this.model.hardIndex];
        for (let i = 0; i <= itemLen; i++) {
            const itemName = `item${i}`;
            const itemNode = this.cardPool.getChildByName(itemName);
            if (itemNode) {
                itemNode.active = false;
                this.itemNodes.push(itemNode);
            }
        }

        let questionNodeLen = 5;
        for (let i = 0; i <= questionNodeLen; i++) {
            const questionName = `question${i}`;
            const questionNode = this.questionNode.getChildByName(questionName);
            if (questionNode) {
                questionNode.active = false;
                this.questionNodes.push(questionNode);
            }
        }
        this.sceneInit();
    }

    sceneInit() {
        super.sceneInit();
        if (this.itemNodes.length > 0) {
            for (let i = 0; i < this.itemNodes.length; i++) {
                const itemNode = this.itemNodes[i];
                itemNode.active = false;
            }
        }

        // 初始化goodNode为隐藏状态
        if (this.goodNode) {
            this.goodNode.active = false;
        }

        this.refreshView();

        // 启动倒计时
        this.startTimer();
    }

    /**
     * 初始化游戏需求（根据图片数据类型）
     */
    private initQuestion(imageTypes: string[]): void {
        // 获取需求数据，传入实际图片类型数组
        this.questionDatas = this.model.getQuestionDatas(imageTypes);
        // 清空已点击的item
        this.clickedItems.clear();
        // 清空已设置item图片的questionNode记录
        this.questionNodesWithItemImage.clear();

        // 更新问题显示
        this.updateQuestionLabel();

        DebugLog.instance.log("游戏需求:", this.questionDatas);
    }

    /**
     * 获取第一个非空组的第一个元素
     */
    private getFirstQuestionType(): string | null {
        for (const group of this.questionDatas) {
            if (group.length > 0) {
                return group[0];
            }
        }
        return null;
    }

    public getFirstQuestionCount(): number {
        // 遍历二维数组，找到第一个长度不为0的一维数组
        for (let i = 0; i < this.questionDatas.length; i++) {
            const array = this.questionDatas[i];
            if (array && array.length > 0) {
                return array.length;
            }
        }
        // 如果全部循环完长度为0，则返回0
        return 0;
    }

    private getQuestionTypeName(type: string): string {
        switch (type) {
            case FindYourSisterModel.TYPE_FRUIT:
                return "水果";
            case FindYourSisterModel.TYPE_THING:
                return "日用品";
            case FindYourSisterModel.TYPE_VEGETABLE:
                return "蔬菜";
        }
    }

    /**
     * 统计指定类型在所有组中的总数量
     */
    private getTypeCount(type: string): number {
        let count = 0;
        for (const group of this.questionDatas) {
            count += group.filter(t => t === type).length;
        }
        return count;
    }

    private _preType: string;

    private _totalQuestionCount: number = 0;

    /**
     * 更新问题标签显示（只显示下一个要点击的物品）
     */
    private updateQuestionLabel(updateRes: boolean = false): void {
        if (this.questionLabel) {
            const nextType = this.getFirstQuestionType();
            if (nextType != this._preType) {
                // 类型切换时，把所有questionNodes的spriteFrame重置为roundframe
                this.resetQuestionNodesToRoundframe();
                this._totalQuestionCount = this.getFirstQuestionCount();
            }
            if (nextType) {
                // 统计该类型在所有组中剩余的数量
                const remainingCount = this.getTypeCount(nextType);
                let name = this.getQuestionTypeName(nextType);
                // 更新questionNode的显示隐藏，显示数量是remainingCount
                this.updateQuestionNodes(remainingCount, updateRes);
                // 使用富文本格式，将name和count设置为绿色
                this.questionLabel.string = `找出<color=#00ff00>${name}</color>x<color=#00ff00>${remainingCount}</color>个`;
            } else {
                // 所有需求已完成
                // 隐藏所有questionNode
                this.updateQuestionNodes(0);
                this.questionLabel.string = "";
            }
            this._preType = nextType;
        }
    }

    /**
     * 更新questionNode的显示隐藏或资源替换
     * @param count 如果updateRes为false，表示需要显示的节点数量；如果updateRes为true，表示不替换资源的数量
     * @param updateRes 如果为true则替换spriteFrame资源，如果为false则处理显示隐藏
     */
    private updateQuestionNodes(count: number, updateRes: boolean = false): void {
        if (updateRes) {
            // count表示不替换资源的数量
            // 替换数量 = 当前显示的节点数量 - count
            const replaceCount = this._totalQuestionCount - count;
            if (replaceCount <= 0) {
                for (let i = 0; i < this.questionNodes.length; i++) {
                    const questionNode = this.questionNodes[i];
                    if (questionNode) {
                        // 显示前count个节点，隐藏其他的
                        questionNode.active = i < this._totalQuestionCount;

                        // 如果节点是显示的，将其spriteFrame重置为roundframe
                        if (i < count) {
                            const sprite = questionNode.getComponent(Sprite);
                            if (sprite) {
                                const bundle = assetManager.getBundle(this.bundleName);
                                const imagePath = "texture/common/roundframe/spriteFrame";
                                bundle.load(imagePath, SpriteFrame, (err, sp) => {
                                    if (err) {
                                        DebugLog.instance.error(err);
                                        return;
                                    }
                                    sprite.spriteFrame = sp;
                                });
                            }
                        }
                    }
                }
                return;
            }

            // 从第count个节点开始替换，替换replaceCount个节点
            // 但是跳过已经设置了item图片的节点
            // for (let i = 0; i < replaceCount && i < this.questionNodes.length; i++) {
            //     // 如果这个节点已经设置了item图片，跳过
            //     if (this.questionNodesWithItemImage.has(i)) {
            //         continue;
            //     }

            //     const questionNode = this.questionNodes[i];
            //     if (questionNode) {
            //         const sprite = questionNode.getComponent(Sprite);
            //         if (sprite) {
            //             const bundle = assetManager.getBundle(this.bundleName);
            //             const imagePath = "texture/common/yes/spriteFrame";
            //             bundle.load(imagePath, SpriteFrame, (err, sp) => {
            //                 if (err) {
            //                     DebugLog.instance.error(err);
            //                     return;
            //                 }
            //                 sprite.spriteFrame = sp;
            //             });
            //         }
            //     }
            // }
        } else {
            // 处理显示隐藏逻辑
            // count表示需要显示的节点数量
            this.currentQuestionNodeCount = count;
            for (let i = 0; i < this.questionNodes.length; i++) {
                const questionNode = this.questionNodes[i];
                if (questionNode) {
                    // 显示前count个节点，隐藏其他的
                    questionNode.active = i < this._totalQuestionCount;

                    // 如果节点是显示的，将其spriteFrame重置为roundframe
                    if (i < count) {
                        const sprite = questionNode.getComponent(Sprite);
                        if (sprite) {
                            const bundle = assetManager.getBundle(this.bundleName);
                            const imagePath = "texture/common/roundframe/spriteFrame";
                            bundle.load(imagePath, SpriteFrame, (err, sp) => {
                                if (err) {
                                    DebugLog.instance.error(err);
                                    return;
                                }
                                sprite.spriteFrame = sp;
                            });
                        }
                    }
                }
            }
        }
    }

    /**
     * 将所有questionNodes的spriteFrame重置为roundframe
     */
    private resetQuestionNodesToRoundframe(): void {
        for (let i = 0; i < this.questionNodes.length; i++) {
            const questionNode = this.questionNodes[i];
            if (questionNode) {
                const sprite = questionNode.getComponent(Sprite);
                if (sprite) {
                    const bundle = assetManager.getBundle(this.bundleName);
                    const imagePath = "texture/common/roundframe/spriteFrame";
                    bundle.load(imagePath, SpriteFrame, (err, sp) => {
                        if (err) {
                            DebugLog.instance.error(err);
                            return;
                        }
                        sprite.spriteFrame = sp;
                    });
                }
            }
        }
    }

    /**
     * 将指定类型对应的所有显示的questionNode替换成yes资源
     * @param type 类型名称
     */
    private replaceQuestionNodesToYes(type: string): void {
        // 遍历所有显示的questionNode，替换资源
        // 当remainingCount == 0时，说明这个类型的任务已完成，将所有显示的节点替换成yes
        // 但是跳过已经设置了item图片的节点
        for (let i = 0; i < this.currentQuestionNodeCount && i < this.questionNodes.length; i++) {
            // 如果这个节点已经设置了item图片，跳过
            if (this.questionNodesWithItemImage.has(i)) {
                continue;
            }

            const questionNode = this.questionNodes[i];
            if (questionNode && questionNode.active) {
                const sprite = questionNode.getComponent(Sprite);
                if (sprite) {
                    const bundle = assetManager.getBundle(this.bundleName);
                    const imagePath = "texture/common/yes/spriteFrame";
                    bundle.load(imagePath, SpriteFrame, (err, sp) => {
                        if (err) {
                            DebugLog.instance.error(err);
                            return;
                        }
                        sprite.spriteFrame = sp;
                    });
                }
            }
        }
    }

    refreshView() {
        let imageDatas = this.model.getImageDatas();
        let len = imageDatas.length;

        if (len === 0) {
            DebugLog.instance.warn("图片数据为空");
            return;
        }

        // 保存所有图片数据，用于后续随机获取
        this.allImageDatas = imageDatas;

        // 统计图片数据中的所有类型
        const typeSet = new Set<string>();
        for (const imageData of imageDatas) {
            typeSet.add(imageData.type);
        }
        const imageTypes = Array.from(typeSet);

        // 初始化游戏需求（根据实际图片类型）
        this.initQuestion(imageTypes);

        // 清空之前的数据映射
        this.itemDataMap.clear();

        for (let i = 0; i < len; i++) {
            const itemNode = this.itemNodes[i];
            itemNode.active = true;
            const itemSprite = itemNode.getComponent(Sprite);
            const imageData = imageDatas[i];

            // 存储item对应的ImageData
            this.itemDataMap.set(i, imageData);

            // 随机设置旋转角度（0-360度）
            const randomRotation = Math.random() * 360;
            itemNode.angle = randomRotation;

            let imagePath = imageData.path;
            // 这里加载图片
            const bundle = assetManager.getBundle(this.bundleName);
            bundle.load(imagePath + "/spriteFrame", SpriteFrame, (err, sp) => {
                if (err) {
                    DebugLog.instance.error(err);
                    return;
                }
                itemSprite.spriteFrame = sp;
            })
        }
    }

    itmeClick(event, data) {
        const index = Number(data);
        DebugLog.instance.log("itemClick", index);

        // 检查是否已经点击过
        if (this.clickedItems.has(index)) {
            DebugLog.instance.log("该item已点击过，忽略");
            return;
        }

        // 获取对应的ImageData
        const imageData = this.itemDataMap.get(index);
        if (!imageData) {
            DebugLog.instance.warn(`未找到索引 ${index} 对应的ImageData`);
            return;
        }

        // 获取当前要点击的类型（第一个非空组的第一个元素）
        const currentTargetType = this.getFirstQuestionType();

        if (!currentTargetType) {
            DebugLog.instance.log("所有需求已完成");
            return;
        }

        // 检查点击的类型是否是当前要点击的类型
        if (imageData.type !== currentTargetType) {
            this.playAudio("music/click", true);

            DebugLog.instance.log(`点击错误！当前需要点击 ${currentTargetType}，但点击的是 ${imageData.type}`);
            // 添加错误抖动动画
            this.shakeItemNode(this.itemNodes[index]);
            return;
        }
        this.playAudio("music/correct", true);

        // 点击正确，从第一个非空组中移除第一个元素
        for (let i = 0; i < this.questionDatas.length; i++) {
            const group = this.questionDatas[i];
            if (group.length > 0) {
                group.shift();
                // 如果组为空，可以选择移除该组（可选）
                // if (group.length === 0) {
                //     this.questionDatas.splice(i, 1);
                // }
                break;
            }
        }

        // 标记该item已点击
        this.clickedItems.add(index);

        // 统计剩余数量（如果还有相同类型的话）
        const remainingCount = this.getTypeCount(imageData.type);
        DebugLog.instance.log(`点击正确！${imageData.type} 剩余数量: ${remainingCount}`);

        // 如果剩余数量为0，将当前类型对应的所有显示的questionNode替换成yes
        if (remainingCount == 0) {
            //表示当前组找东西完成，开启下一组
            // this.replaceQuestionNodesToYes(imageData.type);

            // 检查是否还有下一组
            const nextType = this.getFirstQuestionType();
            if (nextType !== null) {
                this.playAudio("music/huanhu", true);
                // 还有下一组，显示goodNode（使用tween动画）
                if (this.goodNode) {
                    this.goodNode.active = true;
                    this.goodNode.setScale(0, 0, 1);
                    tween(this.goodNode)
                        .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }) // 放大到1，带弹簧效果
                        .delay(1.0) // 保持1秒
                        .to(0.3, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' }) // 缩小到0，带弹簧效果
                        .call(() => {
                            // 动画完成后隐藏节点
                            if (this.goodNode && this.goodNode.isValid) {
                                this.goodNode.active = false;
                            }
                        })
                        .start();
                }
            } else {
                // 没有下一组了，隐藏goodNode
                if (this.goodNode) {
                    this.goodNode.active = false;
                }
            }
        }

        // 让itemNode飞到对应的questionNode
        // 获取被点击的item节点位置作为起始位置
        const clickedItemNode = this.itemNodes[index];
        if (clickedItemNode) {
            this.moveItemNodeToQuestionNode(clickedItemNode, this._totalQuestionCount - remainingCount);
        }

        // 更新问题显示（不再重新生成imageData）
        this.updateQuestionLabel(true);

        // 检查是否所有需求都完成了
        if (this.checkWin()) {
            this.onGameWin();
        }
    }

    /**
     * 更新指定item的图片（完全随机）
     * @param itemIndex item索引
     */
    private updateItemImage(itemIndex: number): void {
        // 如果所有组都为空，不需要更新
        if (this.getFirstQuestionType() === null) {
            DebugLog.instance.log("所有需求已完成，不需要更新图片");
            return;
        }

        // 从所有图片数据中统计所有可用类型（完全随机，不限定类型）
        const allTypes = new Set<string>();
        for (const imageData of this.allImageDatas) {
            allTypes.add(imageData.type);
        }

        // 转换为数组，用于随机选择
        const availableTypes = Array.from(allTypes);

        if (availableTypes.length === 0) {
            DebugLog.instance.warn("没有可用的图片类型");
            return;
        }

        // 从所有可用类型中随机获取一个ImageData（完全自由随机）
        const newImageData = this.model.getRandomImageDataByTypes(availableTypes);

        if (!newImageData) {
            DebugLog.instance.warn("无法获取新的ImageData");
            return;
        }

        // 获取item节点和sprite组件
        const itemNode = this.itemNodes[itemIndex];
        if (!itemNode) {
            DebugLog.instance.warn(`未找到索引 ${itemIndex} 对应的item节点`);
            return;
        }

        const itemSprite = itemNode.getComponent(Sprite);
        if (!itemSprite) {
            DebugLog.instance.warn(`索引 ${itemIndex} 的item节点没有Sprite组件`);
            return;
        }

        // 更新item对应的ImageData
        this.itemDataMap.set(itemIndex, newImageData);

        // 从已点击集合中移除，使其可以重新点击
        this.clickedItems.delete(itemIndex);

        // 随机设置新的旋转角度（0-360度）
        const randomRotation = Math.random() * 360;
        itemNode.angle = randomRotation;

        // 加载新的图片
        const imagePath = newImageData.path;
        const bundle = assetManager.getBundle(this.bundleName);
        bundle.load(imagePath + "/spriteFrame", SpriteFrame, (err, sp) => {
            if (err) {
                DebugLog.instance.error(err);
                return;
            }
            itemSprite.spriteFrame = sp;
            DebugLog.instance.log(`更新item ${itemIndex} 的图片为: ${newImageData.type}`);
        });
    }

    /**
     * 检查是否胜利（所有组都为空）
     */
    private checkWin(): boolean {
        return this.getFirstQuestionType() === null;
    }

    /**
     * 让itemNode飞到对应的questionNode，并将spriteFrame设置到questionNode
     * @param itemNode 被点击的item节点
     * @param remainingCount 剩余数量（用于确定目标节点索引）
     */
    private moveItemNodeToQuestionNode(itemNode: Node, remainingCount: number): void {
        // 找到目标questionNode（应该是当前剩余数量对应的节点）
        // 剩余数量就是需要显示的节点数量，目标节点应该是最后一个显示的节点（索引为 remainingCount - 1）

        const targetNodeIndex = remainingCount - 1;

        if (targetNodeIndex >= this.questionNodes.length || targetNodeIndex < 0) {
            DebugLog.instance.warn(`目标节点索引 ${targetNodeIndex} 超出范围`);
            return;
        }

        const targetQuestionNode = this.questionNodes[targetNodeIndex];
        if (!targetQuestionNode || !targetQuestionNode.active) {
            DebugLog.instance.warn(`目标节点不存在或未激活`);
            return;
        }

        // 获取itemNode的Sprite组件
        const itemSprite = itemNode.getComponent(Sprite);
        if (!itemSprite || !itemSprite.spriteFrame) {
            DebugLog.instance.warn(`itemNode没有Sprite组件或spriteFrame为空`);
            return;
        }

        // 获取目标节点的Sprite组件
        const targetSprite = targetQuestionNode.getComponent(Sprite);
        if (!targetSprite) {
            DebugLog.instance.warn(`目标节点没有Sprite组件`);
            return;
        }

        // 获取目标节点的世界坐标
        const targetUITransform = targetQuestionNode.getComponent(UITransform);
        if (!targetUITransform) {
            DebugLog.instance.warn(`目标节点没有UITransform组件`);
            return;
        }

        // 获取主视图节点用于坐标转换
        let viewNode = this.mainView;
        if (!viewNode) {
            viewNode = this.node;
        }

        const viewUITransform = viewNode.getComponent(UITransform);
        if (!viewUITransform) {
            DebugLog.instance.warn(`视图节点没有UITransform组件`);
            return;
        }

        // 转换目标节点位置到视图节点坐标系
        const targetPos = targetQuestionNode.getPosition();
        const targetParentUITransform = targetQuestionNode.parent?.getComponent(UITransform);
        let targetWorldPos: Vec3;

        if (targetParentUITransform) {
            targetWorldPos = targetParentUITransform.convertToWorldSpaceAR(targetPos);
        } else {
            targetWorldPos = new Vec3(targetPos.x, targetPos.y, 0);
        }

        const targetNodePos = viewUITransform.convertToNodeSpaceAR(targetWorldPos);

        // 转换itemNode位置到视图节点坐标系
        const itemPos = itemNode.getPosition();
        const itemParentUITransform = itemNode.parent?.getComponent(UITransform);
        let itemWorldPos: Vec3;

        if (itemParentUITransform) {
            itemWorldPos = itemParentUITransform.convertToWorldSpaceAR(itemPos);
        } else {
            itemWorldPos = new Vec3(itemPos.x, itemPos.y, 0);
        }

        const itemNodePos = viewUITransform.convertToNodeSpaceAR(itemWorldPos);

        // 保存itemNode的spriteFrame
        const spriteFrame = itemSprite.spriteFrame;

        // 将itemNode临时添加到视图节点，以便进行动画
        const originalParent = itemNode.parent;
        const originalPos = itemNode.getPosition();
        const originalScale = itemNode.getScale();

        // 转换到视图节点坐标系
        itemNode.setParent(viewNode);
        itemNode.setPosition(itemNodePos);
        itemNode.setScale(originalScale);

        // 使用tween动画让itemNode飞到目标位置
        tween(itemNode)
            .to(0.3, {
                position: new Vec3(targetNodePos.x, targetNodePos.y, 0),
                scale: new Vec3(0.5, 0.5, 1) // 飞行过程中稍微缩小
            })
            .call(() => {
                // 动画完成后，将spriteFrame设置到questionNode
                targetSprite.spriteFrame = spriteFrame;

                // 记录这个questionNode已经设置了item图片，不应该被替换为yes
                this.questionNodesWithItemImage.add(targetNodeIndex);

                // 将itemNode的spriteFrame设置为null
                itemSprite.spriteFrame = null;

                // 恢复itemNode的原始状态
                itemNode.setParent(originalParent);
                itemNode.setPosition(originalPos);
                itemNode.setScale(originalScale);
            })
            .start();
    }

    /**
     * 让itemNode抖动（点击错误时使用）
     * @param itemNode 要抖动的节点
     */
    private shakeItemNode(itemNode: Node): void {
        if (!itemNode || !itemNode.isValid) {
            return;
        }

        // 保存原始位置
        const originalPos = itemNode.getPosition();
        const shakeDistance = 10; // 抖动距离
        const shakeDuration = 0.05; // 每次抖动持续时间
        const shakeCount = 6; // 抖动次数

        // 创建抖动动画
        let shakeTween = tween(itemNode);

        // 生成抖动序列：左右左右移动
        for (let i = 0; i < shakeCount; i++) {
            const offset = i % 2 === 0 ? shakeDistance : -shakeDistance;
            shakeTween = shakeTween.to(shakeDuration, {
                position: new Vec3(originalPos.x + offset, originalPos.y, originalPos.z)
            });
        }

        // 最后回到原始位置
        shakeTween.to(shakeDuration, {
            position: originalPos
        }).start();
    }

    /**
     * 创建简单的粒子特效（当粒子资源加载失败时的替代方案）
     */
    private createSimpleParticleEffect(particleNode: Node, startPos: Vec3, targetPos: Vec3, parentNode: Node): void {
        // 添加一个简单的Sprite作为特效
        const sprite = particleNode.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;

        // const bundle = assetManager.getBundle(this.bundleName);
        // bundle.load("texture/common/yes/spriteFrame", SpriteFrame, (err: Error, spriteFrame: SpriteFrame) => {
        //     if (err) {
        //         DebugLog.instance.error(`加载替代资源失败: ${err.message}`);
        //         particleNode.destroy();
        //         return;
        //     }
        // sprite.spriteFrame = spriteFrame;
        particleNode.setScale(0.5, 0.5);

        parentNode.addChild(particleNode);

        // 使用tween动画
        tween(particleNode)
            .to(0.3, { position: new Vec3(targetPos.x, targetPos.y, 0) })
            .call(() => {
                setTimeout(() => {
                    if (particleNode && particleNode.isValid) {
                        particleNode.destroy();
                    }
                }, 200);
            })
            .start();
        // });
    }

    /**
     * 根据当前难度获取倒计时时间
     * @returns 倒计时时间（秒）
     */
    private getTimeLimit(): number {
        const hardIndex = this.model.hardIndex;
        // 确保索引在有效范围内，默认使用最后一个难度的时间
        if (hardIndex >= 0 && hardIndex < this.TIME_LIMITS.length) {
            return this.TIME_LIMITS[hardIndex];
        }
        return this.TIME_LIMITS[this.TIME_LIMITS.length - 1];
    }

    /**
     * 启动倒计时
     */
    private startTimer(): void {
        if (this.timerComponent) {
            const timeLimit = this.getTimeLimit();
            this.timerComponent.startTimer(timeLimit);
            DebugLog.instance.log(`开始倒计时: 难度${this.model.hardIndex + 1}, ${timeLimit}秒`);
        }
    }

    /**
     * 倒计时结束处理（游戏失败）
     */
    onTimerEnd(): void {
        DebugLog.instance.log("倒计时结束，游戏失败");
        this.onGameFail();
    }

    private onGameFail() {
        this.pauseTime();
        this.playAudio("music/fail", true);
        // 使用游戏大厅的结算界面显示失败
        UIManager.getInstance().showPanel(SettlementPanel.NAME, {
            result: false,
            nextHandler: () => {
                this.onNextLevel();
            },
            againHandler: () => {
                this.onAgain();
            }
        });
    }

    /**
     * 游戏胜利处理
     */
    private onGameWin(): void {
        DebugLog.instance.log("游戏胜利！");
        this.pauseTime();

        this.playAudio("music/win", true);
        // 使用游戏大厅的结算界面
        UIManager.getInstance().showPanel(SettlementPanel.NAME, {
            result: true,
            nextHandler: () => {
                this.onNextLevel();
            },
            againHandler: () => {
                this.onAgain();
            }
        });
    }

    /**
     * 下一关逻辑
     */
    private onNextLevel(): void {
        // 增加难度索引（如果还有更高难度）
        const currentHardIndex = this.model.hardIndex;
        const maxHardIndex = this.model.DIFFICULTY_COUNTS.length - 1;

        if (currentHardIndex < maxHardIndex) {
            // 如果还有更高难度，切换到下一难度
            this.model.setHardIndex(currentHardIndex + 1);
        } else {
            // 如果已经是最高难度，重新从第一难度开始
            this.model.setHardIndex(0);
        }

        // 重新开始游戏
        this.restartGame();
    }

    /**
     * 重玩逻辑（当前关卡重新开始）
     */
    public onAgain(): void {
        // 保持当前难度，重新开始游戏
        this.restartGame();
    }

    /**
     * 重新开始游戏
     */
    private restartGame(): void {
        // 重置游戏状态
        this.clickedItems.clear();
        this.itemDataMap.clear();
        this.questionDatas = [];
        this._preType = null;
        this._totalQuestionCount = 0;
        this.currentQuestionNodeCount = 0;
        this.questionNodesWithItemImage.clear();

        // 隐藏所有item节点
        if (this.itemNodes.length > 0) {
            for (let i = 0; i < this.itemNodes.length; i++) {
                const itemNode = this.itemNodes[i];
                if (itemNode) {
                    itemNode.active = false;
                }
            }
        }

        // 隐藏所有questionNode
        this.updateQuestionNodes(0);

        // 重置问题标签
        if (this.questionLabel) {
            this.questionLabel.string = "";
        }

        // 重置goodNode为隐藏状态
        if (this.goodNode) {
            this.goodNode.active = false;
        }

        // 重置并重启倒计时
        if (this.timerComponent) {
            this.timerComponent.resetTimer();
        }

        // 重新刷新视图和初始化游戏
        this.refreshView();

        // 启动倒计时
        this.startTimer();
    }

    quitGame() {
        this.pauseTime();
        // SceneManager.getInstance().backToGameCenter();
        super.quitGame({ parentNode: this.mainView, context: this })
    }

}



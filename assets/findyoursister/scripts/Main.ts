import { _decorator, Node, Label, RichText, Sprite, SpriteFrame, assetManager, Vec3, tween, ParticleSystem2D, ParticleAsset, UITransform, Color } from 'cc';
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
    answerNode:Node;


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

    /** 记录已使用的图片路径，确保不重复 */
    private usedImagePaths: Set<string> = new Set();

    /** 存储每个itemNode的抖动动画tween和原始位置 */
    private shakeTweenMap: Map<Node, { tween: any, originalPos: Vec3 }> = new Map();

    /** 存储正在执行tween动画的itemNode索引（防止重复点击） */
    private itemNodesInTween: Set<number> = new Set();

    /** 存储每个itemNode的初始位置（在start时记录） */
    private itemNodeInitialPositions: Map<Node, Vec3> = new Map();

    /** 当前难度完成的组数（每个难度需要完成3组） */
    private currentDifficultyGroupCount: number = 0;

    /** 每个难度需要完成的组数 */
    private readonly GROUPS_PER_DIFFICULTY: number = 3;

    /** 不同难度对应的倒计时时间（秒） */

    private readonly TIME_LIMITS: number[] = [60, 50, 40]; // 难度1: 60s, 难度2: 50s, 难度3: 40s

    /** 物品缩小的比例 */
    private readonly ITEM_SCALE_SMALL: number = 1; // 缩小后的比例

    private readonly ITEM_BG_COLOR: string[] = ["#CDD7FB"];//, "#2F39EF", "#6585F5","#C7C7C7","#666666","#202020"];

    protected bundleName: string = BundleName.FINDYOURSISTER;

    protected audioUrls = ['music/bgm', "music/win", "music/fail", "music/click", "music/correct", "music/huanhu"];

    onLoad(): void {
        this.loadAudio().then(() => {
            this.playBgmAudio("music/bgm", true);
        });

        this.model = FindYourSisterModel.getInstance();
        // 注册结算面板
        UIManager.getInstance().registerPanel(SettlementPanel.NAME, BundleName.RESOURCES, "prefab/settlementPanel/settlementPanel", SettlementPanel);

    }


    start() {
        super.start();

        this.model.setHardIndex((this.sceneModel as any).difficulty-1);
        // 获取所有 itemNodes（使用最大难度对应的数量，确保获取所有节点）
        const maxItemCount = Math.max(...this.model.DIFFICULTY_COUNTS);
        for (let i = 0; i <= maxItemCount; i++) {
            const itemName = `item${i}`;
            const itemNode = this.cardPool.getChildByName(itemName);
            if (itemNode) {
                itemNode.active = false;
                // 记录itemNode的初始位置
                const initialPos = itemNode.getPosition().clone();
                this.itemNodeInitialPositions.set(itemNode, initialPos);
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

        // 重置当前难度的完成组数
        this.currentDifficultyGroupCount = 0;

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
            case FindYourSisterModel.TYPE_PLANT:
                return "植物";
            case FindYourSisterModel.TYPE_ANIMAL:
                return "动物";
            case FindYourSisterModel.TYPE_FOOD:
                return "食物";
            case FindYourSisterModel.TYPE_BALL:
                return "球类";
            case FindYourSisterModel.TYPE_CAR:
                return "交通工具";
            case FindYourSisterModel.TYPE_THING:
                return "生活用品";
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
                // 不隐藏questionNode，保持显示状态
                // this.updateQuestionNodes(0);
                this.questionLabel.string = "";
            }
            this._preType = nextType;
        }
    }

    /**
     * 获取questionNode的icon子节点的Sprite组件
     * @param questionNode questionNode节点
     * @returns icon子节点的Sprite组件，如果不存在则返回null
     */
    private getQuestionNodeIconSprite(questionNode: Node): Sprite | null {
        if (!questionNode) {
            return null;
        }
        const iconNode = questionNode.getChildByName("icon");
        if (!iconNode) {
            DebugLog.instance.warn(`questionNode ${questionNode.name} 没有找到icon子节点`);
            return null;
        }
        return iconNode.getComponent(Sprite);
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
                            const sprite = this.getQuestionNodeIconSprite(questionNode);
                            if (sprite) {
                                sprite.spriteFrame = null;
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
                        const sprite = this.getQuestionNodeIconSprite(questionNode);
                        if (sprite) {
                            sprite.spriteFrame = null;
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
                const sprite = this.getQuestionNodeIconSprite(questionNode);
                if (sprite) {
                    sprite.spriteFrame = null;
                }
            }
        }
    }

    /**
     * 将指定类型对应的所有显示的questionNode替换成yes资源
     * @param type 类型名称
     */
    private replaceQuestionNodesToYes(): void {
        // 遍历所有显示的questionNode，替换资源
        // 当remainingCount == 0时，说明这个类型的任务已完成，将所有显示的节点替换成yes
        // 但是跳过已经设置了item图片的节点
        for (let i = 0; i < this.questionNodes.length; i++) {
            // 如果这个节点已经设置了item图片，跳过
            if (this.questionNodesWithItemImage.has(i)) {
                continue;
            }

            const questionNode = this.questionNodes[i];
            if (questionNode && questionNode.active) {
                const sprite = this.getQuestionNodeIconSprite(questionNode);
                if (sprite) {
                    sprite.spriteFrame = null;
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

        // 初始化已使用的图片路径集合，记录所有已使用的图片路径
        this.usedImagePaths.clear();
        for (const imageData of imageDatas) {
            this.usedImagePaths.add(imageData.path);
        }

        // 获取所有图片数据的类型数组（包含重复的类型，用于统计数量）
        const imageTypes: string[] = [];
        for (const imageData of imageDatas) {
            imageTypes.push(imageData.type);
        }

        // 初始化游戏需求（根据实际图片类型）
        this.initQuestion(imageTypes);

        // 清空之前的数据映射
        this.itemDataMap.clear();

        // 显示所有 itemNodes
        for (let i = 0; i < this.itemNodes.length; i++) {
            const itemNode = this.itemNodes[i];
            if (!itemNode) {
                continue;
            }
            
            // 重置itemNode到初始位置
            const initialPos = this.itemNodeInitialPositions.get(itemNode);
            if (initialPos) {
                itemNode.setPosition(initialPos);
            }
            
            itemNode.active = true;
            const itembg = itemNode.getComponent(Sprite);
            const iconNode = itemNode.getChildByName("icon");
            if (iconNode) {
                // 重置icon节点的位置和缩放
                iconNode.setPosition(0, 0, 0);
                iconNode.setScale(1.5, 1.5, 1);
            }
            const itemSprite = iconNode ? iconNode.getComponent(Sprite) : null;
            
            // 随机设置背景颜色
            if (itembg) {
                const randomColorIndex = Math.floor(Math.random() * this.ITEM_BG_COLOR.length);
                const colorHex = this.ITEM_BG_COLOR[randomColorIndex];
                const color = Color.fromHEX(new Color(), colorHex);
                itembg.color = color;
            }

            // 如果有对应的 imageData，则设置图片
            if (i < len) {
                const imageData = imageDatas[i];
                
                // 存储item对应的ImageData
                this.itemDataMap.set(i, imageData);

                // 根据难度设置物品缩放
                this.setItemScale(itemNode, i, len);

                // 随机设置旋转角度（0-360度）
                // const randomRotation = Math.random() * 360;
                // itemNode.angle = randomRotation;

                if (itemSprite) {
                    let imagePath = imageData.path;
                    // 这里加载图片，如果失败则随机获取文件夹中存在的资源
                    this.loadItemSpriteWithFallback(itemSprite, imageData, 0);
                }
            } else {
                // 对于没有对应 imageData 的 itemNode，也设置缩放但不清空图片
                this.setItemScale(itemNode, i, len);
            }
        }
    }

    /**
     * 加载物品图片，如果失败则随机获取文件夹中存在的资源
     * 持续随机查找，直到找到未使用的图片为止，保证队列里面图片的唯一性
     * @param itemSprite Sprite组件
     * @param imageData 图片数据
     * @param retryCount 重试次数（防止无限循环）
     */
    private loadItemSpriteWithFallback(itemSprite: Sprite, imageData: ImageData, retryCount: number = 0): void {
        const maxRetries = 10000; // 最大重试次数，防止无限循环
        
        const bundle = assetManager.getBundle(this.bundleName);
        const imagePath = imageData.path + "/spriteFrame";
        
        bundle.load(imagePath, SpriteFrame, (err, sp) => {
            if (err) {
                // 如果资源不存在，随机获取文件夹中存在的资源
                // 持续随机查找，直到找到未使用的图片为止
                if (retryCount >= maxRetries) {
                    DebugLog.instance.error(`加载图片失败，已重试${maxRetries}次: ${imageData.path}，无法找到可用的图片`);
                    return;
                }
                
                DebugLog.instance.warn(`图片资源不存在: ${imagePath}，尝试随机获取文件夹中的其他资源（重试 ${retryCount + 1}/${maxRetries}）`);
                
                // 从路径中提取文件夹名
                const folderName = imageData.folderName;
                const folderPath = `texture/${folderName}/`;
                const imageCount = this.model.getImageCount();
                
                // 持续随机查找，直到找到未使用的图片
                let found = false;
                let attempts = 0;
                const maxAttempts = 1000; // 每次重试最多尝试1000次
                
                while (!found && attempts < maxAttempts) {
                    attempts++;
                    
                    // 随机选择一个图片编号（1 到 imageCount）
                    const randomImageNumber = Math.floor(Math.random() * imageCount) + 1;
                    const candidatePath = `${folderPath}emoji${randomImageNumber}`;
                    
                    // 检查该图片路径是否已被使用
                    if (!this.usedImagePaths.has(candidatePath)) {
                        // 找到未使用的图片，标记为已使用
                        this.usedImagePaths.add(candidatePath);
                        
                        // 创建新的ImageData用于重试
                        const fallbackImageData: ImageData = {
                            path: candidatePath,
                            folderName: folderName,
                            index: imageData.index,
                            type: imageData.type
                        };
                        
                        // 递归重试
                        this.loadItemSpriteWithFallback(itemSprite, fallbackImageData, retryCount + 1);
                        found = true;
                        break;
                    }
                }
                
                // 如果尝试了maxAttempts次还是找不到未使用的图片，继续递归重试
                if (!found) {
                    // 随机选择一个图片编号（即使可能已使用，继续尝试）
                    const randomImageNumber = Math.floor(Math.random() * imageCount) + 1;
                    const fallbackImageData: ImageData = {
                        path: `${folderPath}emoji${randomImageNumber}`,
                        folderName: folderName,
                        index: imageData.index,
                        type: imageData.type
                    };
                    
                    // 递归重试
                    this.loadItemSpriteWithFallback(itemSprite, fallbackImageData, retryCount + 1);
                }
            } else {
                // 加载成功，检查并标记为已使用（如果还未使用）
                if (!this.usedImagePaths.has(imageData.path)) {
                    this.usedImagePaths.add(imageData.path);
                }
                // 设置spriteFrame
                itemSprite.spriteFrame = sp;
            }
        });
    }

    /**
     * 根据难度设置物品缩放
     * @param itemNode 物品节点
     * @param index 物品索引
     * @param totalCount 总物品数量
     */
    private setItemScale(itemNode: Node, index: number, totalCount: number): void {
        const hardIndex = this.model.hardIndex;
        
        if (hardIndex === 0) {
            // 难度一：所有物品缩放1（正常大小）
            itemNode.setScale(1, 1, 1);
        } else if (hardIndex === 1) {
            // 难度二：部分物品缩放缩小（随机选择约50%的物品缩小）
            // 使用随机数决定是否缩小
            if (Math.random() < 0.5) {
                // 约50%的物品缩小
                itemNode.setScale(this.ITEM_SCALE_SMALL, this.ITEM_SCALE_SMALL, 1);
            } else {
                // 其余保持正常大小
                itemNode.setScale(1, 1, 1);
            }
        } else if (hardIndex === 2) {
            // 难度三：所有物品尺寸缩小
            itemNode.setScale(this.ITEM_SCALE_SMALL, this.ITEM_SCALE_SMALL, 1);
        } else {
            // 默认正常大小
            itemNode.setScale(1, 1, 1);
        }
    }

    itmeClick(event, data) {
        const index = Number(data);
        DebugLog.instance.log("itemClick", index);

        // 检查该itemNode是否正在执行tween动画
        if (this.itemNodesInTween.has(index)) {
            DebugLog.instance.error("该item正在执行动画，忽略点击");
            return;
        }

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
            // 如果该itemNode正在执行抖动动画，不允许再次点击
            if (this.itemNodesInTween.has(index)) {
                DebugLog.instance.log("该item正在执行抖动动画，忽略点击");
                return;
            }
            
            this.playAudio("music/click", true);

            DebugLog.instance.log(`点击错误！当前需要点击 ${currentTargetType}，但点击的是 ${imageData.type}`);
            // 添加错误抖动动画（传入index以便跟踪）
            this.shakeItemNode(this.itemNodes[index], index);
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
                             //清理questionNode
                            this.replaceQuestionNodesToYes();
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
            // 标记该itemNode正在执行tween动画
            this.itemNodesInTween.add(index);
            // 等待动画完成
            this.moveItemNodeToQuestionNode(clickedItemNode, this._totalQuestionCount - remainingCount).then(() => {
                // 动画完成后，从tween集合中移除
                this.itemNodesInTween.delete(index);
                // 动画完成后更新问题显示
                this.updateQuestionLabel(true);
            });
        } else {
            // 如果没有itemNode，直接更新问题显示
            this.updateQuestionLabel(true);
        }

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
    private async moveItemNodeToQuestionNode(itemNode: Node, remainingCount: number): Promise<void> {
        // 找到目标questionNode（应该是当前剩余数量对应的节点）
        // 剩余数量就是需要显示的节点数量，目标节点应该是最后一个显示的节点（索引为 remainingCount - 1）

        const targetNodeIndex = remainingCount - 1;

        if (targetNodeIndex >= this.questionNodes.length || targetNodeIndex < 0) {
            DebugLog.instance.warn(`目标节点索引 ${targetNodeIndex} 超出范围`);
            return Promise.resolve();
        }

        const targetQuestionNode = this.questionNodes[targetNodeIndex];
        if (!targetQuestionNode || !targetQuestionNode.active) {
            DebugLog.instance.warn(`目标节点不存在或未激活`);
            return Promise.resolve();
        }

        // 获取itemNode的Sprite组件
        const itemSprite = itemNode.getChildByName("icon").getComponent(Sprite);
        if (!itemSprite || !itemSprite.spriteFrame) {
            DebugLog.instance.warn(`itemNode没有Sprite组件或spriteFrame为空`);
            return Promise.resolve();
        }

        // 获取目标节点的icon子节点的Sprite组件
        const targetSprite = this.getQuestionNodeIconSprite(targetQuestionNode);
        if (!targetSprite) {
            DebugLog.instance.warn(`目标节点没有icon子节点或Sprite组件`);
            return Promise.resolve();
        }

        // 获取目标节点的世界坐标
        const targetUITransform = targetQuestionNode.getComponent(UITransform);
        if (!targetUITransform) {
            DebugLog.instance.warn(`目标节点没有UITransform组件`);
            return Promise.resolve();
        }

        // 获取主视图节点用于坐标转换
        let viewNode = this.mainView;
        if (!viewNode) {
            viewNode = this.node;
        }

        const viewUITransform = viewNode.getComponent(UITransform);
        if (!viewUITransform) {
            DebugLog.instance.warn(`视图节点没有UITransform组件`);
            return Promise.resolve();
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
        let iconNode = itemSprite.node;
        const itemPos = iconNode?.getPosition();
        const itemParentUITransform = iconNode.parent?.getComponent(UITransform);
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
        const originalParent = iconNode.parent;
        const originalPos = iconNode.getPosition();
        // const originalScale = itemNode.getScale();

        // 转换到视图节点坐标系
        iconNode.setParent(viewNode);
        iconNode.setPosition(itemNodePos);
        // itemNode.setScale(originalScale);

        // 使用Promise等待tween动画完成
        return new Promise<void>((resolve) => {
            // 使用tween动画让itemNode飞到目标位置
            tween(iconNode)
                .to(0.3, {
                    position: new Vec3(targetNodePos.x, targetNodePos.y, 0),
                    // scale: new Vec3(0.5, 0.5, 1) // 飞行过程中稍微缩小
                })
                .call(() => {
                    // 动画完成后，将spriteFrame设置到questionNode
                    targetSprite.spriteFrame = spriteFrame;

                    // 记录这个questionNode已经设置了item图片，不应该被替换为yes
                    this.questionNodesWithItemImage.add(targetNodeIndex);

                    // 将itemNode的spriteFrame设置为null
                    itemSprite.spriteFrame = null;

                    // 恢复itemNode的原始状态
                    iconNode.setParent(originalParent);
                    iconNode.setPosition(originalPos);
                    // itemNode.setScale(originalScale);

                    // 动画完成，resolve Promise
                    resolve();
                })
                .start();
        });
    }

    /**
     * 让itemNode抖动（点击错误时使用）
     * @param itemNode 要抖动的节点
     * @param index itemNode的索引（用于跟踪tween状态）
     */
    private shakeItemNode(itemNode: Node, index: number): void {
        console.log("shakeItemNode", itemNode, index);
        if (!itemNode || !itemNode.isValid) {
            return;
        }

        // 如果已经有抖动动画，先停止它
        const existingShake = this.shakeTweenMap.get(itemNode);
        if (existingShake) {
            existingShake.tween.stop();
            // 恢复原始位置
            itemNode.setPosition(existingShake.originalPos);
            // 从tween集合中移除（如果存在）
            this.itemNodesInTween.delete(index);
        }

        // 标记该itemNode正在执行抖动动画
        this.itemNodesInTween.add(index);

        // 保存原始位置
        const originalPos = itemNode.getPosition().clone();
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

        // 最后回到原始位置，并在动画完成时从tween集合中移除
        shakeTween.to(shakeDuration, {
            position: originalPos
        }).call(() => {
            // 抖动动画完成，从tween集合中移除
            this.itemNodesInTween.delete(index);
            console.log("shakeItemNode end", itemNode, index);
        }).start();

        // 保存tween引用和原始位置
        this.shakeTweenMap.set(itemNode, { tween: shakeTween, originalPos: originalPos });
    }

    /**
     * 停止所有抖动动画并恢复itemNode到初始位置
     */
    private stopAllShakeAnimations(): void {
        this.shakeTweenMap.forEach((shakeData, itemNode) => {
            if (itemNode && itemNode.isValid) {
                // 停止tween动画
                shakeData.tween.stop();
                // 恢复到初始位置（使用记录的初始位置）
                const initialPos = this.itemNodeInitialPositions.get(itemNode);
                if (initialPos) {
                    itemNode.setPosition(initialPos);
                } else {
                    // 如果没有初始位置记录，使用抖动时的原始位置
                    itemNode.setPosition(shakeData.originalPos);
                }
            }
        });
        // 清空Map
        this.shakeTweenMap.clear();
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
        // 停止所有抖动动画并恢复itemNode到初始位置
        this.stopAllShakeAnimations();
        // 清空正在执行tween的itemNode集合
        this.itemNodesInTween.clear();
        this.playAudio("music/fail", true);
        // 清空 _preList（结算时清空）
        this.model.clearPreList();
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
     * 游戏胜利处理（完成一组）
     */
    private onGameWin(): void {
        DebugLog.instance.log("完成一组！");
        // 停止所有抖动动画并恢复itemNode到初始位置
        this.stopAllShakeAnimations();
        // 清空正在执行tween的itemNode集合
        this.itemNodesInTween.clear();
        this.playAudio("music/win", true);
        
        // 增加当前难度的完成组数
        this.currentDifficultyGroupCount++;
        DebugLog.instance.log(`当前难度完成组数: ${this.currentDifficultyGroupCount}/${this.GROUPS_PER_DIFFICULTY}`);
        
        // 检查是否完成了3组
        if (this.currentDifficultyGroupCount >= this.GROUPS_PER_DIFFICULTY) {
            // 完成了3组，通关当前难度
            this.pauseTime();
            DebugLog.instance.log("完成当前难度的3组，通关！");
            this.playAudio("music/win", true);
            // 清空 _preList（结算时清空）
            this.model.clearPreList();
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
        } else {
            // 还没完成3组，继续下一组（不暂停时间，继续倒计时）
            DebugLog.instance.log(`继续下一组，剩余组数: ${this.GROUPS_PER_DIFFICULTY - this.currentDifficultyGroupCount}`);
            // 显示完成一组的提示
            if (this.goodNode) {
                this.goodNode.active = true;
                this.goodNode.setScale(0, 0, 1);
                tween(this.goodNode)
                    .to(0.3, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                    .delay(0.5) // 缩短显示时间，快速进入下一组
                    .to(0.3, { scale: new Vec3(0, 0, 1) }, { easing: 'backIn' })
                    .call(() => {
                        if (this.goodNode && this.goodNode.isValid) {
                            this.goodNode.active = false;
                        }
                        // 清理questionNode并开始新的一组
                        this.replaceQuestionNodesToYes();
                        // 开始新的一组（不重置倒计时）
                        this.startNewGroup();
                    })
                    .start();
            } else {
                // 如果没有goodNode，直接开始新的一组
                this.replaceQuestionNodesToYes();
                this.startNewGroup();
            }
        }
    }

    /**
     * 开始新的一组（重新获取数据，不重置倒计时）
     */
    private startNewGroup(): void {
        DebugLog.instance.log("开始新的一组游戏");
        // 重置游戏状态（但保持当前难度和完成组数，不重置倒计时）
        this.clickedItems.clear();
        this.itemDataMap.clear();
        this.questionDatas = [];
        this._preType = null;
        this._totalQuestionCount = 0;
        this.currentQuestionNodeCount = 0;
        this.questionNodesWithItemImage.clear();
        // 清空正在执行tween的itemNode集合
        this.itemNodesInTween.clear();

        // 重置所有item节点位置并隐藏
        if (this.itemNodes.length > 0) {
            for (let i = 0; i < this.itemNodes.length; i++) {
                const itemNode = this.itemNodes[i];
                if (itemNode) {
                    // 重置itemNode到初始位置
                    const initialPos = this.itemNodeInitialPositions.get(itemNode);
                    if (initialPos) {
                        itemNode.setPosition(initialPos);
                    }
                    // 重置icon节点的位置和缩放
                    const iconNode = itemNode.getChildByName("icon");
                    if (iconNode) {
                        iconNode.setPosition(0, 0, 0);
                        iconNode.setScale(1.5, 1.5, 1);
                    }
                    // 重置itemNode的缩放
                    itemNode.setScale(1, 1, 1);
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

        // 注意：不重置倒计时，继续使用剩余时间

        // 重新刷新视图和初始化游戏（会从model中获取新的数据）
        this.refreshView();

        // 倒计时继续运行，不需要重新启动
    }

    /**
     * 下一关逻辑
     */
    private onNextLevel(): void {
        // 增加难度索引（如果还有更高难度）
        // const currentHardIndex = this.model.hardIndex;
        // const maxHardIndex = this.model.DIFFICULTY_COUNTS.length - 1;
        // if (currentHardIndex < maxHardIndex) {
        //     // 如果还有更高难度，切换到下一难度
        //     this.model.setHardIndex(currentHardIndex + 1);
        // } else {
        //     // 如果已经是最高难度，重新从第一难度开始
        //     this.model.setHardIndex(0);
        // }

        // 重置当前难度的完成组数
        this.currentDifficultyGroupCount = 0;

        // 重新开始游戏
        this.restartGame();
    }

    /**
     * 重玩逻辑（当前关卡重新开始）
     */
    public onAgain(): void {
        // 保持当前难度，重置完成组数，重新开始游戏
        this.currentDifficultyGroupCount = 0;
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
        // 清空正在执行tween的itemNode集合
        this.itemNodesInTween.clear();

        // 重置所有item节点位置并隐藏
        if (this.itemNodes.length > 0) {
            for (let i = 0; i < this.itemNodes.length; i++) {
                const itemNode = this.itemNodes[i];
                if (itemNode) {
                    // 重置itemNode到初始位置
                    const initialPos = this.itemNodeInitialPositions.get(itemNode);
                    if (initialPos) {
                        itemNode.setPosition(initialPos);
                    }
                    // 重置icon节点的位置和缩放
                    const iconNode = itemNode.getChildByName("icon");
                    if (iconNode) {
                        iconNode.setPosition(0, 0, 0);
                        iconNode.setScale(1.5, 1.5, 1);
                    }
                    // 重置itemNode的缩放
                    itemNode.setScale(1, 1, 1);
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

    public backMainView(){
        this.answerNode.active = false;
    }

}



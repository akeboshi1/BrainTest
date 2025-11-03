import { _decorator, Label, Node, Sprite, SpriteFrame, Vec3, tween, assetManager, Color, game, Game, AudioClip } from 'cc';
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { GameType, IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { TimerCommonComponent } from "db://assets/resources/scripts/Game/UI/Common/TimerCommonComponent";
import { BundleName } from "db://assets/resources/scripts/Core/Manager/Load/BundleName";
import { Math24CardData, SymbolsType } from "db://assets/math24/scripts/Math24CardData";
import { Math24Database } from "db://assets/math24/scripts/Math24Database";
import { Math24Question } from "db://assets/math24/scripts/Math24Generator";
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { SettlementPanel } from '../../resources/scripts/Core/UI/SettlementPanel';
import { AlertManager, AlertData } from '../../resources/scripts/Core/Manager/Alert/AlertManager';
const { ccclass, property } = _decorator;

@ccclass('Main')
export class Main extends BaseScene<IBaseGameChild> {

    @property(Node)
    mainView: Node;

    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent = null;
    // ============== mainView
    @property(Label)
    formulaLabel: Label = null;

    @property([Node])
    cards: Node[] = [];

    @property(Node)
    addNode: Node = null;

    @property(Node)
    minusNode: Node = null;

    @property(Node)
    multiplyNode: Node = null;

    @property(Node)
    divideNode: Node = null;

    // @property(Button)
    // nextQuestionBtn: Button = null;

    private hards: number[] = [1, 2, 3];

    private level: number = 0;
    private hardIndex: number = 0;

    protected bundleName: string = BundleName.MATH24;

    private _blackCardRes: string = "texture/spade/spade";
    private _clubCardRes: string = "texture/club/club";
    private _diamondCardRes: string = "texture/diamond/diamond";
    private _heartCardRes: string = "texture/heart/heart";

    @property(SpriteFrame)
    frontFrame: SpriteFrame = null;
    @property(SpriteFrame)
    backFrame: SpriteFrame = null;

    private flipDuration = 0.25;
    private isFront = false;
    private time: number = 60;

    private cardValues: number[] = [1, 1, 3, 8];
    private _curCardData: Math24CardData;

    // 当前题目
    private currentQuestion: Math24Question = null;



    // 题库管理器
    private math24Database: Math24Database = null;

    // 重构状态变量，简化训练逻辑
    private selectedCards: number[] = [];  // 存储已选择的卡片索引
    private selectedValues: number[] = []; // 存储已选择的卡片值
    private operators: string[] = [];      // 存储已选择的运算符
    private operatorTypes: number[] = [];  // 存储已选择的运算符类型
    private currentExpression: string = ''; // 当前表达式
    private currentResult: number = 0;     // 当前表达式计算结果

    // 简化括号管理
    // private brackets: {start: number, end: number}[] = []; // 存储括号的开始和结束位置
    private usedCardIndices: Set<number> = new Set(); // 已使用的卡牌索引

    // 游戏结算状态
    private _isGameCompleted: boolean = false;

    // 计算过程记录
    private calculationSteps: any[] = []; // 记录每一步的计算过程
    private currentStepIndex: number = -1; // 当前步骤索引

    // 运算符按钮描边管理
    private currentSelectedOperator: Node = null; // 当前选中的运算符按钮

    protected audioUrls = ['music/24_bgm', "music/win", "music/fail"];

    private bgmClip: AudioClip;

    onLoad(): void {
        this.loadAudio().then(() => {
            this.playBgmAudio("music/24_bgm", true);
        });

        // 获取题库管理器实例
        this.math24Database = Math24Database.getInstance();

        // 注册结算面板
        UIManager.getInstance().registerPanel(SettlementPanel.NAME, BundleName.RESOURCES, "prefab/settlementPanel/settlementPanel", SettlementPanel);

    }

    start() {
        super.start();
        // this.dataInit();
        this.sceneInit();

        // 添加应用前后台切换监听
        this.addAppStateListener();
    }

    dataInit() {
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.hardIndex = (this.sceneModel as any).difficulty - 1;
            this.level = (this.sceneModel as any).level;
        } else {
            this.level = (this.sceneModel as any).level;
            this.hardIndex = 0;//((this.level % 3) == 0?3:(this.level % 3))-1;
        }
    }

    // ========== 开始倒计时 ==========
    public startTime(time: number) {
        if (this.timerComponent) this.timerComponent.startTimer(time);
    }

    sceneInit() {
        super.sceneInit();
        this.refreshView();

        // 加载新题目
        this.loadNewQuestion();
    }

    /**
     * 点击卡片的处理逻辑
     */
    clickCard(event: Event, customEventData: string) {
        this.playAudio("click");
        let index = Number(customEventData);

        // 检查卡牌是否被隐藏
        if (!this.cards[index].active) {
            DebugLog.instance.log(`卡牌${index}已被隐藏，无法选择`);
            return;
        }

        // 判断卡片是否已经被选中
        const isCardSelected = this.selectedCards.includes(index);
        DebugLog.instance.log(`点击卡片，索引: ${index}, 已选中状态: ${isCardSelected}`);

        if (isCardSelected) {
            // 检查是否是第一张数字卡牌
            const isFirstCard = this.selectedCards.length > 0 && this.selectedCards[0] === index;

            if (isFirstCard) {
                // 第一张数字卡牌选中后，如果没有选择运算符号，再次点击则提示
                if (this.operators.length === 0) {
                    const alertData = new AlertData();
                    alertData.title = "提示";
                    alertData.message = "请点击运算符号";
                    alertData.cancelButtonVisible = false;
                    alertData.confirmButtonText = "知道了";
                    AlertManager.getInstance().showAlert(alertData);

                    return;
                } else {
                    // 如果已经选择了运算符号，再次点击第一张数字卡牌，则提示不能重复点击
                    const alertData = new AlertData();
                    alertData.title = "提示";
                    alertData.message = "不能重复点击同一张数字";
                    alertData.cancelButtonVisible = false;
                    alertData.confirmButtonText = "知道了";
                    AlertManager.getInstance().showAlert(alertData);

                    return;
                }
            } else {
                // 如果不是第一张卡牌，允许取消选中
                this.removeCardFromExpression(index);
            }
        } else {
            // 如果卡片尚未被选中，且卡片数量未达上限，则选中它
            if (this.selectedCards.length >= 4) {
                DebugLog.instance.log('已选择4张卡片，不能再选择');
                return;
            }

            // 检查是否已经选择了一个卡牌但没有运算符，此时直接替换上一张卡牌
            if (this.selectedCards.length > 0 && this.operators.length === 0) {
                DebugLog.instance.log('已选择一张卡牌但没有运算符，替换上一张卡牌');

                // 移除上一张选中的卡牌
                const previousCardIndex = this.selectedCards[0];
                this.removeCardFromExpression(previousCardIndex);
            }

            // 获取卡牌的值（直接使用cardValues数组中的值，因为计算结果已经更新到该数组）
            let cardValue = this.cardValues[index];

            // 检查卡牌值是否有效（不为null）
            if (cardValue === null) {
                DebugLog.instance.log(`卡牌${index}的值已被移除，无法选择`);
                return;
            }

            // 添加卡片到表达式
            this.addCardToExpression(index, cardValue);
        }

        // 更新表达式
        this.updateExpression();

        // 如果已经选择了4张卡片，且有3个运算符，自动计算结果
        this.checkAutoSubmit();
    }

    /**
     * 从表达式中移除卡片
     */
    removeCardFromExpression(index: number) {
        // 查找卡片在选中列表中的位置
        const cardPosition = this.selectedCards.indexOf(index);
        if (cardPosition === -1) {
            DebugLog.instance.log(`卡片${index}不在选中列表中`);
            return;
        }

        DebugLog.instance.log(`取消选中卡片${index}，位置: ${cardPosition}`);

        // 如果要移除的卡片后面有运算符，需要一起移除
        if (cardPosition < this.operators.length) {
            // 移除对应位置的运算符
            this.operators.splice(cardPosition, 1);
            this.operatorTypes.splice(cardPosition, 1);
            DebugLog.instance.log(`同时移除位置${cardPosition}的运算符`);
        }

        // 如果不是最后一张卡片，且前面有运算符，也需要移除前面的运算符
        if (cardPosition > 0 && cardPosition === this.selectedCards.length - 1 && this.operators.length >= cardPosition) {
            // 移除前一个位置的运算符
            this.operators.splice(cardPosition - 1, 1);
            this.operatorTypes.splice(cardPosition - 1, 1);
            DebugLog.instance.log(`同时移除位置${cardPosition - 1}的运算符`);
        }

        // 从已选卡片和已选值列表中移除
        this.selectedCards.splice(cardPosition, 1);
        this.selectedValues.splice(cardPosition, 1);

        // 从已使用集合中移除
        this.usedCardIndices.delete(index);

        // 恢复卡片原始颜色和缩放
        this.restoreCard(index);

        // // 如果取消选中后，需要调整括号
        // if (this.brackets.length > 0) {
        //     // 重置括号状态，简单处理
        //     this.brackets = [];
        //     this.bracketMode = 0;
        //     DebugLog.instance.log('重置括号状态');
        // }

        // 调试信息
        DebugLog.instance.log('当前选中卡片:', this.selectedCards);
        DebugLog.instance.log('当前选中值:', this.selectedValues);
    }

    /**
     * 恢复卡片到原始状态
     */
    restoreCard(index: number) {
        if (index >= 0 && index < this.cards.length) {
            // 获取卡片的sprite子节点
            const spriteNode = this.cards[index].getChildByName("sprite");
            // const labelNode = this.cards[index].getChildByName("label");

            if (spriteNode) {
                const sprite = spriteNode.getComponent(Sprite);
                if (sprite) {
                    // 恢复原始颜色
                    sprite.color = new Color(255, 255, 255, 255);
                    DebugLog.instance.log(`恢复卡片${index}为白色`);
                }
                // 显示sprite节点
                spriteNode.active = true;
            }

            // 隐藏并清理结果显示节点
            const resultNode = this.cards[index].getChildByName("resultDisplay");
            if (resultNode) {
                resultNode.active = false;
                resultNode.destroy();
            }

            // 恢复原始缩放
            this.cards[index].setScale(new Vec3(1, 1, 1));

            // 添加恢复动画效果
            tween(this.cards[index])
                .to(0.1, { scale: new Vec3(1.05, 1.05, 1) })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
        }
    }

    /**
     * 设置运算符按钮描边
     * @param operatorNode 要设置描边的运算符按钮节点
     */
    private setOperatorOutline(operatorNode: Node) {
        // 清除之前选中的按钮描边
        this.clearOperatorOutline();

        // 设置新按钮的描边
        if (operatorNode) {
            const outlineNode = operatorNode.getChildByName("outline");
            if (outlineNode) {
                outlineNode.active = true;
                this.currentSelectedOperator = operatorNode;
                DebugLog.instance.log('设置运算符按钮描边:', operatorNode.name);
            } else {
                DebugLog.instance.warn('未找到outline子节点:', operatorNode.name);
            }
        }
    }

    /**
     * 清除所有运算符按钮描边
     */
    private clearOperatorOutline() {
        if (this.currentSelectedOperator) {
            const outlineNode = this.currentSelectedOperator.getChildByName("outline");
            if (outlineNode) {
                outlineNode.active = false;
                DebugLog.instance.log('清除运算符按钮描边:', this.currentSelectedOperator.name);
            }
            this.currentSelectedOperator = null;
        }
    }

    /**
     * 清理所有运算符按钮的描边节点
     */
    private clearAllOperatorOutlines() {
        const operatorNodes = [this.addNode, this.minusNode, this.multiplyNode, this.divideNode];
        operatorNodes.forEach(node => {
            if (node) {
                const outlineNode = node.getChildByName("outline");
                if (outlineNode) {
                    outlineNode.active = false;
                }
            }
        });
        DebugLog.instance.log('清理所有运算符按钮描边节点');
    }

    // 修改四则运算符方法
    addFunc() {
        // 必须先选卡片再选运算符
        if (this.selectedValues.length === 0) {
            DebugLog.instance.log('请先选择卡片');
            return;
        }

        // 检查场上是否只剩下一张牌（即其他牌都被隐藏了）
        const activeCardsCount = this.cards.filter(card => card.active).length;
        if (activeCardsCount === 1) {
            DebugLog.instance.log('场上只剩下一张牌，无法进行运算');
            return;
        }

        // 设置描边效果
        this.setOperatorOutline(this.addNode);

        // 如果已经有运算符，替换最后一个；否则添加新的
        if (this.operators.length >= this.selectedValues.length) {
            // 替换最后一个运算符
            this.operators[this.operators.length - 1] = '+';
            this.operatorTypes[this.operatorTypes.length - 1] = SymbolsType.ADD;
        } else {
            // 添加运算符
            this.operators.push('+');
            this.operatorTypes.push(SymbolsType.ADD);
        }

        // 更新表达式
        this.updateExpression();

        // 如果已经选择了4张卡片，且有3个运算符，自动计算结果
        this.checkAutoSubmit();
    }

    subtractFunc() {
        // 必须先选卡片再选运算符
        if (this.selectedValues.length === 0) {
            DebugLog.instance.log('请先选择卡片');
            return;
        }

        // 检查场上是否只剩下一张牌（即其他牌都被隐藏了）
        const activeCardsCount = this.cards.filter(card => card.active).length;
        if (activeCardsCount === 1) {
            DebugLog.instance.log('场上只剩下一张牌，无法进行运算');
            return;
        }

        // 设置描边效果
        this.setOperatorOutline(this.minusNode);

        // 如果已经有运算符，替换最后一个；否则添加新的
        if (this.operators.length >= this.selectedValues.length) {
            // 替换最后一个运算符
            this.operators[this.operators.length - 1] = '-';
            this.operatorTypes[this.operatorTypes.length - 1] = SymbolsType.SUBTRACT;
        } else {
            // 添加运算符
            this.operators.push('-');
            this.operatorTypes.push(SymbolsType.SUBTRACT);
        }

        // 更新表达式
        this.updateExpression();

        // 如果已经选择了4张卡片，且有3个运算符，自动计算结果
        this.checkAutoSubmit();
    }

    multiplyFunc() {
        // 必须先选卡片再选运算符
        if (this.selectedValues.length === 0) {
            DebugLog.instance.log('请先选择卡片');
            return;
        }

        // 检查场上是否只剩下一张牌（即其他牌都被隐藏了）
        const activeCardsCount = this.cards.filter(card => card.active).length;
        if (activeCardsCount === 1) {
            DebugLog.instance.log('场上只剩下一张牌，无法进行运算');
            return;
        }

        // 设置描边效果
        this.setOperatorOutline(this.multiplyNode);

        // 如果已经有运算符，替换最后一个；否则添加新的
        if (this.operators.length >= this.selectedValues.length) {
            // 替换最后一个运算符
            this.operators[this.operators.length - 1] = '×';
            this.operatorTypes[this.operatorTypes.length - 1] = SymbolsType.MULTIPLY;
        } else {
            // 添加运算符
            this.operators.push('×');
            this.operatorTypes.push(SymbolsType.MULTIPLY);
        }

        // 更新表达式
        this.updateExpression();

        // 如果已经选择了4张卡片，且有3个运算符，自动计算结果
        this.checkAutoSubmit();
    }

    divideFunc() {
        // 必须先选卡片再选运算符
        if (this.selectedValues.length === 0) {
            DebugLog.instance.log('请先选择卡片');
            return;
        }

        // 检查场上是否只剩下一张牌（即其他牌都被隐藏了）
        const activeCardsCount = this.cards.filter(card => card.active).length;
        if (activeCardsCount === 1) {
            DebugLog.instance.log('场上只剩下一张牌，无法进行运算');
            return;
        }

        // 设置描边效果
        this.setOperatorOutline(this.divideNode);

        // 如果已经有运算符，替换最后一个；否则添加新的
        if (this.operators.length >= this.selectedValues.length) {
            // 替换最后一个运算符
            this.operators[this.operators.length - 1] = '÷';
            this.operatorTypes[this.operatorTypes.length - 1] = SymbolsType.DIVIDE;
        } else {
            // 添加运算符
            this.operators.push('÷');
            this.operatorTypes.push(SymbolsType.DIVIDE);
        }

        // 更新表达式
        this.updateExpression();

        // 如果已经选择了4张卡片，且有3个运算符，自动计算结果
        this.checkAutoSubmit();
    }


    /**
     * 重置卡牌状态
     */
    resetCardStatus(isReset: boolean = false) {
        DebugLog.instance.log('重置所有卡牌状态');
        if (!this.cards) {
            return;
        }

        if (isReset) {
            this.cardValues = [...this._preQuestions];
        }

        // 重置所有卡牌的状态
        for (let i = 0; i < this.cards.length; i++) {
            // 显示所有卡牌
            this.cards[i].active = true;

            const spriteNode = this.cards[i].getChildByName("sprite");
            const labelNode = this.cards[i].getChildByName("label");
            const icon0Node = this.cards[i].getChildByName("icon0");
            const icon1Node = this.cards[i].getChildByName("icon1");
            if (icon0Node) {
                const icon0 = icon0Node.getComponent(Sprite);
                if (icon0) {
                    icon0.spriteFrame = null;
                }
            }
            if (icon1Node) {
                const icon1 = icon1Node.getComponent(Sprite);
                if (icon1) {
                    icon1.spriteFrame = null;
                }
            }
            if (spriteNode) {
                const sprite = spriteNode.getComponent(Sprite);
                if (sprite) {
                    // 恢复原始颜色
                    sprite.color = new Color(255, 255, 255, 255);
                    DebugLog.instance.log(`重置卡片${i}颜色为白色`);
                }
                // 显示sprite节点
                spriteNode.active = true;
            }

            if (labelNode) {
                labelNode.active = false;
            }


            // 隐藏并清理结果显示节点
            const resultNode = this.cards[i].getChildByName("resultDisplay");
            if (resultNode) {
                resultNode.active = false;
                resultNode.destroy();
            }

            // 恢复原始缩放
            this.cards[i].setScale(new Vec3(1, 1, 1));
        }

        // 清空所有状态
        this.selectedCards = [];
        this.selectedValues = [];
        this.operators = [];
        this.operatorTypes = [];
        this.currentExpression = '';
        this.currentResult = 0;
        this.usedCardIndices.clear(); // 确保清空已使用的卡片集合
        // this.brackets = [];
        // this.bracketMode = 0;

        // 清空计算步骤记录
        this.calculationSteps = [];
        this.currentStepIndex = -1;

        // 清除运算符按钮描边
        this.clearOperatorOutline();

        // 清理所有运算符按钮的描边节点
        this.clearAllOperatorOutlines();

        // 恢复标签颜色
        this.formulaLabel.color = new Color(0, 0, 0, 255);

        // 清空显示
        this.setLabel("");

        DebugLog.instance.log('卡牌状态已全部重置');
    }

    refreshView() {
        this.mainView.active = true;

        this.setLabel("");
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.showStartAlert({ parentNode: this.mainView, start: this.startGameByAlert, context: this });
        } else {

        }
    }

    flipCard() {
        // 确保卡片值已更新
        DebugLog.instance.log('翻转卡牌，当前卡牌值:', this.cardValues);

        this.cards.forEach((card: Node, index: number) => {
            let sprite = card.getChildByName("sprite").getComponent(Sprite);
            let icon0 = card.getChildByName("icon0").getComponent(Sprite);
            let icon1 = card.getChildByName("icon1").getComponent(Sprite);
            const labelNode = card.getChildByName("label");
            const label = labelNode.getComponent(Label);
            label.string = "";
            labelNode.active = true;
            // 动画半程时长
            const halfDuration = this.flipDuration / 2;
            // 初始确保 scale 为 (1, 1, 1)
            card.setScale(new Vec3(1, 1, 1));
            let self = this;
            tween(card)
                // 第一阶段：X轴从 1 缩放到 0
                .to(halfDuration, { scale: new Vec3(0, 1, 1) })
                .call(() => {
                    // 如果当前是正面，切换到背面
                    if (self.isFront) {
                        sprite.spriteFrame = self.backFrame!;
                    } else {
                        // 随机选择一个花色
                        const flowerTypes = [
                            self._blackCardRes,  // 黑桃
                            self._clubCardRes,   // 梅花
                            self._diamondCardRes, // 方块
                            self._heartCardRes   // 红心
                        ];
                        const flowerIndex = Math.floor(Math.random() * flowerTypes.length);
                        const randomFlower = flowerTypes[flowerIndex];

                        // 获取当前卡片的数字值，确保在有效范围内
                        if (index < self.cardValues.length) {
                            const cardValue = self.cardValues[index];
                            const cardNumber = cardValue - 1;
                            DebugLog.instance.log(`加载卡片${index}图片，值=${cardValue}, 图片索引=${cardNumber}`);
                            let cardDisplayValue: string = cardNumber.toString(); // 数字转字符串

                            // 清除可能的缓存
                            sprite.spriteFrame = null;
                            icon0.spriteFrame = null;
                            icon1.spriteFrame = null;

                            sprite.spriteFrame = self.frontFrame!;

                            label.string = cardValue + "";

                            // 根据花色设置文本颜色
                            // 黑桃(0)和梅花(1) -> #262525, 方块(2)和红心(3) -> #FA657A
                            if (flowerIndex === 0 || flowerIndex === 1) {
                                // 黑桃或梅花，设置为深灰色 #262525 (RGB: 38, 37, 37)
                                label.color = new Color(38, 37, 37, 255);
                            } else {
                                // 方块或红心，设置为粉红色 #FA657A (RGB: 250, 101, 122)
                                label.color = new Color(250, 101, 122, 255);
                            }

                            // 构建完整的图片路径
                            const imagePath = randomFlower;// + cardDisplayValue;

                            const bundle = assetManager.getBundle(self.bundleName);
                            // if (sprite.spriteFrame && sprite.spriteFrame.texture) {
                            //     sprite.spriteFrame.texture.destroy();
                            // }

                            bundle.load(imagePath + "/spriteFrame", SpriteFrame, (err, sp) => {
                                if (err) {
                                    DebugLog.instance.error('加载卡片图片失败:', imagePath, err);
                                    return;
                                }
                                icon0.spriteFrame = sp;
                                icon1.spriteFrame = sp;
                            });
                        } else {
                            DebugLog.instance.error('卡片索引超出范围:', index, '当前卡片值数组:', self.cardValues);
                        }
                    }
                })
                // 第二阶段：X轴从 0 缩放回 1
                .to(halfDuration, { scale: new Vec3(1, 1, 1) })
                .call(() => {
                    // 更新状态
                    self.isFront = !self.isFront;
                    if (!self.timerComponent.isRun()) {
                        self.startTime(self.time);

                        // 显示当前难度级别
                        if (!self.isFront) { // 只在翻到正面时显示
                            const difficultyText = ['简单', '中等', '困难'][self.hardIndex];
                            self.setLabel(`难度：${difficultyText}`);
                            // self.label.string = `难度：${difficultyText}`;

                            // 延迟一会后清空提示文字
                            setTimeout(() => {
                                self.setLabel("");
                                // self.label.string = "";
                            }, 1500);
                        }
                    }
                })
                .start();
        })
    }

    startGameByAlert() {
        // 串烧训练时间配置
        this.startTime(this.time);
    }

    startGameCenterGame() {
        this.flipCard();
    }

    startGameCenterNextGame() {

    }

    retryGameCenterGame() {

    }

    checkFunc() {
        if (this.formulaLabel.string == "24") {
            this.onSuccess();
        } else {
            this.onFail();
        }
    }

    /**
     * 高亮显示卡牌
     */
    highlightCard(index: number) {
        if (index >= 0 && index < this.cards.length) {
            const spriteNode = this.cards[index].getChildByName("sprite");
            if (spriteNode) {
                const sprite = spriteNode.getComponent(Sprite);
                if (sprite) {
                    sprite.color = new Color(179, 241, 46, 255); // 黄色高亮
                }
            }
        }
    }

    /**
     * 清除所有高亮显示
     */
    clearHighlights() {
        for (const index of this.selectedCards) {
            if (index >= 0 && index < this.cards.length) {
                const spriteNode = this.cards[index].getChildByName("sprite");
                if (spriteNode) {
                    const sprite = spriteNode.getComponent(Sprite);
                    if (sprite) {
                        // 恢复卡片原始颜色
                        sprite.color = new Color(255, 255, 255, 255);
                        DebugLog.instance.log(`恢复卡片${index}的原始颜色`);
                    }
                }

                // 恢复原始缩放
                this.cards[index].setScale(new Vec3(1, 1, 1));
            }
        }
    }

    equalFunc() {
        // 必须恰好使用4张牌和3个运算符才允许提交
        if (this.selectedValues.length !== 4 || this.operators.length !== 3) {
            DebugLog.instance.log('表达式未使用完4张牌或3个运算符，提交无效');

            const alertData = new AlertData();
            alertData.title = "提示";
            alertData.message = "必须使用4张牌和3个运算符才能提交";
            alertData.cancelButtonVisible = false;
            alertData.confirmButtonText = "知道了";
            AlertManager.getInstance().showAlert(alertData);

            return;
        }

        // 仅计算结果，不改动文本内容（文本只显示公式）
        const result = this.calculateExpressionWithBrackets();

        setTimeout(() => {
            if (Math.abs(result - 24) < 0.000001) {
                this.onSuccess();
            } else {
                this.onFail();
            }
        }, 500);
    }

    refreshFunc() {
        DebugLog.instance.log('刷新训练状态...');

        // 重置游戏状态
        this.resetCardStatus(true);



        this._isGameCompleted = false; // 重置游戏完成状态

        // 重置倒计时
        if (this.timerComponent) {
            this.timerComponent.resetTimer();
        }

        // 清空所有状态
        this.usedCardIndices.clear();
        this.selectedCards = [];
        this.selectedValues = [];
        this.operators = [];
        this.operatorTypes = [];
        this.calculationSteps = [];
        this.currentStepIndex = -1;

        // 清除运算符按钮描边
        this.clearAllOperatorOutlines();

        // 记录初始状态（4张牌的状态）
        this.recordInitialState();

        // 清空表达式显示
        this.setLabel("");




        // 刷新卡牌显示，确保翻转
        this.forceRefreshCardDisplay();

        // 更新游戏UI
        this.updateGameUI();

        DebugLog.instance.log('游戏状态已重置，新题目已加载');
    }

    quitGame() {
        this.pauseTime();
        // SceneManager.getInstance().backToGameCenter();
        super.quitGame({ parentNode: this.mainView, context: this })
    }

    onSuccess() {
        this._isGameCompleted = true; // 设置游戏完成状态
        this.mainView.active = true;
        this.playAudio("music/win");

        // 停止倒计时
        if (this.timerComponent) {
            this.timerComponent.pauseTimer();
        }

        // 记录成功，可以在这里添加分数统计等逻辑
        DebugLog.instance.log('成功解决题目:', this.currentQuestion);

        // 使用游戏大厅的结算界面
        UIManager.getInstance().showPanel(SettlementPanel.NAME, {
            result: true,
            nextHandler: () => {
                // 增加难度
                this.hardIndex = (this.hardIndex + 1) % 3; // 0->1->2->0 循环

                this.loadNewQuestion();



                DebugLog.instance.log('切换到难度:', this.hardIndex + 1);
            },
            againHandler: () => {
                this.onAgain();

                DebugLog.instance.log('重新开始当前难度:', this.hardIndex + 1);
            }
        });
    }

    onFail() {
        this._isGameCompleted = true; // 设置游戏完成状态
        this.playAudio("music/fail");

        // 停止倒计时
        if (this.timerComponent) {
            this.timerComponent.pauseTimer();
        }

        // 可以在这里显示正确解法
        DebugLog.instance.log('题目解法:', this.currentQuestion?.solutions);

        // 显示正确解法
        let solutionText = "";
        if (this.currentQuestion && this.currentQuestion.solutions && this.currentQuestion.solutions.length > 0) {
            solutionText = `正确解法: ${this.currentQuestion.solutions[0]}`;
        }

        // 使用游戏大厅的结算界面
        UIManager.getInstance().showPanel(SettlementPanel.NAME, {
            result: false,
            nextHandler: () => {
                this.loadNewQuestion();
            },
            againHandler: () => {
                this.onAgain();
                DebugLog.instance.log('重新开始当前难度:', this.hardIndex + 1);
            }
        });
    }

    onAgain(): void {
        DebugLog.instance.log('重新玩当前局...');
        // 重新玩当前局
        this.refreshFunc();
    }

    onTimerEnd() {
        super.onTimerEnd();
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            //上报数据
            this._requestSkewersGameComplete();
        } else {
            this._requestGameCenterComplete();
        }
        this.onFail();
    }

    private _requestSkewersGameComplete() {

    }

    private _requestGameCenterComplete() {

    }


    private _preQuestions: number[] = [];

    /**
     * 加载新题目
     */
    loadNewQuestion() {
        DebugLog.instance.log('加载新题目...');

        // 完全重置状态
        this.resetCardStatus();

        // 重置倒计时
        if (this.timerComponent) {
            this.timerComponent.resetTimer();
        }

        // 再次确保卡片使用状态被清空
        this.usedCardIndices.clear();
        this.selectedCards = [];
        this.selectedValues = [];

        // 根据当前难度选择题目
        const difficulty = this.hards[this.hardIndex];

        // 从题库获取题目
        this.currentQuestion = this.math24Database.getQuestion(difficulty);

        DebugLog.instance.log("加载新题目", this.currentQuestion);

        // 如果获取到题目，使用它的值
        if (this.currentQuestion) {
            this.cardValues = [...this.currentQuestion.numbers];
            this._preQuestions = [...this.currentQuestion.numbers];
        } else {
            // 如果没有找到题目，使用默认值
            this.cardValues = [1, 3, 5, 7];
        }

        // 记录初始状态（4张牌的状态）
        this.recordInitialState();

        // 初始化卡片显示
        this.forceRefreshCardDisplay();

        DebugLog.instance.error('题目加载完成，状态检查:');
        DebugLog.instance.error('- 选中卡片:', this.selectedCards);
        DebugLog.instance.log('- 已使用卡片:', Array.from(this.usedCardIndices));
    }

    setLabel(str: string) {
        this.formulaLabel.string = str;
    }

    /**
     * 更新卡片显示
     */
    updateCardDisplay() {
        // 这里可以更新卡片的显示内容，例如显示卡片的数字等
        // 此处需要根据实际UI结构实现
        for (let i = 0; i < this.cards.length && i < this.cardValues.length; i++) {
            const cardLabel = this.cards[i].getComponentInChildren(Label);
            if (cardLabel) {
                cardLabel.string = this.cardValues[i].toString();
            }
        }
    }

    // 跳过当前题目，加载下一题
    skipQuestion() {
        this.loadNewQuestion();
        this.setLabel("");
        // this.label.string = "";
        this._curCardData = null;
    }

    /**
     * 清空当前操作，重新开始
     */
    clearFunc() {
        // 重新加载题目
        this.loadNewQuestion();
    }


    /**
     * 切换到下一题（保持当前难度）
     */
    nextQuestionSameDifficulty() {
        DebugLog.instance.log('切换到下一题（保持当前难度）...');

        // 重置训练状态
        this.resetCardStatus();
        this._isGameCompleted = false; // 重置游戏完成状态

        // 保持当前难度不变
        // this.hardIndex 保持不变

        // 加载新题目
        this.loadNewQuestion();

        DebugLog.instance.log('保持难度:', this.hardIndex + 1);
    }

    /**
     * 显示答案
     */
    showAnswer() {
        DebugLog.instance.log('显示答案...');

        if (!this.currentQuestion || !this.currentQuestion.solutions || this.currentQuestion.solutions.length === 0) {
            DebugLog.instance.warn('当前没有题目或没有解法');
            return;
        }

        // 获取第一个解法作为答案
        const answer = this.currentQuestion.solutions[0];
        const cardNumbers = this.currentQuestion.numbers.join(', ');

        // 使用 SettlementPanel 显示答案
        UIManager.getInstance().showPanel(SettlementPanel.NAME, {
            mode: "answer",
            answerCardNumbers: `题目数字：${cardNumbers}`,
            answerSolution: `解法：${answer}`,
            nextHandler: () => {
                DebugLog.instance.log('用户查看了答案');
            }
        });
    }

    /**
     * 下一题按钮点击事件
     */
    onClickNextQuestion() {
        DebugLog.instance.log('点击下一题按钮');
        this.nextQuestionSameDifficulty();
    }


    private _time = null;
    /**
     * 强制刷新所有卡牌的显示
     */
    forceRefreshCardDisplay() {
        // 先重置卡牌到背面
        this.cards.forEach((card: Node) => {
            let sprite = card.getChildByName("sprite").getComponent(Sprite);
            if (sprite) {
                sprite.spriteFrame = this.backFrame!;
            }
        });

        this.isFront = false;

        if (this._time) {
            clearTimeout(this._time);
            this._time = null;
        }

        // 执行翻转
        this._time = setTimeout(() => {
            this.flipCard();
        }, 500);
    }

    /**
     * 检查是否可以自动提交
     */
    checkAutoSubmit() {

        // 只高亮提示用户可以点击等号了
        if (this.selectedCards.length === 4 && this.operators.length === 3) {
            // 提示用户可以点击等号了
            DebugLog.instance.log('表达式已完成，请点击等号按钮计算结果');
            // 可以在这里添加等号按钮的高亮效果
        }
    }

    /**
     * 考虑括号计算表达式
     */
    calculateExpressionWithBrackets() {
        // 复制数组以免影响原始数据
        const values = [...this.selectedValues];
        const ops = [...this.operatorTypes];

        DebugLog.instance.log('开始计算带括号的表达式:');
        DebugLog.instance.log('- 原始值:', values);
        DebugLog.instance.log('- 原始运算符:', ops);

        return this.calculateWithPriority(values, ops);

    }


    /**
     * 按照运算符优先级计算结果
     */
    calculateWithPriority(values: number[], ops: number[]): number {
        if (values.length === 1) {
            return values[0];
        }

        // 复制数组以便操作
        const valCopy = [...values];
        const opsCopy = [...ops];

        // 第一轮：处理乘除法
        for (let i = 0; i < opsCopy.length; i++) {
            if (opsCopy[i] === SymbolsType.MULTIPLY || opsCopy[i] === SymbolsType.DIVIDE) {
                // 计算乘除法
                const result = this.calculateResult(valCopy[i], valCopy[i + 1], opsCopy[i]);

                // 替换计算结果
                valCopy.splice(i, 2, result);
                opsCopy.splice(i, 1);

                // 调整索引
                i--;
            }
        }

        // 第二轮：处理加减法
        while (opsCopy.length > 0) {
            const result = this.calculateResult(valCopy[0], valCopy[1], opsCopy[0]);
            valCopy.splice(0, 2, result);
            opsCopy.shift();
        }

        return valCopy[0];
    }

    /**
     * 计算最终结果（修改为使用新的计算方法）
     */
    calculateFinalResult() {
        if (this.selectedValues.length !== 4 || this.operators.length !== 3) {
            DebugLog.instance.log('表达式不完整');
            return;
        }

        // 使用考虑括号的计算方法
        const finalResult = this.calculateExpressionWithBrackets();

        // 显示最终结果
        setTimeout(() => {
            this.setLabel(`${this.currentExpression} = ${finalResult}`);
            // this.label.string = `${this.currentExpression} = ${finalResult}`;

            // 检查结果是否为24
            setTimeout(() => {
                if (Math.abs(finalResult - 24) < 0.000001) {
                    this.onSuccess();
                } else {
                    this.onFail();
                }
            }, 1000);
        }, 500);
    }

    /**
     * 计算两个数的四则运算结果
     */
    calculateResult(a: number, b: number, operator: number): number {
        switch (operator) {
            case SymbolsType.ADD:
                return a + b;
            case SymbolsType.SUBTRACT:
                return a - b;
            case SymbolsType.MULTIPLY:
                return a * b;
            case SymbolsType.DIVIDE:
                return a / b;
            default:
                return 0;
        }
    }

    /**
     * 禁用卡片（显示高亮效果表示已被选中）
     */
    disableCard(index: number) {
        if (index >= 0 && index < this.cards.length) {
            // 获取卡片的sprite子节点
            const spriteNode = this.cards[index].getChildByName("sprite");

            if (spriteNode) {
                const sprite = spriteNode.getComponent(Sprite);
                if (sprite) {
                    // 更改为明亮的高亮颜色，使用优雅的紫色突出显示已选择的卡牌
                    sprite.color = new Color(179, 241, 46, 255); // #B3F12E 高亮效果

                    // 为卡片添加轻微缩放效果，显示它已被选中
                    this.cards[index].setScale(new Vec3(0.95, 0.95, 1));

                    // 播放选中声音（可选）
                    this.playAudio("click");

                    // 可以在这里添加简单的动画效果
                    tween(this.cards[index])
                        .to(0.1, { scale: new Vec3(0.9, 0.9, 1) })
                        .to(0.1, { scale: new Vec3(0.95, 0.95, 1) })
                        .start();

                    DebugLog.instance.log(`设置卡片${index}高亮颜色: 255, 215, 0,255`);
                }
            } else {
                DebugLog.instance.log(`卡片${index}没有找到sprite子节点`);
            }
        }
    }

    /**
     * 更新表达式显示
     */
    updateExpression() {
        DebugLog.instance.log("更新表达式显示:", this.selectedValues, this.operators);

        // 根据选择的卡片和运算符构建表达式
        let expressionParts = [];
        let values = this.selectedValues;
        let ops = this.operators;

        // 如果没有选择任何卡片，显示空
        if (values.length === 0) {
            this.setLabel("");
            // this.label.string = "";
            return;
        }

        // 构建基本表达式，插入数字和运算符
        for (let i = 0; i < values.length; i++) {
            expressionParts.push(values[i].toString());
            if (i < ops.length) {
                expressionParts.push(ops[i]);
            }
        }

        // 处理括号的情况
        let expression = expressionParts.join(' ');
        // if (this.brackets.length > 0) {
        //     // 先转换成带括号的表达式
        //     expression = this.buildExpressionWithBrackets(expressionParts);
        // }

        DebugLog.instance.log("最终表达式:", expression);

        // 保存当前表达式以便在其他地方使用
        this.currentExpression = expression;

        // 计算当前表达式的结果（仅用于内部校验），文本只显示公式
        if (values.length === 4 && ops.length === 3) {
            try {
                this.currentResult = this.calculateExpressionWithBrackets();

                // 文本仅显示公式
                this.setLabel(expression);

                // 如果结果接近24，改变文本颜色以给予视觉反馈
                if (Math.abs(this.currentResult - 24) < 0.00001) {
                    this.formulaLabel.color = new Color(0, 255, 0, 255); // 绿色，表示成功
                } else if (Math.abs(this.currentResult - 24) < 5) {
                    this.formulaLabel.color = new Color(179, 241, 46, 255); // 黄色，表示接近
                } else {
                    this.formulaLabel.color = new Color(0, 0, 0, 255); // 黑色，正常状态
                }
            } catch (e) {
                DebugLog.instance.error('计算表达式出错:', e);
                // 出错时只显示表达式
                this.setLabel(expression);
                // this.label.string = expression;
            }
        } else {
            // 只显示公式
            this.setLabel(expression);
        }
    }

    /**
     * 添加卡片到表达式
     */
    addCardToExpression(index: number, cardValue: number) {
        // 已选择了4张卡片，不再接受新的卡片
        if (this.selectedCards.length >= 4) {
            DebugLog.instance.log('已选择4张卡片');
            return;
        }

        // 添加到已选择的卡片
        this.selectedCards.push(index);
        this.selectedValues.push(cardValue);
        this.usedCardIndices.add(index);

        DebugLog.instance.log(`添加卡片${index}到表达式，值: ${cardValue}`);
        this.disableCard(index);

        // 检查是否需要自动计算结果并替换卡牌
        this.checkAndReplaceCardWithResult(index);

        // 调试信息
        DebugLog.instance.log('当前选中卡片:', this.selectedCards);
        DebugLog.instance.log('当前选中值:', this.selectedValues);
    }

    /**
     * 检查并替换卡牌为计算结果
     */
    checkAndReplaceCardWithResult(currentCardIndex: number) {
        let preCardValues = [...this.cardValues];
        // 检查是否满足条件：已选择2张卡牌且有1个运算符
        if (this.selectedCards.length === 2 && this.operators.length === 1) {
            DebugLog.instance.log('满足自动计算条件：2张卡牌 + 1个运算符');

            // 计算前两张卡牌的结果
            const firstValue = this.selectedValues[0];
            const secondValue = this.selectedValues[1];
            const operator = this.operatorTypes[0];

            const result = this.calculateResult(firstValue, secondValue, operator);
            DebugLog.instance.log(`计算结果: ${firstValue} ${this.operators[0]} ${secondValue} = ${result}`);

            // 保存要隐藏的第一张卡牌索引
            const firstCardIndex = this.selectedCards[0];

            // 隐藏第一张卡牌
            this.hideCard(firstCardIndex);

            // 在第二张卡牌上显示计算结果
            this.replaceCardWithResult(currentCardIndex, result);

            // 更新状态：只保留第二张卡牌，其值为计算结果
            this.selectedCards = [currentCardIndex];
            this.selectedValues = [result];
            this.operators = [];
            this.operatorTypes = [];

            // 清除运算符按钮描边
            this.clearOperatorOutline();

            // 更新卡牌值数组，将计算结果赋予第二张卡牌
            this.cardValues[currentCardIndex] = result;
            DebugLog.instance.log(`卡牌${currentCardIndex}的值已更新为: ${result}`);

            // 从cardValues中移除被隐藏的第一张卡牌的值
            this.cardValues[firstCardIndex] = null;
            DebugLog.instance.log(`卡牌${firstCardIndex}的值已移除`);

            // 隐藏对应的卡牌
            this.cards[firstCardIndex].active = false;

            // 从已使用集合中移除第一张卡牌
            this.usedCardIndices.delete(firstCardIndex);

            // 第二张卡牌保持选中状态
            this.disableCard(currentCardIndex);

            // 记录计算步骤（记录计算后的状态）
            this.recordCalculationStep({
                type: 'first_calculation',
                firstCardIndex: firstCardIndex,
                secondCardIndex: currentCardIndex,
                firstValue: firstValue,
                secondValue: secondValue,
                operator: this.operators[0],
                result: result,
                selectedCards: [...this.selectedCards],
                selectedValues: [...this.selectedValues],
                cardValues: [...this.cardValues],
                usedCardIndices: new Set(this.usedCardIndices),
                beforeCardValues: [...preCardValues] // 计算前的状态
            });

            // 检查计算结果是否等于24
            this.checkResultEquals24(result);

            DebugLog.instance.log('卡牌替换完成，当前状态:');
            DebugLog.instance.log('- 选中卡片:', this.selectedCards);
            DebugLog.instance.log('- 选中值:', this.selectedValues);
        }
        // 检查是否满足连续计算条件：已选择1张卡牌（结果卡牌）且有1个运算符，再选择1张新卡牌
        else if (this.selectedCards.length === 2 && this.operators.length === 1 &&
            this.selectedCards[0] !== currentCardIndex) {
            DebugLog.instance.log('满足连续计算条件：结果卡牌 + 运算符 + 新卡牌');

            // 计算结果卡牌和新卡牌的结果
            const resultValue = this.selectedValues[0]; // 结果卡牌的值
            const newValue = this.selectedValues[1];   // 新卡牌的值
            const operator = this.operatorTypes[0];

            const newResult = this.calculateResult(resultValue, newValue, operator);
            DebugLog.instance.log(`连续计算结果: ${resultValue} ${this.operators[0]} ${newValue} = ${newResult}`);

            // 保存要隐藏的结果卡牌索引
            const resultCardIndex = this.selectedCards[0];

            // 隐藏前面的结果卡牌（第一张卡牌）
            this.hideCard(resultCardIndex);

            // 在新卡牌上显示新的计算结果（新卡牌不消失）
            this.replaceCardWithResult(currentCardIndex, newResult);

            // 更新状态：只保留新卡牌，其值为新的计算结果
            this.selectedCards = [currentCardIndex];
            this.selectedValues = [newResult];
            this.operators = [];
            this.operatorTypes = [];

            // 清除运算符按钮描边
            this.clearOperatorOutline();

            // 更新卡牌值数组，将新的计算结果赋予新卡牌
            this.cardValues[currentCardIndex] = newResult;
            DebugLog.instance.log(`卡牌${currentCardIndex}的值已更新为: ${newResult}`);

            // 从cardValues中移除被隐藏的结果卡牌的值
            this.cardValues[resultCardIndex] = null;
            DebugLog.instance.log(`卡牌${resultCardIndex}的值已移除`);

            // 隐藏对应的卡牌
            this.cards[resultCardIndex].active = false;

            // 从已使用集合中移除结果卡牌
            this.usedCardIndices.delete(resultCardIndex);

            // 新卡牌保持选中状态
            this.disableCard(currentCardIndex);

            // 记录计算步骤（记录计算后的状态）
            this.recordCalculationStep({
                type: 'continuous_calculation',
                resultCardIndex: resultCardIndex,
                newCardIndex: currentCardIndex,
                resultValue: resultValue,
                newValue: newValue,
                operator: this.operators[0],
                newResult: newResult,
                selectedCards: [...this.selectedCards],
                selectedValues: [...this.selectedValues],
                cardValues: [...this.cardValues],
                usedCardIndices: new Set(this.usedCardIndices),
                beforeCardValues: [...preCardValues] // 计算前的状态
            });

            // 检查计算结果是否等于24
            this.checkResultEquals24(newResult);

            DebugLog.instance.log('连续计算完成，当前状态:');
            DebugLog.instance.log('- 选中卡片:', this.selectedCards);
            DebugLog.instance.log('- 选中值:', this.selectedValues);
        }
    }

    /**
     * 记录初始状态（4张牌的初始值）
     */
    recordInitialState() {
        // 清空之前的所有步骤
        this.calculationSteps = [];
        this.currentStepIndex = -1;

        // 记录初始状态
        const initialStep = {
            type: 'initial_state',
            cardValues: [...this.cardValues],
            selectedCards: [],
            selectedValues: [],
            cardIndices: [0, 1, 2, 3] // 初始的4张牌索引
        };

        this.calculationSteps.push(initialStep);
        this.currentStepIndex = 0;

        DebugLog.instance.log('记录初始状态:', initialStep);
        DebugLog.instance.log('初始卡牌值:', this.cardValues);
    }

    /**
     * 记录计算步骤
     */
    recordCalculationStep(stepData: any) {
        // 如果当前索引不是最后一个，需要清空后续步骤重新记录
        if (this.currentStepIndex < this.calculationSteps.length - 1) {
            // 删除从 currentStepIndex + 1 到数组末尾的所有旧步骤
            const removeCount = this.calculationSteps.length - (this.currentStepIndex + 1);
            this.calculationSteps.splice(this.currentStepIndex + 1, removeCount);
            DebugLog.instance.log(`清空了 ${removeCount} 个旧步骤，准备重新记录`);
        }

        // 添加新步骤
        this.calculationSteps.push(stepData);
        this.currentStepIndex = this.calculationSteps.length - 1;
        DebugLog.instance.log(`添加新步骤 ${this.currentStepIndex + 1}:`, stepData.type);

        DebugLog.instance.log('总步骤数:', this.calculationSteps.length);
        DebugLog.instance.log('当前步骤索引:', this.currentStepIndex);
    }

    /**
     * 检查计算结果是否等于24
     */
    checkResultEquals24(result: number) {
        DebugLog.instance.log(`检查计算结果: ${result} 是否等于24`);

        // 检查是否所有4张卡牌都被使用过
        const usedCardsCount = this.usedCardIndices.size;
        const nullValuesCount = this.cardValues.filter(value => value === null).length;

        DebugLog.instance.log(`已使用卡牌数量: ${usedCardsCount}`);
        DebugLog.instance.log(`null值卡牌数量: ${nullValuesCount}`);

        // 只有当所有4张卡牌都被使用过（即3张卡牌被隐藏，1张卡牌显示结果）时才能检查24
        if (nullValuesCount < 3) {
            DebugLog.instance.log('还有卡牌未使用，不能检查24结果');
            return;
        }

        // 使用浮点数比较，允许小的误差
        if (Math.abs(result - 24) < 0.000001) {
            DebugLog.instance.log('所有卡牌已使用且计算结果等于24，显示成功！');
            this.onSuccess();
        } else {
            DebugLog.instance.log(`所有卡牌已使用但计算结果不等于24，当前结果: ${result}`);
        }
    }

    /**
     * 隐藏卡牌
     */
    hideCard(cardIndex: number) {
        if (cardIndex >= 0 && cardIndex < this.cards.length) {
            this.cards[cardIndex].active = false;
            DebugLog.instance.log(`隐藏卡牌${cardIndex}`);
        }
    }

    /**
     * 替换卡牌资源为计算结果
     */
    replaceCardWithResult(cardIndex: number, result: number) {
        if (cardIndex >= 0 && cardIndex < this.cards.length) {
            const cardNode = this.cards[cardIndex];
            const labelNode = cardNode.getChildByName("label");

            if (labelNode) {
                const label = labelNode.getComponent(Label);
                if (label) {
                    // 直接在卡牌的label中显示计算结果
                    label.string = result.toString();
                }
            } else {
                DebugLog.instance.error(`卡牌${cardIndex}没有找到label节点`);
            }
        }
    }

    /**
     * 创建结果显示
     */
    createResultDisplay(cardIndex: number, result: number) {
        const cardNode = this.cards[cardIndex];

        // 隐藏原有的sprite
        const spriteNode = cardNode.getChildByName("sprite");
        // if (spriteNode) {
        //     spriteNode.active = false;
        // }

        // 创建或更新结果显示节点
        let resultNode = cardNode.getChildByName("resultDisplay");
        if (!resultNode) {
            resultNode = new Node("resultDisplay");
            cardNode.addChild(resultNode);
        }

        // 设置结果显示的位置和样式
        resultNode.setPosition(0, 0, 0);

        // 创建Label组件显示结果
        const label = resultNode.getComponent(Label) || resultNode.addComponent(Label);
        label.string = result.toString();
        label.fontSize = 48;
        label.color = new Color(0, 0, 0, 255);

        // 设置Label的节点属性
        resultNode.active = true;

        // 添加动画效果
        resultNode.setScale(new Vec3(0.5, 0.5, 1));
        tween(resultNode)
            .to(0.2, { scale: new Vec3(1.1, 1.1, 1) })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    /**
     * 构建带括号的表达式
     */
    buildExpressionWithBrackets(expressionParts: string[]): string {
        // 首先构建基本表达式（不含括号）
        let baseExpression = '';
        for (let i = 0; i < expressionParts.length; i++) {
            if (i > 0) baseExpression += ' ';
            baseExpression += expressionParts[i];
        }

        return baseExpression;

    }

    /**
     * 计算当前表达式的结果
     */
    calculateCurrentResult() {
        if (this.selectedValues.length > 1 && this.operators.length > 0) {
            try {
                this.currentResult = this.calculateExpressionWithBrackets();
            } catch (e) {
                DebugLog.instance.error('计算表达式出错:', e);
                this.currentResult = 0;
            }
        } else {
            this.currentResult = this.selectedValues.length > 0 ? this.selectedValues[0] : 0;
        }
    }

    /**
     * 恢复步骤状态
     */
    restoreStepState(stepData: any) {
        if (stepData.type === 'initial_state') {
            // 恢复初始状态（4张牌的原始值）
            this.selectedCards = [];
            this.selectedValues = [];
            this.operators = [];
            this.operatorTypes = [];
            this.cardValues = [...stepData.cardValues];
            this.usedCardIndices.clear();

            // 显示所有卡牌
            this.cards.forEach((card, index) => {
                card.active = true;
            });

            // 恢复卡牌显示
            this.restoreCardDisplay(false);
            // 更新表达式显示
            this.updateExpression();

        } else if (stepData.type === 'first_calculation') {
            // 恢复第一次计算前的状态，但只保留第一张卡牌为选中状态
            this.selectedCards = [stepData.secondCardIndex];
            this.selectedValues = [stepData.result];
            this.operators = [];
            this.operatorTypes = [];
            // 使用计算前的状态
            this.cardValues = [...stepData.cardValues];
            this.usedCardIndices = new Set();

            // 显示所有卡牌
            this.cards.forEach((card, index) => {
                card.active = true;
            });

            // 检查并隐藏所有null值的卡牌
            this.hideNullValueCards();
            // 恢复卡牌显示
            this.restoreCardDisplay(true);
            // 更新表达式显示
            this.updateExpression();

        }
        // else if (stepData.type === 'continuous_calculation') {
        //     // 恢复连续计算前的状态，但只保留结果卡牌为选中状态
        //     this.selectedCards = [stepData.resultCardIndex];
        //     this.selectedValues = [stepData.resultValue];
        //     this.operators = [];
        //     this.operatorTypes = [];
        //     // 使用计算前的状态
        //     this.cardValues = [...stepData.cardValues];
        //     this.usedCardIndices = new Set();

        //     // 显示所有卡牌
        //     this.cards.forEach((card, index) => {
        //         card.active = true;
        //     });

        //     // 检查并隐藏所有null值的卡牌
        //     this.hideNullValueCards();
        //     // 恢复卡牌显示
        //     this.restoreCardDisplay(true);
        //     // 更新表达式显示
        //     this.updateExpression();
        // }

        DebugLog.instance.log('状态恢复完成');
        DebugLog.instance.log('- 选中卡片:', this.selectedCards);
        DebugLog.instance.log('- 选中值:', this.selectedValues);
    }

    /**
     * 获取运算符类型
     */
    getOperatorType(operator: string): number {
        switch (operator) {
            case '+': return SymbolsType.ADD;
            case '-': return SymbolsType.SUBTRACT;
            case '×': return SymbolsType.MULTIPLY;
            case '÷': return SymbolsType.DIVIDE;
            default: return SymbolsType.ADD;
        }
    }

    /**
     * 恢复卡牌显示
     */
    restoreCardDisplay(changeStep: boolean = false) {
        for (let i = 0; i < this.cards.length; i++) {
            const card = this.cards[i];
            const labelNode = card.getChildByName("label");

            // 检查cardValues是否为null，如果是则隐藏卡牌
            if (this.cardValues[i] === null) {
                card.active = false;
                continue; // 跳过后续处理
            }

            if (labelNode) {
                const label = labelNode.getComponent(Label);
                if (label) {
                    // 恢复原始卡牌值显示
                    label.string = this.cardValues[i].toString();
                }
            }

            // 恢复卡牌颜色和缩放
            const spriteNode = card.getChildByName("sprite");
            if (spriteNode) {
                const sprite = spriteNode.getComponent(Sprite);
                if (sprite) {
                    if (changeStep) {
                        // 如果是回退步骤，第一个被选中的卡牌不恢复颜色，其他恢复
                        const isFirstSelected = this.selectedCards.length > 0 && i === this.selectedCards[0];
                        if (!isFirstSelected) {
                            sprite.color = new Color(255, 255, 255, 255);
                        } else {
                            // 第一个被选中的卡牌保持选中状态（高亮显示）
                            sprite.color = new Color(179, 241, 46, 255); // 黄色表示选中
                        }
                    } else {
                        // 正常恢复所有卡牌颜色
                        sprite.color = new Color(255, 255, 255, 255);
                    }
                }
                spriteNode.active = true;
            }

            card.setScale(new Vec3(1, 1, 1));
        }
    }

    /**
     * 检查并隐藏所有null值的卡牌
     */
    hideNullValueCards() {
        for (let i = 0; i < this.cards.length; i++) {
            if (this.cardValues[i] === null) {
                this.cards[i].active = false;
                DebugLog.instance.log(`卡牌${i}的值为null，已隐藏`);
            }
        }
    }

    preStep() {
        if (this.currentStepIndex <= 0) {
            DebugLog.instance.log('没有可回退的步骤（已到达初始状态）');
            return;
        }

        // 清除运算符按钮的选中状态
        this.clearOperatorOutline();
        this.clearAllOperatorOutlines();

        // 先回退到上一步
        this.currentStepIndex--;

        const stepData = this.calculationSteps[this.currentStepIndex];
        DebugLog.instance.log(`回退到步骤 ${this.currentStepIndex + 1}:`, stepData.type);
        stepData.operatType = "pre";
        // 恢复状态
        this.restoreStepState(stepData);
    }

    /**
     * 更新游戏UI
     */
    updateGameUI() {
        // 重置所有卡牌状态
        for (let i = 0; i < this.cards.length; i++) {
            const card = this.cards[i];
            card.active = true; // 显示所有卡牌

            // 重置卡牌颜色
            const spriteNode = card.getChildByName("sprite");
            if (spriteNode) {
                const sprite = spriteNode.getComponent(Sprite);
                if (sprite) {
                    sprite.color = new Color(255, 255, 255, 255); // 白色
                }
            }

            // 重置卡牌缩放
            card.setScale(new Vec3(1, 1, 1));

            // 更新卡牌标签
            const labelNode = card.getChildByName("label");
            if (labelNode) {
                const label = labelNode.getComponent(Label);
                if (label) {
                    label.string = this.cardValues[i]?.toString() || "";
                }
            }
        }

        // 重置表达式标签颜色
        this.formulaLabel.color = new Color(0, 0, 0, 255); // 黑色

        DebugLog.instance.log('游戏UI已更新');
    }

    nextStep() {
        // 检查是否有下一步骤
        if (this.currentStepIndex >= this.calculationSteps.length - 1) {
            DebugLog.instance.log('没有下一步骤可执行');
            return;
        }

        // 清除运算符按钮的选中状态
        this.clearOperatorOutline();
        this.clearAllOperatorOutlines();

        // 移动到下一步骤
        this.currentStepIndex++;
        const stepData = this.calculationSteps[this.currentStepIndex];
        stepData.operatType = "next";

        DebugLog.instance.log(`执行下一步骤 ${this.currentStepIndex + 1}:`, stepData.type);
        DebugLog.instance.log('当前步骤索引:', this.currentStepIndex);
        DebugLog.instance.log('总步骤数:', this.calculationSteps.length);

        // 恢复下一步骤的状态
        this.restoreStepState(stepData);
    }

    protected onDestroy(): void {
        // 移除应用状态监听
        game.off(Game.EVENT_HIDE, this.onAppHide, this);
        game.off(Game.EVENT_SHOW, this.onAppShow, this);

        super.onDestroy();
    }

    /**
     * 添加应用前后台切换监听
     */
    private addAppStateListener() {
        // 监听应用进入后台
        game.on(Game.EVENT_HIDE, this.onAppHide, this);
        // 监听应用回到前台
        game.on(Game.EVENT_SHOW, this.onAppShow, this);
    }

    /**
     * 应用进入后台时的处理
     */
    private onAppHide() {
        DebugLog.instance.log("应用进入后台，暂停游戏并显示退出弹窗");

        // 暂停计时器
        if (this.timerComponent) {
            this.timerComponent.pauseTimer();
        }

        // 暂停游戏状态
        // this.isAbleClick = false;

        // 显示退出弹窗
        this.showPauseAlert();
    }

    /**
     * 应用回到前台时的处理
     */
    private onAppShow() {
        DebugLog.instance.log("应用回到前台，恢复游戏");

        // 如果游戏在结算阶段，不恢复倒计时
        if (this._isGameCompleted) {
            DebugLog.instance.log("游戏在结算阶段，不恢复倒计时");
            return;
        }

        // 恢复计时器
        if (this.timerComponent) {
            this.timerComponent.resumeTimer();
        }

        // 恢复游戏状态
        // this.isAbleClick = true;
    }

    /**
     * 显示暂停弹窗
     */
    private showPauseAlert() {
        // 使用现有的quitGame方法显示退出弹窗
        // this.quitGame({ parentNode: this.mainView, context: this });
    }
}
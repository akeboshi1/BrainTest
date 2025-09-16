import { _decorator, Button, Label, Node, Sprite, SpriteFrame, ProgressBar, Vec3, tween, assetManager, game, Game, ParticleAsset } from 'cc';
import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";
import { TimeUtil } from "../../resources/scripts/Core/Util/TimeUtil";
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { TimerCommonComponent } from '../../resources/scripts/Game/UI/Common/TimerCommonComponent';
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { GameType, IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { Global } from "db://assets/resources/scripts/Core/Manager/Config/Global";
import { AudioManager } from "db://assets/resources/scripts/Core/Manager/Audio/AudioManager";
import { SkewersManager } from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
import { SkewersGameType } from "db://assets/resources/scripts/Game/Task/Skewers/SkewersGameData";
import { EventManager } from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
import { FrameComponent } from '../../resources/scripts/Core/Component/FrameComponent';

const { ccclass, property } = _decorator;

interface CardItem {
    index: number;
    imgUrl: string;
    isBacked: boolean;
    isDeleted: boolean;
    cardType?: number;
}

@ccclass('Main')
export class Main extends BaseScene<IBaseGameChild> {

    @property(Node)
    mainView: Node;

    @property(Node)
    cardPool: Node;

    @property(Node)
    quitBtn: Node;

    @property(ProgressBar)
    progressBar: ProgressBar;

    @property(Node)
    goonBtn: Node = null;

    @property(Label)
    guankaLabel: Label;


    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent;

    @property(Label)
    countDownLabel: Label;

    @property(Sprite)
    private showSprite: Sprite;

    private currentCard: Node;
    private buttonLableText: Label;


    private cardTheme: number;
    private cardList: CardItem[];

    private cardTotalCount: number = 0;
    private curHard: number = 0;

    private hards: number[] = [1, 2, 3];

    private hardIndex: number = 0;

    private level: number = 1;

    private customsSendDataState: boolean;
    private isAbleClick: boolean = true;

    // 点击保护相关变量
    private isCardFlipping: boolean = false; // 是否有卡片正在翻转
    private lastClickTime: number = 0; // 上次点击时间
    private readonly CLICK_INTERVAL: number = 100; // 点击间隔保护时间（毫秒）

    // 倒计时暂停相关变量
    private isCountdownPaused: boolean = false;
    private pauseStartTime: number = 0;
    private remainingTimeBeforePause: number = 0;
    private isInPreviewMode: boolean = false; // 是否在预览模式

    // 全局翻转保护相关变量
    private isGlobalFlipping: boolean = false; // 是否有卡片正在全局翻转（预览阶段）
    private flippingCardCount: number = 0; // 正在翻转的卡片数量

    // 退出状态相关变量
    private isQuitDialogOpen: boolean = false; // 退出对话框是否打开

    // 倒计时保护相关变量
    private isTimerStarted: boolean = false; // 倒计时是否已启动

    // 游戏退出状态相关变量
    private isGameExited: boolean = false; // 游戏是否已退出

    // 预览阶段中断相关变量
    private wasInPreviewMode: boolean = false; // 是否在预览阶段被中断

    protected bundleName: string = BundleName.FANPAI;


    protected audioUrls = ['music/bgMusic', "music/fanpai", "music/win", "music/success", "music/fail"];

    constructor() {
        super();
    }
    onLoad(): void {

    }


    start() {
        super.start();
        // this.showSprite.node.parent.active = false;
        // this.showSprite.node.active = false;
        this.dataInit();
        // ui初始化
        this.sceneInit();

        // 添加应用前后台切换监听
        this.addAppStateListener();
    }
    dataInit() {
        //数据初始化
        if (this.goonBtn) {
            this.goonBtn.active = false;
        }
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.hardIndex = (this.sceneModel as any).difficulty - 1;
            this.level = (this.sceneModel as any).level;
            let skewersGameData = (this.sceneModel as any).game;
            this.progressBar.progress = skewersGameData.progress;
            this.guankaLabel.string = "第" + skewersGameData.progressStr + "关";


        } else {

            this.level = (this.sceneModel as any).level;
            this.hardIndex = (this.sceneModel as any).difficulty - 1;
            this.progressBar.progress = 1;
            this.guankaLabel.string = "第" + this.level + "关";
        }
    }

    sceneInit() {
        super.sceneInit();
        // 独有初始化
        this.initCardView();


        if (this.sceneModel.gameType == GameType.SKEWERS) {
            // this.successView.active = false;
            this.loadAudio().then(
                async () => {
                    await this.startGameByAlert();
                }
            );

        } else {
            this.loadAudio().then(async () => {
                await this.startGameByAlert();
            });
        }
    }
    clickCardHandler(event, data) {
        // 基础检查
        if (!this.isAbleClick) {
            DebugLog.instance.log("训练未开始，无法点击卡片");
            return;
        }
        if (!this.cardList || this._setTimeOutId != null) {
            DebugLog.instance.log("卡片列表为空或正在预览中，无法点击");
            return;
        }

        // 检查是否在预览模式或有卡片正在全局翻转
        if (this.isInPreviewMode || this.isGlobalFlipping) {
            DebugLog.instance.log("预览阶段或卡片正在全局翻转中，无法点击");
            return;
        }

        // 检查是否有卡片正在翻转
        if (this.flippingCardCount > 0) {
            DebugLog.instance.log("有卡片正在翻转中，忽略此次点击");
            return;
        }

        // 点击间隔保护
        const currentTime = Date.now();
        if (currentTime - this.lastClickTime < this.CLICK_INTERVAL) {
            DebugLog.instance.error("点击过于频繁，忽略此次点击");
            return;
        }

        // 检查是否有卡片正在翻转（保留原有检查作为备用）
        if (this.isCardFlipping) {
            DebugLog.instance.log("有卡片正在翻转中，忽略此次点击");
            return;
        }

        // 检查卡片是否已经被翻开或删除
        const index = Number(data);
        if (this.cardList[index].isBacked || this.cardList[index].isDeleted) {
            DebugLog.instance.log("卡片已经被翻开或删除，忽略此次点击");
            return;
        }

        // 更新点击时间
        this.lastClickTime = currentTime;
        this.isCardFlipping = true;

        // 播放音效
        this.playAudio("music/fanpai", true);

        let self = this;
        // 获取当前卡片
        const currentCard = this.cardPool.children[0].children[index];
        const card = currentCard.getChildByName("card")
        const sprite = card.getComponent(Sprite);

        this.flipCardAnimation(card, () => {
            // 翻转到中间点时加载卡片图片
            const bundle = assetManager.getBundle(self.bundleName);
            bundle.load(this.cardList[index].imgUrl + "/spriteFrame", SpriteFrame, (err, sp) => {
                if (err) {
                    DebugLog.instance.error(err);
                    return;
                }
                sprite.spriteFrame = sp;
            })
        });

        this.cardList[index].isBacked = true;

        let isBackedCards = this.cardList.filter(card => (card.isBacked && !card.isDeleted));
        if (isBackedCards.length === 2 && isBackedCards[0].imgUrl === isBackedCards[1].imgUrl) {
            isBackedCards[0].isDeleted = isBackedCards[1].isDeleted = true;

            // 获取当前和上一个配对的卡片节点
            const currentFrameComp = currentCard.getComponent(FrameComponent);
            const lastCardIndex = isBackedCards[0].index === index ? isBackedCards[1].index : isBackedCards[0].index;
            const lastCardNode = this.cardPool.children[0].children[lastCardIndex];
            const lastCard = lastCardNode.getChildByName("card");
            const lastFrameComp = lastCardNode.getComponent(FrameComponent);

            // 播放star特效
            currentFrameComp.playAnimation("star", 48, false, false);
            lastFrameComp.playAnimation("star", 48, false, false);

            if (this.sceneModel.gameType != GameType.SKEWERS) {
                if (!this.customsSendDataState) {
                    this.sceneModel.gameMatch();
                }
            }
            const isDeletedCardCount = this.cardList.filter(c => c.isDeleted).length;
            if (isDeletedCardCount == this.cardTotalCount) {
                this.currentCustomsSuccess();
                return;
            }
            this.showSpriteAnimation("texture/right", () => {
                // 重置翻转状态
                this.isCardFlipping = false;
            });
            this.playAudio("music/success", true);
        }

        if (isBackedCards.length === 2 && isBackedCards[0].imgUrl !== isBackedCards[1].imgUrl) {
            this.showSpriteAnimation("texture/error", () => {
                isBackedCards.forEach(card => {
                    const cardNode = this.cardPool.children[0].children[card.index];
                    // 添加翻转动画
                    this.flipCardAnimation(cardNode, () => {

                        const sprite = cardNode.getChildByName("card").getComponent(Sprite);

                        const bundle = assetManager.getBundle(self.bundleName);
                        bundle.load("texture/card/Card_back_d/spriteFrame", SpriteFrame, (err, sp) => {
                            if (err) {
                                DebugLog.instance.error(err);
                                return;
                            }
                            sprite.spriteFrame = sp;
                        })

                    });
                    this.cardList[card.index].isBacked = false;
                });

                // 在错误动画完成后重置翻转状态
                setTimeout(() => {
                    this.isCardFlipping = false;
                }, 200); // 给错误动画足够的时间完成
            });
            this.playAudio("music/fail", true);
        }

        // 如果只有一张卡片被翻开，需要重置翻转状态
        if (isBackedCards.length === 1) {
            // 在翻转动画完成后重置状态
            setTimeout(() => {
                this.isCardFlipping = false;
            }, 200); // 翻转动画的完整时长
        }

        DebugLog.instance.log(index, currentCard);
    }

    /**
     * 卡片翻转动画
     * @param cardNode 卡片节点
     * @param middleCallback 翻转到中间时的回调函数
     * @param isGlobalFlip 是否为全局翻转（预览阶段）
     */
    flipCardAnimation(cardNode: Node, middleCallback: () => void, isGlobalFlip: boolean = false) {
        // 取消可能正在进行的动画
        tween(cardNode).stop();

        // 动画半程时长，稍微调长保证完成
        const halfDuration = 0.2;

        // 强制设置为标准缩放值
        cardNode.setScale(1, 1, 1);

        // 增加翻转计数器
        this.flippingCardCount++;
        if (isGlobalFlip) {
            this.isGlobalFlipping = true;
        }

        // 监控变量，确保回调只执行一次
        let callbackExecuted = false;

        // 创建更可靠的X轴翻转动画
        const t = tween(cardNode)
            // 第一阶段：X轴从1缩放到0（卡片看起来消失）
            .to(halfDuration, { scale: new Vec3(0, 1, 1) })
            .call(() => {
                // 防止重复执行
                if (!callbackExecuted) {
                    callbackExecuted = true;

                    try {
                        // 执行中间回调，在这里可以改变卡片状态
                        if (middleCallback) middleCallback();
                    } catch (error) {
                        DebugLog.instance.error("翻转卡片回调执行出错:", error);
                    }
                }
            })
            // 第二阶段：X轴从0缩放回1（卡片看起来出现）
            .to(halfDuration, { scale: new Vec3(1, 1, 1) })
            .call(() => {
                // 确保最终卡片缩放是正确的
                cardNode.setScale(1, 1, 1);

                // 减少翻转计数器
                this.flippingCardCount = Math.max(0, this.flippingCardCount - 1);

                // 如果是全局翻转且所有卡片翻转完成，重置全局翻转状态
                if (isGlobalFlip && this.flippingCardCount === 0) {
                    this.isGlobalFlipping = false;
                }

                // 设置一个较短的定时器，再次确认卡片缩放正确
                setTimeout(() => {
                    if (cardNode && cardNode.isValid) {
                        cardNode.setScale(1, 1, 1);
                    }
                }, 50);
            });

        // 开始执行动画
        t.start();

        // 为防止卡住的情况，设置一个超时保护
        setTimeout(() => {
            // 如果中间回调还没执行，强制执行
            if (!callbackExecuted && middleCallback) {
                callbackExecuted = true;
                try {
                    middleCallback();
                } catch (error) {
                    DebugLog.instance.error("超时保护触发的回调执行出错:", error);
                }
            }

            // 减少翻转计数器（超时保护）
            this.flippingCardCount = Math.max(0, this.flippingCardCount - 1);
            if (isGlobalFlip && this.flippingCardCount === 0) {
                this.isGlobalFlipping = false;
            }

            // 确保卡片最后是正确的缩放
            if (cardNode && cardNode.isValid) {
                cardNode.setScale(1, 1, 1);
            }
        }, halfDuration * 1000 * 2.5);  // 设置超时时间为动画时长的2.5倍
    }

    /**
     * 检查所有卡片状态并修复可能的问题
     */
    checkAndFixCardScales() {
        // 检查并修复所有卡片的缩放
        if (this.cardPool && this.cardPool.children[0]) {
            const cards = this.cardPool.children[0].children;
            for (let i = 0; i < cards.length; i++) {
                if (cards[i] && cards[i].isValid) {
                    const scale = cards[i].getScale();
                    // 检查卡片缩放是否异常
                    if (scale.x < 0.9 || scale.y < 0.9 || scale.x > 1.1 || scale.y > 1.1) {
                        DebugLog.instance.log(`修复卡片${i}的异常缩放:`, scale);
                        cards[i].setScale(1, 1, 1);
                    }
                }
            }
        }
    }

    /**
     * 重置点击保护状态
     */
    private resetClickProtection() {
        this.isCardFlipping = false;
        this.lastClickTime = 0;
        this.isGlobalFlipping = false;
        this.flippingCardCount = 0;
        this.isTimerStarted = false; // 重置倒计时状态
        this.isGameExited = false; // 重置退出状态
        DebugLog.instance.log("点击保护状态已重置");
    }

    private _startTime: number = 0
    private _endTime: number = 0;
    currentCustomsSuccess() {
        this.isAbleClick = false;
        this.isCardFlipping = false;
        this.isTimerStarted = false; // 重置倒计时状态
        this._endTime = TimeUtil.getNow();
        this.timerComponent.pauseTimer();
        clearInterval(this.timerId);

        this.playAudio("music/win", true);
        let obj = this.requestGameResult();
        // 非串烧训练
        if (this.sceneModel.gameType !== GameType.SKEWERS) {
            (this.sceneModel as any).showSuccessView();
            if (!this.customsSendDataState) {
                this._requestGameCenterComplete(obj.complete, obj.duration);
            }
        } else {
            this.requestGameComplete({ context: this, parentNode: this.mainView, complete: obj.complete, duration: obj.duration });
        }
    }

    async startGame() {
        this.isAbleClick = true;
        this.isCardFlipping = false;
        this.lastClickTime = 0;
        this.curHard = this.hards[this.hardIndex];
        this.cardTotalCount = this.calculCardTotalCount(this.hardIndex);
        await this.gameStartInit();
    }

    async startGameByAlert() {
        this.isAbleClick = true;
        this.isCardFlipping = false;
        this.lastClickTime = 0;
        this.curHard = this.hards[this.hardIndex];
        this.cardTotalCount = this.calculCardTotalCount(this.hardIndex);
        await this.gameStartInit();
    }
    private async _gamecenterNextGame() {
        Global.isAgain = false;
        this.level = (this.sceneModel as any).game.level;

        // 更新关卡标签显示
        this.guankaLabel.string = "第" + this.level + "关";

        this.closeAllCard();
        this.curHard = this.hards[this.hardIndex];
        this.initCardView();
        await this.gameStartInit();
    }
    playNextCustoms() {
        // 如果游戏在结算阶段，只关闭弹窗，不执行继续游戏操作
        if (this.customsSendDataState) {
            DebugLog.instance.log("游戏在结算阶段，只关闭弹窗");
            return;
        }

        this.isAbleClick = true;
        this.isCardFlipping = false;
        this.lastClickTime = 0;
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.sceneModel.goonHandler(this)
        } else {
            this._gamecenterNextGame();
        }
    }

    replayGame() {
        if (this.goonBtn) {
            this.goonBtn.active = false;
        }
        this.isAbleClick = true;
        this.isCardFlipping = false;
        this.lastClickTime = 0;
        this.closeAllCard();
        this.timerInit();
        // 移除立即调用timerTick()，让previewCard()在预览结束后自动调用
        this.previewCard();
        this.playBgmAudio("music/bgMusic", true);
    }

    onSuccessNextLevel() {
        this.playNextCustoms();
    }

    onFailNextLevel(): void {

        this.playNextCustoms();
    }
    onAgain() {
        this.replayGame();
    }

    private calculCardTotalCount(index: number): number {
        return (index + 2) * 4;
    }

    async gameStartInit() {
        // this.successView.active = false;
        this.customsSendDataState = false;
        this.isQuitDialogOpen = false; // 重置退出对话框状态
        this.wasInPreviewMode = false; // 重置预览中断标志
        this.resetClickProtection();
        this.initCardView();

        this.timerInit();

        this.initCardTheme();
        this.initCardData();

        // 预加载卡牌背面资源
        await this.preloadCardBackResource();

        this.previewCard();

        this.playBgmAudio("music/bgMusic", true);
    }
    // 初始化待显示的卡片主题
    initCardTheme() {
        this.cardTheme = (this.level >= 21) ? this.level % 21 + 1 : this.level;  // 达到27后重置为7
    }

    // 初始化卡片数据
    initCardData() {
        // 初始化卡片列表和可用位置
        this.cardList = new Array(this.cardTotalCount).fill(null);
        let availablePositions = Array.from({ length: this.cardTotalCount }, (_, i) => i);

        // 为每种卡片类型生成两张卡片
        for (let cardType = 1; cardType <= this.cardTotalCount / 2; cardType++) {
            // 放置该类型的两张卡片
            for (let j = 0; j < 2; j++) {
                // 从可用位置中找到合适的位置
                let validPositions = availablePositions.filter(pos => {
                    // 检查左右相邻
                    let leftValid = pos % 4 === 0 ||
                        !this.cardList[pos - 1] ||
                        this.cardList[pos - 1].cardType !== cardType;
                    let rightValid = pos % 4 === 3 ||
                        !this.cardList[pos + 1] ||
                        this.cardList[pos + 1].cardType !== cardType;
                    // 检查上下相邻
                    let upValid = pos < 4 ||
                        !this.cardList[pos - 4] ||
                        this.cardList[pos - 4].cardType !== cardType;
                    let downValid = pos >= this.cardTotalCount - 4 ||
                        !this.cardList[pos + 4] ||
                        this.cardList[pos + 4].cardType !== cardType;

                    return leftValid && rightValid && upValid && downValid;
                });

                // 如果没有完全符合条件的位置，就放宽限制只检查水平相邻
                if (validPositions.length === 0) {
                    validPositions = availablePositions.filter(pos => {
                        let leftValid = pos % 4 === 0 ||
                            !this.cardList[pos - 1] ||
                            this.cardList[pos - 1].cardType !== cardType;
                        let rightValid = pos % 4 === 3 ||
                            !this.cardList[pos + 1] ||
                            this.cardList[pos + 1].cardType !== cardType;
                        return leftValid && rightValid;
                    });
                }

                // 如果还是没有位置，就使用任意可用位置
                if (validPositions.length === 0) {
                    validPositions = availablePositions;
                }

                // 随机选择一个有效位置
                let randomIndex = Math.floor(Math.random() * validPositions.length);
                let selectedPosition = validPositions[randomIndex];

                // 放置卡片
                this.cardList[selectedPosition] = {
                    index: selectedPosition,
                    imgUrl: `texture/svg/${cardType}_${this.cardTheme}`,
                    isBacked: false,
                    isDeleted: false,
                    cardType: cardType
                };

                // 从可用位置列表中移除已使用的位置
                availablePositions = availablePositions.filter(pos => pos !== selectedPosition);
            }
        }

        // 所有卡片设置为背板
        this.closeAllCard();
    }

    async showAllCard() {
        let self = this;
        // 设置全局翻转状态
        this.isGlobalFlipping = true;
        this.flippingCardCount = 0;

        // 先预加载所有卡牌资源
        await this.preloadAllCardResources();

        // 所有资源加载完成后，开始同步翻转所有卡牌
        this.cardList.forEach((cardItem, index) => {
            const cardNode = this.cardPool.children[0].children[index];
            if (cardNode) {
                const card = cardNode.getChildByName("card");
                // 确保卡片处于正确的初始状态
                card.setScale(1, 1, 1);

                const sprite = card.getComponent(Sprite);
                sprite.spriteFrame = null;
                // 使用全局翻转标志
                this.flipCardAnimation(cardNode, () => {
                    // 资源已经预加载，直接设置
                    const bundle = assetManager.getBundle(self.bundleName);
                    const spriteFrame = bundle.get(cardItem.imgUrl + "/spriteFrame", SpriteFrame);
                    if (spriteFrame) {
                        sprite.spriteFrame = spriteFrame;
                    } else {
                        DebugLog.instance.error(`卡牌资源未找到: ${cardItem.imgUrl}`);
                    }
                }, true); // 标记为全局翻转
            }
        });
    }

    closeAllCard() {
        clearTimeout(this._setTimeOutId);
        this._setTimeOutId = null;
        let self = this;

        // 设置全局翻转状态
        this.isGlobalFlipping = true;
        this.flippingCardCount = 0;

        this.cardList.forEach((card, index) => {
            card.isBacked = false;
            card.isDeleted = false;
            const cardNode = this.cardPool.children[0].children[index];
            if (cardNode) {
                const card = cardNode.getChildByName("card");
                // 确保卡片处于正确的初始状态
                card.setScale(1, 1, 1);

                // 使用全局翻转标志
                this.flipCardAnimation(cardNode, () => {
                    const sprite = card.getComponent(Sprite);

                    const bundle = assetManager.getBundle(self.bundleName);
                    // 尝试从已加载的资源中获取，如果失败则异步加载
                    const backSpriteFrame = bundle.get("texture/card/Card_back_d/spriteFrame", SpriteFrame);
                    if (backSpriteFrame) {
                        sprite.spriteFrame = backSpriteFrame;
                    } else {
                        // 如果资源未加载，异步加载
                        bundle.load("texture/card/Card_back_d/spriteFrame", SpriteFrame, (err, sp) => {
                            if (err) {
                                DebugLog.instance.error(err);
                                return;
                            }
                            sprite.spriteFrame = sp;
                        });
                    }
                }, true); // 标记为全局翻转
            }
        });
    }
    protected onDestroy(): void {
        // 设置游戏退出状态
        this.isGameExited = true;
        
        clearTimeout(this._setTimeOutId);
        clearInterval(this.timerId);
        clearInterval(this.intervalId);

        // 重置点击保护状态
        this.isAbleClick = false;
        this.isCardFlipping = false;
        this.lastClickTime = 0;

        // 重置翻转保护状态
        this.isGlobalFlipping = false;
        this.flippingCardCount = 0;
        this.isInPreviewMode = false;

        // 重置倒计时状态
        this.isTimerStarted = false;

        // 移除应用状态监听
        game.off(Game.EVENT_HIDE, this.onAppHide, this);
        game.off(Game.EVENT_SHOW, this.onAppShow, this);

        super.onDestroy();
    }

    private _setTimeOutId;
    // 预览卡片，time，秒数
    seconds: number[] = [4, 5, 6];
    private intervalId;
    async previewCard() {
        let self = this;
        // 先检查并修复可能存在的问题
        this.checkAndFixCardScales();

        // 设置预览模式标志
        this.isInPreviewMode = true;
        this.isCountdownPaused = false;

        await this.showAllCard();

        const initialTime = this.seconds[this.hardIndex];
        const decimalPart = initialTime - Math.floor(initialTime); // 小数部分

        // 如果有小数部分，先等待小数部分的时间过去（不显示倒计时）
        if (decimalPart > 0) {
            // 等待小数部分时间过去
            await new Promise(resolve => {
                setTimeout(resolve, decimalPart * 1000);
            });
        }

        // 现在开始显示倒计时，从整数秒开始
        const integerTime = Math.floor(initialTime);
        if (integerTime > 0) {
            this.countDownLabel.node.active = true;
            this.countDownLabel.string = `${integerTime}.0s`;
            this.countDownLabel.node.setScale(1, 1, 1);

            const updateDisplay = (time) => {
                self.countDownLabel.string = `${Math.floor(time)}.0s`;
                tween(self.countDownLabel.node)
                    .to(0.25, { scale: new Vec3(0.6, 0.6, 1) })
                    .to(0.25, { scale: new Vec3(1, 1, 1) })
                    .start();
            };

            let remainTime = integerTime;

            this.intervalId = setInterval(() => {
                remainTime -= 1;
                if (remainTime >= 0) {
                    updateDisplay(remainTime);
                }

                if (remainTime < 0) {
                    clearInterval(this.intervalId);
                    // 时间到0时显示"开始"并播放放大动画
                    this.countDownLabel.string = "开始";
                    this.countDownLabel.node.setScale(1, 1, 1);

                    // 播放放大动画
                    tween(this.countDownLabel.node)
                        .to(0.3, { scale: new Vec3(1.5, 1.5, 1) })
                        .to(0.2, { scale: new Vec3(1, 1, 1) })
                        .call(() => {
                            // 动画完成后停止定时器
                            clearInterval(this.intervalId);
                            this.intervalId = null;
                        })
                        .start();
                }
            }, 1000);

            // 设置结束定时器
            this._setTimeOutId = setTimeout(() => {
                if (this._setTimeOutId) {
                    clearTimeout(this._setTimeOutId);
                }
                if (this.intervalId) {
                    clearInterval(this.intervalId);
                }
                this._setTimeOutId = null;

                // 确保显示"开始"并播放放大动画
                this.countDownLabel.string = "开始";
                this.countDownLabel.node.active = true;
                this.countDownLabel.node.setScale(1, 1, 1);

                // 播放放大动画
                tween(this.countDownLabel.node)
                    .to(0.3, { scale: new Vec3(1.5, 1.5, 1) })
                    .to(0.2, { scale: new Vec3(1, 1, 1) })
                    .call(() => {
                        // 动画完成后延迟一段时间再隐藏标签
                        setTimeout(() => {
                            this.endPreview();
                        }, 300); // 给用户时间看到"开始"文字
                    })
                    .start();

            }, integerTime * 1000);
        } else {
            // 如果整数部分为0，直接显示"开始"
            this.countDownLabel.node.active = true;
            this.countDownLabel.string = "开始";
            this.countDownLabel.node.setScale(1, 1, 1);

            // 播放放大动画
            tween(this.countDownLabel.node)
                .to(0.3, { scale: new Vec3(1.5, 1.5, 1) })
                .to(0.2, { scale: new Vec3(1, 1, 1) })
                .call(() => {
                    setTimeout(() => {
                        this.endPreview();
                    }, 300);
                })
                .start();
        }

        this._startTime = TimeUtil.getNow();
    }

    // 定时器
    timerId: any;
    // timer: number;

    INIT_TIME = 90;

    private _isTimerStop: boolean = false;

    timerInit() {
        this.timerComponent.resetTimer();
        this.isTimerStarted = false; // 重置倒计时启动状态
    }
    timerTick() {
        // 检查游戏是否已退出
        if (this.isGameExited) {
            DebugLog.instance.log("游戏已退出，不启动倒计时");
            return;
        }

        // 检查倒计时是否已经启动，防止重复启动
        if (this.isTimerStarted) {
            DebugLog.instance.log("倒计时已经启动，忽略重复调用");
            return;
        }

        // 检查退出对话框是否打开，如果打开则不开始倒计时
        if (this.isQuitDialogOpen) {
            this._isTimerStop = true;
            DebugLog.instance.log("退出对话框已打开，不开始倒计时");
            return;
        }

        // 标记倒计时已启动
        this.isTimerStarted = true;
        DebugLog.instance.log("开始倒计时");

        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.timerComponent.startTimer((this.sceneModel as any).game.timeLimit);
        } else {
            this.timerComponent.startTimer(this.INIT_TIME);
        }
    }
    _requestGameCenterComplete(complete, duration) {
        const curGame = (this.sceneModel as any).game;
        let config = {
            sessionId: curGame.sessionid,
            count: complete * this.cardTotalCount / 2,
            level: this.level,
            complete: complete,
            duration: duration,
            timelimit: this.INIT_TIME,
            difficulty: this.hards[this.hardIndex],
            levelMode: curGame.levelMode,
            callback: () => { }
        }
        this.sceneModel.requestGameComplete(config)
    }
    onTimerEnd() {
        DebugLog.instance.log("计时器结束了，执行相应逻辑");
        this.playFail();
        // clearInterval(this.timerId);
        AudioManager.getInstance().stopBgm();
        this.isAbleClick = false;
        this.isCardFlipping = false;
        this.isTimerStarted = false; // 重置倒计时状态
        let { complete, duration } = this.requestGameResult();
        // 倒计时结束，训练结束
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            //上报数据
            this.sceneModel.requestGameComplete({ context: this, parentNode: this.mainView, complete, duration });
        } else {
            if (!this.customsSendDataState) {
                this.customsSendDataState = true;
                this._requestGameCenterComplete(complete, duration);
            }
            (this.sceneModel as any).showFailView();
        }
    }

    dzgoonHandler(resuleBoo: boolean = true) {
        this.clearGameView();
        if (this.sceneModel) {
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                // 直接发送训练完成请求，不处理弹窗逻辑
                // 直接向服务器发送请求，但不处理回调
                let self = this;
                let trainData = SkewersManager.getInstance().getUnCompleteGameData();
                let _boo = trainData.type != SkewersGameType.Memory;
                if (!_boo) {
                    EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, (data) => {
                        (self.sceneModel as any).goonHandler(self, true);
                    }, this, true);
                    this.clearGameView();
                    SkewersManager.getInstance().requestGameComplete(this.complete, this.duration);
                } else {
                    (this.sceneModel as any).goonHandler(self, true);
                }
            }
        }
    }

    /**
     * 初始化卡牌view
     * @private
     */
    private initCardView() {
        this.cardTotalCount = this.calculCardTotalCount(this.hardIndex);
        // DebugLog.instance.log('this.cardTotalCount', this.cardTotalCount)

        const maxLen = this.cardPool.children[0].children.length;
        for (let i = 0; i < maxLen; i++) {
            this.cardPool.children[0].children[i].active = i < this.cardTotalCount ? true : false;
        }
    }

    private requestGameResult() {
        // 上报数据
        this._endTime = TimeUtil.getNow();
        // 获取已删除卡片数量
        const isDeletedCardCount = this.cardList.filter(c => c.isDeleted).length;
        // 计算完成度
        let complete = isDeletedCardCount / this.cardTotalCount;
        // 计算耗时
        let duration = (this._endTime - this._startTime) / 1000;
        return {
            complete,
            duration
        }
    }

    quitGame() {
        this.isQuitDialogOpen = true;
        super.quitGame({ parentNode: this.mainView, context: this });
        clearInterval(this.timerId);
    }


    exitCallBack(context) {
        // 设置游戏退出状态
        context.isGameExited = true;
        
        // 重置退出对话框状态
        context.isQuitDialogOpen = false;
        DebugLog.instance.log("用户确认退出，设置退出状态");

        clearTimeout(context._setTimeOutId);
        context._setTimeOutId = null;
        super.exitCallBack(context);
    }

    /**
     * 显示动画特效
     */
    private showSpriteAnimation(textureUrl: string, callback: () => void) {
        let self = this;
        const bundle = assetManager.getBundle(self.bundleName);
        bundle.load(textureUrl + "/spriteFrame", SpriteFrame, (err, sp) => {
            if (err) {
                DebugLog.instance.error(err);
                return;
            }
            if (self.showSprite) {
                self.showSprite.spriteFrame = sp;
                let rightTween = tween(self.showSprite.node)
                    .to(0.5, { scale: new Vec3(2, 2, 1) })
                    .call(() => {
                        callback();
                        rightTween.stop();
                        rightTween = null;
                        self.showSprite.node.active = false;
                        // self.showSprite.node.parent.active = false;
                        self.showSprite.node.scale = new Vec3(1, 1, 1);
                    })
                    .start();
                self.showSprite.node.active = true;
                // self.showSprite.node.parent.active = true;
            } else {
                DebugLog.instance.error("showSprite is null!");
            }
        });
    }

    public onClickShowAnswer() {
        this.isAbleClick = false;
        this.goonBtn.active = true;
        super.onClickShowAnswer();
        this.showAllCard();

    }
    public onclickContinue() {
        this.dzanswerHandler(this);
    }

    public onClickRetryGame() {
        this.replayGame();
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
        DebugLog.instance.error("应用进入后台，暂停游戏并显示退出弹窗");

        // 如果在预览阶段，记录中断状态
        if (this.isInPreviewMode) {
            DebugLog.instance.log("预览阶段进入后台，记录中断状态");
            this.wasInPreviewMode = true;
            
            // 停止所有卡牌翻转动画
            this.stopAllCardAnimations();
            
            // 停止预览倒计时
            this.stopPreviewCountdown();
            
            // 重置预览状态
            this.isInPreviewMode = false;
            this.isCountdownPaused = false;
        } else {
            // 非预览阶段，暂停倒计时
            this.pauseCountdown();
        }

        // 暂停计时器
        if (this.timerComponent) {
            this.timerComponent.pauseTimer();
        }

        // 暂停游戏状态
        this.isAbleClick = false;
        this.isCardFlipping = false;

        // 显示退出弹窗
        this.showPauseAlert();
    }

    public resumeCallBack(context?: any) {
        super.resumeCallBack(context);
        // 重置退出对话框状态（用户可能取消了退出）
        context.isQuitDialogOpen = false;
        
        // 检查是否是从预览阶段中断的
        if (context.wasInPreviewMode) {
            DebugLog.instance.log("从预览阶段中断恢复，重新开始预览过程");
            // 重置中断标志
            context.wasInPreviewMode = false;
            // 重新初始化卡片数据（重新打乱）
            context.initCardData();
            // 预加载卡牌背面资源
            context.preloadCardBackResource().then(() => {
                // 重新开始预览
                context.previewCard();
            });
        } else if (context.isInPreviewMode) {
            DebugLog.instance.log("预览阶段弹窗，重新开始预览倒计时并重新打乱卡牌");
            // 重新初始化卡片数据（重新打乱）
            context.initCardData();
            // 预加载卡牌背面资源
            context.preloadCardBackResource().then(() => {
                // 重新开始预览
                context.previewCard();
            });
        } else {
            // 游戏阶段，恢复游戏状态
            DebugLog.instance.log("游戏阶段弹窗，恢复游戏状态");
            context.isAbleClick = true;
        }
    }

    public resumeTime() {
        if (this.timerComponent) {
            if (this._isTimerStop) {
                if (this.sceneModel.gameType == GameType.SKEWERS) {
                    this.timerComponent.startTimer((this.sceneModel as any).game.timeLimit);
                } else {
                    this.timerComponent.startTimer(this.INIT_TIME);
                }
            } else {
                this.timerComponent.resumeTimer();
            }
        }
        this._isTimerStop = false;
    }

    /**
     * 应用回到前台时的处理
     */
    private onAppShow() {
        DebugLog.instance.error("应用回到前台，恢复倒计时");

        // 如果游戏在结算阶段，不恢复倒计时
        if (this.customsSendDataState) {
            DebugLog.instance.log("游戏在结算阶段，不恢复倒计时");
            return;
        }

        // 如果游戏已退出，不恢复倒计时
        if (this.isGameExited) {
            DebugLog.instance.log("游戏已退出，不恢复倒计时");
            return;
        }

        // 如果在预览阶段，恢复预览倒计时
        if (this.isInPreviewMode) {
            DebugLog.instance.log("预览阶段，恢复预览倒计时");
            this.resumeCountdown();
            return;
        }

        this.isAbleClick = true;
    }

    /**
     * 显示暂停弹窗
     */
    private showPauseAlert() {
        // 设置退出对话框打开状态
        this.isQuitDialogOpen = true;
        DebugLog.instance.log("退出对话框已打开，设置退出状态");

        // 使用现有的quitGame方法显示退出弹窗
        super.quitGame({ parentNode: this.mainView, context: this });
    }

    /**
     * 暂停倒计时
     */
    private pauseCountdown() {
        if (this.isInPreviewMode && !this.isCountdownPaused) {
            this.isCountdownPaused = true;
            this.pauseStartTime = Date.now();

            // 计算剩余时间
            if (this._setTimeOutId) {
                // 清除当前的倒计时
                clearTimeout(this._setTimeOutId);
                this._setTimeOutId = null;
            }
            if (this.intervalId) {
                clearInterval(this.intervalId);
                this.intervalId = null;
            }

            DebugLog.instance.log("倒计时已暂停");
        }
    }

    /**
     * 恢复倒计时
     */
    private resumeCountdown() {
        if (this.isCountdownPaused && this.isInPreviewMode) {
            this.isCountdownPaused = false;

            // 计算暂停的时长
            const pauseDuration = Date.now() - this.pauseStartTime;
            const pauseDurationSeconds = pauseDuration / 1000;

            // 重新计算剩余时间
            const currentRemainingTime = this.seconds[this.hardIndex] - pauseDurationSeconds;

            if (currentRemainingTime > 0) {
                // 重新开始倒计时
                this.restartCountdown(currentRemainingTime);
                DebugLog.instance.log(`倒计时已恢复，剩余时间: ${currentRemainingTime.toFixed(1)}秒`);
            } else {
                // 时间已到，直接结束预览
                this.endPreview();
                DebugLog.instance.log("倒计时时间已到，直接结束预览");
            }
        }
    }

    /**
     * 重新开始倒计时
     */
    private restartCountdown(remainingTime: number) {
        this.countDownLabel.node.active = true;
        this.countDownLabel.string = `${remainingTime.toFixed(1)}s`;
        this.countDownLabel.node.setScale(1, 1, 1);

        let remainTime = remainingTime;

        const updateDisplay = (time) => {
            this.countDownLabel.string = `${time.toFixed(1)}s`;
            tween(this.countDownLabel.node)
                .to(0.25, { scale: new Vec3(0.6, 0.6, 1) })
                .to(0.25, { scale: new Vec3(1, 1, 1) })
                .start();
        };

        // 先处理整数秒
        if (remainTime >= 1) {
            const fullSeconds = Math.floor(remainTime);
            const decimalPart = remainTime - fullSeconds;

            this.intervalId = setInterval(() => {
                if (remainTime >= 1) {
                    remainTime -= 1;
                    updateDisplay(remainTime);
                } else {
                    clearInterval(this.intervalId);
                    if (decimalPart > 0) {
                        remainTime = decimalPart;
                        updateDisplay(remainTime);
                        // 创建新的0.5秒定时器
                        this.intervalId = setInterval(() => {
                            if (remainTime > 0) {
                                remainTime -= 0.5;
                                updateDisplay(remainTime);
                            }
                        }, 500);
                    }
                }
            }, 1000);
        } else {
            // 处理小数秒
            this.intervalId = setInterval(() => {
                if (remainTime > 0) {
                    remainTime -= 0.5;
                    updateDisplay(remainTime);
                }
            }, 500);
        }

        // 设置结束定时器
        this._setTimeOutId = setTimeout(() => {
            this.endPreview();
        }, remainingTime * 1000);
    }

    /**
     * 结束预览
     */
    private endPreview() {
        // 如果退出弹窗已打开，直接返回，不执行后续操作
        if (this.isQuitDialogOpen) {
            DebugLog.instance.log("退出弹窗已打开，endPreview直接返回");
            return;
        }

        if (this._setTimeOutId) {
            clearTimeout(this._setTimeOutId);
            this._setTimeOutId = null;
        }
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        // 检查并修复可能存在的问题
        this.checkAndFixCardScales();

        this.closeAllCard();
        this.countDownLabel.node.active = false;

        // 等待所有卡片翻转完成后再开始游戏
        this.waitForAllCardsFlipped(() => {
            this.timerTick();
            // 重置预览模式标志
            this.isInPreviewMode = false;
            this.isCountdownPaused = false;
        });
    }

    /**
     * 等待所有卡片翻转完成
     * @param callback 所有卡片翻转完成后的回调
     */
    private waitForAllCardsFlipped(callback: () => void) {
        let callbackExecuted = false; // 防止重复执行回调
        
        const checkInterval = setInterval(() => {
            // 检查游戏是否已退出
            if (this.isGameExited) {
                clearInterval(checkInterval);
                DebugLog.instance.log("游戏已退出，取消等待卡片翻转完成");
                return;
            }
            
            // 检查是否还有卡片在翻转
            if (this.flippingCardCount === 0 && !this.isGlobalFlipping) {
                clearInterval(checkInterval);
                if (!callbackExecuted && !this.isGameExited) {
                    callbackExecuted = true;
                    callback();
                }
            }
        }, 50); // 每50ms检查一次

        // 设置最大等待时间，防止无限等待
        setTimeout(() => {
            clearInterval(checkInterval);
            if (!callbackExecuted && !this.isGameExited) {
                callbackExecuted = true;
                DebugLog.instance.log("等待卡片翻转完成超时，强制开始游戏");
                callback();
            }
        }, 2000); // 最多等待2秒
    }

    /**
     * 停止所有卡牌翻转动画
     */
    private stopAllCardAnimations() {
        // 停止所有卡片的翻转动画
        if (this.cardPool && this.cardPool.children[0]) {
            const cards = this.cardPool.children[0].children;
            for (let i = 0; i < cards.length; i++) {
                if (cards[i] && cards[i].isValid) {
                    // 停止当前卡片的动画
                    tween(cards[i]).stop();
                    
                    // 确保卡片处于正确的状态
                    cards[i].setScale(1, 1, 1);
                }
            }
        }
        
        // 重置翻转状态
        this.isGlobalFlipping = false;
        this.flippingCardCount = 0;
        this.isCardFlipping = false;
        
        DebugLog.instance.log("已停止所有卡牌翻转动画");
    }

    /**
     * 停止预览倒计时
     */
    private stopPreviewCountdown() {
        // 清除倒计时定时器
        if (this._setTimeOutId) {
            clearTimeout(this._setTimeOutId);
            this._setTimeOutId = null;
        }
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        // 隐藏倒计时标签
        if (this.countDownLabel) {
            this.countDownLabel.node.active = false;
        }
        
        DebugLog.instance.log("已停止预览倒计时");
    }

    /**
     * 预加载所有卡牌资源
     */
    private async preloadAllCardResources(): Promise<void> {
        if (!this.cardList || this.cardList.length === 0) {
            return;
        }

        const bundle = assetManager.getBundle(this.bundleName);
        if (!bundle) {
            DebugLog.instance.error("资源包未找到");
            return;
        }

        // 收集所有需要加载的资源URL
        const resourceUrls = this.cardList.map(cardItem => cardItem.imgUrl + "/spriteFrame");
        
        // 去重
        const uniqueUrls = [...new Set(resourceUrls)];

        DebugLog.instance.log(`开始预加载 ${uniqueUrls.length} 个卡牌资源`);

        // 使用Promise.all确保所有资源都加载完成
        const loadPromises = uniqueUrls.map(url => {
            return new Promise<void>((resolve, reject) => {
                // 检查资源是否已经加载
                const existingResource = bundle.get(url, SpriteFrame);
                if (existingResource) {
                    resolve();
                    return;
                }

                // 加载资源
                bundle.load(url, SpriteFrame, (err, spriteFrame) => {
                    if (err) {
                        DebugLog.instance.error(`加载卡牌资源失败: ${url}`, err);
                        reject(err);
                    } else {
                        DebugLog.instance.log(`卡牌资源加载成功: ${url}`);
                        resolve();
                    }
                });
            });
        });

        try {
            await Promise.all(loadPromises);
            DebugLog.instance.log("所有卡牌资源预加载完成");
        } catch (error) {
            DebugLog.instance.error("卡牌资源预加载失败:", error);
            // 即使部分资源加载失败，也继续执行，避免卡住游戏
        }
    }

    /**
     * 预加载卡牌背面资源
     */
    private async preloadCardBackResource(): Promise<void> {
        const bundle = assetManager.getBundle(this.bundleName);
        if (!bundle) {
            DebugLog.instance.error("资源包未找到");
            return;
        }

        const backResourceUrl = "texture/card/Card_back_d/spriteFrame";
        
        // 检查资源是否已经加载
        const existingResource = bundle.get(backResourceUrl, SpriteFrame);
        if (existingResource) {
            DebugLog.instance.log("卡牌背面资源已加载");
            return;
        }

        DebugLog.instance.log("开始预加载卡牌背面资源");

        return new Promise<void>((resolve, reject) => {
            bundle.load(backResourceUrl, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    DebugLog.instance.error(`加载卡牌背面资源失败: ${backResourceUrl}`, err);
                    reject(err);
                } else {
                    DebugLog.instance.log("卡牌背面资源加载成功");
                    resolve();
                }
            });
        });
    }
}



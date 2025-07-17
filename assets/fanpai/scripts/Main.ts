import { _decorator, Button, Label, Node, Sprite, SpriteFrame, ProgressBar, Vec3, tween, assetManager, game,Game, ParticleAsset } from 'cc';
import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";
import { TimeUtil } from "../../resources/scripts/Core/Util/TimeUtil";
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { TimerCommonComponent } from '../../resources/scripts/Game/UI/Common/TimerCommonComponent';
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { GameType, IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { Global } from "db://assets/resources/scripts/Core/Manager/Config/Global";
import {AudioManager} from "db://assets/resources/scripts/Core/Manager/Audio/AudioManager";
import {SkewersManager} from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
import {SkewersGameType} from "db://assets/resources/scripts/Game/Task/Skewers/SkewersGameData";
import {EventManager} from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
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


    @property(Label)
    guankaLabel: Label;


    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent;

    @property(Label)
    countDownLabel:Label;

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

    protected bundleName: string = BundleName.FANPAI;


    protected audioUrls = ['music/bgMusic',"music/fanpai", "music/win","music/success","music/fail"];

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
                () => {
                    this.startGameByAlert();
                }
            );

        } else {
            this.loadAudio().then(() => {
                this.startGameByAlert();
            });
        }
    }
    clickCardHandler(event, data) {
        // 基础检查
        if (!this.isAbleClick) { 
            DebugLog.instance.log("游戏未开始，无法点击卡片");
            return; 
        }
        if (!this.cardList || this._setTimeOutId != null) {
            DebugLog.instance.log("卡片列表为空或正在预览中，无法点击");
            return;
        }

        // 点击间隔保护
        const currentTime = Date.now();
        if (currentTime - this.lastClickTime < this.CLICK_INTERVAL) {
            DebugLog.instance.error("点击过于频繁，忽略此次点击");
            return;
        }

        // 检查是否有卡片正在翻转
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
            currentFrameComp.playAnimation("star",48,false,false);
            lastFrameComp.playAnimation("star",48,false,false);

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
            this.playAudio("music/fail",true);
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
     */
    flipCardAnimation(cardNode: Node, middleCallback: () => void) {
        // 取消可能正在进行的动画
        tween(cardNode).stop();

        // 动画半程时长，稍微调长保证完成
        const halfDuration = 0.2;

        // 强制设置为标准缩放值
        cardNode.setScale(1, 1, 1);

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
        DebugLog.instance.log("点击保护状态已重置");
    }

    private _startTime: number = 0
    private _endTime: number = 0;
    currentCustomsSuccess() {
        this.isAbleClick = false;
        this.isCardFlipping = false;
        this._endTime = TimeUtil.getNow();
        this.timerComponent.pauseTimer();
        clearInterval(this.timerId);

        this.playAudio("music/win",true);
        let obj = this.requestGameResult();
        // 非串烧游戏
        if (this.sceneModel.gameType !== GameType.SKEWERS) {
            (this.sceneModel as any).showSuccessView();
            if (!this.customsSendDataState) {
                this._requestGameCenterComplete(obj.complete, obj.duration);
            }
        } else {
            this.requestGameComplete({ context: this, parentNode: this.mainView, complete: obj.complete, duration: obj.duration });
        }
    }

    startGame() {
        this.isAbleClick = true;
        this.isCardFlipping = false;
        this.lastClickTime = 0;
        this.curHard = this.hards[this.hardIndex];
        this.cardTotalCount = this.calculCardTotalCount(this.hardIndex);
        this.gameStartInit();
    }

    startGameByAlert() {
        this.isAbleClick = true;
        this.isCardFlipping = false;
        this.lastClickTime = 0;
        this.curHard = this.hards[this.hardIndex];
        this.cardTotalCount = this.calculCardTotalCount(this.hardIndex);
        this.gameStartInit();
    }
    private _gamecenterNextGame() {
        Global.isAgain = false;
        this.level = (this.sceneModel as any).game.level;

        // 更新关卡标签显示
        this.guankaLabel.string = "第" + this.level + "关";

        this.closeAllCard();
        this.curHard = this.hards[this.hardIndex];
        this.initCardView();
        this.gameStartInit();
    }
    playNextCustoms() {
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
        this.isAbleClick = true;
        this.isCardFlipping = false;
        this.lastClickTime = 0;
        this.closeAllCard();
        this.timerInit();
        this.timerTick();
        this.previewCard();
        this.playBgmAudio("music/bgMusic",true);
    }

    onSuccessNextLevel(){
        this.playNextCustoms();
    }

    onFailNextLevel(): void {
        
        this.playNextCustoms();
    }
    onAgain(){
        this.replayGame();
    }

    private calculCardTotalCount(index: number): number {
        return (index + 2) * 4;
    }

    gameStartInit() {
        // this.successView.active = false;
        this.customsSendDataState = false;
        this.resetClickProtection();
        this.initCardView();

        this.timerInit();

        this.initCardTheme();
        this.initCardData();


        this.previewCard();

        this.playBgmAudio("music/bgMusic",true);
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
        this.cardList.forEach((cardItem, index) => {
            const cardNode = this.cardPool.children[0].children[index];
            if (cardNode) {
                const card = cardNode.getChildByName("card");
                // 确保卡片处于正确的初始状态
                card.setScale(1, 1, 1);

                const sprite = card.getComponent(Sprite);
                sprite.spriteFrame = null;
                // 直接添加翻转动画，移除延迟
                this.flipCardAnimation(cardNode, () => {
                    const bundle = assetManager.getBundle(self.bundleName);
                    bundle.load(cardItem.imgUrl + "/spriteFrame", SpriteFrame, (err, sp) => {
                        if (err) {
                            DebugLog.instance.error(err);
                            return;
                        }
                        sprite.spriteFrame = sp;
                    })
                });
            }
        });
    }

    closeAllCard() {
        clearTimeout(this._setTimeOutId);
        this._setTimeOutId = null;
        let self = this;
        this.cardList.forEach((card, index) => {
            card.isBacked = false;
            card.isDeleted = false;
            const cardNode = this.cardPool.children[0].children[index];
            if (cardNode) {
                const card = cardNode.getChildByName("card");
                // 确保卡片处于正确的初始状态
                card.setScale(1, 1, 1);

                // 直接添加翻转动画，移除延迟
                this.flipCardAnimation(cardNode, () => {
                    const sprite = card.getComponent(Sprite);

                    const bundle = assetManager.getBundle(self.bundleName);
                    bundle.load("texture/card/Card_back_d/spriteFrame", SpriteFrame, (err, sp) => {
                        if (err) {
                            DebugLog.instance.error(err);
                            return;
                        }
                        sprite.spriteFrame = sp;
                    })

                });
            }
        });
    }
    protected onDestroy(): void {
        clearTimeout(this._setTimeOutId);
        clearInterval(this.timerId);
        clearInterval(this.intervalId);
        
        // 重置点击保护状态
        this.isAbleClick = false;
        this.isCardFlipping = false;
        this.lastClickTime = 0;
        
        // 移除应用状态监听
        game.off(Game.EVENT_HIDE, this.onAppHide, this);
        game.off(Game.EVENT_SHOW, this.onAppShow, this);
        
        super.onDestroy();
    }

    private _setTimeOutId;
    // 预览卡片，time，秒数
    seconds: number[] = [2.5, 4, 5];
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
                if(this.intervalId){
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
                            // 检查并修复可能存在的问题
                            this.checkAndFixCardScales();

                            this.closeAllCard();
                            this.countDownLabel.node.active = false;
                            this.timerTick();
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
                        // 检查并修复可能存在的问题
                        this.checkAndFixCardScales();

                        this.closeAllCard();
                        this.countDownLabel.node.active = false;
                        this.timerTick();
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

    timerInit() {
        this.timerComponent.resetTimer();
    }
    timerTick() {
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
        let { complete, duration } = this.requestGameResult();
        // 倒计时结束，游戏结束
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

    dzgoonHandler(resuleBoo:boolean = true) {
        this.clearGameView();
        if (this.sceneModel) {
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                // 直接发送游戏完成请求，不处理弹窗逻辑
                // 直接向服务器发送请求，但不处理回调
                let self = this;
                let trainData = SkewersManager.getInstance().getUnCompleteGameData();
                let _boo = trainData.type != SkewersGameType.Memory;
                if(!_boo){
                    EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, (data) => {
                        (self.sceneModel as any).goonHandler(self, true);
                    }, this, true);
                    this.clearGameView();
                    SkewersManager.getInstance().requestGameComplete(this.complete, this.duration);
                }else{
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
        super.quitGame({ parentNode: this.mainView, context: this });
        clearInterval(this.timerId);
    }


    exitCallBack(context) {
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
        super.onClickShowAnswer();
        this.showAllCard();

    }
    public onclickContinue() {
        this.dzanswerHandler(this);
    }

    public onClickRetryGame(){
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
        DebugLog.instance.error("应用进入后台，暂停倒计时");
        this.pauseCountdown();
    }
    
    /**
     * 应用回到前台时的处理
     */
    private onAppShow() {
        DebugLog.instance.error("应用回到前台，恢复倒计时");
        this.resumeCountdown();
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
        this.timerTick();

        // 重置预览模式标志
        this.isInPreviewMode = false;
        this.isCountdownPaused = false;
    }
}



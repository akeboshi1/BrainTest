import { _decorator, Button, Label, Node, Sprite, SpriteFrame, Texture2D, Vec3, tween, assetManager } from 'cc';
import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";
import { TimeUtil } from "../../resources/scripts/Core/Util/TimeUtil";
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { TimerCommonComponent } from '../../resources/scripts/Game/UI/Common/TimerCommonComponent';
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { GameType, IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import { Global } from "db://assets/resources/scripts/Core/Manager/Config/Global";
import {AudioManager} from "db://assets/resources/scripts/Core/Manager/Audio/AudioManager";
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
    viewNode: Node;

    @property(Node)

    successView: Node;

    @property(Node)
    failView: Node;

    @property(Node)
    bigWin: Node;

    @property(Node)
    timeNode: Node;

    @property(Node)
    cardPool: Node;

    @property(Button)
    nextButton: Button;

    @property(Button)
    startButton: Button;

    @property(Button)
    successNextButton: Button;

    @property(Button)
    successStartButton: Button;

    @property(Button)
    failNextButton: Button;

    @property(Button)
    failRetryButton: Button;

    @property(Label)
    successViewProgressLabel: Label;

    @property(Label)
    failViewProgressLabel: Label;

    @property(Label)
    titleLabel: Label;

    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent;

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

    @property(Sprite)
    private showSprite: Sprite;

    protected bundleName: string = BundleName.FANPAI;


    protected audioUrls = ['music/bgMusic',"music/fanpai", "music/win","music/success"];

    constructor() {
        super();
    }
    onLoad(): void {
        this.loadAudio().then();
    }

    start() {
        super.start();
        this.showSprite.node.parent.active = false;
        this.showSprite.node.active = false;
        this.dataInit();
        // ui初始化
        this.sceneInit();
    }
    dataInit() {
        //数据初始化
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.hardIndex = (this.sceneModel as any).difficulty - 1;
            this.level = (this.sceneModel as any).level;
        } else {

            this.level = (this.sceneModel as any).level;
            this.hardIndex = 0;//((this.level % 3) == 0?3:(this.level % 3))-1;
        }
        // this.hardIndex = (this.sceneModel as any).difficulty - 1;
        // this.level = (this.sceneModel as any).level;
        // DebugLog.instance.log("1111111111111111111111111",  this.hardIndex, this.level);
    }

    sceneInit() {
        super.sceneInit();
        // 独有初始化
        this.initCardView();
        // this.timerInit();

        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.successView.active = false;
            this.showStartAlert({ parentNode: this.viewNode, start: this.startGameByAlert, context: this });
        } else {
            this.successView.active = true;
            this.titleLabel.string = `看牌结束后开始挑战`;
            this.successViewProgressLabel.node.active = true;
            this.successViewProgressLabel.string = `看牌倒计时${this.seconds[this.hardIndex]}秒`;
            this.updateSuccessPopupTitle(1);
            this.successStartButton.node.active = true;
            this.successNextButton.node.active = false;

        }
    }
    clickCardHandler(event, data) {
        // if (!this.isAbleClick) { return; }
        if (!this.cardList || this._setTimeOutId != null) {
            return;
        }

        // 播放音效
        this.playAudio("music/fanpai", true);
        const index = Number(data);
        let self = this;
        // 获取当前卡片
        const currentCard = this.cardPool.children[0].children[index];
        const sprite = currentCard.getComponent(Sprite);
        this.flipCardAnimation(currentCard, () => {
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
            if (this.sceneModel.gameType != GameType.SKEWERS) {
                if (!this.customsSendDataState) {
                    this.sceneModel.gameMatch();
                    //GameCenterManager.getInstance().gameMatch(GameCenterManager.getInstance().currentGame.sessionid, () => { })
                }
            }
            const isDeletedCardCount = this.cardList.filter(c => c.isDeleted).length;
            if (isDeletedCardCount == this.cardTotalCount) {
                this.currentCustomsSuccess();
                return;
            }
            this.showSpriteAnimation("texture/right", () => { });
            this.playAudio("music/success", true);
        }

        if (isBackedCards.length === 2 && isBackedCards[0].imgUrl !== isBackedCards[1].imgUrl) {
            this.showSpriteAnimation("texture/error", () => {
                isBackedCards.forEach(card => {
                    const cardNode = this.cardPool.children[0].children[card.index];
                    // 添加翻转动画
                    this.flipCardAnimation(cardNode, () => {
                        const sprite = cardNode.getComponent(Sprite);

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
                })
            });
           AudioManager.getInstance().playFail();
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

    updateSuccessPopupTitle(num) {
        if (num == 1) {
            this.successView.getChildByName('top_Title1').active = true;
            this.successView.getChildByName('top_Title2').active = false;
        }
        if (num == 2) {
            this.successView.getChildByName('top_Title1').active = false;
            this.successView.getChildByName('top_Title2').active = true;
        }

    }
    updateSuccessPopupToptxt(num) {
        if (num == 0) {
            this.successView.getChildByName('top_txt1').active = true;
            this.successView.getChildByName('top_txt2').active = false;
        } else {
            this.successView.getChildByName('top_txt1').active = false;
            this.successView.getChildByName('top_txt2').active = true;
            const topTxt = this.successView.getChildByName('top_txt2')
            if (num == 1) {
                topTxt.getChildByName('count').getComponent(Label).string = '1';
            }
            if (num == 2) {
                topTxt.getChildByName('count').getComponent(Label).string = '2';
            }
            if (num == 3) {
                topTxt.getChildByName('count').getComponent(Label).string = '3';
            }
        }

    }
    updateSuccessPopupStar(num) {
        const lights = ['light1', 'light2', 'light3'];
        lights.forEach((lightName, index) => {
            this.successView.getChildByName(lightName).active = index < num;
        });
    }

    private _startTime: number = 0
    private _endTime: number = 0;
    currentCustomsSuccess() {
        // this.isAbleClick = false;
        this._endTime = TimeUtil.getNow();
        this.timerComponent.pauseTimer();
        clearInterval(this.timerId);

        this.playAudio("music/win",true);
        let obj = this.requestGameResult();
        // 非串烧游戏
        if (this.sceneModel.gameType !== GameType.SKEWERS) {
            this.successView.active = true;
            this.successStartButton.node.active = false;
            this.successNextButton.node.active = true;
            this.successViewProgressLabel.node.active = true;
            this.successViewProgressLabel.string = `看牌倒计时${this.seconds[this.hardIndex + 1]}秒`;
            if (this.curHard == this.hards[0]) {
                this.updateSuccessPopupTitle(2);
                this.updateSuccessPopupToptxt(this.curHard);
                this.updateSuccessPopupStar(this.curHard);
            } else if (this.curHard == this.hards[1]) {
                this.updateSuccessPopupTitle(2);
                this.updateSuccessPopupToptxt(this.curHard);
                this.updateSuccessPopupStar(this.curHard);
            } else if (this.curHard == this.hards[2]) {

                this.successView.active = false;
                this.bigWin.active = true;
            }
            if (!this.customsSendDataState) {
                this._requestGameCenterComplete(obj.complete, obj.duration);
            }
        } else {
            this.requestGameComplete({ context: this, parentNode: this.viewNode, complete: obj.complete, duration: obj.duration });
            // this.sceneModel.showNextSuccessHandler(this)

        }
    }

    startGame() {
        // this.isAbleClick = true;
        this.curHard = this.hards[this.hardIndex];
        this.cardTotalCount = this.calculCardTotalCount(this.hardIndex);
        this.gameStartInit();
    }

    startGameByAlert(context) {
        context.isAbleClick = true;
        context.curHard = context.hards[context.hardIndex];
        context.cardTotalCount = context.calculCardTotalCount(context.hardIndex);
        context.gameStartInit();
    }
    private _gamecenterNextGame() {
        Global.isAgain = false;
        if (this.hardIndex >= this.hards.length - 1) {
            this.hardIndex = 0;
            this.bigWin.active = false;
            this.updateSuccessPopupTitle(1);
            this.updateSuccessPopupToptxt(0);
            this.updateSuccessPopupStar(this.curHard);

        } else {
            this.hardIndex++;
        }
        this.level++;

        this.closeAllCard();
        this.curHard = this.hards[this.hardIndex];
        this.initCardView();
        this.gameStartInit();
        this.closeFailView();
    }
    playNextCustoms() {
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.sceneModel.goonHandler(this)
        } else {
            this._gamecenterNextGame();
        }
    }

    replayGame() {
        Global.isAgain = true;
        this.closeAllCard();
        this.timerInit();
        this.timerTick();
        this.closeFailView();
        this.previewCard();
        this.playAudio("music/bgMusic",false,true);
    }

    closeFailView() {
        this.failView.active = false;
    }
    private calculCardTotalCount(index: number): number {
        return (index + 2) * 4;
    }

    gameStartInit() {
        this.successView.active = false;
        // this.bigWin.active = false;
        // this.failView.active = false;
        this.customsSendDataState = false;
        this.initCardView();

        this.timerInit();
        this.timerTick();

        this.initCardTheme();
        this.initCardData();


        this.previewCard();

        this.playAudio("music/bgMusic",false,true);
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

    showAllCard() {
        let self = this;
        this.cardList.forEach((card, index) => {
            const cardNode = this.cardPool.children[0].children[index];
            if (cardNode) {
                // 确保卡片处于正确的初始状态
                cardNode.setScale(1, 1, 1);

                // 直接添加翻转动画，移除延迟
                this.flipCardAnimation(cardNode, () => {
                    const sprite = cardNode.getComponent(Sprite);

                    const bundle = assetManager.getBundle(self.bundleName);
                    bundle.load(card.imgUrl + "/spriteFrame", SpriteFrame, (err, sp) => {
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
                // 确保卡片处于正确的初始状态
                cardNode.setScale(1, 1, 1);

                // 直接添加翻转动画，移除延迟
                this.flipCardAnimation(cardNode, () => {
                    const sprite = cardNode.getComponent(Sprite);

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
        super.onDestroy();
    }

    private _setTimeOutId;
    // 预览卡片，time，秒数
    seconds: number[] = [2.5, 4, 5];
    previewCard() {
        // 先检查并修复可能存在的问题
        this.checkAndFixCardScales();

        this.showAllCard();
        this._startTime = TimeUtil.getNow();
        if (this._setTimeOutId != null) {
            clearTimeout(this._setTimeOutId);
        }
        this._setTimeOutId = setTimeout(() => {
            if (this._setTimeOutId) {
                clearTimeout(this._setTimeOutId);
            }
            this._setTimeOutId = null;

            // 检查并修复可能存在的问题
            this.checkAndFixCardScales();

            this.closeAllCard();
        }, this.seconds[this.hardIndex] * 1000);
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
        // clearInterval(this.timerId);
        // this.isAbleClick = false
        let { complete, duration } = this.requestGameResult();
        // 倒计时结束，游戏结束
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            //上报数据
            // EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this.failRequestSkewersGameComplete, this);
            this.sceneModel.requestGameComplete({ context: this, parentNode: this.viewNode, complete, duration });
        } else {
            if (!this.customsSendDataState) {
                this.customsSendDataState = true;
                this._requestGameCenterComplete(complete, duration);
            }
            this.failView.active = true;
            this.failViewProgressLabel.node.active = false;
            this.failRetryButton.node.active = true;
        }
    }

    reCurrentCustoms() {
        this.failView.active = false;
        this.startGame();
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
        super.quitGame({ parentNode: this.viewNode, context: this });
        clearInterval(this.timerId);
    }


    exitCallBack(context) {
        clearTimeout(context._setTimeOutId);
        context._setTimeOutId = null;
        super.exitCallBack(this);
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
                        self.showSprite.node.parent.active = false;
                        self.showSprite.node.scale = new Vec3(1, 1, 1);
                    })
                    .start();
                self.showSprite.node.active = true;
                self.showSprite.node.parent.active = true;
            } else {
                DebugLog.instance.error("showSprite is null!");
            }
        });
    }

}



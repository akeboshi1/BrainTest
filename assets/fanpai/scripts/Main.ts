import { _decorator, Button, Label, Node, Sprite, SpriteFrame, Texture2D,Vec3,tween } from 'cc';
import { LoaderManager } from "../../scripts/Core/Manager/Load/LoaderManager";
import { DebugLog } from "../../scripts/Core/Util/DebugLog";
import { TimeUtil } from "../../scripts/Core/Util/TimeUtil";
import { BaseScene } from '../../scene/Core/BaseScene';
import { GameType, IBaseGameChild } from '../../scripts/Game/GameDataFactory/BaseGameData';
import { BundleName } from '../../scripts/Core/Manager/Load/BundleName';
import { GameCenterSpecData } from '../../scripts/Game/GameDataFactory/GameCenterSpecData';
import { TimerCommonComponent } from '../../scripts/Game/UI/Common/TimerCommonComponent';
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

    private level: number = 0;

    private customsSendDataState: boolean;

    @property(Sprite)
    private showSprite: Sprite;

    protected bundleName: string = BundleName.FANPAI;


    protected audioUrls = ["music/fanpai", "music/win", 'music/bgMusic'];

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
        if (this.sceneData.gameType == GameType.SKEWERS) {
            this.hardIndex = (this.sceneData as any).difficulty - 1;
            this.level = (this.sceneData as any).level;
        }
        // this.hardIndex = (this.sceneData as any).difficulty - 1;
        // this.level = (this.sceneData as any).level;
        // DebugLog.instance.log("1111111111111111111111111",  this.hardIndex, this.level);
    }

    sceneInit() {
        super.sceneInit();
        // 独有初始化
        this.initCardView();
        // this.timerInit();

        if (this.sceneData.gameType == GameType.SKEWERS) {
            this.successView.active = false;
            this.showStartAlert({ parentNode: this.viewNode, start: this.startGameByAlert, context: this });
        } else {
            this.successView.active = true;
            this.titleLabel.string = `看牌结束后开始挑战`
            this.updateSuccessPopupTitle(1);
            this.successStartButton.node.active = true;
            this.successNextButton.node.active = false;
            this.successViewProgressLabel.node.active = false;
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
        this.currentCard = this.cardPool.children[0].children[index];
        const sprite = this.currentCard.getComponent(Sprite);
        LoaderManager.getInstance().assetBundleLoad(self.bundleName, self.bundleName).then((bundle) => {
            LoaderManager.getInstance().loadABRes(this.cardList[index].imgUrl, self.bundleName).then((res) => {
                const texture = new Texture2D();
                texture.image = res;
                const spriteFrame = new SpriteFrame();
                spriteFrame.texture = texture;
                sprite.spriteFrame = spriteFrame;
            })
        });
        this.cardList[index].isBacked = true;

        let isBackedCards = this.cardList.filter(card => (card.isBacked && !card.isDeleted));
        if (isBackedCards.length === 2 && isBackedCards[0].imgUrl === isBackedCards[1].imgUrl) {
            isBackedCards[0].isDeleted = isBackedCards[1].isDeleted = true;
            if (this.sceneData.gameType != GameType.SKEWERS) {
                if (!this.customsSendDataState) {
                    this.sceneData.gameMatch();
                    //GameCenterManager.getInstance().gameMatch(GameCenterManager.getInstance().currentGame.sessionid, () => { })
                }
            }
            const isDeletedCardCount = this.cardList.filter(c => c.isDeleted).length;
            if (isDeletedCardCount == this.cardTotalCount) {
                this.currentCustomsSuccess();
                return;
            }
            this.showSpriteAnimation("texture/right",()=>{});
            this.playAudio("music/success",true);
        }

        if (isBackedCards.length === 2 && isBackedCards[0].imgUrl !== isBackedCards[1].imgUrl) {
            this.showSpriteAnimation("texture/error",()=>{
                isBackedCards.forEach(card => {
                    const cardNode = this.cardPool.children[0].children[card.index];
                    const sprite = cardNode.getComponent(Sprite);
                    LoaderManager.getInstance().assetBundleLoad(self.bundleName, self.bundleName).then((bundle) => {
                        LoaderManager.getInstance().loadABRes("texture/card/Card_back_d", self.bundleName).then((res) => {
                            const spriteFrame = new SpriteFrame();
                            const texture = new Texture2D();
                            texture.image = res;
                            spriteFrame.texture = texture;
                            sprite.spriteFrame = spriteFrame;
                        })
                    });
                    this.cardList[card.index].isBacked = false;
                })
            });
            this.playAudio("music/fail",true);
        }

        DebugLog.instance.log(index, this.currentCard);
    }
    private showSpriteAnimation(textureUrl: string,callback: () => void) {
        let self = this;
        LoaderManager.getInstance().assetBundleLoad(self.bundleName, self.bundleName).then((bundle) => {
            LoaderManager.getInstance().loadABRes(textureUrl, self.bundleName).then((res) => {
                const texture = new Texture2D();
                texture.image = res;
                const spriteFrame = new SpriteFrame();
                spriteFrame.texture = texture;
                if (self.showSprite) {
                    self.showSprite.spriteFrame = spriteFrame;
                    let rightTween= tween(self.showSprite.node)
                        .to(0.5, { scale: new Vec3(2, 2, 1) })
                        .call(() => {
                            callback();
                            rightTween.stop();
                            rightTween=null;
                            self.showSprite.node.active = false;
                            self.showSprite.node.parent.active = false;
                            self.showSprite.node.scale = new Vec3(1,1,1);
                        })
                        .start();
                    self.showSprite.node.active = true;
                    self.showSprite.node.parent.active = true;
                } else {
                    DebugLog.instance.error("showSprite is null!");
                }
            })
        });
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

        this.playAudio("music/win");

        // 非串烧游戏
        if (this.sceneData.gameType !== GameType.SKEWERS) {
            this.successView.active = true;
            this.successStartButton.node.active = false;
            this.successNextButton.node.active = true;
            if (this.curHard == this.hards[0]) {
                this.updateSuccessPopupTitle(2);
                this.updateSuccessPopupToptxt(this.curHard);
                this.updateSuccessPopupStar(this.curHard);
            } else if (this.curHard == this.hards[1]) {
                this.updateSuccessPopupTitle(2);
                this.updateSuccessPopupToptxt(this.curHard);
                this.updateSuccessPopupStar(this.curHard);
            } else if (this.curHard == this.hards[2]) {
                this.successViewProgressLabel.node.active = false;
                this.successView.active = false;
                this.bigWin.active = true;
            }
            if (!this.customsSendDataState) {
                this._requestGameCenterComplete();
            }
        } else {
            let obj = this.requestGameResult();
            this.requestGameComplete({ context: this, parentNode: this.viewNode, complete: obj.complete, duration: obj.duration });
            this.sceneData.showNextSuccessHandler(this)

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
        if (this.hardIndex >= this.hards.length - 1) {
            this.hardIndex = 0;
            this.bigWin.active = false;
            this.successView.active = true;
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
        if (this.sceneData.gameType == GameType.SKEWERS) {
            this.sceneData.goonHandler(this)
        } else {
            this._gamecenterNextGame();
        }
    }

    replayGame() {
        this.closeAllCard();
        this.timerInit();
        this.timerTick();
        this.closeFailView();
        this.previewCard();
        this.playAudio("music/bgMusic");
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

        this.playAudio("music/bgMusic");
    }
    // 初始化待显示的卡片主题
    initCardTheme() {
        let cardThemeCounter=this.level;
        this.cardTheme  = (cardThemeCounter >= 21) ? 1: cardThemeCounter + 1;  // 达到27后重置为7
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
                const sprite = cardNode.getComponent(Sprite);
                LoaderManager.getInstance().assetBundleLoad(self.bundleName, self.bundleName).then((bundle) => {
                    LoaderManager.getInstance().loadABRes(card.imgUrl, self.bundleName).then((res) => {
                        const spriteFrame = new SpriteFrame();
                        const texture = new Texture2D();
                        texture.image = res;
                        spriteFrame.texture = texture;
                        sprite.spriteFrame = spriteFrame;
                    })
                });
            }
        })
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
                const sprite = cardNode.getComponent(Sprite);
                LoaderManager.getInstance().assetBundleLoad(self.bundleName, self.bundleName).then((bundle) => {
                    LoaderManager.getInstance().loadABRes("texture/card/Card_back_d", self.bundleName).then((res) => {
                        const spriteFrame = new SpriteFrame();
                        const texture = new Texture2D();
                        texture.image = res;
                        spriteFrame.texture = texture;
                        sprite.spriteFrame = spriteFrame;
                    })
                });
            }
        })
    }
    protected onDestroy(): void {
        clearTimeout(this._setTimeOutId);
        clearInterval(this.timerId);
    }

    private _setTimeOutId = -1;
    // 预览卡片，time，秒数
    seconds: number[] = [1.5, 2, 3.5];
    previewCard() {
        this.showAllCard();
        this._startTime = TimeUtil.getNow();
        if (this._setTimeOutId != -1) {
            clearTimeout(this._setTimeOutId);
        }
        this._setTimeOutId = setTimeout(() => {
            clearTimeout(this._setTimeOutId);
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
        this.timerComponent.startTimer(this.INIT_TIME);
    }
    _requestGameCenterComplete() {
        const curGame = (this.sceneData as GameCenterSpecData).game;
        let config = {
            sessionId: curGame.sessionid,
            count: this.calculCardTotalCount(this.hardIndex) / 2,
            level:  this.level,
            complete: 1,
            duration: (this._endTime - this._startTime) / 1000,
            timelimit: this.INIT_TIME,
            difficulty: this.hards[this.hardIndex],
            levelMode:curGame.levelMode,
            callback: () => { }
        }
        this.sceneData.requestGameComplete(config)
    }
    onTimerEnd() {
        DebugLog.instance.log("计时器结束了，执行相应逻辑");
        // clearInterval(this.timerId);
        // this.isAbleClick = false
        let { complete, duration } = this.requestGameResult();
        // 倒计时结束，游戏结束
        if (this.sceneData.gameType == GameType.SKEWERS) {
            //上报数据
            // EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this.failRequestSkewersGameComplete, this);
            this.sceneData.requestGameComplete({ context: this, parentNode: this.viewNode, complete, duration });
        } else {
            if (!this.customsSendDataState) {
                this.customsSendDataState = true;
                this._requestGameCenterComplete();
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
        const isDeletedCardCount = this.cardList.filter(c => c.isDeleted).length;
        let complete = isDeletedCardCount / this.cardTotalCount;
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

}



import {_decorator, Button, Component, instantiate, Label, Node, Sprite, SpriteFrame, Texture2D} from 'cc';
import {LoaderManager} from "../../scripts/Core/Manager/Load/LoaderManager";
import {Global} from "../../scripts/Core/Manager/Config/Global";
import {SkewersManager} from "../../scripts/Game/Task/Skewers/SkewersManager";
import {DebugLog} from "../../scripts/Core/Util/DebugLog";
import {SceneManager} from "../../scripts/Core/Manager/Scene/SceneManager";
import {TimeUtil} from "../../scripts/Core/Util/TimeUtil";
import {GameCenterManager} from "../../scripts/Game/Socket/GameCenterManager";
import {SocketManager} from '../../scripts/Core/Manager/Net/SocketManager';
import {SocketData} from '../../scripts/Core/Manager/Net/SocketData';
import {Alert, AlertType} from "db://assets/scripts/Game/UI/Alert/Alert";

const { ccclass, property } = _decorator;

function getRandomNumber(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

@ccclass('Main')
export class Main extends Component {

    // MATCH_ITEM = "game.match_item"

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

    @property(Label)
    Timer: Label;

    @property(Button)
    nextButton: Button;

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

    private currentCard: Node;
    private buttonLableText: Label;


    private cardTheme: string;
    private cardList: { index: number, imgUrl: string, isBacked: boolean, isDeleted: boolean }[];

    private cardTotalCount: number = 0;
    private curHard: number = 0;

    private hards: number[] = [1, 2, 3];

    private hardIndex: number = 0;

    private isAbleClick: boolean = false;

    private bundleName: string = 'fanpai';


    start() {
        // test
        // GameCenterManager.getInstance().startGame(1, this.startGame);
        if (Global.isSkewersGame) {
            this.hardIndex = Global.userData.curSkewerGameData.difficulty;
            this.timer = Global.userData.curSkewerGameData.timeLimit;
        }
        this.sceneInit()
    }
    sceneInit() {
        this.successView.active = true;
        this.updateSuccessPopupTitle(1); 
        this.successStartButton.node.active = true;
        this.successNextButton.node.active = false;
        this.successViewProgressLabel.node.active = false;
        this.initCardView();
        this.timerInit();
    }
    gamepasslevelCallback() {

    }
    clickCardHandler(event, data) {
        // if (!this.isAbleClick) { return; }
        const index = Number(data);
        let self = this;
        let isBackedCards = this.cardList.filter(card => (card.isBacked && !card.isDeleted));
        if (isBackedCards.length === 2) {

            // 复原翻过来但未被消除的卡片
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


                // resources.load("texture/card/Card_back_d", (err, image: ImageAsset) => {
                //     if (err) {
                //         console.log(err);
                //         return;
                //     }
                //     const spriteFrame = new SpriteFrame();
                //     const texture = new Texture2D();
                //     texture.image = image;
                //     spriteFrame.texture = texture;
                //     sprite.spriteFrame = spriteFrame;
                // });
                this.cardList[card.index].isBacked = false;

            })
        }

        // 获取当前卡片
        this.currentCard = this.cardPool.children[0].children[index];
        const sprite = this.currentCard.getComponent(Sprite);

        LoaderManager.getInstance().assetBundleLoad(self.bundleName, self.bundleName).then((bundle) => {
            LoaderManager.getInstance().loadABRes(this.cardList[index].imgUrl, self.bundleName).then((res) => {
                const spriteFrame = new SpriteFrame();
                const texture = new Texture2D();
                texture.image = res;
                spriteFrame.texture = texture;
                sprite.spriteFrame = spriteFrame;
            })
        });
        // resources.load(this.cardList[index].imgUrl, (err, image: ImageAsset) => {
        //     if (err) {
        //         console.log(err);
        //         return;
        //     }
        //     const spriteFrame = new SpriteFrame();
        //     const texture = new Texture2D();
        //     texture.image = image;
        //     spriteFrame.texture = texture;
        //     sprite.spriteFrame = spriteFrame;
        // });
        this.cardList[index].isBacked = true;

        isBackedCards = this.cardList.filter(card => (card.isBacked && !card.isDeleted));


        if (isBackedCards.length === 2 && isBackedCards[0].imgUrl === isBackedCards[1].imgUrl) {
            isBackedCards[0].isDeleted = isBackedCards[1].isDeleted = true;
            if(!Global.isSkewersGame){
                // DebugLog.instance.log('sessionid', GameCenterManager.getInstance().currentGame.sessionid);
                SocketManager.getInstance().send(new SocketData({
                    action: GameCenterManager.GAMEMATCHITEM,
                    data: {
                        session_id: GameCenterManager.getInstance().currentGame.sessionid,
                    }
                }));
            }

            const isDeletedCardCount = this.cardList.filter(c => c.isDeleted).length;
            if (isDeletedCardCount == this.cardTotalCount) {
                this.currentCustomsSuccess();
            }
        }

        DebugLog.instance.log(index, this.currentCard);
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
            const topTxt=this.successView.getChildByName('top_txt2')
            if (num == 1) {
                topTxt.getChildByName('count').getComponent(Label).string = '1';
            }
            if (num == 2) {
                topTxt.getChildByName('count').getComponent(Label).string = '2';
            }
            if(num == 3) {
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
    
    currentCustomsSuccess() {
        this.isAbleClick = false
        clearInterval(this.timerId);
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
            // 是否是串烧游戏
            if (!Global.isSkewersGame) {
                this.successViewProgressLabel.node.active = false;
                this.successView.active = false;
                this.bigWin.active = true;
                const curGame = GameCenterManager.getInstance().currentGame;
                GameCenterManager.getInstance().gamePassLevel(curGame.sessionid, this.calculCardTotalCount(this.hardIndex) / 2, this.hards[this.hardIndex],
                    this.hards[this.hardIndex] / this.hards.length, this.INIT_TIME - this.timer, this.INIT_TIME, this.hards[this.hardIndex], () => { });
            } else {
                let maxCount = SkewersManager.getInstance().getGameCount();
                let curCount = SkewersManager.getInstance().getCurGameIndex();
                this.successViewProgressLabel.node.active = true;
                if (SkewersManager.getInstance().isRunOver()) {
                    this.successViewProgressLabel.string = `当前游戏进度:${maxCount}/${maxCount}`;
                    this.successView.active = false;
                    this.bigWin.active = true;
                } else {
                    this.successViewProgressLabel.string = `当前游戏进度:${curCount}/${maxCount}`;
                    this.successView.active = true;
                    this.bigWin.active = false;
                }
            }
        }

    }

    startGame() {
        this.isAbleClick = true;
        this.curHard = this.hards[this.hardIndex];
        this.cardTotalCount = this.calculCardTotalCount(this.hardIndex);
        this.gameStartInit();

    }
    playNextCustoms() {
        // let curGame = GameCenterManager.getInstance().currentGame;
        //     GameCenterManager.getInstance().gamePassLevel(curGame.sessionid,0,curGame.level,1,30,this.gameLength,curGame.difficulty,this.gamepasslevelCallback);
        // 串烧游戏状态下，运行下一个串烧游戏内容
        if (Global.isSkewersGame) {
            if (SkewersManager.getInstance().isRunOver()) {
                SceneManager.getInstance().backToHall();
            }
            else {
                SkewersManager.getInstance().runNextGame();
            }
            return;
        }
      
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
        this.closeAllCard();
        this.curHard = this.hards[this.hardIndex];
        this.initCardView();
        this.gameStartInit();
        this.closeFailView();
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
        this.initCardView();

        this.timerInit();
        this.timerTick();

        this.initCardTheme();
        this.initCardData();


        this.previewCard(2);
    }
    // 初始化待显示的卡片主题
    initCardTheme() {
        const n = getRandomNumber(7, 18)
        // 如果n大于9，则将n转换为字符串，否则将n转换为字符串并在前面加上0
        this.cardTheme = n > 9 ? `${n}` : `0${n}`
    }

    // 初始化卡片数据
    initCardData() {
        this.cardList = [];
        const cardTypeUsedMap = new Map<number, number>();
        // 初始化16张卡片数据
        while (this.cardList.length < this.cardTotalCount) {
            const currentCardIndex = this.cardList.length;
            const cardTypeNumber = getRandomNumber(1, this.cardTotalCount / 2);
            // 如果cardTypeUsedMap中没有该卡片类型，则添加该卡片类型
            if (!cardTypeUsedMap.has(cardTypeNumber)) {
                this.cardList.push({
                    index: currentCardIndex,
                    imgUrl: `texture/svg/${cardTypeNumber}_${this.cardTheme}`,
                    isBacked: false,
                    isDeleted: false,
                });
                cardTypeUsedMap.set(cardTypeNumber, 1);
            } else {
                // 如果cardTypeUsedMap中该卡片类型为1，则添加该卡片类型
                if (cardTypeUsedMap.get(cardTypeNumber) === 1) {
                    this.cardList.push({
                        index: currentCardIndex,
                        imgUrl: `texture/svg/${cardTypeNumber}_${this.cardTheme}`,
                        isBacked: false,
                        isDeleted: false,
                    });
                    cardTypeUsedMap.set(cardTypeNumber, 2);
                }
            }
        }
        // DebugLog.instance.log('this.cardList', this.cardList);
        // 所有卡片设置为背板
        this.closeAllCard();
    }

    showAllCard() {
        let self = this;
        this.cardList.forEach((card, index) => {
            const cardNode = this.cardPool.children[0].children[index];
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


            // resources.load(card.imgUrl, (err, image: ImageAsset) => {
            //     if (err) {
            //         console.log(err);
            //         return;
            //     }
            //     const spriteFrame = new SpriteFrame();
            //     const texture = new Texture2D();
            //     texture.image = image;
            //     spriteFrame.texture = texture;
            //     sprite.spriteFrame = spriteFrame;
            // });
        })
    }

    closeAllCard() {
        let self = this;
        this.cardList.forEach((card, index) => {
            const cardNode = this.cardPool.children[0].children[index];
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
            // resources.load("texture/card/Card_back_d", (err, image: ImageAsset) => {
            //     if (err) {
            //         console.log(err);
            //         return;
            //     }
            //     const spriteFrame = new SpriteFrame();
            //     const texture = new Texture2D();
            //     texture.image = image;
            //     spriteFrame.texture = texture;
            //     sprite.spriteFrame = spriteFrame;
            // });
        })
    }

    // 预览卡片，time，秒数
    previewCard(time: number) {
        this.showAllCard();
        setTimeout(() => this.closeAllCard(), time * 1000);
    }

    // 定时器
    timerId: any;
    timer: number;

    INIT_TIME = 90;

    timerInit() {
        this.timer = this.INIT_TIME;
        this.Timer.string = TimeUtil.formatTime(this.timer);
    }
    timerTick() {
        this.timerId = setInterval(() => {
            this.timer -= 1;
            if (this.timer <= 0) {
                clearInterval(this.timerId);
                this.isAbleClick = false
                // 倒计时结束，游戏结束
                this.failView.active = true;
                if (Global.isSkewersGame) {
                    this.failViewProgressLabel.node.active = true;
                    let maxCount = SkewersManager.getInstance().getGameCount();
                    let curCount = SkewersManager.getInstance().getCurGameIndex();
                    this.failRetryButton.node.active = false;
                    if (SkewersManager.getInstance().isRunOver()) {
                        this.failViewProgressLabel.string = `当前游戏进度:${maxCount}/${maxCount}`;
                    } else {
                        // 直接进入下一关
                        this.failViewProgressLabel.string = `当前游戏进度${curCount}/${maxCount}`;
                    }
                } else {
                    this.failViewProgressLabel.node.active = false;
                    this.failRetryButton.node.active = true;
                }
            }
            this.updateTimerLabel()
        }, 1 * 1000);
    }
    restoreTimer() {
        // if (this.timerId) {
        //     clearInterval(this.timerId);
        //     this.timerId = undefined;
        // }
        this.updateTimerLabel();    
       
        this.timerTick();
    }

    updateTimerLabel() {
        const fenzhong = Math.floor(this.timer / 60);
        const miaozhong = this.timer % 60;
        const second = miaozhong > 9 ? miaozhong : `0${miaozhong}`
        this.Timer.string = `0${fenzhong}:${second}`
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
    private quitGame() {
        // clearInterval(this.timerId);
        DebugLog.instance.log('this.timer1', this.timer)
        if(Global.isSkewersGame) {
            let self = this;
            DebugLog.instance.log('this.timer2', this.timer)
            LoaderManager.getInstance().resourcesLoadPrefab("prefab/BrainTrainAlert").then((resource)=>{
                const alertNode = instantiate(resource);
                this.node.addChild(alertNode);
                let alert = alertNode.getComponent("Alert");
                alertNode.setPosition(0,0,0);
                alert["showView"](AlertType.Normal);
                alert["setTitle"]("是否退出当前游戏？");
                DebugLog.instance.log('this.timer3', this.timer)
                alert["setCallBack"](self.restoreTimer,this)
            });
        }else{
            // 游戏大厅
            clearInterval(this.timerId);
            console.log("返回大厅")
            SocketManager.getInstance().send(new SocketData({
                action: GameCenterManager.GAMEEND,
                data: {
                    session_id: GameCenterManager.getInstance().currentGame.sessionid,
                }
            }));
            SceneManager.getInstance().backToHall();
        }
    }

}



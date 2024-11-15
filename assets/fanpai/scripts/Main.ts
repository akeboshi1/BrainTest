import { _decorator, Component, Node, resources, Sprite, SpriteFrame, Texture2D, ImageAsset, Label, Button, random } from 'cc';
import {LoaderManager} from "../../scripts/Core/Manager/Load/LoaderManager";
const { ccclass, property } = _decorator;

function getRandomNumber(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

@ccclass('Main')
export class Main extends Component {

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

    @property(Label)
    successLable: Label;

    private currentCard: Node;
    private buttonLableText: Label;
    private successLableText: Label;

    private cardTheme: string;
    private cardList: { index: number, imgUrl: string, isBacked: boolean, isDeleted: boolean }[];

    private cardTotalCount: number = 8;
    private cardCustoms: number = 1;

    private isAbleClick: boolean = false;

    private bundleName:string = 'fanpai';

    private sceneName = "fanpaiScene";

    start() {
        this.cardPool;
        this.sceneInit()
    }
    sceneInit() {
        this.successView.active = true;
        this.successLableText = this.successLable.getComponent(Label);
        this.buttonLableText = this.nextButton.node.children[0].getComponent(Label);
        this.buttonLableText.string = '开始游戏';
        this.timerInit();
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


                LoaderManager.getInstance().assetBundleLoad(self.bundleName,self.bundleName).then((bundle)=>{
                    LoaderManager.getInstance().loadABRes("texture/card/Card_back_d",self.bundleName).then((res)=>{
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

        this.currentCard = this.cardPool.children[0].children[index];
        const sprite = this.currentCard.getComponent(Sprite);

        LoaderManager.getInstance().assetBundleLoad(self.bundleName,self.bundleName).then((bundle)=>{
            LoaderManager.getInstance().loadABRes(this.cardList[index].imgUrl,self.bundleName).then((res)=>{
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
            // 判断是否胜利
            // 获取cardList中isDeleted为true的card的数量
            const isDeletedCardCount = this.cardList.filter(c => c.isDeleted).length;
            if (isDeletedCardCount == this.cardTotalCount) {
                // this.bigWin.active = true;
                this.isAbleClick = false
                clearInterval(this.timerId);
                this.successView.active = true;

                this.successView.children[7].active = false;
                this.successView.children[6].active = true;
                this.buttonLableText.string = '下一关';
                if (this.cardCustoms == 1) {
                    this.successView.children[0].active = true;
                    this.successLableText.string = '1'
                } else if (this.cardCustoms == 2) {
                    this.successView.children[0].active = true;
                    this.successView.children[1].active = true;
                    this.successLableText.string = '2'
                } else if (this.cardCustoms == 3) {
                    this.successView.active = false;
                    this.bigWin.active = true;
                }
                this.cardCustoms++;
            }
        }

        console.log(index, this.currentCard);
    }
    startGame() {
        this.isAbleClick = true;

        if (this.cardCustoms == 1) {
            this.gameStartInit();
        } else if (this.cardCustoms == 2) {
            if (this.cardTotalCount == 8) {
                this.nextCustoms();
                this.successView.children[0].active = false;
            } else {
                this.gameStartInit();
            }

        } else if (this.cardCustoms == 3) {
            if (this.cardTotalCount == 12) {
                this.nextCustoms();
                this.successView.children[0].active = false;
                this.successView.children[1].active = false;
            } else {
                this.gameStartInit();
            }
        }
    }

    gameStartInit() {
        console.log("游戏开始");
        this.successView.active = false;
        // this.bigWin.active = false;
        // this.failView.active = false;

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
        console.log('this.cardList', this.cardList);
        // 所有卡片设置为背板
        this.closeAllCard();
    }

    nextCustoms() {
        // 所有卡片设置为背板
        this.closeAllCard();

        this.cardTotalCount = (this.cardCustoms + 1) * 4;
        console.log(' this.cardTotalCount ', this.cardTotalCount)

        const maxLen = this.cardPool.children[0].children.length;
        for (let i = 0; i < maxLen; i++) {
            this.cardPool.children[0].children[i].active = i < this.cardTotalCount ? true : false;
        }

        this.buttonLableText.string = '开始游戏';
        this.successView.children[6].active = false;
        this.successView.children[7].active = true;
    }

    showAllCard() {
        let self = this;
        this.cardList.forEach((card, index) => {
            const cardNode = this.cardPool.children[0].children[index];
            const sprite = cardNode.getComponent(Sprite);


            LoaderManager.getInstance().assetBundleLoad(self.bundleName,self.bundleName).then((bundle)=>{
                LoaderManager.getInstance().loadABRes(card.imgUrl,self.bundleName).then((res)=>{
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
            LoaderManager.getInstance().assetBundleLoad(self.bundleName,self.bundleName).then((bundle)=>{
                  LoaderManager.getInstance().loadABRes("texture/card/Card_back_d",self.bundleName).then((res)=>{
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
    timer: number = 90;

    timerInit() {
        this.timer = 90;
        this.Timer.string = "01:30";
    }

    timerTick() {
        this.timerId = setInterval(() => {
            this.timer -= 1;
            if (this.timer <= 0) {
                clearInterval(this.timerId);
                this.isAbleClick = false
                // 倒计时结束，游戏结束
                this.failView.active = true;
            }
            this.updateTimerLabel()
        }, 1 * 1000);
    }

    updateTimerLabel() {
        const fenzhong = Math.floor(this.timer / 60);
        const miaozhong = this.timer % 60;
        const second = miaozhong > 9 ? miaozhong : `0${miaozhong}`
        this.Timer.string = `0${fenzhong}:${second}`
    }

    getAward() {
        this.bigWin.active = false;
        this.successView.children[6].active = false;
        this.successView.children[7].active = true;
        this.cardCustoms = 1;
        this.closeAllCard();
        let subarray = this.cardPool.children[0].children.slice(8, 16);
        subarray.forEach(item => {
            item.active = false;
        });
        this.cardTotalCount = 8;
        this.cardList = [];
        this.sceneInit();
    }
    reCurrentCustoms() {
        this.failView.active = false;
        this.startGame();
    }
    playNextCustoms() {
        this.failView.active = false;
        if(this.cardCustoms >=3) {
            this.cardCustoms = 1
        }else {
            this.cardCustoms++;  
        }
        this.nextCustoms();
        this.gameStartInit()
    }

}



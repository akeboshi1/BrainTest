import {_decorator,assetManager, Button, Component, Label, Node, Sprite, SpriteFrame, Texture2D,tween,Vec3,AudioClip} from 'cc';
import {LoaderManager} from "../../scripts/Core/Manager/Load/LoaderManager";
import {Global} from "../../scripts/Core/Manager/Config/Global";
import {SkewersManager} from "../../scripts/Game/Task/Skewers/SkewersManager";
import {DebugLog} from "../../scripts/Core/Util/DebugLog";
import {SceneManager} from "../../scripts/Core/Manager/Scene/SceneManager";
import {TimeUtil} from "../../scripts/Core/Util/TimeUtil";
import {GameCenterManager} from "db://assets/scripts/Game/GameCenter/GameCenterManager";
import {AlertType} from "db://assets/scripts/Game/UI/Alert/GameAlert";
import {EventManager} from "db://assets/scripts/Core/Manager/Event/EventManager";
import {AudioManager} from "db://assets/scripts/Core/Manager/Audio/AudioManager";
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


    private audioUrls=["music/fanpai","music/win",'music/bgMusic'];
    private audioMap:Map<string,AudioClip> = new Map();
    start() {
        // test
        // GameCenterManager.getInstance().startGame(1, this.startGame);
        if (Global.isSkewersGame) {
            this.hardIndex = Global.userData.curSkewerGameData.difficulty - 1;
            this.timer = Global.userData.curSkewerGameData.timeLimit;
        }

        AudioManager.getInstance().onAudioStart(this.onAudioStart,this);
        AudioManager.getInstance().onAudioEnd(this.onAudioFinished,this);


        this.loadAudio();
        this.sceneInit();
    }

    private async loadAudio() {
        const bundle = assetManager.getBundle(this.bundleName);
        if(!bundle){
            DebugLog.instance.error("bundle is not exist! ---- bundle name:"+ this.bundleName);
            return;
        }
        let self = this;
       let len = this.audioUrls.length;
       for(let i:number = 0;i<len;i++){
           let audioUrl = this.audioUrls[i];
           const audioRes:AudioClip = await new Promise<AudioClip>((resolve,reject)=>{
               bundle.load(audioUrl,AudioClip,(err,data:AudioClip)=>{
                   if(err){
                       DebugLog.instance.error("AudioClip Load Failed ! url : " + audioUrl);
                       reject(err);
                   }else{
                       resolve(data);
                   }
               })
           });
           this.audioMap.set(audioUrl,audioRes);
       }
    }

    private onAudioStart(){
        DebugLog.instance.log("Audio Started!!!");
    }

    private onAudioFinished(){
        DebugLog.instance.log("Audio Finished!!!");
    }

    private playAudio(url:string,isShot:boolean = false,isLoop:boolean = false){
        let audioRes = this.audioMap.get(url);
        if(audioRes != null){
            if(isShot){
                AudioManager.getInstance().playOneShot(audioRes);
            }else{
                AudioManager.getInstance().play(audioRes,isLoop);
            }
        }
    }

    sceneInit() {


        this.initCardView();
        this.timerInit();

        if(Global.isSkewersGame){
            this.successView.active = false;
            SkewersManager.getInstance().showGameAlert(this.node,AlertType.Init, "开始游戏!","",0,0,this.startGameByAlert,null,this);
        }else{
            this.successView.active = true;
            this.updateSuccessPopupTitle(1);
            this.successStartButton.node.active = true;
            this.successNextButton.node.active = false;
            this.successViewProgressLabel.node.active = false;
        }
    }
    gamepasslevelCallback() {

    }
    clickCardHandler(event, data) {
        // if (!this.isAbleClick) { return; }
        // 播放音效
        this.playAudio("music/fanpai",true);
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
                const texture = new Texture2D();
                texture.image = res;
                const spriteFrame = new SpriteFrame();
                spriteFrame.texture = texture;
                sprite.spriteFrame = spriteFrame;


            })
        });

        this.cardList[index].isBacked = true;

        isBackedCards = this.cardList.filter(card => (card.isBacked && !card.isDeleted));


        if (isBackedCards.length === 2 && isBackedCards[0].imgUrl === isBackedCards[1].imgUrl) {
            isBackedCards[0].isDeleted = isBackedCards[1].isDeleted = true;
            if(!Global.isSkewersGame){
                GameCenterManager.getInstance().gameMatch( GameCenterManager.getInstance().currentGame.sessionid,()=>{})
            }

            const isDeletedCardCount = this.cardList.filter(c => c.isDeleted).length;
            if (isDeletedCardCount == this.cardTotalCount) {
                this.currentCustomsSuccess();
            }
        }

        DebugLog.instance.log(index, this.currentCard);
    }

    private flipCard(sprite:Sprite,texture:Texture2D){
        let flipDuration = 1;
        // 定义翻牌动画

        let scaleAction1 = tween().to(flipDuration / 2, { scale: new Vec3(0, 1,1) });
        let scaleAction2 = tween().to(flipDuration / 2, { scale: new Vec3(1, 1,1) });

        sprite.node.scale = new Vec3(0,sprite.node.scale.y);
        tween(sprite)
            .then(scaleAction1)
            .call(() => {
                // 在翻转到一半时，更新卡片内容
                const spriteFrame = new SpriteFrame();
                spriteFrame.texture = texture;
                sprite.spriteFrame = spriteFrame;
            })
            .then(scaleAction2)
            .start();
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

    private _startTime:number=0
    private _endTime:number=0;
    currentCustomsSuccess() {
        this.isAbleClick = false;
        this._endTime = TimeUtil.getNow();
        clearInterval(this.timerId);

        this.playAudio("music/win");

        // 非串烧游戏
        if (!Global.isSkewersGame) {
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
            const curGame = GameCenterManager.getInstance().currentGame;
            GameCenterManager.getInstance().gamePassLevel(curGame.sessionid, this.calculCardTotalCount(this.hardIndex) / 2, this.hards[this.hardIndex],
            this.hards[this.hardIndex] / this.hards.length, this.INIT_TIME - this.timer, this.INIT_TIME, this.hards[this.hardIndex]);
        }else{
            this.requestGameResult();
            // 串烧游戏逻辑
            if(SkewersManager.getInstance().isRunOver()){
                SkewersManager.getInstance().showGameAlert(this.node,AlertType.Sucess_Big,"太棒了，恭喜你全部通关","收获xxx点脑力值！",0,0,null,this.exitCallBack,this);
                return;
            }
            //上报数据
            EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE,this.requestSkewersGameComplete,this);

        }
    }

    private requestSkewersGameComplete(data){
        let trainid = data;
        let trainData = SkewersManager.getInstance().getTrainData(trainid);
        EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE,this);
        let maxCount = trainData.parentSkewersGameData.trains.length;
        let curCount = trainData.seq;

        // 游戏内界面提示
        if(maxCount != curCount){
            SkewersManager.getInstance().showGameAlert(this.node,AlertType.Normal,"太棒了，请继续！","",curCount,maxCount,this.alertGoonHandler,this.exitCallBack,this);
        }else{
            if (!SkewersManager.getInstance().isRunOver()) {
                SkewersManager.getInstance().showGameAlert(this.node,AlertType.Sucess_Small,"太棒了，恭喜你通关翻牌游戏","收获xxx点脑力值！",0,0,this.nextAlertHandler,this.exitCallBack,this);
            }else{
                SkewersManager.getInstance().showGameAlert(this.node,AlertType.Sucess_Big,"太棒了，恭喜你全部通关","收获xxx点脑力值！",0,0,this.alertGoonHandler,this.exitCallBack,this);
            }
        }
    }


    startGame() {
        this.isAbleClick = true;
        this.curHard = this.hards[this.hardIndex];
        this.cardTotalCount = this.calculCardTotalCount(this.hardIndex);
        this.gameStartInit();
    }

    startGameByAlert(context){
        context.isAbleClick = true;
        context.curHard = context.hards[context.hardIndex];
        context.cardTotalCount = context.calculCardTotalCount(context.hardIndex);
        context.gameStartInit();
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

    replayGame() {
        this.closeAllCard();
        this.timerInit();
        this.timerTick();
        this.closeFailView();
        this.previewCard(2);
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

        this.playAudio("music/bgMusic");
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
            if(cardNode){
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
            card.isBacked = false;
            card.isDeleted = false;
            const cardNode = this.cardPool.children[0].children[index];
            if(cardNode){
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

    private _setTimeOutId = -1;
    // 预览卡片，time，秒数
    previewCard(time: number) {
        this.showAllCard();
        this._startTime = TimeUtil.getNow();
        this._setTimeOutId = setTimeout(() => {
            this.closeAllCard();
        }, time * 1000);
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
                if (Global.isSkewersGame) {
                    //上报数据
                    EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE,this.failRequestSkewersGameComplete,this);
                    this.requestGameResult();
                } else {
                    this.failView.active = true;
                    this.failViewProgressLabel.node.active = false;
                    this.failRetryButton.node.active = true;
                }
            }
            this.updateTimerLabel()
        }, 1 * 1000);
    }

    private failRequestSkewersGameComplete(){
        EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE,this)
        let trainData = SkewersManager.getInstance().getUnCompleteGameData();
        let maxCount = SkewersManager.getInstance().getGameCount();
        let curCount = trainData.seq - 1<0?0:trainData.seq -1;
        SkewersManager.getInstance().showGameAlert(this.node,AlertType.Normal,"真遗憾，请加油！","",curCount,maxCount,this.alertGoonHandler,this.exitCallBack,this);
    }

    restoreTimer() {
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

    private requestGameResult(){
        // 上报数据
        this._endTime = TimeUtil.getNow();
        const isDeletedCardCount = this.cardList.filter(c => c.isDeleted).length;
        let complete =isDeletedCardCount/this.cardTotalCount;
        let duration= (this._endTime - this._startTime)/1000;
        SkewersManager.getInstance().requestGameComplete(complete,duration);
    }

    private quitGame() {
        clearInterval(this.timerId);
        DebugLog.instance.log('this.timer1', this.timer)
        if(Global.isSkewersGame) {
            let trainData = SkewersManager.getInstance().getUnCompleteGameData();
            let maxCount = SkewersManager.getInstance().getGameCount();
            let curCount = trainData.seq - 1<0?0:trainData.seq -1;
            SkewersManager.getInstance().quitGame(this.node,curCount,maxCount,this.goonCallBack,this.exitCallBack,this);
        }else{
            // 游戏大厅
            console.log("返回大厅")
            GameCenterManager.getInstance().quitGame(this.node,this.goonCallBack,this.exitCallBack,this);
        }
    }

    private goonCallBack(context){
        if(Global.isSkewersGame) {
            if(!SkewersManager.getInstance().isRunOver()){
                context.restoreTimer();
            }
        }else{
            context.restoreTimer();
        }
    }

    private alertGoonHandler(context){
        clearInterval(context.timerId);
        clearTimeout(context._setTimeOutId);
        if (!SkewersManager.getInstance().isRunOver()) {
            context.node.active = false;
            SkewersManager.getInstance().runNextGame();
        }else{
            SkewersManager.getInstance().exitCallBack();
        }
    }

    private nextAlertHandler(context){
        clearInterval(context.timerId);
        clearTimeout(context._setTimeOutId);
        let gameData = SkewersManager.getInstance().getUnCompleteGameData();
        SkewersManager.getInstance().showGameAlert(context.node,AlertType.Next,`接下来将进入${gameData.gameName}游戏`,'',0,0,context.alertGoonHandler,context.exitCallBack,context);
    }



    private exitCallBack(context){
        AudioManager.getInstance().stop();
        clearInterval(context.timerId);
        clearTimeout(context._setTimeOutId);
        if(Global.isSkewersGame){
            SkewersManager.getInstance().exitCallBack();
        }else{
            GameCenterManager.getInstance().exitCallBack();
        }
    }

    private autoExitCallBack(context){
        AudioManager.getInstance().stop();
        clearInterval(context.timerId);
        clearTimeout(context._setTimeOutId);
        //上报数据
        context.requestGameResult();
        if(Global.isSkewersGame){
            SkewersManager.getInstance().exitCallBack();
        }else{
            GameCenterManager.getInstance().exitCallBack();
        }
    }

}



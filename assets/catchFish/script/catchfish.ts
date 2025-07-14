import {
    _decorator,
    Canvas,
    director,
    instantiate,
    Label,
    Node,
    Prefab,
    Sprite,
    SpriteFrame,
    tween,
    Tween,
    UITransform,
    v3,
    Vec3,
    resources,
    AudioClip,
    ProgressBar
} from 'cc';
import { ColorUtil } from '../../resources/scripts/Core/Util/ColorUtil';
import { Fish } from './Fish';
import { EventManager } from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
import { DebugLog } from "db://assets/resources/scripts/Core/Util/DebugLog";
import { TimeUtil } from "db://assets/resources/scripts/Core/Util/TimeUtil";
import { GuideManager } from "db://assets/resources/scripts/Core/Manager/Guide/GuideManager";
import { CatchFishGuide } from "db://assets/resources/scripts/Core/Manager/Guide/game/CatchFishGuide";
import {CreateQuestion, FishQuestion} from "db://assets/catchFish/script/createQuestion";
import { TimerCommonComponent } from '../../resources/scripts/Game/UI/Common/TimerCommonComponent';
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import {BaseScene} from "db://assets/resources/scripts/Core/Scene/BaseScene";
import {GameType, IBaseGameChild} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import {Global} from "db://assets/resources/scripts/Core/Manager/Config/Global";
import {SkewersManager} from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
import {SkewersGameType} from "db://assets/resources/scripts/Game/Task/Skewers/SkewersGameData";
const { ccclass, property } = _decorator;


const SHOOT_INTERVAL = 0.65;
// let questions = [questions0, questions1, questions2];
@ccclass('catchfish')
export class catchfish extends BaseScene<IBaseGameChild> {

    @property(Node)
    mainView: Node = null;

    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent = null;


    // @property(Node)
    // gameFailView: Node;

    // @property(Node)
    // gameSuccessView: Node;

    // @property(Node)
    // gameBeforeView: Node;

    @property(Node)
    answerView:Node

    @property(Node)
    quitBtn: Node;

    // @property(Label)
    // Timer: Label;

    @property([Node])
    wangs: Node[] = [];

    @property([SpriteFrame])
    spriteFrames: SpriteFrame[] = [];


    @property([Node])
    answerNodes: Node[] = [];

    // @property(Label)
    // catchLabel: Label;

    @property(Node)
    resultNode = null;

    @property(Node)
    fishParentNode: Node;

    @property(Prefab)
    fishPrefab: Prefab;

    @property(Prefab)
    wangPrefab: Prefab;

    @property(ProgressBar)
    progressBar: ProgressBar;


    @property(Label)
    guankaLabel: Label;

    @property(Node)
    fishes1: Node = null;

    @property(Node)
    fishes2: Node = null;

    @property(Node)
    fishes3: Node = null;

    private selectColor = ColorUtil.hexToColor("#3AEB0E");
    private unSelectColor = ColorUtil.hexToColor("#FFFFFF");
    private ErrorColor = ColorUtil.hexToColor("#FC0505");

    // 存储答错的题目
    private wrongQuestions: FishQuestion[] = [];

    private fishs: Fish[];
    private _curFish: Fish;
    private wangMaxCount: number = 5;
    private wangCount: number = 0;

    private curHard: number = 0;
    private hards: number[] = [1, 2, 3];
    private hardIndex: number = 0;
    private customsSendDataState: boolean;

    private hasWangClick: boolean = false;

    private _leftSceneX: number = -1;

    private isGuide: boolean = false;

    private _wangPosList = [{ x: 127, y: 154 }, { x: 402, y: 154 }, { x: 677, y: 154 }, { x: 952, y: 154 }];

    private _fishTweens: Tween<Node>[] = [];
    private _isPaused = false;
    private _clearBoo = false;
    private _gameEnded = false; // 添加游戏结束标志
    // 在类中添加边界属性和初始化方法
    private _sceneWidth: number = 1080; // 根据实际场景宽度设置
    private _moveSpeed: number = 200; // 像素/秒

    private _pause = false;
    private _waveConfig = {
        amplitude: 30,   // 波动幅度
        frequency: 0.002 // 波动频率
    };
    private _moveSpeeds = {
        leftToRight: 180, // fishes1速度
        rightToLeft: 220  // fishes2速度
    };

    // fishes3上下缓动配置
    private _fishes3Config = {
        amplitude: 40,    // 上下移动幅度
        duration: 2.5,    // 一次上下移动的时长
        easeType: 'sineInOut' as any // 缓动类型
    };

    // ====================== 继承basescene ===================
    onLoad() {
        this.audioUrls = [ "music/fishBG","music/fishCatch", "music/win"];
        this.bundleName = BundleName.CATCHFISH;
        let self = this;
        this.loadAudio().then(()=>{
            if(!self.bgmClip){
                self.bgmClip = self.playBgmAudio("music/fishBG",true);
            }
        });

        // 加载错题列表
        this.loadWrongQuestions();
    }

    // 从本地存储加载错题列表
    private loadWrongQuestions(): void {
        // 不再从localStorage加载，保持wrongQuestions为空
        this.wrongQuestions = [];
    }

    start() {
        super.start();
        // let logoSprite = this.logoNode.getComponent(Sprite);
        // const bundle = assetManager.getBundle(this.bundleName);
        // if (this.sceneModel.gameType == GameType.SKEWERS) {
        //     resources.load("texture/game/logo/judgment/spriteFrame",SpriteFrame,(err,sp)=>{
        //         if(err){
        //             DebugLog.instance.error(err);
        //             return;
        //         }
        //         logoSprite.spriteFrame = sp;
        //     });

        // } else {
        //     bundle.load("texture/page1_start/logo/spriteFrame",SpriteFrame,(err,sp)=>{
        //         if(err){
        //             DebugLog.instance.error(err);
        //             return;
        //         }
        //         logoSprite.spriteFrame = sp;
        //     });
        // }
        const scene = director.getScene();
        const canvas = scene.getComponentInChildren(Canvas);
        const uitransform = canvas.getComponent(UITransform);
        if(uitransform.width < 1080){
            this._leftSceneX = -uitransform.width / 2 - 80;
        }else{
            this._leftSceneX = -1080 / 2 - 80;
        }
        this.fishs = [];
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            // this.gameBeforeView.active = false;
            this.sceneModel.runNextGame = this.startGame.bind(this);
            this.sceneModel.runNextGame();
        } else {
            // this.gameBeforeView.active = true;
            this.sceneModel.runNextGame = this._nextGame.bind(this);
            this.startGame();
        }
    }



    public hideGuide(){
        super.hideGuide();
        this.sceneModel.runNextGame();
    }

    // ===== 最后一个串烧游戏失败后，弹窗继续得回调 =====
    failCompleteHandler() {
        super.failCompleteHanlder(this);
    }

    goonHandler() {
        this.node.active = false;
        super.goonHandler(this);
    }


    dzgoonHandler(resuleBoo:boolean = true) {
        this.clearGameView();
        if (this.sceneModel) {
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                // 直接发送游戏完成请求，不处理弹窗逻辑
                // 直接向服务器发送请求，但不处理回调
                let self = this;
                let trainData = SkewersManager.getInstance().getUnCompleteGameData();
                let _boo = trainData.type != SkewersGameType.Calculator;
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


    nextHandler() {
        super.nextHandler(this);
    }


    exitCallBack(context: any): void {
        super.exitCallBack(context);
    }

    /**
     * 返回应用大厅
     */
    quitGame() {
        // console.log("返回大厅")
        this._pause = true;
        // this.pauseTime();
        this.setGamePause(true);
        this.fishs.forEach(fish => {
            fish.curTween.stop();
            fish.curTween = null;
        });
        super.quitGame({ parentNode: this.mainView, context: this });
    }

    resumeCallBack(context) {
        context.setGamePause(false);
        context.fishs.forEach(fish => {
            context.moveFishes(fish);
        });
        context._pause = false;
        super.resumeCallBack(context);
    }

    onTimerEnd() {
        // 如果游戏已经结束，不再执行倒计时逻辑
        if (this._gameEnded) {
            return;
        }
        super.onTimerEnd();
        this.playFail();
        // 保存错题
        this.saveWrongQuestions();

        if (this.wangCount !== this.wangMaxCount) {
            this._gameEnded = true;
            this.clearGameView(); // 游戏失败时也立即停止所有鱼和动画
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                //上报数据
                this._requestSkewersGameComplete();
            } else {
                this._requestGameCenterComplete();
                (this.sceneModel as any).showFailView();
            }
        }
    }

    public resumeTime() {
        this._clearBoo = false;
        super.resumeTime();
    }


    public clearGameView() {
        super.clearGameView();
        this._clearBoo = true;
        this._gameEnded = true; // 确保游戏彻底结束
        if (this._wangTween) {
            this._wangTween.stop();
            this._wangTween = null;
        }

        // 停止所有动画
        Tween.stopAll();
        this._fishTweens.forEach(tween => {
            if (tween) {
                tween.stop();
            }
        });
        this._fishTweens = [];

        EventManager.getInstance().off(Fish.FishClick, this);

        // 停止所有鱼的动画并移除
        if (this.fishs && this.fishParentNode) {
            let len = this.fishs.length;
            for (let i: number = 0; i < len; i++) {
                let fish = this.fishs[i];
                if (fish) {
                    if (fish.curTween) {
                        fish.curTween.stop();
                        fish.curTween = null;
                    }
                    // 确保鱼节点存在且有效
                    const fishNode = fish.getFishNode();
                    if (fishNode && fishNode.isValid && this.fishParentNode.isValid) {
                        if (fishNode.parent === this.fishParentNode) {
                            this.fishParentNode.removeChild(fishNode);
                        }
                    }
                    fish = null;
                }
            }
            this.fishs = [];
        }
    }

    // ================== 捕鱼游戏逻辑 ===================


    startGame() {
        this.customsSendDataState = false;
        this._clearBoo = false;
        this._gameEnded = false; // 重置游戏结束标志

        // 确保鱼群动画重置并启动
        this.resetAndStartFishMovement();

        this._startTime = TimeUtil.getNow();
        // this.gameBeforeView.active = false;
        // this.gameStartView.active = true;
        this.wangCount = 0;
        // 清空错题列表
        this.clearWrongQuestions();

        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.curHard = (this.sceneModel as any).difficulty;
            this.hardIndex = this.hards.indexOf(this.curHard);
            switch (this.curHard) {
                case 1:
                    //this.wangMaxCount = 4;
                    break;
                case 2:
                    //this.wangMaxCount = 4;
                    break;
                case 3:
                    //this.wangMaxCount = 4;
                    break;
            }
            let skewersGameData = (this.sceneModel as any).game;
            this.progressBar.progress = skewersGameData.progress;
            this.guankaLabel.string = "第" + skewersGameData.progressStr + "关";

        } else {
            let level = (this.sceneModel as any).level;
            this.curHard = (this.sceneModel as any).difficulty;
            this.hardIndex = this.hards.indexOf(this.curHard);
            this.progressBar.progress = 1;
            this.guankaLabel.string = "第" + level + "关";
            // if(this.hardIndex == -1){
            //     this.hardIndex =((this.sceneModel as any).level % 3 == 0?3:(this.sceneModel as any).level % 3)-1;
            // }
            // if (win) {
            //     this.curHard = this.hards[this.hardIndex];
            // } else {
            //     if (this.hardIndex == this.hards.length - 1) {
            //         this.hardIndex = 0;
            //     } else {
            //         this.hardIndex++;
            //     }
            //     this.curHard = this.hards[this.hardIndex];
            // }
        }


       this.initResultNode();

        // this.catchLabel.getComponent(Label).string = `${this.wangCount}/${this.wangMaxCount}`;
        this.timeInit();
        this.createFish();

        if(!this.bgmClip){
            this.bgmClip = this.playBgmAudio("music/fishBG",true);
        }
    }

    private initResultNode(){
        for (let j = 0; j < this.resultNode.children.length; j++) {
            let children = this.resultNode.children[j].getChildByName("right");
            children.active = false;
            if (j >= this.wangMaxCount) {
                this.resultNode.children[j].active = false;
            }
        }
    }
    private bgmClip:AudioClip;



    // 初始化鱼群运动
    startFishMovement() {
        try {
            if (this.fishes1 && this.fishes1.isValid) {
                this.setupFishGroup(this.fishes1, true, this._moveSpeeds.leftToRight);
            }

            if (this.fishes2 && this.fishes2.isValid) {
                this.setupFishGroup(this.fishes2, false, this._moveSpeeds.rightToLeft);
            }

            if (this.fishes3 && this.fishes3.isValid) {
                this.setupFishes3Float();
            }
        } catch (e) {
            console.error("启动鱼群动画时发生错误:", e);
        }
    }

    private setupFishGroup(fishNode: Node, startFromLeft: boolean, speed: number) {
        // 初始位置和方向
        const startX = startFromLeft ? -this._sceneWidth / 2 : this._sceneWidth / 2;
        fishNode.setPosition(startX, fishNode.position.y);
        fishNode.scale = new Vec3(startFromLeft ? 1 : -1, 1, 1);

        // 生成随机波动参数
        const waveParams = {
            offset: Math.random() * 1000,
            amplitude: this._waveConfig.amplitude * (0.8 + Math.random() * 0.4)
        };

        this.createFishMotion(fishNode, startFromLeft, speed, waveParams);
    }

    private createFishMotion(fishNode: Node, movingRight: boolean, speed: number, waveParams: any) {
        const targetX = movingRight ? this._sceneWidth / 2 : -this._sceneWidth / 2;
        const distance = Math.abs(targetX - fishNode.position.x);
        const duration = distance / speed;

        const motionTween = tween(fishNode)
            .to(duration, {
                position: new Vec3(targetX, fishNode.position.y, fishNode.position.z)
            }, {
                onUpdate: (target: Node) => {
                    if (this._isPaused) {
                        motionTween.stop();
                        return;
                    }
                    // Y轴波动计算
                    const waveY = Math.sin(Date.now() * this._waveConfig.frequency + waveParams.offset) * waveParams.amplitude;
                    target.position = new Vec3(
                        target.position.x,
                        fishNode.position.y + waveY,
                        target.position.z
                    );
                },
                onComplete: () => {
                    // 翻转方向并继续运动
                    fishNode.scale = new Vec3(movingRight ? -1 : 1, 1, 1);
                    waveParams.offset = Date.now() * this._waveConfig.frequency; // 重置波动相位
                    this.createFishMotion(fishNode, !movingRight, speed, waveParams);
                }
            })
            .start();

        this._fishTweens.push(motionTween);
    }

    /**
     * 设置fishes3的上下缓动动画
     */
    private setupFishes3Float() {
        if (!this.fishes3 || !this.fishes3.isValid) {
            return;
        }

        // 基准y坐标为200
        const baseY = 200;
        const upY = baseY + this._fishes3Config.amplitude;
        const downY = baseY - this._fishes3Config.amplitude;

        const floatTween = tween(this.fishes3)
            .to(this._fishes3Config.duration, { 
                position: new Vec3(this.fishes3.position.x, upY, this.fishes3.position.z) 
            }, { 
                easing: this._fishes3Config.easeType 
            })
            .to(this._fishes3Config.duration, { 
                position: new Vec3(this.fishes3.position.x, downY, this.fishes3.position.z) 
            }, { 
                easing: this._fishes3Config.easeType 
            })
            .call(() => {
                // 循环动画
                if (!this._isPaused && !this._gameEnded) {
                    this.setupFishes3Float();
                }
            })
            .start();

        this._fishTweens.push(floatTween);
    }

    // 暂停/恢复控制
    setGamePause(isPaused: boolean) {
        this._isPaused = isPaused;
        if (isPaused) {
            this._fishTweens.forEach(tween => tween.stop());
        } else {
            this._fishTweens.forEach(tween => tween.start());
        }

    }


    private createFish(count: number = 1) {
        if (this._gameEnded) return; // 游戏结束不再创建鱼
        if (this.fishParentNode && this.fishPrefab) {
            if (!this.hasGuide) {
                if (this.sceneModel.hasGuide) {
                    count = 1;
                }
            }
            let len = count;
            this._guideIndex = 0;
            let datas = [];
            for (let i = 0; i < len; i++) {
                if (this._gameEnded) break; // 游戏结束不再创建
                let fish = new Fish(this.fishPrefab);
                fish.positionYIndex = len == 1 ? 1 : Math.floor(Math.random() * this.fishYs.length);
                fish.setParent(this.fishParentNode);
                this.randomFish(fish);
                this.fishs.push(fish);
                this.moveFishes(fish, i * SHOOT_INTERVAL);
                if (i == 0 || i == 2) {
                    datas.push({ root: this.node, fish: fish, wang: this._wangPosList[fish.currentIndex] });
                }
                this._curFish = fish;
            }
        }
    }

    private fishYs: number[] = [-160, -60, 60, 160];
    public hasGuide: boolean = false;
    private randomFish(fish: Fish) {
        if (this._clearBoo) {
            return;
        }
        let x = 800;
        let y = this.fishYs[fish.positionYIndex];

        if (this.sceneModel.hasGuide) {
            if (!this.hasGuide) {
                x = (this._leftSceneX + 540) / 2;
            }
        }
        let spriteFramelen = this.spriteFrames.length;

        let index = Math.floor(Math.random() * spriteFramelen);

        this._guideIndex = 1;

        let spriteFrame = this.spriteFrames[index];

        fish.setPosition(x, y);
        fish.setScale(1);
        DebugLog.instance.log(`create ---- ${fish.position}`)

        fish.setSpriteFrame(spriteFrame);

        fish.pause = false;

        // 从可用问题中随机选择一个
        let self = this;
        CreateQuestion.create(this.curHard).then((question) => {
            EventManager.getInstance().off(Fish.FishClick, self);
            EventManager.getInstance().on(Fish.FishClick, self.selectFish, self);
            fish.setQuestion(question);
            fish.clickHandler();
        });
    }

    private selectFish(fish, context) {
        // if (context.hasWangClick) {
        //     // DebugLog.instance.log("已经有网飞出来")
        //     return;
        // }
        // if (context._curFish) {
        //     context._curFish.setSelect(context.unSelectColor, 1);
        // }

        context._curFish = fish;
        // DebugLog.instance.log("选中鱼currentIndex",fish.currentIndex);
        let data = fish.getData();

        let options = data.options;

        let len = options.length;

        for (let i = 0; i < len; i++) {

            let answer = options[i];

            let wangNode = context.wangs[i];

            let label = wangNode.getChildByName('Label').getComponent(Label);

            label.string = answer;
        }
        context._curFish.setSelect(context.selectColor, 1.3);
        for (let i = 0; i < len; i++) {
            this.unSelectWang(i);
        }
    }

    private _offsetX :number = 900;
    private _offsetX1:number = 1200;
    moveFishes(fish: Fish, delay: number = 0) {
        if (this._gameEnded) return; // 游戏结束不再移动鱼
        if (fish.curTween) {
            fish.curTween.stop();
            fish.curTween = null;
        }

        let self = this;
        const upDistance = 8; // 上下浮动的距离+
        const duration = (20 * (1600 - Math.abs(800 - fish.position.x))) / 1600; // 每次往返的时间(根据鱼的当前点x坐标动态计算时间)
        DebugLog.instance.log("pause duration:" + duration);
        // 定义上下移动的幅度（即上下移动的范围大小），可根据实际需求调整
        const floatAmplitude = 0.08;
        const phase = 0; // The initial phase of the wave
        let pause = false;
        // 使用 tween 创建运动效果
        if (this.sceneModel.hasGuide) {
            if (!this.hasGuide) {
                // 串烧引导流程
                fish.curTween = tween(fish)
                    // 对当前鱼对象进行 tween 动画
                    .delay(delay)// 每个对象延迟4秒开始
                    .to(duration, { position: new Vec3(-600, fish.position.y, fish.position.z) },
                        {
                            onUpdate: () => {
                                if (fish.pause) {
                                    fish.curTween.stop();
                                    return;
                                }
                                if (self._clearBoo) return;
                                if (this.sceneModel.gameType != GameType.SKEWERS) {
                                    if ((self.sceneModel as any).settleMentPanelShow) {
                                        return;
                                    }
                                }
                                const y = upDistance * Math.sin(floatAmplitude * fish.position.x + phase);
                                const newPosition = new Vec3(fish.position.x, fish.position.y + y, fish.position.z);
                                fish.setPosition(newPosition.x, newPosition.y);
                                if (self.hasGuide) {
                                    return;
                                }
                                // 脑力保健才有引导
                                // ||(Global.isSkewersGame && Global.userData.curSkewerGameData && Global.userData.curSkewerGameData.getCurTrainData()&&Global.userData.curSkewerGameData.getCurTrainData().hasGuide == true)
                                if ((this.sceneModel.hasGuide && this.sceneModel.gameType != GameType.SKEWERS)) {
                                    if (fish.position.x <= (self._leftSceneX + 540) / 2 && fish.positionYIndex == self._guideIndex) {
                                        self.hasGuide = true;
                                        EventManager.getInstance().on(CatchFishGuide.GUIDECLICK, self.guideClick.bind(self), self);
                                        fish.pause = true;
                                        self.isGuide = true;
                                        self._curFish = fish;
                                        GuideManager.getInstance().start(CatchFishGuide.NAME, { root: this.node, fish: fish, wang: self.wangs });
                                        // 这里暂停tween
                                    }
                                }
                            }
                        }
                    )
                    .call(() => {
                        fish.pause = false;
                        if (this.sceneModel.gameType != GameType.SKEWERS) {
                            if ((self.sceneModel as any).settleMentPanelShow) {
                                return;
                            }
                        }
                        if (self._clearBoo) return;
                        if (fish == self._curFish) {
                            self.clearWangNubmer();
                            self._curFish = null;
                        }
                        self.randomFish(fish);
                        self.moveFishes(fish, SHOOT_INTERVAL);
                    })
                    .start(); // 启动动画
            } else {
                // 串烧正常流程
                if (this._pause && fish.position.x < this._leftSceneX + this._offsetX) {
                    fish.curTween = tween(fish).to(duration, { position: new Vec3(-600, this.fishYs[fish.positionYIndex], fish.position.z) },
                        {
                            onUpdate: () => {
                                if (self._pause) {
                                    DebugLog.instance.log("pause update")
                                    return;
                                }
                                if (fish.pause) {
                                    fish.curTween.stop();
                                    return;
                                }
                                if (self._clearBoo) return;
                                if (this.sceneModel.gameType != GameType.SKEWERS) {
                                    if ((self.sceneModel as any).settleMentPanelShow) {
                                        return;
                                    }
                                }
                                const y = upDistance * Math.sin(floatAmplitude * fish.position.x + phase);
                                const newPosition = new Vec3(fish.position.x, fish.position.y + y, fish.position.z);
                                fish.setPosition(newPosition.x, newPosition.y);
                                if (self.hasGuide) {
                                    return;
                                }

                                // 开启引导
                                if (this.sceneModel.hasGuide && this.sceneModel.gameType != GameType.SKEWERS) {
                                    if (fish.position.x <= (self._leftSceneX + 540) / 2 && fish.positionYIndex == self._guideIndex) {
                                        self.hasGuide = true;
                                        EventManager.getInstance().on(CatchFishGuide.GUIDECLICK, self.guideClick.bind(self), self);
                                        fish.pause = true;
                                        self.isGuide = true;
                                        self._curFish = fish;
                                        GuideManager.getInstance().start(CatchFishGuide.NAME, {
                                            root: this.node,
                                            fish: fish,
                                            wang: self.wangs
                                        });
                                        // 这里暂停tween
                                    }
                                }
                            }
                        }
                    )
                        .call(() => {
                            self._pause = false;
                            fish.pause = false;
                            if (this.sceneModel.gameType != GameType.SKEWERS) {
                                if ((self.sceneModel as any).settleMentPanelShow) {
                                    return;
                                }
                            }
                            if (self._clearBoo) return;
                            if (fish == self._curFish) {
                                self.clearWangNubmer();
                                self._curFish = null;
                            }
                            self.randomFish(fish);
                            self.moveFishes(fish, fish.positionYIndex * SHOOT_INTERVAL);
                        })
                        .start();
                } else {
                    fish.curTween = tween(fish)
                        // 对当前鱼对象进行 tween 动画
                        .delay(delay)// 每个对象延迟n秒开始
                        .to(0.5, { position: new Vec3(self._leftSceneX + this._offsetX, fish.position.y, fish.position.z) }, { easing: 'cubicIn' })
                        .call(() => {
                            self.hasWangClick = false;
                            fish.curTween = tween(fish).to(duration, { position: new Vec3(fish.position.x - this._offsetX1, fish.position.y, fish.position.z) },
                                {
                                    onUpdate: () => {
                                        if (fish.pause) {
                                            fish.curTween.stop();
                                            return;
                                        }
                                        if (self._clearBoo) return;
                                        if (this.sceneModel.gameType != GameType.SKEWERS) {
                                            if ((self.sceneModel as any).settleMentPanelShow) {
                                                return;
                                            }
                                        }
                                        const y = upDistance * Math.sin(floatAmplitude * fish.position.x + phase);
                                        const newPosition = new Vec3(fish.position.x, fish.position.y + y, fish.position.z);
                                        fish.setPosition(newPosition.x, newPosition.y);
                                        if (self.hasGuide) {
                                            return;
                                        }
                                        if ((this.sceneModel.hasGuide && this.sceneModel.gameType != GameType.SKEWERS)) {
                                            if (fish.position.x <= (self._leftSceneX + 540) / 2 && fish.positionYIndex == self._guideIndex) {
                                                self.hasGuide = true;
                                                EventManager.getInstance().on(CatchFishGuide.GUIDECLICK, self.guideClick.bind(self), self);
                                                fish.pause = true;
                                                self.isGuide = true;
                                                self._curFish = fish;
                                                GuideManager.getInstance().start(CatchFishGuide.NAME, { root: this.node, fish: fish, wang: self.wangs });
                                                // 这里暂停tween
                                            }
                                        }
                                    }
                                }
                            )
                                .call(() => {
                                    fish.pause = false;
                                    if (this.sceneModel.gameType != GameType.SKEWERS) {
                                        if ((self.sceneModel as any).settleMentPanelShow) {
                                            return;
                                        }
                                    }
                                    if (self._clearBoo) return;
                                    if (fish == self._curFish) {
                                        self.clearWangNubmer();
                                        self._curFish = null;
                                    }
                                    self.randomFish(fish);
                                    self.moveFishes(fish, SHOOT_INTERVAL);
                                })
                                .start();
                        })
                        .start(); // 启动动画
                }
            }
        }
        else {
            if (this._pause && fish.position.x < this._leftSceneX + this._offsetX) {
                fish.curTween = tween(fish).to(duration, { position: new Vec3(-600, this.fishYs[fish.positionYIndex], fish.position.z) },
                    {
                        onUpdate: () => {
                            if (self._pause) {
                                DebugLog.instance.log("pause update")
                                return;
                            }
                            if (fish.pause) {
                                fish.curTween.stop();
                                return;
                            }
                            if (self._clearBoo) return;
                            if (this.sceneModel.gameType != GameType.SKEWERS) {
                                if ((self.sceneModel as any).settleMentPanelShow) {
                                    return;
                                }
                            }
                            const y = upDistance * Math.sin(floatAmplitude * fish.position.x + phase);
                            const newPosition = new Vec3(fish.position.x, fish.position.y + y, fish.position.z);
                            fish.setPosition(newPosition.x, newPosition.y);
                            if (self.hasGuide) {
                                return;
                            }

                            // 开启引导
                            if ((this.sceneModel.hasGuide && this.sceneModel.gameType != GameType.SKEWERS)) {
                                if (fish.position.x <= (self._leftSceneX + 540) / 2 && fish.positionYIndex == self._guideIndex) {
                                    self.hasGuide = true;
                                    EventManager.getInstance().on(CatchFishGuide.GUIDECLICK, self.guideClick.bind(self), self);
                                    fish.pause = true;
                                    self.isGuide = true;
                                    self._curFish = fish;
                                    GuideManager.getInstance().start(CatchFishGuide.NAME, { root: this.node, fish: fish, wang: self.wangs });
                                    // 这里暂停tween
                                }
                            }
                        }
                    }
                )
                    .call(() => {
                        self._pause = false;
                        fish.pause = false;
                        if (this.sceneModel.gameType != GameType.SKEWERS) {
                            if ((self.sceneModel as any).settleMentPanelShow) {
                                return;
                            }
                        }
                        if (self._clearBoo) return;
                        if (fish == self._curFish) {
                            self.clearWangNubmer();
                            self._curFish = null;
                        }
                        self.randomFish(fish);
                        self.moveFishes(fish, fish.positionYIndex * SHOOT_INTERVAL);
                    })
                    .start();
            } else {
                fish.curTween = tween(fish)
                    // 对当前鱼对象进行 tween 动画
                    .delay(delay)// 每个对象延迟n秒开始
                    .to(0.2, { position: new Vec3(self._leftSceneX + this._offsetX, fish.position.y, fish.position.z) }, { easing: 'cubicIn' })
                    .call(() => {
                        self.hasWangClick = false;
                        fish.curTween = tween(fish).to(duration, { position: new Vec3(fish.position.x - this._offsetX1, fish.position.y, fish.position.z) },
                            {
                                onUpdate: () => {
                                    if (fish.pause) {
                                        fish.curTween.stop();
                                        return;
                                    }
                                    if (self._clearBoo) return;
                                    if (this.sceneModel.gameType != GameType.SKEWERS) {
                                        if ((self.sceneModel as any).settleMentPanelShow) {
                                            return;
                                        }
                                    }
                                    const y = upDistance * Math.sin(floatAmplitude * fish.position.x + phase);
                                    const newPosition = new Vec3(fish.position.x, fish.position.y + y, fish.position.z);
                                    fish.setPosition(newPosition.x, newPosition.y);
                                    if (self.hasGuide) {
                                        return;
                                    }
                                    if ((this.sceneModel.hasGuide && this.sceneModel.gameType != GameType.SKEWERS)) {
                                        if (fish.position.x <= (self._leftSceneX + 540) / 2 && fish.positionYIndex == self._guideIndex) {
                                            self.hasGuide = true;
                                            EventManager.getInstance().on(CatchFishGuide.GUIDECLICK, self.guideClick.bind(self), self);
                                            fish.pause = true;
                                            self.isGuide = true;
                                            self._curFish = fish;
                                            GuideManager.getInstance().start(CatchFishGuide.NAME, { root: this.node, fish: fish, wang: self.wangs });
                                            // 这里暂停tween
                                        }
                                    }
                                }
                            }
                        )
                            .call(() => {
                                fish.pause = false;
                                if (this.sceneModel.gameType != GameType.SKEWERS) {
                                    if ((self.sceneModel as any).settleMentPanelShow) {
                                        return;
                                    }
                                }
                                if (self._clearBoo) return;
                                if (fish == self._curFish) {
                                    self.clearWangNubmer();
                                    self._curFish = null;
                                }

                                // 当鱼游出边界未被回答时，记录为错题
                                const fishData = fish.getData();
                                if (fishData && !fishData.hasChose) {
                                    // 避免重复添加同一个题目
                                    if (!self.wrongQuestions.some(q => q.question === fishData.question)) {
                                        self.wrongQuestions.push(fishData);
                                        console.log("边界错题已保存:", fishData.question);
                                    }
                                }

                                self.randomFish(fish);
                                self.moveFishes(fish, SHOOT_INTERVAL);
                            })
                            .start();
                    })
                    .start(); // 启动动画
            }
        }
    }

    private guideClick(step: number) {
        switch (step) {
            case 1:
                EventManager.getInstance().emit(Fish.FishClick, this._curFish);
                break;
            case 2:
                this.isGuide = false;
                this._wangClick(this._curFish.currentIndex);
                EventManager.getInstance().off(CatchFishGuide.GUIDECLICK, this);
                break;
        }

    }

    update(deltaTime: number) {

    }

    timer: number;
    INIT_TIME = 120;
    timeInit() {
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.timer = (this.sceneModel as any).game.timeLimit;
        } else {
            this.timer = this.INIT_TIME;
        }
        this.startTime(this.timer);
    }

    rePlayGame() {
        this.bgmClip = null;
        this.customsSendDataState = true;
        this._gameEnded = false; // 重置游戏结束标志
        this._clearBoo = false;
        this._pause = false; // 重置暂停状态
        this.hasGuide = false; // 重置引导状态
        this.isGuide = false; // 重置引导状态
        this.hasWangClick = false; // 重置网点击状态
        Global.isAgain = true;
        this.clearGameView();
        // 重新设置游戏状态，因为clearGameView会设置_gameEnded为true
        this._gameEnded = false;
        this._clearBoo = false;
        this._startTime = TimeUtil.getNow();
        this.wangCount = 0;
        // 清空错题列表
        this.clearWrongQuestions();

        this.initResultNode();
        // this.catchLabel.getComponent(Label).string = `${this.wangCount}/${this.wangMaxCount}`;
        this.timeInit();

        // 重置并重启鱼群背景动画
        this.resetAndStartFishMovement();

        this.createFish();
        if(!this.bgmClip){
            this.bgmClip = this.playBgmAudio("music/fishBG",true);
        }
    }

    private _wangTween;
    wangClick(event, data) {
        // 如果当前鱼不存在|已经点击过了|处于引导状态 则返回
        if (this._curFish && !this.hasWangClick && !this.isGuide) {
            this._wangClick(data);
        }
    }

    private _guideIndex = -1;
    private _wangClick(data) {
        this.hasWangClick = true;
        // 遍历wangs数组
        let index = Number(data);
        let len = this.wangs.length;

        if (index !== this._curFish.currentIndex) {
            for (let i = 0; i < len; i++) {
                // 如果当前索引等于传入的索引，则调用selectWang方法
                if (i == index) {
                    // console.log("点击了第" + i + "个网");
                    // this._curFish.setSelect(this.unSelectColor, 1);
                    this.errorClick(i);
                    return;
                } else {
                    // 否则调用unSelectWang方法
                    this.unSelectWang(i);
                }
            }
            // this.hasWangClick = false;
            return;
        }
        for (let i = 0; i < len; i++) {
            this.unSelectWang(i);
        }

        this.clearWangNubmer();
        if (this._curFish.position.x < this._leftSceneX) {
            // this.hasWangClick = false;
            return;
        }
        this._curFish.curTween.stop();
        let wangPrefab = instantiate(this.wangPrefab);
        wangPrefab.setWorldScale(new Vec3(0.5, 0.5, 0.5));
        // 获取当前索引对应的wang
        let wang = this.wangs[index];
        // 将wangPrefab添加到wang的子节点中
        wang.addChild(wangPrefab);
        wangPrefab.setPosition(new Vec3(0, 0, 0));
        // wang.setPosition(new Vec3(0, 0, 0));
        // 游戏过程数据匹配
        this.sceneModel.gameMatch();

        let self = this;// -600.-520.-440.-360
        let offsetX = this._curFish.currentIndex * 10 + 550;
        let offsetTime = this._curFish.positionYIndex * 0.01;
        let fishWorldPos = self._curFish.getFishNode().parent.getComponent(UITransform).convertToWorldSpaceAR(this._curFish.position);
        let wangWorldPos = wang.getComponent(UITransform).convertToWorldSpaceAR(wangPrefab.position);
        let question = this._curFish.getData();
        // 标记题目为已回答
        question.hasChose = true;

        if (this._wangTween) this._wangTween.stop();
        // 启动动画
        this._wangTween = tween(wangPrefab).parallel(
            tween().to(0.4 - offsetTime, { scale: new Vec3(3, 3, 3) }, { easing: 'bounceIn' }),
            tween().to(0.25 - offsetTime, { position: new Vec3(fishWorldPos.x - wangWorldPos.x, fishWorldPos.y - 500, fishWorldPos.z) }))
            .call(() => {
                self._curFish.curTween.stop();
                const scaleUp = 1.3; // 放大到2倍
                const scaleDown = 1.0; // 恢复到原始大小
                const duration = 0.06; // 每次放大和缩小的时长
                self.playAudio("music/fishCatch", true);
                tween(self._curFish.getFishNode())
                    .to(duration, { scale: new Vec3(scaleUp, scaleUp, scaleUp) }, { easing: 'bounceOut' }) // 放大
                    .delay(0.1)
                    .to(duration, { scale: new Vec3(scaleDown, scaleDown, scaleDown) }, { easing: 'bounceOut' }) // 缩小
                    .delay(0.1)
                    .to(duration, { scale: new Vec3(scaleUp, scaleUp, scaleUp) }, { easing: 'bounceOut' }) // 再次放大
                    .delay(0.1)
                    .to(duration, { scale: new Vec3(scaleDown, scaleDown, scaleDown) }, { easing: 'bounceOut' }) // 再次缩小
                    .call(() => {
                        self._wangTween.stop();
                        self._wangTween = null;
                        // self.hasWangClick = false;
                        // 移除wangPrefab
                        wang.removeChild(wangPrefab);
                        if (self._clearBoo) return;
                        self.wangCount++;
                        self.showResultRightEffect(self.wangCount-1);
                        // self.catchLabel.getComponent(Label).string = `${self.wangCount}/${self.wangMaxCount}`;
                        if (self.wangCount == self.wangMaxCount) {
                            self.endCurHardGame();
                        }
                        if (self.hasGuide && self.fishs.length <= 1) {
                            if (this._wangTween) {
                                this._wangTween.stop();
                                this._wangTween = null;
                            }
                            // Tween.stopAll();
                            EventManager.getInstance().off(Fish.FishClick, this);

                            if (this.fishs) {
                                let len = this.fishs.length;
                                for (let i: number = 0; i < len; i++) {
                                    let fish = this.fishs[i];
                                    if (fish) {
                                        if (fish.curTween) {
                                            fish.curTween.stop();
                                            fish.curTween = null;
                                        }
                                        this.fishParentNode.removeChild(fish.getFishNode());
                                        fish = null;
                                    }
                                }
                                this.fishs = [];
                            }
                            self._curFish = null;
                            if (!self._clearBoo) self.createFish();
                        } else {
                            // 设置当前鱼为选中状态
                            self._curFish.setSelect(self.unSelectColor, 1);
                            // 随机生成鱼
                            self.randomFish(self._curFish);
                            // 移动鱼
                            if (!self._pause) self.moveFishes(self._curFish, SHOOT_INTERVAL);

                            self._curFish = null;
                        }


                    })
                    .start();
            })
            .start(); // 启动动画


    }
    clearWangNubmer() {
        for (let i = 0; i < 4; i++) {

            let wangNode = this.wangs[i];

            let label = wangNode.getChildByName('Label').getComponent(Label);

            label.string = '?';
        }
    }

    private async endCurHardGame() {
        this._gameEnded = true; // 设置游戏结束标志
        this.pauseTime(); // 停止倒计时
        this.clearGameView(); // 停止所有鱼和动画，确保结算面板弹出时鱼不再游动
        this.playAudio("music/win",true);
        // 保存错题
        this.saveWrongQuestions();

        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this._requestSkewersGameComplete();
        } else {
            if (!this.customsSendDataState) {
                this._requestGameCenterComplete();
            }
            this.customsSendDataState = true;
            await this.showAllResultRightAndSettle();
        }
    }

    private _startTime: number = 0
    private _endTime: number = 0;

    private _requestSkewersGameComplete() {
        this._endTime = TimeUtil.getNow();
        let complete = this.wangCount / this.wangMaxCount;
        let duration = (this._endTime - this._startTime) / 1000;
        this.requestGameComplete({ context: this, parentNode: this.mainView, complete, duration});
    }

    private _requestGameCenterComplete() {
        const curGame = (this.sceneModel as any).game;
        this._endTime = TimeUtil.getNow();
        let level = curGame.level;
        let complete = this.wangCount / this.wangMaxCount;
        let duration = (this._endTime - this._startTime) / 1000;
        this.requestGameComplete({
            sessionId: curGame.sessionid,
            count: this.wangCount,
            level,
            complete,
            duration,
            timelimit: this.INIT_TIME,
            difficulty: this.hards[this.hardIndex],
            levelMode:curGame.levelMode
        });
    }

    // ui挂载得点击事件
    private nextGame() {
        Tween.stopAll();
        this.sceneModel.runNextGame();
    }

    private _nextGame() {
        this.bgmClip = null;
        this.startGame(); // 开始下一关
    }

    private selectWang(index: number) {
        let wang = this.wangs[index];
        wang.getComponent(Sprite).color = this.selectColor;
    }

    private unSelectWang(index: number) {
        let wang = this.wangs[index];
        wang.getComponent(Sprite).color = this.unSelectColor;
    }

    private errorClick(i: number) {
        let self = this;
        let wang = this.wangs[i];
        wang.getComponent(Sprite).color = this.ErrorColor;
        if (this._curFish.curTween) {
            this._curFish.curTween.stop();
            this._curFish.curTween = null;
        }

        // 保存答错的题目
        const question = this._curFish.getData();
        // 避免重复添加同一个题目
        if (!this.wrongQuestions.some(q => q.question === question.question)) {
            this.wrongQuestions.push(question);
            console.log("错题已保存:", question.question);
        }

        this._curFish.curTween = tween(this._curFish)
            .to(0.8, { position: new Vec3(self._leftSceneX - 300, self._curFish.position.y, self._curFish.position.z) }, { easing: "sineOut" })
            .call(() => {
                // self.hasWangClick = false;
                self.unSelectWang(i);
                self._curFish.pause = false;
                if (this.sceneModel.gameType != GameType.SKEWERS) {
                    if ((self.sceneModel as any).settleMentPanelShow) {
                        return;
                    }
                }
                if (self._clearBoo) return;
                self.clearWangNubmer();
                self._curFish.curTween.stop();
                self._curFish.curTween = null;
                self.randomFish(self._curFish);
                self.moveFishes(self._curFish, SHOOT_INTERVAL);
            })
            .start(); // 启动动画
    }

    // 获取错题列表
    public getWrongQuestions(): FishQuestion[] {
        return this.wrongQuestions;
    }

    // 清空错题列表
    public clearWrongQuestions(): void {
        this.wrongQuestions = [];
    }

    // 保存错题到本地存储
    private saveWrongQuestions(): void {
        // 不再保存到localStorage，只在当前游戏中使用
        console.log(`当前游戏中有${this.wrongQuestions.length}个错题`);
    }

    public onClickRetryGame() {
        this.rePlayGame();
    }


    onclickContinue() {
        (this.sceneModel as any).dzanswerHandler(this);
    }


    // 显示订正界面
    public onClickShowAnswer(): void {
        super.onClickShowAnswer();

        // 暂停鱼群动画
        this._isPaused = true;
        this._fishTweens.forEach(tween => tween.stop());

        // 如果有鱼的动画正在进行，也需要停止
        if (this.fishs) {
            this.fishs.forEach(fish => {
                if (fish && fish.curTween) {
                    fish.curTween.stop();
                    fish.pause = true;
                }
            });
        }

        // 显示订正界面
        this.answerView.active = true;

        // 使用当前游戏中累积的错题
        const wrongQuestions = this.wrongQuestions;

        // 取最后5道错题
        const questionsToShow = wrongQuestions.slice(-5);

        // 显示到answerNodes上
        let len = Math.min(questionsToShow.length, this.answerNodes.length);
        for (let i = 0; i < len; i++) {
            const node = this.answerNodes[i];
            node.active = true;

            // 获取题目和答案
            const question = questionsToShow[i];

            // 直接获取节点上的label组件并设置文本
            const label = node.getChildByName("label").getComponent(Label);
            if (label) {
                // 显示题目和正确答案
                label.string = `${question.question} = ${question.correctAnswer}`;
            }
        }

        // 如果错题不足5道，隐藏多余的节点
        for (let i = len; i < this.answerNodes.length; i++) {
            this.answerNodes[i].active = false;
        }
    }

    // // 关闭订正界面并恢复动画
    // public onClickCloseAnswer(): void {
    //     // 关闭订正界面
    //     this.answerView.active = false;

    //     // 恢复鱼群动画
    //     this._isPaused = false;

    //     // 重置并重启鱼群背景动画
    //     this.resetAndStartFishMovement();

    //     // 恢复鱼的动画
    //     if (this.fishs) {
    //         this.fishs.forEach(fish => {
    //             if (fish) {
    //                 fish.pause = false;
    //                 // 如果鱼没有动画，重新创建动画
    //                 if (!fish.curTween) {
    //                     this.moveFishes(fish, 0);
    //                 } else {
    //                     // 如果有动画，继续执行
    //                     fish.curTween.start();
    //                 }
    //             }
    //         });
    //     }
    // }

    // 重置并重启鱼群背景动画
    private resetAndStartFishMovement(): void {
        // 停止所有现有的鱼群动画
        this._fishTweens.forEach(tween => {
            if (tween) {
                tween.stop();
            }
        });
        this._fishTweens = [];
        this._isPaused = false;

        // 确保背景鱼群节点存在且有效
        if (this.fishes1 && this.fishes2 && this.fishes1.isValid && this.fishes2.isValid) {
            try {
                // 重置鱼群位置和状态
                this.fishes1.setPosition(new Vec3(-this._sceneWidth / 2, this.fishes1.position.y, this.fishes1.position.z));
                this.fishes1.scale = new Vec3(1, 1, 1);

                this.fishes2.setPosition(new Vec3(this._sceneWidth / 2, this.fishes2.position.y, this.fishes2.position.z));
                this.fishes2.scale = new Vec3(-1, 1, 1);

                // fishes3重置y坐标
                if (this.fishes3 && this.fishes3.isValid) {
                    // y坐标重置为200
                    this.fishes3.setPosition(new Vec3(this.fishes3.position.x, 200, this.fishes3.position.z));
                }

                // 重新启动鱼群动画
                this.startFishMovement();
            } catch (e) {
                console.error("重置鱼群动画时发生错误:", e);
            }
        }
    }

    onDestroy() {
        // 确保在组件销毁前清理所有资源
        if (this._wangTween) {
            this._wangTween.stop();
            this._wangTween = null;
        }

        // 停止所有鱼群动画
        if (this._fishTweens) {
            this._fishTweens.forEach(tween => {
                if (tween) {
                    tween.stop();
                }
            });
            this._fishTweens = [];
        }

        // 停止所有鱼的动画
        if (this.fishs) {
            this.fishs.forEach(fish => {
                if (fish && fish.curTween) {
                    fish.curTween.stop();
                    fish.curTween = null;
                }
            });
        }

        // 停止背景音乐
        if (this.bgmClip) {
            this.bgmClip = null;
        }

        // 解除事件监听
        EventManager.getInstance().off(Fish.FishClick, this);
        EventManager.getInstance().off(CatchFishGuide.GUIDECLICK, this);

        // 调用父类的onDestroy方法
        super.onDestroy();
    }


    onSuccessNextLevel(): void {
        this.nextGame();
    }

    onFailNextLevel(): void {
        this.nextGame();
    }

    onAgain(): void {
        this.rePlayGame();
    }

    public showResultRightEffect(index: number): Promise<void> {
        return new Promise((resolve) => {
            if (index < 0 || index >= this.resultNode.children.length) {
                resolve();
                return;
            }
            let resultNode = this.resultNode.children[index];
            let rightNode = resultNode.getChildByName("right");
            if (rightNode) {
                rightNode.active = true;
                rightNode.scale = new Vec3(0.5, 0.5, 0.5);
                rightNode.opacity = 0;
                tween(rightNode)
                    .to(0.2, { scale: new Vec3(1.2, 1.2, 1), opacity: 255 })
                    .to(0.1, { scale: new Vec3(1, 1, 1) })
                    .call(() => resolve())
                    .start();
            } else {
                resolve();
            }
        });
    }

    public async showAllResultRightAndSettle() {
        const promises = [];
        for (let i = 0; i < this.wangCount; i++) {
            promises.push(this.showResultRightEffect(i));
        }
        await Promise.all(promises);
        // 所有动画完成后再展示结算界面
        (this.sceneModel as any).showSuccessView();
    }
}



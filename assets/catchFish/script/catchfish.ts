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
    Texture2D
} from 'cc';
import { ColorUtil } from '../../scripts/Core/Util/ColorUtil';
import { Fish } from './Fish';
import { EventManager } from "db://assets/scripts/Core/Manager/Event/EventManager";
import { DebugLog } from "db://assets/scripts/Core/Util/DebugLog";
import { TimeUtil } from "db://assets/scripts/Core/Util/TimeUtil";
import { GuideManager } from "db://assets/scripts/Core/Manager/Guide/GuideManager";
import { CatchFishGuide } from "db://assets/scripts/Core/Manager/Guide/game/CatchFishGuide";
import { LoaderManager } from "db://assets/scripts/Core/Manager/Load/LoaderManager";
import {CreateQuestion, FishQuestion} from "db://assets/catchFish/script/createQuestion";
import { GameType, IBaseGameChild } from '../../scripts/Game/GameDataFactory/BaseGameData';
import { BaseScene } from '../../scene/Core/BaseScene';
import { TimerCommonComponent } from '../../scripts/Game/UI/Common/TimerCommonComponent';
import { BundleName } from '../../scripts/Core/Manager/Load/BundleName';

const { ccclass, property } = _decorator;


const SHOOT_INTERVAL = 0.65;
// let questions = [questions0, questions1, questions2];
@ccclass('catchfish')
export class catchfish extends BaseScene<IBaseGameChild> {

    @property(Node)
    viewNode: Node = null;

    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent = null;


    @property(Node)
    gameFailView: Node;

    @property(Node)
    gameSuccessView: Node;

    @property(Node)
    gameBeforeView: Node;

    @property(Node)
    gameStartView: Node;

    // @property(Label)
    // Timer: Label;

    @property([Node])
    wangs: Node[] = [];

    @property([SpriteFrame])
    spriteFrames: SpriteFrame[] = [];

    @property([Node])
    stars: Node[] = [];

    @property(Label)
    catchLabel: Label;

    @property(Node)
    fishParentNode: Node;

    @property(Prefab)
    fishPrefab: Prefab;

    @property(Prefab)
    wangPrefab: Prefab;

    @property(Node)
    mask: Node = null;

    @property(Node)
    logoNode: Node = null;

    @property(Node)
    fishes1: Node = null;

    @property(Node)
    fishes2: Node = null;

    private selectColor = ColorUtil.hexToColor("#3AEB0E");
    private unSelectColor = ColorUtil.hexToColor("#FFFFFF");
    private ErrorColor = ColorUtil.hexToColor("#FC0505");

    private fishs: Fish[];
    private _curFish: Fish;
    private wangMaxCount: number = 4;
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

    // ====================== 继承basescene ===================
    onLoad() {
        this.audioUrls = ["music/fishCatch", "music/win"];
        this.bundleName = BundleName.CATCHFISH;
        this.mask.scale = v3(0, 1, 1);
        tween(this.mask)
            .to(0.4, { scale: v3(1, 1, 1) }, { easing: 'quadOut' })
            .call(() => {
            })
            .start();
        this.loadAudio().then();
    }


    start() {
        super.start();
        let logoSprite = this.logoNode.getComponent(Sprite);
        if (this.sceneData.gameType == GameType.SKEWERS) {
            LoaderManager.getInstance().resourcesLoadFrame("texture/game/logo/judgment").then((spiteFrame) => {
                logoSprite.spriteFrame = spiteFrame;
            });
        } else {
            LoaderManager.getInstance().loadABRes("texture/page1_start/logo", this.bundleName).then((res) => {
                const texture = new Texture2D();
                texture.image = res;
                const spriteFrame = new SpriteFrame();
                spriteFrame.texture = texture;
                logoSprite.spriteFrame = spriteFrame;
            });
        }
        const scene = director.getScene();
        const canvas = scene.getComponentInChildren(Canvas);
        const uitransform = canvas.getComponent(UITransform);
        this._leftSceneX = -uitransform.width / 2 - 80;
        this.fishs = [];
        if (this.sceneData.gameType == GameType.SKEWERS) {
            this.gameBeforeView.active = false;
            this.sceneData.runNextGame = this.startGame.bind(this);
            this.sceneData.runNextGame();
        } else {
            this.gameBeforeView.active = true;
            this.sceneData.runNextGame = this._nextGame.bind(this);
        }
    }

    onEnable(): void {
        super.onEnable();
    }

    onDisable() {
        super.onDisable();
        EventManager.getInstance().disableContext(this);
    }


    // ===== 最后一个串烧游戏失败后，弹窗继续得回调 =====
    failCompleteHandler() {
        super.failCompleteHanlder(this);
    }

    goonHandler() {
        this.node.active = false;
        super.goonHandler(this);
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
        super.quitGame({ parentNode: this.viewNode, context: this });
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
        super.onTimerEnd();
        if (this.wangCount !== this.wangMaxCount) {
            if (this.sceneData.gameType == GameType.SKEWERS) {
                //上报数据
                this._requestSkewersGameComplete();
            } else {
                this._requestGameCenterComplete();
                this.gameFailView.active = true;
                this.updateSuccessPopupStar(this.curHard);
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
        if (this._wangTween) {
            this._wangTween.stop();
            this._wangTween = null;
        }

        Tween.stopAll();
        EventManager.getInstance().off(Fish.FishClick, this);

        // this.resetQuestions();
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
    }

    // ================== 捕鱼游戏逻辑 ===================


    startGame(win: number = 1) {
        this.customsSendDataState = false;
        this._clearBoo = false;
        this.startFishMovement();
        this._startTime = TimeUtil.getNow();
        this.gameBeforeView.active = false;
        this.gameStartView.active = true;
        this.wangCount = 0;
        if (this.sceneData.gameType == GameType.SKEWERS) {
            this.curHard = (this.sceneData as any).difficulty;
            this.hardIndex = this.hards.indexOf(this.curHard);
            switch (this.curHard) {
                case 1:
                    this.wangMaxCount = 4;
                    break;
                case 2:
                    this.wangMaxCount = 4;
                    break;
                case 3:
                    this.wangMaxCount = 4;
                    break;
            }
        } else {
            if (win) {
                this.curHard = this.hards[this.hardIndex];
            } else {
                if (this.hardIndex == this.hards.length - 1) {
                    this.hardIndex = 0;
                } else {
                    this.hardIndex++;
                }
                this.curHard = this.hards[this.hardIndex];
            }
        }
        this.catchLabel.getComponent(Label).string = `${this.wangCount}/${this.wangMaxCount}`;
        this.timeInit();
        this.createFish();
    }



    // 初始化鱼群运动
    startFishMovement() {
        this.setupFishGroup(this.fishes1, true, this._moveSpeeds.leftToRight);
        this.setupFishGroup(this.fishes2, false, this._moveSpeeds.rightToLeft);
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
        if (this.fishParentNode && this.fishPrefab) {
            if (!this.hasGuide) {
                if (this.sceneData.hasGuide) {
                    count = 1;
                }
            }
            let len = count;
            this._guideIndex = 0;
            let datas = [];
            for (let i = 0; i < len; i++) {
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

    private fishYs: number[] = [-450, -150, 150, 450];
    public hasGuide: boolean = false;
    private randomFish(fish: Fish) {
        if (this._clearBoo) {
            return;
        }
        let x = 800;
        let y = this.fishYs[fish.positionYIndex];

        if (this.sceneData.hasGuide) {
            if (!this.hasGuide) {
                x = (this._leftSceneX + 540) / 2;
            }
        }
        let spriteFramelen = this.spriteFrames.length;

        let index = Math.floor(Math.random() * (spriteFramelen - 1));

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

    moveFishes(fish: Fish, delay: number = 0) {
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
        if (this.sceneData.hasGuide) {
            if (!this.hasGuide) {
                // 串烧引导流程
                fish.curTween = tween(fish)
                    // 对当前鱼对象进行 tween 动画
                    .delay(delay)// 每个对象延迟4秒开始
                    .to(duration, { position: new Vec3(-800, fish.position.y, fish.position.z) },
                        {
                            onUpdate: () => {
                                if (fish.pause) {
                                    fish.curTween.stop();
                                    return;
                                }
                                if (self._clearBoo) return;
                                if (this.sceneData.gameType != GameType.SKEWERS) {
                                    if (self.gameSuccessView.active || self.gameFailView.active) {
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
                                if ((this.sceneData.hasGuide && this.sceneData.gameType != GameType.SKEWERS)) {
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
                        if (this.sceneData.gameType != GameType.SKEWERS) {
                            if (self.gameSuccessView.active || self.gameFailView.active) {
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
                if (this._pause && fish.position.x < this._leftSceneX + 1080) {
                    fish.curTween = tween(fish).to(duration, { position: new Vec3(-800, this.fishYs[fish.positionYIndex], fish.position.z) },
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
                                if (this.sceneData.gameType != GameType.SKEWERS) {
                                    if (self.gameSuccessView.active || self.gameFailView.active) {
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
                                if (this.sceneData.hasGuide && this.sceneData.gameType != GameType.SKEWERS) {
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
                            if (this.sceneData.gameType != GameType.SKEWERS) {
                                if (self.gameSuccessView.active || self.gameFailView.active) {
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
                        .to(0.5, { position: new Vec3(self._leftSceneX + 1080, fish.position.y, fish.position.z) }, { easing: 'cubicIn' })
                        .call(() => {
                            self.hasWangClick = false;
                            fish.curTween = tween(fish).to(duration, { position: new Vec3(fish.position.x - 1600, fish.position.y, fish.position.z) },
                                {
                                    onUpdate: () => {
                                        if (fish.pause) {
                                            fish.curTween.stop();
                                            return;
                                        }
                                        if (self._clearBoo) return;
                                        if (this.sceneData.gameType != GameType.SKEWERS) {
                                            if (self.gameSuccessView.active || self.gameFailView.active) {
                                                return;
                                            }
                                        }
                                        const y = upDistance * Math.sin(floatAmplitude * fish.position.x + phase);
                                        const newPosition = new Vec3(fish.position.x, fish.position.y + y, fish.position.z);
                                        fish.setPosition(newPosition.x, newPosition.y);
                                        if (self.hasGuide) {
                                            return;
                                        }
                                        if ((this.sceneData.hasGuide && this.sceneData.gameType != GameType.SKEWERS)) {
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
                                    if (this.sceneData.gameType != GameType.SKEWERS) {
                                        if (self.gameSuccessView.active || self.gameFailView.active) {
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
            if (this._pause && fish.position.x < this._leftSceneX + 1080) {
                fish.curTween = tween(fish).to(duration, { position: new Vec3(-800, this.fishYs[fish.positionYIndex], fish.position.z) },
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
                            if (this.sceneData.gameType != GameType.SKEWERS) {
                                if (self.gameSuccessView.active || self.gameFailView.active) {
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
                            if ((this.sceneData.hasGuide && this.sceneData.gameType != GameType.SKEWERS)) {
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
                        if (this.sceneData.gameType != GameType.SKEWERS) {
                            if (self.gameSuccessView.active || self.gameFailView.active) {
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
                    .to(0.2, { position: new Vec3(self._leftSceneX + 1080, fish.position.y, fish.position.z) }, { easing: 'cubicIn' })
                    .call(() => {
                        self.hasWangClick = false;
                        fish.curTween = tween(fish).to(duration, { position: new Vec3(-800, fish.position.y, fish.position.z) },
                            {
                                onUpdate: () => {
                                    if (fish.pause) {
                                        fish.curTween.stop();
                                        return;
                                    }
                                    if (self._clearBoo) return;
                                    if (this.sceneData.gameType != GameType.SKEWERS) {
                                        if (self.gameSuccessView.active || self.gameFailView.active) {
                                            return;
                                        }
                                    }
                                    const y = upDistance * Math.sin(floatAmplitude * fish.position.x + phase);
                                    const newPosition = new Vec3(fish.position.x, fish.position.y + y, fish.position.z);
                                    fish.setPosition(newPosition.x, newPosition.y);
                                    if (self.hasGuide) {
                                        return;
                                    }
                                    if ((this.sceneData.hasGuide && this.sceneData.gameType != GameType.SKEWERS)) {
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
                                if (this.sceneData.gameType != GameType.SKEWERS) {
                                    if (self.gameSuccessView.active || self.gameFailView.active) {
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
        if (this.sceneData.gameType == GameType.SKEWERS) {
            this.timer = (this.sceneData as any).game.timeLimit;
        } else {
            this.timer = this.INIT_TIME;
        }
        this.startTime(this.timer);
    }

    rePlayGame() {
        this.customsSendDataState = true;
        this.clearGameView();
        this._clearBoo = false;
        this._startTime = TimeUtil.getNow();
        this.gameFailView.active = false;
        this.wangCount = 0;
        this.catchLabel.getComponent(Label).string = `${this.wangCount}/${this.wangMaxCount}`;
        this.timeInit();
        this.createFish();
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
        wang.setPosition(new Vec3(0, 0, 0));
        // 游戏过程数据匹配
        this.sceneData.gameMatch();

        let self = this;// -600.-520.-440.-360
        let offsetX = this._curFish.currentIndex * 10 + 550;
        let offsetTime = this._curFish.positionYIndex * 0.01;
        let fishWorldPos = self._curFish.getFishNode().parent.getComponent(UITransform).convertToWorldSpaceAR(this._curFish.position);
        let wangWorldPos = wang.getComponent(UITransform).convertToWorldSpaceAR(wangPrefab.position);
        let question = this._curFish.getData();
        question.hasChose = false;
        if (this._wangTween) this._wangTween.stop();
        // 启动动画
        this._wangTween = tween(wangPrefab).parallel(
            tween().to(0.4 - offsetTime, { scale: new Vec3(3, 3, 3) }, { easing: 'bounceIn' }),
            tween().to(0.25 - offsetTime, { position: new Vec3(fishWorldPos.x - wangWorldPos.x, fishWorldPos.y - 100, fishWorldPos.z) }))
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
                        self.catchLabel.getComponent(Label).string = `${self.wangCount}/${self.wangMaxCount}`;
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

    updateSuccessPopupStar(num) {
        this.stars.forEach((star, index) => {
            star.active = index < num;
        });
    }
    private endCurHardGame() {
        this.clearGameView();
        this.playAudio("music/win");
        if (this.sceneData.gameType == GameType.SKEWERS) {
            this._requestSkewersGameComplete();
        } else {
            if (!this.customsSendDataState) {
                this._requestGameCenterComplete();
            }
            this.customsSendDataState = true;
            this.gameSuccessView.active = true;
            this.updateSuccessPopupStar(this.curHard);
            this.stars[this.hardIndex].scale = new Vec3(2, 2, 2);
            if (this.hardIndex == this.hards.length - 1) {
                this.hardIndex = 0;
            } else {
                this.hardIndex++;
            }
            this.curHard = this.hards[this.hardIndex];
        }
    }

    private _startTime: number = 0
    private _endTime: number = 0;

    private _requestSkewersGameComplete() {
        this._endTime = TimeUtil.getNow();
        let complete = this.wangCount / this.wangMaxCount;
        let duration = (this._endTime - this._startTime) / 1000;
        this.requestGameComplete({ context: this, parentNode: this.viewNode, complete, duration});
    }

    private _requestGameCenterComplete() {
        const curGame = (this.sceneData as any).game;
        this._endTime = TimeUtil.getNow();
        let level = curGame.level + 1;
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
        });
    }

    private _state: number = 0;
    // ui挂载得点击事件
    private nextGame(event, data) {
        let state = Number(data);
        this._state = state;
        Tween.stopAll();
        if (!state) {
            this.clearGameView();
        }
        this.sceneData.runNextGame();
    }

    private _nextGame() {
        this.gameSuccessView.active = false;
        this.gameFailView.active = false;
        this.startGame(this._state); // 开始下一关
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
        this._curFish.curTween = tween(this._curFish)
            .to(0.8, { position: new Vec3(self._leftSceneX - 300, self._curFish.position.y, self._curFish.position.z) }, { easing: "sineOut" })
            .call(() => {
                // self.hasWangClick = false;
                self.unSelectWang(i);
                self._curFish.pause = false;
                if (this.sceneData.gameType != GameType.SKEWERS) {
                    if (self.gameSuccessView.active || self.gameFailView.active) {
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

}



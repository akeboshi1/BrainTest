import { _decorator, Node, director,Vec3,ProgressBar,Button,Sprite,find,Label,assetManager,instantiate,SpriteFrame,Color,UITransform,UIOpacity,tween,ParticleAsset,Rect,Prefab,ParticleSystem2D } from "cc";
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import PanelMgr, { Layer } from "../Common/manage/PanelMgr";
import GameView from "../Moudle/View/GameView";
import { GameType } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import FindingGlobal from "../Common/FindingGlobal";
import AudioMgr from "../Common/manage/AudioMgr";
import GameConfig from "../Moudle/Game/GameConfig";
import { Global } from "db://assets/resources/scripts/Core/Manager/Config/Global";
import {TimeUtil} from "db://assets/resources/scripts/Core/Util/TimeUtil";
import {BundleName} from "db://assets/resources/scripts/Core/Manager/Load/BundleName";
import {AbortablePromise} from "db://assets/resources/scripts/Core/StateMachine/AbortablePromise";
import {SequenceFlow} from "db://assets/resources/scripts/Core/StateMachine/SequenceFlow";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";
import {EventManager} from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
import {FindingGuide} from "db://assets/resources/scripts/Core/Manager/Guide/game/FindingGuide";
import {GuideManager, GuideState} from "db://assets/resources/scripts/Core/Manager/Guide/GuideManager";
import CacheMgr from "db://assets/finding/script/Common/manage/CacheMgr";
import Tools from "db://assets/finding/script/Common/Tools";
import Constant from "db://assets/finding/script/Common/Constant";
import {SkewersManager} from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
import {SkewersGameType} from "db://assets/resources/scripts/Game/Task/Skewers/SkewersGameData";
import HomeView from "db://assets/finding/script/Moudle/View/HomeView";
import HintPrefab from "db://assets/finding/script/Moudle/Game/HintPrefab";
import GameLog from "db://assets/finding/script/Common/manage/GameLogMgr";

const { ccclass, property } = _decorator;

@ccclass
export class Game extends BaseScene<IBaseGameChild> {
    //Game实例
    public static Ins: Game = null;

    @property(Node)
    viewNode: Node = null;

    @property(
        {
            type: [Node]
        }
    )
    public layers: Node[] = [];



    private picture1: Node = null;

    private picture2: Node = null;

    private pictureList: Node[] = [];

    private frameList = [];

    private framePostions: Vec3[] = [];

    private errNode: Node = null;

    private resultList = [];

    private resultNode: Node = null;

    private countDownLabel: Node = null;

    private countDownTime: number = null;

    private countDown = null;

    private progress: ProgressBar = null;
    //
    // private progressSprite: Sprite = null;

    private hintData = null;

    private hintRoundNode1: Node = null;

    private hintRoundNode2: Node = null;

    private interval: number = 0;

    private hintIndex: number = 0;

    private isStartCount: boolean = false;

    private reminderNode: Node = null;

    private guankaLabel: Node = null;


    private victory: Node = null;

    quitBtn: Node;

    private goonBtn: Node = null;

    private clockTime: number = null;

    private plistNode: Node = null;

    private tempList = [];

    private tempCountDown: number = null;

    private canAddTime: boolean = false;

    private gameOver: boolean = false;

    private pause: boolean = false;

    private _curHard: number = 0;

    private _curCount: number = 0;
    private _maxCount: number = 0;
    private _endTimeoutId: any = null;
    private _particleTimeoutIds: Map<string, any> = new Map();

    /**
     * 训练结算状态标志
     * @private
     */
    private _isSettling: boolean = false;

    /**
     * 找茬个数
     * @private
     */
    private _counts = [3, 4, 5];

    private _checkPoint = 0;


    start() {
        super.start();
        Game.Ins = this;
        // PanelMgr.INS.layers = this.layers;
        // PanelMgr.INS.clear();
        // 初始化FindingGlobal的事件监听器
        FindingGlobal.initEventListeners();
        this.init_OK();
        // Emit.instance().on(EventCode.PanelMgrInitOK, this.do_after_panelMgr_initOK, this)
        // Emit.instance().emit(EventCode.PanelMgrInitOK);
        // // 监听PanelMgr初始化完成事件
        // Emit.instance().on(EventCode.PanelMgrInitOK, () => {
        //     this.do_after_panelMgr_initOK();
        // }, this);
    }

    setGameViewRef(view: GameView) {
        this.curView = view;
    }

    private randomSkewerGame(): number {
        // 评测第一关(带引导)
        // if(Global.userData.curSkewerGameData.hasGuid()) {
        //     return 0;
        // }

        FindingGlobal.curSkewersGameIndex = Global.userData.curSkewerGameData.getCurTrainData().level > GameConfig.allCheckPoint ?
            Global.userData.curSkewerGameData.getCurTrainData().level % GameConfig.allCheckPoint : Global.userData.curSkewerGameData.getCurTrainData().level;

        return FindingGlobal.skewersGameList[FindingGlobal.curSkewersGameIndex - 1];
    }


    //PanelMgr 初始化完成之后执行的方法
    init_OK() {
        // 判断当前训练是否是串烧训练
        this.sceneModel = (director.getScene() as unknown as { sceneModel }).sceneModel;
        AudioMgr.backMusic()
        let checkPoint = 0;
        if (this.sceneModel.gameType === GameType.SKEWERS) {
            checkPoint = !Global.isAgain ? this.randomSkewerGame() : (this.sceneModel as any).level;
            FindingGlobal.skewersGameLevel = checkPoint;
        } else {
            // 非串烧训练优先使用FindingGlobal.gameCenterGameLevel，如果没有则使用sceneModel的level
            checkPoint = (this.sceneModel as any).level;
            if (checkPoint == 0) {
                checkPoint = 1;
            }
            FindingGlobal.gameCenterGameLevel = checkPoint;


        }

        if (checkPoint == 0) {
            // CacheMgr.checkpoint = 1;
            checkPoint = 1;
            FindingGlobal.gameCenterGameLevel = checkPoint;
            FindingGlobal.curSkewersGameIndex = 1;
        }

        this.initUI();

        //直接打开GameView
        // PanelMgr.INS.openPanel({
        //     layer: Layer.gameLayer,
        //     panel: GameView,
        // })

    }

    initUI(): Promise<void> {
        this.sceneModel = (director.getScene() as unknown as { sceneModel }).sceneModel;
        return new Promise(async resolve => {
            this.framePostions = [];
            this._startTime = TimeUtil.getNow();
            this.canAddTime = true;

            // 使用统一的方法获取viewNode中的UI元素
            this.getViewNodeElements();

            // 设置倒计时和进度条初始值
            // this.countDownTime = GameConfig.customTime;
            // this.tempCountDown = GameConfig.allTime;
            let loopLevel = 0;
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                this._checkPoint = FindingGlobal.curSkewersGameIndex;
                let skewersGameData = (this.sceneModel as any).game;
                this._curHard = (this.sceneModel as any).difficulty;//Global.userData.curSkewerGameData.difficulty;
                // test code
                loopLevel = FindingGlobal.curSkewersGameIndex;
                this._checkPoint = loopLevel % GameConfig.allCheckPoint;
                this.guankaLabel.getComponent(Label).string = "第" + skewersGameData.progressStr + "关";
                this.progress.progress = skewersGameData.progress;
                this.tempCountDown = skewersGameData.timeLimit;
                this.countDownTime = skewersGameData.timeLimit;
            } else {
                let _hard = (this.sceneModel as any).game.difficulty;
                this._curHard = _hard;
                if (!Global.isAgain) this._checkPoint = (this.sceneModel as any).level;
                // if(Global.isAgain){
                //     CacheMgr.hard --;
                //     _hard = _hard<0?0:_hard-1;
                // }
                //
                // if (_hard % 3 == 0) {
                //     if (_hard == 0) {
                //         this._curHard = 1;
                //     } else {
                //         this._curHard = 3;
                //     }
                // } else {
                //     this._curHard = _hard % 3;
                // }

                // 重置倒计时
                this.countDownTime = GameConfig.customTime;
                this.tempCountDown = GameConfig.allTime;
                loopLevel = this._checkPoint % GameConfig.allCheckPoint;
                if (loopLevel == 0) loopLevel = GameConfig.allCheckPoint;
                this.progress.progress = loopLevel / (this.sceneModel as any).levelLen;
                let customCount;
                if (loopLevel == GameConfig.allCheckPoint) {
                    customCount = 1;
                } else {
                    customCount = loopLevel;
                }
                this.guankaLabel.getComponent(Label).string = "第" + loopLevel + "/" + (this.sceneModel as any).levelLen + "关";
            }
            this._curCount = 0;
            this._maxCount = this._counts[this._curHard - 1];


            let _level = GameConfig.level_order[loopLevel - 1];
            let bundleName = "level" + _level;
            let imageName = GameConfig.image_name.get(_level);
            let pictureSprite1 = this.picture1.getComponent(Sprite);
            let pictureSprite2 = this.picture2.getComponent(Sprite);
            let self = this;
            const bundle = assetManager.getBundle(BundleName.FINGING);
            let spriteFrame1 = null;
            let spriteFrame2 = null;
            let flow1 = new AbortablePromise((res, rej) => {
                bundle.load(bundleName + `/image/${imageName}_1_32/spriteFrame`, SpriteFrame, (err: Error, spriteFrame: SpriteFrame) => {
                    if (err) {
                        rej(err);
                    }
                    spriteFrame1 = spriteFrame;
                    res(spriteFrame);
                });
            });


            this.countDown.string = Math.ceil(this.countDownTime) + "秒";

            let flow2 = new AbortablePromise((res, rej) => {
                bundle.load(bundleName + `/image/${imageName}_2_32/spriteFrame`, SpriteFrame, (err: Error, spriteFrame: SpriteFrame) => {
                    if (err) {
                        rej(err);
                    }
                    spriteFrame2 = spriteFrame;
                    res(spriteFrame);
                });
            });

            let flow = new SequenceFlow();
            flow.addFlow(flow1);
            flow.addFlow(flow2);
            flow.start().then(() => {
                pictureSprite1.spriteFrame = spriteFrame1;
                pictureSprite2.spriteFrame = spriteFrame2;
                pictureSprite1.node.active = true;
                pictureSprite2.node.active = true;

                let tmpDatas = GameConfig.level_rect.get(`${imageName}`);
                let tmpDataList = tmpDatas.split("|");
                let len = tmpDataList.length;
                let uitransform = self.picture1.getComponent(UITransform)
                for (let i = 0; i < len; i++) {
                    let node: Node = new Node();
                    let nodeUITransform = node.addComponent(UITransform);
                    let tempData = tmpDataList[i].split(",");
                    // 左上角
                    nodeUITransform.width = Number(tempData[2]);
                    nodeUITransform.height = Number(tempData[3]);
                    // 资源尺寸 696*436
                    // 必须按照资源尺寸的比例来设计ui上的图片容器尺寸，否则将对不上配置上的交互点
                    // 按照1.3的比例来设计ui上的图片容器尺寸，显示尺寸 904.8*566.8
                    node.setPosition(Number(tempData[0]) * this._scale, uitransform.height - Number(tempData[1]) * this._scale);
                    nodeUITransform.setAnchorPoint(0, 1);
                    node.setScale(1.4, 1.4);

                    // 添加红色背景用于显示不同点区域
                    // let graphics = node.addComponent(Graphics);
                    // let graphicsUITransform = graphics.getComponent(UITransform);
                    // if (!graphicsUITransform) {
                    //     graphicsUITransform = graphics.addComponent(UITransform);
                    // }
                    // graphicsUITransform.setAnchorPoint(0, 1);
                    // graphics.fillColor = new Color(255, 0, 0, 128); // 红色半透明
                    // graphics.rect(-nodeUITransform.width/2, -nodeUITransform.height/2, nodeUITransform.width, nodeUITransform.height);
                    // graphics.fill();

                    nodeUITransform.convertToWorldSpaceAR(node.position);
                    self.framePostions.push(node.position);
                    self.picture1.addChild(node);
                    self.frameList.push(nodeUITransform.getBoundingBox());
                    self.frameList[i].id = i + 1;
                }
                if (self._checkPoint == 1 && self.sceneModel.gameType != GameType.SKEWERS) {
                    self.newHandHint();
                }
                for (let j = 0; j < self.resultNode.children.length; j++) {
                    let children = self.resultNode.children[j].getChildByName("right");
                    children.active = false;
                    if (j >= self._maxCount) {
                        self.resultNode.children[j].active = false;
                    }
                }

                // 确保关闭按钮处于可交互状态
                this.setQuitButtonInteractable(true);
                this._isSettling = false;
                this.tempList = [];
                this.clockTime = GameConfig.clockTime;
                this.monitorEvent();
                resolve();
            }).catch((err) => {
                DebugLog.instance.error(err);
            });
        })
    }

    private backHandler() {
        // 如果训练正在结算中，阻止退出操作
        if (this._isSettling) {
            DebugLog.instance.log("[GameView] 训练结算中，无法退出训练");
            return;
        }

        this.pause = true;
        FindingGlobal.reset();
        this.quitGame({
            parentNode: this.viewNode,
            context: this
        });
    }

    resumeCallBack(context) {
        // if(context.sceneModel.gameType == GameType.SKEWERS) {
        //     if(!SkewersManager.getInstance().isRunOver()){
        //         context.pause = false;
        //     }else{
        //         context.exitCallBack();
        //     }
        // }else{
        //     context.pause = false;
        // }
        context.pause = super.resumeCallBack(context);
        if (context.sceneModel.gameType == GameType.SKEWERS && context.pause) {
            context.exitCallBack();
        }
    }

    show(param: any): void {
        this.tempList = [];
        this.clockTime = GameConfig.clockTime;
        this.monitorEvent();
        // if (this._checkPoint != 1 || this.sceneModel.gameType == GameType.SKEWERS) this.monitorEvent();
    }

    public newHandHint() {
        return;
        // 暂时不需要点击类型的引导
        DebugLog.instance.log("进入新手提示");
        // this.monitorEvent();
        EventManager.getInstance().on(FindingGuide.GUIDE_FIND_EMIT, this.guideClick.bind(this), this);
        EventManager.getInstance().on(FindingGuide.GUIDE_FIND_END, this.guideEND.bind(this), this);
        GuideManager.getInstance().start(FindingGuide.NAME, { root: this.picture1, data: this.frameList, count: this._maxCount - 1 });
        // this.clickHint(false);
    }

    private guideClick(data) {
        console.log(data);
        this.onTouchDown(data);
    }

    private guideEND(data) {
        this.onTouchDown(data);
        this.monitorEvent();
    }

    update(dt) {
        if (this.pause) return;
        this.gameCountDown(dt);
        this.hintCountDown(dt);
        this.countDownClockTime(dt);
    }

    public countDownClockTime(dt) {
        if (this.clockTime == null) return;
        if (this.gameOver) return;
        if (Math.ceil(this.clockTime) <= 0) {
            this.clockTime = GameConfig.clockTime;
            AudioMgr.play("sub/audio/view/game/clock").then()
        }
        this.clockTime -= dt;
    }

    public gameCountDown(dt) {
        if (this.countDownTime == null) return;
        if (this.pause) return;
        if (this.gameOver) return;
        if (Math.ceil(this.countDownTime) <= 0) {
            this.countDown.string = "0秒";
            // this.progressSprite.fillRange = 0;
            this.closeGame(false);
            this.gameOver = true;
            this.canAddTime = false;

            return;
        }
        this.countDownTime -= dt;
        this.countDown.string = Math.ceil(this.countDownTime) + "秒";
        let plan = this.countDownTime / this.tempCountDown;
        // this.progressSprite.fillRange = plan;
    }

    hintCountDown(dt) {
        if (!this.isStartCount) return;
        if (!this.isStartCount) return;
        if (this.interval >= 10) {
            this.isStartCount = false;
            this.interval = 0;
            this.hintIndex = 0;
        }
        this.interval += dt;
    }

    public clickAddTime() {
        if (!this.canAddTime) return;
        this.pause = true;
        let addTimeCount = CacheMgr.addTime;
        if (addTimeCount <= 0) {
            Tools.handleVideo(Constant.VIDEO_TYPE.GET_PROPS).then((res) => {
                if (res) {
                    this.handler_addTime();
                    this.pause = false;
                } else {
                    this.pause = false;
                }
            })
        } else {
            CacheMgr.addTime = addTimeCount - 1;
            this.handler_addTime();
        }
    }

    public handler_addTime() {
        this.countDownTime += 60;
        this.tempCountDown += 60;
    }

    public clickHint(isCut) {
        return;
        // if (this.hintData != null) return;
        // this.pause = true;
        // let hint = CacheMgr.hint;
        // for (let i = 0; i < this.frameList.length; i++) {
        //     if (!this.frameList[i].dot) {
        //         if (isCut) {
        //             if (hint <= 0) {
        //                 Tools.handleVideo(Constant.VIDEO_TYPE.GET_PROPS).then((res) => {
        //                     if (res) {
        //                         this.pause = false;
        //                         this.handler_hint(i);
        //                     }else{
        //                         this.pause = false;
        //                     }
        //                 })
        //             } else {
        //                 CacheMgr.hint = hint - 1;
        //                 this.handler_hint(i)
        //             }
        //         } else {
        //             this.handler_hint(i)
        //         }
        //         break;
        //     }
        // }
    }

    public handler_hint(i) {
        let url = "sub/image/view/gameView/public/hint";
        this.hintData = this.frameList[i];
        for (let j = 0; j < this.pictureList.length; j++) {
            if (j == 0) {
                this.hintRoundNode1 = this.createRound(i, j, url, 120);
            } else {
                this.hintRoundNode2 = this.createRound(i, j, url, 120);
            }
        }
    }

    public monitorEvent() {
        if (this.picture1) {
            this.picture1.off(Node.EventType.TOUCH_START, this.onTouchDown, this);
            this.picture1.on(Node.EventType.TOUCH_START, this.onTouchDown, this);
        }
        if (this.picture2) {
            this.picture2.off(Node.EventType.TOUCH_START, this.onTouchDown, this);
            this.picture2.on(Node.EventType.TOUCH_START, this.onTouchDown, this);
        }
    }

    public removeMonitorEvent() {
        if (this.picture1) {
            this.picture1.off(Node.EventType.TOUCH_START, this.onTouchDown, this);
        }
        if (this.picture2) {
            this.picture2.off(Node.EventType.TOUCH_START, this.onTouchDown, this);
        }
    }

    private _scale = 1.5;
    refreshGame(): void {
        // 重新初始化关卡数据
        this.initUI();

        // 重置计时、分数、标记等状态
        this._startTime = TimeUtil.getNow();
        this._curCount = 0;
        this._maxCount = this._counts[this._curHard - 1];
        this.gameOver = false;
        this.resultList = [];
        this.tempList = [];
        this.hintIndex = 0;
        this.isStartCount = false;
        this.interval = 0;
        this.pause = false;
        this.canAddTime = true;
        this._pauseStartTime = 0;
        this._pauseDurTime = 0;
        this.victory.active = false;
        this.goonBtn.active = false;
        this.plistNode.active = false;

        // 重置结算状态并恢复关闭按钮交互
        this._isSettling = false;
        this.setQuitButtonInteractable(true);

        // 清理不同点节点
        this.framePostions = [];
        this.frameList = [];
        if (this.picture1) {
            this.picture1.removeAllChildren();
        }
        if (this.picture2) {
            this.picture2.removeAllChildren();
        }
        // 重新生成不同点区域和图片
        let _level = GameConfig.level_order[this._checkPoint - 1];
        let bundleName = "level" + _level;
        let imageName = GameConfig.image_name.get(_level);
        const bundle = assetManager.getBundle(BundleName.FINGING);
        // 刷新两张图片
        bundle.load(bundleName + `/image/${imageName}_1_32/spriteFrame`, SpriteFrame, (err, spriteFrame) => {
            if (!err && this.picture1) {
                this.picture1.getComponent(Sprite).spriteFrame = spriteFrame;
            }
        });
        bundle.load(bundleName + `/image/${imageName}_2_32/spriteFrame`, SpriteFrame, (err, spriteFrame) => {
            if (!err && this.picture2) {
                this.picture2.getComponent(Sprite).spriteFrame = spriteFrame;
            }
        });
        // 重新生成不同点区域
        let tmpDatas = GameConfig.level_rect.get(`${imageName}`);
        let tmpDataList = tmpDatas.split("|");
        let len = tmpDataList.length;
        let uitransform = this.picture1.getComponent(UITransform);
        for (let i = 0; i < len; i++) {
            let node: Node = new Node();
            let nodeUITransform = node.addComponent(UITransform);
            let tempData = tmpDataList[i].split(",");
            nodeUITransform.width = Number(tempData[2]);
            nodeUITransform.height = Number(tempData[3]);
            node.setPosition(Number(tempData[0]) * this._scale, uitransform.height - Number(tempData[1]) * this._scale);
            nodeUITransform.setAnchorPoint(0, 1);
            node.setScale(1.4, 1.4);
            nodeUITransform.convertToWorldSpaceAR(node.position);
            this.framePostions.push(node.position);
            this.picture1.addChild(node);
            this.frameList.push(nodeUITransform.getBoundingBox());
            this.frameList[i].id = i + 1;
        }
        // 重置结果节点
        for (let j = 0; j < this.resultNode.children.length; j++) {
            let children = this.resultNode.children[j].getChildByName("right");
            children.active = false;
            if (j >= this._maxCount) {
                this.resultNode.children[j].active = false;
            } else {
                this.resultNode.children[j].active = true;
            }
        }
        // 重置倒计时
        this.countDownTime = GameConfig.customTime;
        this.tempCountDown = GameConfig.allTime;
        this.countDown.string = Math.ceil(this.countDownTime) + "秒";
        let levels = (this.sceneModel as any).levelLen
        // 关卡标签
        this.guankaLabel.getComponent(Label).string = `第${this._checkPoint}/${levels}关`;

        // 重新绑定点击事件，恢复音效
        this.monitorEvent();
        AudioMgr.backMusic();
    }

    onSuccessNextLevel(): void {
        CacheMgr.checkpoint = CacheMgr.checkpoint + 1;
        this.refreshGame();
    }

    onFailNextLevel(): void {
        CacheMgr.checkpoint = CacheMgr.checkpoint + 1;
        this.refreshGame();
    }

    onAgain(): void {
        this.refreshGame();
    }

    public onDisable() {
        super.onDisable();
        if (this.picture1) this.picture1.off(Node.EventType.TOUCH_START, this.onTouchDown, this);
        if (this.picture2) this.picture2.off(Node.EventType.TOUCH_START, this.onTouchDown, this);
        EventManager.getInstance().off(FindingGuide.GUIDE_FIND_EMIT, this);
        EventManager.getInstance().off(FindingGuide.GUIDE_FIND_END, this);

        // 清理计时器
        if (this._endTimeoutId) {
            clearTimeout(this._endTimeoutId);
            this._endTimeoutId = null;
        }

        // 清理所有粒子计时器
        this._particleTimeoutIds.forEach((id) => {
            clearTimeout(id);
        });
        this._particleTimeoutIds.clear();

        // 重置结算状态
        this._isSettling = false;
    }

    public onTouchDown(event) {
        if (this.gameOver || this.resultList.length == this._maxCount || this._isSettling) return;
        let clickPos;
        let url = "sub/image/view/gameView/public/rightRound";
        if (!event.target && GuideManager.getInstance().curGuide && GuideManager.getInstance().curGuide instanceof FindingGuide == true && GuideManager.getInstance().curGuide.state == GuideState.processing) {
            (this.sceneModel as any).gameMatch();
            AudioMgr.play("sub/audio/view/game/right", 1, false).then()
            let destroyHint = () => {
                this.hintData = null;
                if (this.hintRoundNode1) {
                    this.hintRoundNode1.destroy();
                    this.hintRoundNode1 = null;
                }
                if (this.hintRoundNode2) {
                    this.hintRoundNode2.destroy();
                    this.hintRoundNode2 = null;
                }
            }
            let isDestroy = true;
            let i = event.i;
            if (this.tempList.length == 0) isDestroy = true;
            for (let j = 0; j < this.tempList.length; j++) {
                if (this.frameList[i].id == this.tempList[j]) {
                    isDestroy = false;
                    break;
                }
            }
            if (isDestroy) destroyHint();
            if (this.frameList[i].dot) return;
            this.frameList[i].dot = true;
            this.resultList.push(i);
            for (let j = 0; j < this.pictureList.length; j++) {
                this.createRound(i, j, url, 70);
            }
            this.createHintPrefab();
            clickPos = event.pos;
            this.createParticle(clickPos);
            this.tempList.push(this.frameList[i].id);
            return;
        }

        if (!event.target) {
            return;
        }


        clickPos = event.getUILocation();
        let target: Node = event.target;

        let targetUITransform = target.getComponent(UITransform);
        if (!targetUITransform) {
            targetUITransform = target.addComponent(UITransform);
        }
        let nodePos = targetUITransform.convertToNodeSpaceAR(new Vec3(clickPos.x, clickPos.y, 0));
        let rect = new Rect(nodePos.x, nodePos.y, GameConfig.checkArea, GameConfig.checkArea);
        rect.x -= GameConfig.checkArea / 2;
        rect.y -= GameConfig.checkArea / 2;
        let isRight: boolean = false;
        for (let i = 0; i < this.frameList.length; i++) {
            let checkRect = this.frameList[i];
            let isClick = rect.intersects(checkRect);
            if (isClick) {
                (this.sceneModel as any).gameMatch();

                // if(Global.isSkewersGame){

                // }else{
                //     GameCenterManager.getInstance().gameMatch(GameCenterManager.getInstance().currentGame.sessionid, () => { });
                // }
                isRight = true;
                AudioMgr.play("sub/audio/view/game/right", 1, false).then()
                let destroyHint = () => {
                    this.hintData = null;
                    if (this.hintRoundNode1) {
                        this.hintRoundNode1.destroy();
                        this.hintRoundNode1 = null;
                    }
                    if (this.hintRoundNode2) {
                        this.hintRoundNode2.destroy();
                        this.hintRoundNode2 = null;
                    }

                }
                let isDestroy = true;
                if (this.tempList.length == 0) isDestroy = true;
                for (let j = 0; j < this.tempList.length; j++) {
                    if (this.frameList[i].id == this.tempList[j]) {
                        isDestroy = false;
                        break;
                    }
                }
                if (isDestroy) destroyHint();
                if (this.frameList[i].dot) break;
                this.frameList[i].dot = true;
                this.resultList.push(i);
                for (let j = 0; j < this.pictureList.length; j++) {
                    this.createRound(i, j, url, 70);
                }
                this.createHintPrefab();
                this.createParticle(clickPos);
                this.tempList.push(this.frameList[i].id);
                break;
            }
        }
        if (!isRight) {
            if (this.errNode != null) {
                this.errNode.destroy();
                this.errNode = null;
                this.createErr(clickPos);
            } else {
                this.createErr(clickPos)
            }
        }
    }


    requestGameCompleteCallBack() {
        this.updateSkewersGameList();

        // 串烧训练结算完成后恢复关闭按钮交互
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.setQuitButtonInteractable(true);
            this._isSettling = false;
        }
    }

    private updateSkewersGameList() {
        //筛选出未处理过的图片
        FindingGlobal.skewersGameList = GameConfig.level_order.filter(num => num != FindingGlobal.curSkewersGameIndex);
    }

    private totalCompete(context) {
        context.pause = false;
        context._pauseDurTime += context._pauseEndTime - TimeUtil.getNow();
        AudioMgr.audioSource.stop();
    }

    goonHandler(context) {
        context.pause = false;
        context._pauseDurTime += context._pauseEndTime - TimeUtil.getNow();
        AudioMgr.audioSource.stop();
        super.goonHandler(context);
    }

    dzgoonHandler(resuleBoo: boolean = true) {
        this.clearGameView();
        if (this.sceneModel) {
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                // 直接发送训练完成请求，不处理弹窗逻辑
                // 直接向服务器发送请求，但不处理回调
                let self = this;
                let trainData = SkewersManager.getInstance().getUnCompleteGameData();
                let _boo = trainData.type != SkewersGameType.Judgment;
                if (!_boo) {
                    EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, (data) => {
                        (self.sceneModel as any).goonHandler(self, true);
                    }, this, true);
                    this.clearGameView();
                    SkewersManager.getInstance().requestGameComplete(this.complete, this.duration);
                } else {
                    // 串烧训练类型不匹配时，恢复关闭按钮交互
                    this.setQuitButtonInteractable(true);
                    this._isSettling = false;
                    (this.sceneModel as any).goonHandler(self, true);
                }
            }
        }
    }
    public clearGameView() {
        super.clearGameView();
        AudioMgr.stop();

        // 安全清理：禁用所有相关节点而不是直接设置spriteFrame为null
        this.safeClearAllNodes();
    }

    /**
     * 安全清理所有节点，通过禁用节点来避免引擎渲染错误
     */
    private safeClearAllNodes() {
        // 禁用主视图节点
        if (this.viewNode && this.viewNode.isValid) {
            this.viewNode.active = false;
        }

        // 禁用错误节点
        if (this.errNode && this.errNode.isValid) {
            this.errNode.active = false;
        }

        // 禁用提示节点
        if (this.reminderNode && this.reminderNode.isValid) {
            this.reminderNode.active = false;
        }

        // 禁用胜利节点
        if (this.victory && this.victory.isValid) {
            this.victory.active = false;
        }

        // 禁用彩带节点
        if (this.plistNode && this.plistNode.isValid) {
            this.plistNode.active = false;
        }

        // 禁用所有图片节点
        if (this.pictureList && this.pictureList.length > 0) {
            this.pictureList.forEach(picture => {
                if (picture && picture.isValid) {
                    picture.active = false;
                }
            });
        }

        // 禁用提示圆圈节点
        if (this.hintRoundNode1 && this.hintRoundNode1.isValid) {
            this.hintRoundNode1.active = false;
        }
        if (this.hintRoundNode2 && this.hintRoundNode2.isValid) {
            this.hintRoundNode2.active = false;
        }
    }

    private _pauseStartTime: number = 0;
    private _pauseDurTime: number = 0;
    nextHandler(context) {
        context.pause = true;
        context._pauseStartTime = TimeUtil.getNow();
        super.nextHandler(context);
        // SkewersManager.getInstance().showGameAlert(context.node,AlertType.Next,SkewersManager.getInstance().nextSkewersGameStr,'',0,0,context.alertGoonHandler,context.exitCallBack,context);
    }

    nextClick() {
        this.nextHandler(this);
    }

    /**
     * 显示所有不同的地方
     * @private
     */
    private showAllPoint() {
        // 用粉色圆圈显示所有尚未点击的不同点
        const url = "sub/image/view/gameView/public/hint";
        for (let i = 0; i < this.frameList.length; i++) {
            // 如果这个点尚未被找到
            if (!this.frameList[i].dot) {
                // 在两张图片上都创建标记
                for (let j = 0; j < this.pictureList.length; j++) {
                    this.createRound(i, j, url, 120);
                }
                // 标记为已找到，避免重复点击时出错
                this.frameList[i].dot = true;
                // 添加到已找到列表
                this.resultList.push(i);
                this.tempList.push(this.frameList[i].id);
            }
        }

        // 更新显示结果
        for (let i = 0; i < this.resultList.length && i < this.resultNode.children.length; i++) {
            let resultNode = this.resultNode.children[i];
            let children = resultNode.getChildByName("right");
            if (children) {
                children.active = true;
            }
        }

        // 训练结束
        if (this.resultList.length >= this._maxCount) {
            this.gameOver = true;
            this.canAddTime = false;
        }
    }

    public onClickShowAnswer() {
        super.onClickShowAnswer();
        this.goonBtn.active = true;
        this.showAllPoint();
    }


    public onClickRetryGame() {
        Global.isAgain = true;
        PanelMgr.INS.openPanel({
            layer: Layer.gameLayer,
            panel: HomeView,
            param: CacheMgr.checkpoint
        }).then(() => {

            PanelMgr.INS.closePanel(GameView);
        });
    }

    exitCallBack(context) {
        context.pause = false;
        AudioMgr.audioSource.stop();

        // 安全清理：禁用所有相关节点
        context.safeClearAllNodes();

        PanelMgr.INS.closePanel(GameView);
        FindingGlobal.reset();
        context.totalCompete(context);
        super.exitCallBack(context);
    }


    public closeGame(isWin) {
        if (this.gameOver) return;

        // 设置训练结算状态
        this._isSettling = true;
        this.gameOver = true;

        // 禁用关闭按钮交互
        this.setQuitButtonInteractable(false);

        this.removeMonitorEvent();
        if (isWin) {
            this.victory.active = true;
            AudioMgr.play("sub/audio/view/game/win", 1, false).then();
        } else {
            AudioMgr.play("sub/audio/view/game/lose", 1, false).then();
        }
        AudioMgr.audioSource.stop();
        // 上报训练数据
        this._endTime = TimeUtil.getNow();

        if (this.sceneModel.gameType == GameType.SKEWERS) {
            FindingGlobal.skewersGameLevel = 0;
            this._requestSkewersGameComplete();
        } else {
            this._requestGameCenterComplete();
        }



        // this._endTime = TimeUtil.getNow();
        // if(Global.isSkewersGame){
        //     EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE,isWin?this.WinRequestSkewerGameComplete:this.failRequestSkewersGameComplete,this);
        //     this.requestGameResult();
        // }else{
        //     const curGame = GameCenterManager.getInstance().currentGame;
        //     let duration= (this._endTime - this._startTime - this._pauseDurTime)/1000;
        //     GameCenterManager.getInstance().gamePassLevel(curGame.sessionid, this.resultList.length, CacheMgr.checkpoint,
        //         this.resultList.length / this._maxCount, duration, GameConfig.customTime, this._curHard, () => { });

        //     setTimeout(() => {
        //         PanelMgr.INS.openPanel({
        //             layer: Layer.gameLayer,
        //             panel: EndView,
        //             param: {
        //                 residue: 1,
        //                 isWin: isWin,
        //                 residueTime: this.countDownTime
        //             }
        //         }).then(() => {
        //             PanelMgr.INS.closePanel(GameView);
        //         })
        //     },1500);
        // }
    }


    private _startTime: number = 0
    private _endTime: number = 0;
    private _requestSkewersGameComplete() {
        // 上报数据
        let complete = this.resultList.length / this._maxCount;//this.resultNode.children.length;
        let duration = (this._endTime - this._startTime - this._pauseDurTime) / 1000;
        this.requestGameComplete({ context: this, parentNode: this.viewNode, complete, duration });

        // 串烧训练结算完成后恢复关闭按钮交互
        // 注意：串烧训练的结算流程是异步的，需要等待服务器响应和弹窗显示
        // 关闭按钮的交互将在requestGameCompleteCallBack中恢复
    }

    private _requestGameCenterComplete() {
        // CacheMgr.hard++;
        let isWin = Boolean(this.resultList.length / this._maxCount >= 1);
        const curGame = (this.sceneModel as any).game;
        let duration = (this._endTime - this._startTime - this._pauseDurTime) / 1000;
        // 使用正确的关卡值，优先使用FindingGlobal.gameCenterGameLevel
        let currentLevel = curGame.level;
        this.requestGameComplete({
            sessionId: curGame.sessionid,
            count: this.resultList.length,
            level: currentLevel,
            complete: this.resultList.length / this._maxCount,
            duration,
            timelimit: GameConfig.customTime,
            difficulty: this._curHard,
            levelMode: curGame.levelMode
        });
        // GameCenterManager.getInstance().gamePassLevel(curGame.sessionid, this.resultList.length, CacheMgr.checkpoint,
        //     this.resultList.length / this._maxCount, duration, GameConfig.customTime, this._curHard, () => { });

        this._endTimeoutId = setTimeout(() => {
            if (isWin) {
                (this.sceneModel as any).showSuccessView();
            } else {
                (this.sceneModel as any).showFailView();
            }
            // 恢复关闭按钮交互
            this.setQuitButtonInteractable(true);
            this._isSettling = false;
        }, 1000);
    }

    public createHintPrefab() {
        // 只在reminderNode存在且有效时进行销毁
        if (this.reminderNode && this.reminderNode.isValid) {
            this.reminderNode.destroy();
            this.reminderNode = null;
        }

        const bundle = assetManager.getBundle(BundleName.FINGING);
        bundle.load(GameConfig.prefabData[this.hintIndex], Prefab, (err: Error, prefab: Prefab) => {
            if (err) {
                DebugLog.instance.error(err);
                return;
            }

            // 再次检查，确保在异步加载完成后reminderNode仍然为null
            if (this.reminderNode && this.reminderNode.isValid) {
                this.reminderNode.destroy();
                this.reminderNode = null;
            }

            let node = instantiate(prefab);
            this.viewNode.addChild(node);
            let script = node.getComponent(HintPrefab);
            script.playSound(GameConfig.soundData[this.hintIndex]);
            this.hintIndex += 1;
            this.isStartCount = true;
            this.interval = 0;
            this.reminderNode = node;
        });
    }

    public createParticle(clickPos) {
        let result = this.resultList.length;
        if (this.resultList.length == this._maxCount) {
            this.plistNode.active = true;
            AudioMgr.play("sub/audio/view/game/sahua").then();
        }
        let resultNode = this.resultNode.children[result - 1];
        let resultParentNodeUITransform = resultNode.parent.getComponent(UITransform);
        if (!resultParentNodeUITransform) {
            resultParentNodeUITransform = resultNode.parent.addComponent(UITransform);
        }
        let nodeUITransform = this.viewNode.getComponent(UITransform);
        if (!nodeUITransform) {
            nodeUITransform = this.viewNode.addComponent(UITransform);
        }
        let resultPos = resultNode.getPosition();
        let resultWorldPos = resultParentNodeUITransform.convertToWorldSpaceAR(resultPos);
        let targetNodePos = nodeUITransform.convertToNodeSpaceAR(resultWorldPos);
        let pos = nodeUITransform.convertToNodeSpaceAR(new Vec3(clickPos.x, clickPos.y, 0));
        let node = new Node();
        node.name = "particle";
        node.setPosition(pos);
        let particleComp: ParticleSystem2D = node.addComponent(ParticleSystem2D);
        let particleUrl = "sub/image/view/gameView/particle/win";

        const bundle = assetManager.getBundle(BundleName.FINGING);
        bundle.load(particleUrl, ParticleAsset, (err: Error, particle: ParticleAsset) => {
            if (err) {
                DebugLog.instance.error(err);
            }
            particleComp.file = particle;
        });

        this.viewNode.addChild(node);
        tween(node)
            .to(0.1, { position: new Vec3(targetNodePos.x, targetNodePos.y) })
            .call(() => {
                let children = resultNode.getChildByName("right")
                children.active = true;
                this.checkResult();
                // let checkPoint = CacheMgr.checkpoint;
                // if (checkPoint == 1) {
                //     this.clickHint(false);
                // }
                const particleId = `particle_${Date.now()}_${Math.random()}`;
                const timeoutId = setTimeout(() => {
                    node.destroy();
                    this._particleTimeoutIds.delete(particleId);
                }, 200);
                this._particleTimeoutIds.set(particleId, timeoutId);
            })
            .start()
    }


    public createRound(index1, index2, url, dia) {
        let node: Node = new Node();
        let nodeUITransform = node.addComponent(UITransform);
        nodeUITransform.width = dia;
        nodeUITransform.height = dia;
        //矩形是从左下角为锚点
        let diffX = this.frameList[index1].width / 2;
        let diffY = this.frameList[index1].height / 2;
        node.setPosition(this.frameList[index1].x + diffX, this.frameList[index1].y + diffY)
        nodeUITransform.setAnchorPoint(0.5, 0.5)
        node.setScale(new Vec3(2, 2, 2));
        let sprite: Sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;

        const bundle = assetManager.getBundle(BundleName.FINGING);
        bundle.load(url + "/spriteFrame", SpriteFrame, (err: Error, spriteFrame: SpriteFrame) => {
            if (err) {
                DebugLog.instance.error(err);
            }
            sprite.spriteFrame = spriteFrame;
            if (url == "sub/image/view/gameView/public/hint") {
                sprite.color = new Color(255, 0, 0, 255); // 红色
            }
            sprite.node.active = true;
        });

        this.pictureList[index2].addChild(node);

        return node;
    }

    onclickContinue() {
        (this.sceneModel as any).dzanswerHandler(this);
    }

    public createErr(clickPos) {
        this.isStartCount = false;
        this.interval = 0;
        this.hintIndex = 0;
        AudioMgr.play("sub/audio/view/game/err", 1, false).then();
        let node: Node = new Node();
        let nodeUITransform = node.addComponent(UITransform);
        nodeUITransform.width = 60;
        nodeUITransform.height = 60;
        let gameViewUITransform = this.viewNode.getComponent(UITransform);
        if (!gameViewUITransform) {
            gameViewUITransform = this.viewNode.addComponent(UITransform);
        }
        let gameViewPos = gameViewUITransform.convertToNodeSpaceAR(new Vec3(clickPos.x, clickPos.y, 0));
        node.setPosition(gameViewPos);
        nodeUITransform.setAnchorPoint(0.5, 0.5);
        let sprite: Sprite = node.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;

        const bundle = assetManager.getBundle(BundleName.FINGING);
        bundle.load("sub/image/view/gameView/public/err/spriteFrame", SpriteFrame, (err: Error, spriteFrame: SpriteFrame) => {
            if (err) {
                DebugLog.instance.error(err);
            }
            sprite.spriteFrame = spriteFrame;
            sprite.node.active = true;
        });

        node.setScale(1.6, 1.6);
        this.viewNode.addChild(node);
        this.errNode = node;
        let opacityComponent = node.getComponent(UIOpacity);
        if (!opacityComponent) {
            opacityComponent = node.addComponent(UIOpacity);
        }
        tween(opacityComponent)
            .to(1.5, { opacity: 0 })
            .call(() => {
                node.destroy();
            })
            .start()
        let count: Node = new Node();
        count.setPosition(gameViewPos);
        let countTransform = count.addComponent(UITransform);
        countTransform.setAnchorPoint(0.5, 0.5);
        let countSprite = count.addComponent(Sprite);
        countSprite.color = new Color(255, 0, 0, 255);
        // let str = count.addComponent(Label);
        // str.string = "-10";
        // str.fontSize = 40;
        this.viewNode.addChild(count);
        let countDownLabelUITransform = this.countDownLabel.getComponent(UITransform);
        if (!countDownLabelUITransform) {
            countDownLabelUITransform = this.countDownLabel.addComponent(UITransform);
        }
        let resultPos = countDownLabelUITransform.convertToWorldSpaceAR(this.countDownLabel.getPosition());
        let countParentUITransform = count.parent.getComponent(UITransform);
        if (!countParentUITransform) {
            countDownLabelUITransform = count.parent.addComponent(UITransform);
        }
        let nodePos = countParentUITransform.convertToNodeSpaceAR(resultPos);
        tween(count)
            .to(1, { position: new Vec3(nodePos.x, nodePos.y) })
            .call(() => {
                count.destroy();
                // this.countDownTime -= 10;
            })
            .start()
    }

    public checkResult() {
        if (this.resultList.length == this._maxCount) {
            // 在检查结果时禁用退出按钮
            this.setQuitButtonInteractable(false);
            this._isSettling = true;

            this.closeGame(true);
            this.gameOver = true;
        }
    }

    hide() {
    }

    /**
     * 设置关闭按钮的交互状态
     * @param interactable 是否可交互
     * @private
     */
    private setQuitButtonInteractable(interactable: boolean): void {
        if (this.quitBtn && this.quitBtn.isValid) {
            this.setInteractable(this.quitBtn, interactable, true);
        }
    }

    /**
     * 从viewNode中获取UI元素
     * 统一管理viewNode内的所有UI元素获取
     */
    private getViewNodeElements(): void {
        // 获取viewNode
        let viewNode = this.getNode("viewNode");
        if (!viewNode) {
            DebugLog.instance.error("[GameView] viewNode not found");
            return;
        }

        // 从viewNode中获取图片元素
        this.picture1 = viewNode.getChildByName("pictureBg")?.getChildByName("mask")?.getChildByName("picture");
        if (this.picture1) {
            this.pictureList.push(this.picture1);
        }

        this.picture2 = viewNode.getChildByName("picture2Bg")?.getChildByName("mask")?.getChildByName("picture");
        if (this.picture2) {
            this.pictureList.push(this.picture2);
        }

        // 从viewNode中获取结果列表节点
        this.resultNode = viewNode.getChildByName("resultList");

        // 从viewNode中获取倒计时标签
        this.countDownLabel = viewNode.getChildByName("countDown")?.getChildByName("Label");
        if (this.countDownLabel) {
            this.countDown = this.countDownLabel.getComponent(Label);
        }

        // 从viewNode中获取进度条
        const progressNode = viewNode.getChildByName("ProgressBar");
        if (progressNode) {
            this.progress = progressNode.getComponent(ProgressBar);
        }

        // 从viewNode中获取关卡标签
        this.guankaLabel = viewNode.getChildByName("guankaLabel");

        // 从viewNode中获取胜利节点
        this.victory = viewNode.getChildByName("victory");
        if (this.victory) {
            this.victory.active = false;
        }

        // 从viewNode中获取按钮节点
        this.quitBtn = viewNode.getChildByName("back");
        this.goonBtn = viewNode.getChildByName("goonBtn");
        if (this.goonBtn) {
            this.goonBtn.active = false;
        }

        // 从viewNode中获取彩带节点
        this.plistNode = viewNode.getChildByName("caidai");
        if (this.plistNode) {
            this.plistNode.active = false;
        }

        DebugLog.instance.log("[GameView] viewNode elements initialized successfully");
    }

    private _touchList: { [key: string]: { target: any, handler: any, callObj: any } } = {};
    private _touchEndList: { [key: string]: { target: any, handler: any, callObj: any } } = {}

    private _enableList: { [key: string]: { enabled: boolean, isGray: boolean } } = {};


    private grayColor: Color = new Color(153,145,145,255);
    private normalColor:Color = new Color(255,255,255,255);

    protected setInteractable(target: Node, v: boolean, isGray: boolean = true) {
        if (!target)
            return;
        let button: Button = target.getComponent(Button);
        if (button) {
            let btnSprite = button.getComponent(Sprite);
            btnSprite.color = isGray==true?this.grayColor:this.normalColor
            button.interactable = v;
        }
        this._enableList[target.name] = {enabled: v, isGray};
    }

    protected onTouch(target: Node, handler: Function, sound: string = "sub/audio/click", scale = 0.9, stopEvent = true) {
        if (!target || !handler) {
            GameLog.error("target || handler为空-->", target, handler);
            return;
        }

        let targetName: string = target.name;
        if (this._touchList[targetName] && this._touchList[targetName].target == target) {
            GameLog.warn("重复设置-->", targetName);
            return;
        }

        //添加一个button 动画
        let button = target.getComponent(Button);
        if (scale != 1) {
            if (!button) {
                button = target.addComponent(Button);
                button.transition = Button.Transition.SCALE;
                button.zoomScale = scale;
            }
        }


        let enabled = true;
        let isGray = true;
        if (this._enableList[target.name]) {
            enabled = this._enableList[target.name].enabled;
            isGray = this._enableList[target.name].isGray;
        }

        this.setInteractable(target, enabled, false);

        let callObj = this;
        let touchHandler = (event) => {
            let {enabled = true} = this._enableList[target.name] || {};
            if (!enabled) {
                return;
            }

            event.propagationStopped = stopEvent;

            if (sound && sound != "") {
                // if (sound === "check") {
                // sound = "piano/a" + Math.floor(Math.random() * (5 - 1) + 1);
                // }
                AudioMgr.play(sound).then();
            }
            handler.call(callObj, event);
        };
        target.on(Node.EventType.TOUCH_START, touchHandler);
        this._touchList[targetName] = {target: target, handler: touchHandler, callObj: callObj};
    }

    protected onTouchEnd(target: Node, handler: Function) {
        if (!target || !handler) {
            GameLog.error("target || handle为空 ondTouchEnd -->", target, handler)
            return
        }
        let targetName: string = target.name
        if (this._touchEndList[targetName] && this._touchEndList[targetName].target == target) {
            GameLog.warn("重复设置 --> onTouchEnd ", targetName)
        }

        let callObj = this;
        let touchHandler = (event) => {
            handler.call(callObj, event);
        };
        target.on(Node.EventType.TOUCH_END, touchHandler);
        target.on(Node.EventType.TOUCH_CANCEL, touchHandler);

        this._touchEndList[targetName] = {target: target, handler: touchHandler, callObj: callObj};
    }

    protected offTouchEnd(target: Node) {
        if (!target) {
            GameLog.error("target 为空 ")
            return
        }
        let targetName: string = target.name
        if (this._touchEndList[targetName]) {
            let handler = this._touchEndList[targetName].handler
            target.off(Node.EventType.TOUCH_END, handler)
            target.off(Node.EventType.TOUCH_CANCEL, handler)
            delete this._touchEndList[targetName]
        }
    }

    /**
     * 移除对象点击事件
     * @param target
     */
    protected offTouch(target: Node) {
        if (!target) {
            GameLog.error("target 为空");
            return
        }
        let targetName: string = target.name;
        if (this._touchList[targetName]) {
            let touchHandler = this._touchList[targetName].handler;
            target.off(Node.EventType.TOUCH_START, touchHandler);
            delete this._touchList[targetName]
        }
        delete this._enableList[targetName]
    }


    protected clear() {
        for (let key in this._touchList) {
            this.offTouch(this._touchList[key].target)
        }
    }

    protected getNode(path: string): Node {
        let node: Node = null;
        if (path == "" || !path)
            return null;
        if (path.indexOf("/") != -1) {
            node = find(path, this.node);
        } else {
            node = this.node.getChildByName(path);
        }

        if (!node) {
            GameLog.warn("未找到该节点  path=", path);
        }
        return node;
    }


}

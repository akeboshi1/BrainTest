import {
    _decorator,
    assetManager,
    EventTouch,
    instantiate,
    Node,
    Prefab,
    Rect,
    Size,
    Sprite,
    SpriteFrame,
    Texture2D,
    tween,
    UITransform,
    Vec2,
    Vec3,
    AudioClip,
    ProgressBar,
    Label,
    Button,
    game,
    Game
} from 'cc';
import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";
import { TimeUtil } from "db://assets/resources/scripts/Core/Util/TimeUtil";
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { TimerCommonComponent } from '../../resources/scripts/Game/UI/Common/TimerCommonComponent';
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { GameType, IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";

import { SkewersManager } from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
import { SkewersGameType } from "db://assets/resources/scripts/Game/Task/Skewers/SkewersGameData";
import { EventManager } from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
import { ScreenSizeUtil } from '../../resources/scripts/Adapter/ScreenSizeUtil';
import {AlertData, AlertManager} from "db://assets/resources/scripts/Core/Manager/Alert/AlertManager";
import {SocketUtil} from "db://assets/resources/scripts/Core/Manager/Net/SocketUtil";

const { ccclass, property } = _decorator;
@ccclass('puzzleGame')
export class puzzleGame extends BaseScene<IBaseGameChild> {
    @property(Node)
    public viewNode: Node = null;

    protected bundleName: string = BundleName.PUZZLE;

    @property(Prefab)
    private chipNodePrefab: Prefab;

    @property(Node)
    private chipParentNode: Node;

    @property(Node)
    private bigLoadNode:Node;

    @property(Node)
    private smallLoadNode:Node;

    @property(Node)
    quitBtn: Node;


    @property(ProgressBar)
    progressBar: ProgressBar;

    @property(Label)
    guankaLabel: Label;

    // 可拖拽的节点
    @property(Node)
    private draggableNode: Node;

    @property(Number)
    private chipGap: number = 1;

    private gameLength: number = 180;

    @property(Sprite)
    private previewSprite: Sprite;

    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent;


    @property(Node)
    private startGameMask: Node;

    // @property(puzzleSummaryAlert)
    // private summaryAlert: puzzleSummaryAlert;


    @property(Node)
    private showSpriteNode: Node;

    @property(Sprite)
    private showSprite: Sprite;

    @property(Node)
    private showResultContinueButton: Node;

    @property(Node)
    private touchMask: Node;

    //显示对象
    private chipsInstances: Node[] = [];
    //数据 矩形区域 rect 位置编号 position
    private chipsDataMap: Map<number, Object> = new Map();
    
    // 游戏结算状态
    private _isGameCompleted: boolean = false;

    private dragStartPos: Vec2 = new Vec2(); //触点起始位置
    private dragObjectStartPos: Vec3 = new Vec3();
    private dragInstance: Node = null;
    private dragStartFlag: boolean = false;
    private selectedLevelIndex: number = 0;

    private levelList: Vec2[] = [
        new Vec2(2, 3),
        new Vec2(3, 3),
        new Vec2(4, 4)
    ];
    private selectedLevel: Vec2 = this.levelList[this.selectedLevelIndex];
    private textureIndex: number = 0;
    private randomPlayIndex: number[] = [];
    private currentTexture2d: Texture2D = null;

    private _startTime: number = 0;

    private loadTextureResolver: (texture: Texture2D) => void = null;
    private loadTextureRejector: (err) => void = null;

    private _timeID;

    private _endTime: number = 0;

    // 添加一个新属性来控制是否允许拖拽
    private isDragEnabled: boolean = true;

    // 添加一个属性来控制是否允许退出
    private isQuitEnabled: boolean = true;

    // 加载状态管理
    private isLoading: boolean = false;
    private loadingTimeoutId: any = null;
    private readonly LOADING_TIMEOUT: number = 10000; // 10秒超时

    protected audioUrls = ['music/puzzleBG', "music/drag", "music/win"];

    private bgmClip: AudioClip;

    private async loadPuzzleTexture(id: number): Promise<Texture2D> {
        // 设置加载状态
        this.isLoading = true;
        this.setQuitButtonInteractable(false);
        this.bigLoadNode.active = true;
        this.smallLoadNode.active = true;
        
        // 清除之前的超时定时器
        // if (this.loadingTimeoutId) {
        //     clearTimeout(this.loadingTimeoutId);
        //     this.loadingTimeoutId = null;
        // }

        const bundle = assetManager.getBundle(this.bundleName);
        return new Promise<Texture2D>((resolve, reject) => {
            this.loadTextureResolver = resolve;
            this.loadTextureRejector = reject;

            // 设置超时检测
            // this.loadingTimeoutId = setTimeout(() => {
            //     this.handleLoadingTimeout();
            // }, this.LOADING_TIMEOUT);

            bundle.load("texture/pintu" + (id).toString() + "/texture", Texture2D, (err, data) => {
                // 清除超时定时器
                if (this.loadingTimeoutId) {
                    clearTimeout(this.loadingTimeoutId);
                    this.loadingTimeoutId = null;
                }

                // 重置加载状态
                this.isLoading = false;
                this.bigLoadNode.active = false;
                this.smallLoadNode.active = false;
                this.setQuitButtonInteractable(true);

                if (err) {
                    if (this.loadTextureRejector) {
                        this.loadTextureRejector(err);
                    }
                } else {
                    if (this.loadTextureResolver) {
                        this.loadTextureResolver(data);
                    }
                }
                this.loadTextureResolver = null;
                this.loadTextureRejector = null;
            })
        });
    }

    onLoad() {
        this.loadAudio().then(() => {
            this.playBgmAudio("music/puzzleBG", true);
        });
    }

    private textureLen = 463;
    start() {
        super.start();
        for (let i = 1; i < this.textureLen; i++) {
            this.randomPlayIndex.push(i);
        }
        this.showSpriteNode.active = false;
        this.showResultContinueButton.active = false;
        
        // 添加应用前后台切换监听
        this.addAppStateListener();
        this.cleanChipsCache();
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            let game = (this.sceneModel as any).game;
            this.selectedLevelIndex = (this.sceneModel as any).difficulty - 1;
            this.gameLength = game.timeLimit;
            this.textureIndex = (game.level - 1) % this.randomPlayIndex.length;

            let skewersGameData = (this.sceneModel as any).game;
            this.progressBar.progress = skewersGameData.progress;
            this.guankaLabel.string = "第" + skewersGameData.progressStr + "关";
            // 串烧训练时，直接开始训练，不显示开始提示
            let textureID = this.randomPlayIndex[this.textureIndex];
            this.loadPuzzleTexture(textureID).then((texture) => {
                this.currentTexture2d = texture;
                this.cropTextureToSprites(this.levelList[this.selectedLevelIndex], this.currentTexture2d);
                this.updatePreviewSprite(this.currentTexture2d);
                // 直接调用开始训练
                this.onClickStartGame();
            });
        } else {
            this.selectedLevelIndex = (this.sceneModel as any).difficulty - 1;
            this.textureIndex = ((this.sceneModel as any).level - 1) % this.randomPlayIndex.length;
            let level = (this.sceneModel as any).level;
            this.progressBar.progress = 1;
            this.guankaLabel.string = "第" + level + "关";
            // 非串烧训练时，显示开始提示
            // this.showStartAlert({ parentNode: this.viewNode, start: this.onClickStartGame, context: this });
            let textureID = this.randomPlayIndex[this.textureIndex];
            this.loadPuzzleTexture(textureID).then((texture) => {
                this.currentTexture2d = texture;
                this.cropTextureToSprites(this.levelList[this.selectedLevelIndex], this.currentTexture2d);
                this.updatePreviewSprite(this.currentTexture2d);
                this.onClickStartGame();
            });
        }
    }

    onEnable() {
        if (this.draggableNode) {
            this.draggableNode.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.draggableNode.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
            this.draggableNode.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.draggableNode.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        }
        super.onEnable();
    }

    onDisable() {
        if (this.draggableNode) {
            this.draggableNode.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.draggableNode.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
            this.draggableNode.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.draggableNode.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        }
        this.cleanChipsCache();
        super.onDisable();
    }

    protected onDestroy(): void {
        this.resetDragState();
        this.loadTextureRejector = null;
        this.loadTextureResolver = null;
        
        // 清理加载超时定时器
        if (this.loadingTimeoutId) {
            clearTimeout(this.loadingTimeoutId);
            this.loadingTimeoutId = null;
        }
        
        // 移除应用状态监听
        game.off(Game.EVENT_HIDE, this.onAppHide, this);
        game.off(Game.EVENT_SHOW, this.onAppShow, this);
        
        super.onDestroy();
    }

    cropTextureToSprites(cropSize: Vec2, texture: Texture2D) {
        const textureRect = new Size(texture.width, texture.height);
        const cropWidth = textureRect.width / cropSize.x;
        const cropHeight = textureRect.height / cropSize.y;

        const rectList: Rect[] = [];

        // 按照 cropSize.x 和 cropSize.y 进行切割
        for (let i = 0; i < cropSize.y; i++) {
            for (let j = 0; j < cropSize.x; j++) {
                const rect = new Rect(j * cropWidth, i * cropHeight, cropWidth, cropHeight);
                rectList.push(rect);
            }
        }

        const scaleRate = this.chipParentNode.getComponent(UITransform).contentSize.width / textureRect.width;
        for (let i = 0; i < rectList.length; i++) {
            const instantiatedPrefab = instantiate(this.chipNodePrefab);
            this.chipsInstances.push(instantiatedPrefab);

            const spriteComponent = instantiatedPrefab.getChildByName("Sprite").getComponent(Sprite);

            const spriteFrame = new SpriteFrame();
            spriteFrame.texture = texture;
            spriteFrame.rect = rectList[i];
            spriteComponent.spriteFrame = spriteFrame;

            instantiatedPrefab.setParent(this.chipParentNode);

            const rect = new Rect(
                rectList[i].x * scaleRate,
                (0 - rectList[i].y - rectList[i].height) * scaleRate,
                rectList[i].width * scaleRate,
                rectList[i].height * scaleRate
            );

            const gap = this.chipGap.valueOf();
            instantiatedPrefab.setPosition(rect.x + gap / 2, rect.y + gap / 2);
            instantiatedPrefab.getComponent(UITransform).contentSize = new Size(rect.width - gap, rect.height - gap);
            instantiatedPrefab.setSiblingIndex(0);

            this.chipsDataMap.set(i, { rect: rect, puzzlePos: i, objectPos: instantiatedPrefab.getPosition() });
        }
    }

    cleanChipsCache() {
        while (this.chipsInstances.length > 0) {
            const node = this.chipsInstances.pop();
            node.removeFromParent();
            node.destroy();
        }
        this.chipsDataMap.clear();
        this.previewSprite.spriteFrame = null;
        this.showSprite.spriteFrame = null;
    }

    onTouchStart(event: EventTouch) {
        // 拖拽被禁用或已有拖拽实例时直接返回
        if (!this.isDragEnabled || this.dragInstance != null || this.dragStartFlag) return;

        this.dragStartFlag = true;
        let currentPos: Vec2 = event.getUILocation();
        let vec3 = this.chipParentNode.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(currentPos.x, currentPos.y, 0));
        vec3.x = vec3.x - this.offsetX;
        const startpos = new Vec2(vec3.x, vec3.y);
        let selectedObjectIndex = this.checkTouchedObjectIndex(startpos);

        if (selectedObjectIndex != -1) {
            this.dragInstance = this.chipsInstances[selectedObjectIndex];
            this.dragObjectStartPos = this.getChipDataByPuzzlePos(selectedObjectIndex)["objectPos"];
            this.dragStartPos = startpos;
            this.dragInstance.setSiblingIndex(100);
        } else {
            this.resetDragState();
        }
    }

    onTouchMove(event: EventTouch) {
        if (!this.isDragEnabled || this.dragInstance == null || !this.dragStartFlag) return;

        let currentPos: Vec2 = event.getUILocation();
        const vec3 = this.chipParentNode.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(currentPos.x, currentPos.y, 0));
        const offset = vec3.subtract(new Vec3(this.dragStartPos.x, this.dragStartPos.y, 0));
        this.dragInstance.setPosition(this.dragObjectStartPos.x + offset.x - this.offsetX, this.dragObjectStartPos.y + offset.y);
    }

    onTouchEnd(event: EventTouch) {
        if (!this.isDragEnabled || this.dragInstance == null || !this.dragStartFlag) return;

        this.playAudio("music/drag", true);
        this.dragStartFlag = false;

        const currentPos: Vec2 = event.getUILocation();
        const vec3 = this.chipParentNode.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(currentPos.x, currentPos.y, 0));
        const endpos = new Vec2(vec3.x - this.offsetX, vec3.y);

        try {
            const selectedObjectIndex = this.checkTouchedObjectIndex(endpos);

            // 检查getChipDataByPuzzlePos是否会报错
            const dragInstanceIndex = this.chipsInstances.indexOf(this.dragInstance);
            const dragChipData = this.getChipDataByPuzzlePos(dragInstanceIndex);
            const targetChipData = selectedObjectIndex !== -1 ? this.getChipDataByPuzzlePos(selectedObjectIndex) : null;

            if (!dragChipData || (selectedObjectIndex !== -1 && !targetChipData)) {
                DebugLog.instance.log(`[puzzleGame] getChipDataByPuzzlePos 报错，拖拽图片返回原位置`);
                this.processTouchCancel();
                this.dragInstance = null;
                return;
            }

            if (this.chipsInstances.indexOf(this.dragInstance) != selectedObjectIndex && selectedObjectIndex != -1) {
                this.swapPuzzleChips(selectedObjectIndex, this.chipsInstances.indexOf(this.dragInstance));
                
                // 更新所有chipNode的border状态
                this.updateAllChipBorders();
                
                if (this.checkPuzzleResult()) {
                    this.processGameSuccess();
                }
            } else {
                this.processTouchCancel();
                this.dragInstance = null;
            }
        } catch (error) {
            DebugLog.instance.debug(`[puzzleGame] onTouchEnd 发生错误: ${error}，拖拽图片返回原位置`);
            this.processTouchCancel();
            this.dragInstance = null;
        }

        this.dragInstance = null;
        DebugLog.instance.log("当前数量：" + this.getCorrentCounts());
        DebugLog.instance.log('总数', this.chipsInstances.length);
    }

    onTouchCancel(event: EventTouch) {
        if (!this.isDragEnabled || this.dragInstance == null || !this.dragStartFlag) return;

        this.dragStartFlag = false;
        this.processTouchCancel();
        this.dragInstance = null;
    }

    // 重置拖拽状态
    private resetDragState() {
        this.dragStartFlag = false;
        this.dragInstance = null;
    }

    quitGame() {
        // 如果退出被禁用或正在加载中，直接返回
        if (!this.isQuitEnabled || this.isLoading) {
            return;
        }

        this.resetDragState();

        super.quitGame({ parentNode: this.viewNode, context: this });
        if (this._timeID) {
            clearTimeout(this._timeID);
        }
    }

    private processTouchCancel() {
        if (!this.dragInstance) return;

        try {
            // 检查dragObjectStartPos是否有效
            if (this.dragObjectStartPos &&
                typeof this.dragObjectStartPos.x === 'number' &&
                typeof this.dragObjectStartPos.y === 'number') {

                tween(this.dragInstance)
                    .to(0.3, { position: this.dragObjectStartPos })
                    .start();
            } else {
                DebugLog.instance.error(`[puzzleGame] dragObjectStartPos 无效，直接重置拖拽状态`);
            }
        } catch (error) {
            DebugLog.instance.error(`[puzzleGame] processTouchCancel 发生错误: ${error}`);
        }

        this.dragInstance.setSiblingIndex(0);
        this.resetDragState();
    }

    processGameSuccess() {
        this.isDragEnabled = false;
        this._isGameCompleted = true; // 设置游戏完成状态
        
        // 禁用退出按钮
        this.setQuitButtonInteractable(false);

        if (this._timeID) {
            clearTimeout(this._timeID);
        }

        this.timerComponent.pauseTimer();
        
        // 暂停背景音乐
        this.pauseBgmAudio();
        
        // 隐藏底图（拼图块）
        this.chipParentNode.active = false;
        
        this.showSpriteNode.active = true;
        this.playAudio("music/win", true);
        // 设置缩放动画（循环2次后完成）
        let _tween = tween(this.showSpriteNode)
            .to(2, { scale: new Vec3(1.1, 1.1, 1.1) }, { easing: 'cubicOut' })
            .to(2, { scale: new Vec3(1, 1, 1) }, { easing: 'cubicOut' })
            .union()
            .repeat(1)  // 指定重复次数
            .call(() => {
                // 动画完成回调，在指定次数的动画全部完成后执行
                this.showSpriteNode.setScale(new Vec3(1, 1, 1));
                this.showSpriteNode.active = false;
                
                // 显示底图（拼图块）
                this.chipParentNode.active = true;
                
                // 重新启用退出按钮
                this.setQuitButtonInteractable(true);
                
                // 重置游戏完成状态，允许继续操作
                this._isGameCompleted = false;
               
                // 处理训练结果
                if (this.sceneModel.gameType == GameType.SKEWERS) {
                    this.requestGameResult();
                } else {
                    this._requestGameCenterComplete(1);
                    (this.sceneModel as any).showSuccessView();
                }
            })
            .start();

    }

    // 启用拖拽功能和重置训练状态
    private enableDragAndResetGame() {
        this.isDragEnabled = true;
        this._isGameCompleted = false; // 重置游戏完成状态
    }

    // 设置退出按钮的交互状态
    private setQuitButtonInteractable(interactable: boolean): void {
        if (this.quitBtn && this.quitBtn.isValid) {
            const button = this.quitBtn.getComponent(Button);
            if (button) {
                button.interactable = interactable;
            }
        }
        this.isQuitEnabled = interactable;
    }

    onClickStartGame() {
        this.enableDragAndResetGame();
        
        // 确保退出按钮在游戏开始时是启用的
        this.setQuitButtonInteractable(true);

        this._startTime = TimeUtil.getNow();
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.timerComponent.startTimer((this.sceneModel as any).game.timeLimit);
            let skewersGameData = (this.sceneModel as any).game;
            this.progressBar.progress = skewersGameData.progress;
            this.guankaLabel.string = "第" + skewersGameData.progressStr + "关";
        } else {
            this.timerComponent.startTimer(this.gameLength.valueOf());
            let level = (this.sceneModel as any).level;
            this.progressBar.progress = 1;
            this.guankaLabel.string = "第" + level + "关";
        }
        this.onClickDisturbPuzzleButton();
        
        this.startGameMask.active = false;
        this.playBgmAudio("music/puzzleBG", true);
    }

    goonHandler(context) {
        // 如果游戏在结算阶段且动画还在进行中，只关闭弹窗，不执行继续游戏操作
        if (context._isGameCompleted && context.showSpriteNode.active) {
            DebugLog.instance.log("游戏在结算阶段且动画进行中，只关闭弹窗");
            return;
        }
        
        context.enableDragAndResetGame();

        if (context.sceneModel.gameType == GameType.SKEWERS) {
            (context.sceneModel as any).goonHandler(context);
            return;
        }

        context.onClickChangeLevel().then(() => {
            context.startGameMask.active = true;
            context.timerComponent.resetTimer();
        });
    }

    dzgoonHandler(context,resuleBoo: boolean = true) {
        context.clearGameView();
        if (context.sceneModel) {
            if (context.sceneModel.gameType == GameType.SKEWERS) {
                // 直接发送训练完成请求，不处理弹窗逻辑
                // 直接向服务器发送请求，但不处理回调
                let self = context;
                let trainData = SkewersManager.getInstance().getUnCompleteGameData();
                let _boo = trainData.type != SkewersGameType.Executionability;
                if (!_boo) {
                    EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, (data) => {
                        (self.sceneModel as any).goonHandler(self, true);
                    }, self, true);
                    self.clearGameView();
                    SkewersManager.getInstance().requestGameComplete(self.complete, self.duration);
                } else {
                    (context.sceneModel as any).goonHandler(self, true);
                }
            }
        }
    }

    onClickRetryCurrentLevel() {
        this.enableDragAndResetGame();

        this.cleanChipsCache();

        this.startGameMask.active = true;
        this.timerComponent.resetTimer();

        let textureID = this.randomPlayIndex[this.textureIndex];
        this.loadPuzzleTexture(textureID).then((texture) => {
            this.currentTexture2d = texture;
            this.cropTextureToSprites(this.levelList[this.selectedLevelIndex], this.currentTexture2d);
            this.updatePreviewSprite(this.currentTexture2d);
            this.onClickDisturbPuzzleButton();
            
            // 调用开始游戏方法，这会隐藏startGameMask并启动游戏
            this.onClickStartGame();
        });
    }

    private requestGameResult() {
        // 上报数据
        let endTime = TimeUtil.getNow();
        let complete = this.getCorrentCounts() / this.chipsInstances.length;
        if (this._startTime == 0) {
            this._startTime = endTime;
        }
        let duration = (endTime - this._startTime) / 1000;
        this.requestGameComplete({ context: this, parentNode: this.viewNode, complete, duration });
    }

    public exitCallBack(context) {
        context.pauseTime();
        super.exitCallBack(context);
    }

    private autoExitCallBack(context) {
        clearInterval(context.timerId);
        clearTimeout(context._setTimeOutId);
        //上报数据
        context.requestGameResult(false);
        super.exitCallBack(context);
    }

    private checkTouchedObjectIndex(currentPos: Vec2): number {
        //先确定触摸的格子
        var puzzlePos = -1;
        var positionIndex = -1;
        
        for (let [key, value] of this.chipsDataMap.entries()) {
            const rect: Rect = value["rect"];
            if (rect.contains(new Vec2(currentPos.x, currentPos.y))) {
                puzzlePos = value["puzzlePos"];
                positionIndex = key;
                break;
            }
        }

        // 如果检测到位置，检查该位置上的拼图块是否已在正确位置
        if (puzzlePos !== -1 && positionIndex !== -1) {
            // 检查当前在positionIndex位置的拼图块是否就是应该在这个位置的拼图块
            if (puzzlePos === positionIndex) {
                DebugLog.instance.log(`[puzzleGame] 触摸到位置${positionIndex}的拼图块${puzzlePos}已在正确位置，返回-1`);
                return -1; // 拼图块已在正确位置，返回-1避免重复操作
            }
        }

        return puzzlePos;
    }

    private swapPuzzleChips(puzzlePos1: number, puzzlePos2: number) {
        try {
            const chipData1 = this.getChipDataByPuzzlePos(puzzlePos1);
            const chipData2 = this.getChipDataByPuzzlePos(puzzlePos2);
            if (!chipData1 || !chipData2) {
                DebugLog.instance.error(`[puzzleGame] 交换失败: chipData1=${chipData1} chipData2=${chipData2}`);
                if (this.dragInstance) {
                    this.processTouchCancel();
                }
                return;
            }

            const chipLastPos1 = chipData1["puzzlePos"];
            const chipLastPos2 = chipData2["puzzlePos"];

            chipData1["puzzlePos"] = chipLastPos2;
            chipData2["puzzlePos"] = chipLastPos1;

            const duration = 0.3;
            const targetPosition1 = chipData2["objectPos"];
            tween(this.chipsInstances[puzzlePos1]).to(duration, { position: targetPosition1 }).start();

            const targetPosition2 = chipData1["objectPos"];
            tween(this.chipsInstances[puzzlePos2]).to(duration, { position: targetPosition2 }).start();
        } catch (error) {
            DebugLog.instance.error(`[puzzleGame] swapPuzzleChips 发生错误: ${error}`);
            // 如果交换过程中出现错误，尝试让拖拽的图片返回原位置
            if (this.dragInstance) {
                this.processTouchCancel();
            }
        }
    }

    private get offsetX() {
        const uiSize = ScreenSizeUtil.getUISize();
        const screenWidth = uiSize.width;
        let scale = screenWidth/1080 >1?1:screenWidth/1080;
        let contentSizeWidth = this.chipParentNode.getComponent(UITransform).contentSize.width;
        return  (screenWidth - contentSizeWidth)/2-75/scale;
    }

    private getChipDataByPuzzlePos(puzzlePos: number): Object {
        try {
            // 参数验证
            if (puzzlePos < 0 || puzzlePos >= this.chipsInstances.length) {
                DebugLog.instance.error(`[puzzleGame] getChipDataByPuzzlePos 参数错误: puzzlePos=${puzzlePos}, chipsInstances.length=${this.chipsInstances.length}`);
                return null;
            }

            for (let [key, value] of this.chipsDataMap.entries()) {
                const pos: number = value["puzzlePos"];
                if (pos == puzzlePos) {
                    return value;
                }
            }

            DebugLog.instance.error(`[puzzleGame] getChipDataByPuzzlePos 未找到数据: puzzlePos=${puzzlePos}`);
            return null;
        } catch (error) {
            DebugLog.instance.error(`[puzzleGame] getChipDataByPuzzlePos 发生错误: ${error}, puzzlePos=${puzzlePos}`);
            return null;
        }
    }

    private checkPuzzleResult(): boolean {
        let index = 0;
        for (let [key, value] of this.chipsDataMap.entries()) {
            if (value["puzzlePos"] == index) {
                index++;
            }
            else {
                return false;
            }
        }
        return true;
    }

    // 检测并更新所有chipNode的border状态
    private updateAllChipBorders() {
        for (let i = 0; i < this.chipsInstances.length; i++) {
            this.updateChipBorder(i);
        }
    }

    // 检测单个chipNode是否在正确位置并更新border状态
    private updateChipBorder(chipIndex: number) {
        const chipNode = this.chipsInstances[chipIndex];
        if (!chipNode || !chipNode.isValid) {
            DebugLog.instance.warn(`[puzzleGame] chipNode[${chipIndex}] 无效`);
            return;
        }
        // 获取border子节点
        const borderNode = chipNode.getChildByName("border");
        if (!borderNode) {
            DebugLog.instance.warn(`[puzzleGame] chipNode[${chipIndex}] 没有找到border子节点`);
            return;
        }
        
        // 遍历chipsDataMap，找到位置chipIndex对应的数据
        let isInCorrectPosition = false;
        for (let [key, value] of this.chipsDataMap.entries()) {
            if (key === chipIndex) {
                // 检查当前在位置chipIndex的拼图块是否就是应该在这个位置的拼图块
                isInCorrectPosition = value["puzzlePos"] == chipIndex;
                break;
            }
        }
        
        // 更新border节点的active状态
        borderNode.active = isInCorrectPosition;
    }

    private getCorrentCounts() {
        let counts = 0;
        for (let [key, value] of this.chipsDataMap.entries()) {
            if (value["puzzlePos"] == key) {
                counts++;
            }
        }
        return counts;
    }

    // 优化后的智能交换方法，确保每次交换都不会让元素回到原位
    private smartSwapPuzzleChipsNTimes(n: number) {
        const maxPos = this.selectedLevel.x * this.selectedLevel.y;
        
        // 如果只有1个拼图块，无法打乱
        if (maxPos <= 1) {
            return;
        }
        
        // 记录每个位置当前存放的拼图块索引
        let currentPositions: number[] = [];
        for (let i = 0; i < maxPos; i++) {
            currentPositions.push(i);
        }
        
        // 执行n次智能交换
        for (let i = 0; i < n; i++) {
            // 找到两个可以安全交换的位置
            const swapPositions = this.findSafeSwapPositions(currentPositions);
            
            if (swapPositions.length === 2) {
                const [pos1, pos2] = swapPositions;
                
                // 执行交换
                this.swapPuzzleChips(pos1, pos2);
                
                // 更新位置记录
                [currentPositions[pos1], currentPositions[pos2]] = [currentPositions[pos2], currentPositions[pos1]];
            } else {
                // 如果找不到安全交换位置，跳过这次交换
                DebugLog.instance.log(`[puzzleGame] 第${i+1}次交换：找不到安全交换位置，跳过`);
            }
        }
    }

    // 找到两个可以安全交换的位置（交换后两个元素都不会回到原位）
    private findSafeSwapPositions(currentPositions: number[]): number[] {
        const maxPos = currentPositions.length;
        const candidates: number[] = [];
        
        // 收集所有可以安全交换的位置对
        for (let i = 0; i < maxPos; i++) {
            for (let j = i + 1; j < maxPos; j++) {
                // 检查交换后两个元素是否都不会回到原位
                if (this.isSafeSwap(currentPositions, i, j)) {
                    candidates.push(i, j);
                }
            }
        }
        
        // 如果找到候选位置，随机选择一个
        if (candidates.length >= 2) {
            const randomIndex = Math.floor(Math.random() * (candidates.length / 2)) * 2;
            return [candidates[randomIndex], candidates[randomIndex + 1]];
        }
        
        return [];
    }

    // 检查交换两个位置是否安全（两个元素都不会回到原位）
    private isSafeSwap(currentPositions: number[], pos1: number, pos2: number): boolean {
        // 获取当前位置的拼图块
        const chipAtPos1 = currentPositions[pos1];
        const chipAtPos2 = currentPositions[pos2];
        
        // 检查交换后是否会导致任何一张图片回到原本位置
        // 拼图块chipAtPos1原本在位置chipAtPos1，交换后到位置pos2，不能等于chipAtPos1
        // 拼图块chipAtPos2原本在位置chipAtPos2，交换后到位置pos1，不能等于chipAtPos2
        if (pos2 === chipAtPos1 || pos1 === chipAtPos2) {
            return false; // 有拼图块会回到原本位置，不安全
        }
        
        return true; // 安全，可以交换
    }

    private shuffleArray(array: number[]) {
        for (let i = array.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // 检测拼图打乱结果
    private checkPuzzleShuffleResult() {
        const maxPos = this.selectedLevel.x * this.selectedLevel.y;
        let correctCount = 0;
        let totalCount = maxPos;
        let shuffleInfo = "";
        
        // 统计正确位置的拼图块数量
        for (let [key, value] of this.chipsDataMap.entries()) {
            const currentPos = value["puzzlePos"];
            const correctPos = key;
            
            if (currentPos === correctPos) {
                correctCount++;
            }
            
            // 构建打乱信息字符串
            if (shuffleInfo) {
                shuffleInfo += ", ";
            }
            shuffleInfo += `位置${key}: 拼图块${currentPos}`;
        }
        
        // 计算打乱程度
        const shuffleRate = ((totalCount - correctCount) / totalCount * 100).toFixed(2);
        const isFullyShuffled = correctCount === 0;
        
        // 输出检测结果
        DebugLog.instance.log(`[puzzleGame] 拼图打乱检测结果:`);
        DebugLog.instance.log(`- 总拼图块数: ${totalCount}`);
        DebugLog.instance.log(`- 正确位置数: ${correctCount}`);
        DebugLog.instance.log(`- 打乱程度: ${shuffleRate}%`);
        DebugLog.instance.log(`- 是否完全打乱: ${isFullyShuffled ? "是" : "否"}`);
        DebugLog.instance.log(`- 打乱详情: ${shuffleInfo}`);
        
        // 如果完全打乱，输出成功信息
        if (isFullyShuffled) {
            DebugLog.instance.log(`[puzzleGame] ✅ 拼图已完全打乱，所有拼图块都不在正确位置`);
        } else {
            DebugLog.instance.log(`[puzzleGame] ⚠️ 拼图未完全打乱，仍有 ${correctCount} 个拼图块在正确位置`);
        }
        
        return {
            totalCount,
            correctCount,
            shuffleRate: parseFloat(shuffleRate),
            isFullyShuffled,
            shuffleInfo
        };
    }

    // 调整原位块，确保完全打乱
    private adjustInPlaceBlocks() {
        DebugLog.instance.log(`[puzzleGame] 开始调整原位块...`);
        
        // 找出所有原位块
        const inPlaceBlocks: number[] = [];
        for (let [key, value] of this.chipsDataMap.entries()) {
            const currentPos = value["puzzlePos"];
            const correctPos = key;
            if (currentPos === correctPos) {
                inPlaceBlocks.push(key);
            }
        }
        
        const K = inPlaceBlocks.length;
        DebugLog.instance.log(`[puzzleGame] 发现 ${K} 个原位块: [${inPlaceBlocks.join(', ')}]`);
        
        if (K === 0) {
            // 情况1：无原位块，直接返回
            DebugLog.instance.log(`[puzzleGame] 无原位块，无需调整`);
            return;
        } else if (K === 1) {
            // 情况2：有1个原位块
            this.adjustSingleInPlaceBlock(inPlaceBlocks[0]);
        } else {
            // 情况3：有≥2个原位块
            this.adjustMultipleInPlaceBlocks(inPlaceBlocks);
        }
        
        // 调整完成后再次检测
        DebugLog.instance.log(`[puzzleGame] 原位块调整完成，开始最终检测...`);
        const finalResult = this.checkPuzzleShuffleResult();
        DebugLog.instance.log(`[puzzleGame] 原位块调整完成，最终结果: ${finalResult.isFullyShuffled ? "完全打乱" : "仍有原位块"}`);
        
        // 如果仍未完全打乱，进行最后一次强制调整
        if (!finalResult.isFullyShuffled) {
            DebugLog.instance.warn(`[puzzleGame] 调整后仍有原位块，进行强制调整...`);
            this.forceAdjustRemainingBlocks();
            
            // 最终检测
            const ultimateResult = this.checkPuzzleShuffleResult();
            DebugLog.instance.log(`[puzzleGame] 强制调整完成，最终结果: ${ultimateResult.isFullyShuffled ? "完全打乱" : "仍有原位块"}`);
        }
    }

    // 调整单个原位块
    private adjustSingleInPlaceBlock(inPlaceIndex: number) {
        DebugLog.instance.log(`[puzzleGame] 调整单个原位块: 位置${inPlaceIndex}`);
        
        const maxPos = this.selectedLevel.x * this.selectedLevel.y;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
            // 随机选择另一个非原位块的索引
            let targetIndex = Math.floor(Math.random() * maxPos);
            while (targetIndex === inPlaceIndex) {
                targetIndex = Math.floor(Math.random() * maxPos);
            }
            
            // 检查交换后是否安全
            const targetChipData = this.getChipDataByPuzzlePos(targetIndex);
            if (targetChipData && targetChipData["puzzlePos"] !== inPlaceIndex) {
                // 执行交换
                this.swapPuzzleChips(inPlaceIndex, targetIndex);
                DebugLog.instance.log(`[puzzleGame] 交换位置${inPlaceIndex}和位置${targetIndex}`);
                return;
            }
            
            attempts++;
        }
        
        DebugLog.instance.warn(`[puzzleGame] 调整单个原位块失败，已达到最大尝试次数`);
    }

    // 调整多个原位块
    private adjustMultipleInPlaceBlocks(inPlaceBlocks: number[]) {
        DebugLog.instance.log(`[puzzleGame] 调整多个原位块: [${inPlaceBlocks.join(', ')}]`);
        
        const K = inPlaceBlocks.length;
        
        // 两两交换
        for (let i = 0; i < K - 1; i += 2) {
            const pos1 = inPlaceBlocks[i];
            const pos2 = inPlaceBlocks[i + 1];
            this.swapPuzzleChips(pos1, pos2);
            DebugLog.instance.log(`[puzzleGame] 交换位置${pos1}和位置${pos2}`);
        }
        
        // 如果K为奇数，处理最后一个原位块
        if (K % 2 === 1) {
            const lastInPlaceIndex = inPlaceBlocks[K - 1];
            // 与列表中任意一个已交换的块再次交换
            const swapTarget = inPlaceBlocks[0];
            this.swapPuzzleChips(lastInPlaceIndex, swapTarget);
            DebugLog.instance.log(`[puzzleGame] 处理奇数情况，交换位置${lastInPlaceIndex}和位置${swapTarget}`);
        }
    }

    // 强制调整剩余的原位块
    private forceAdjustRemainingBlocks() {
        DebugLog.instance.log(`[puzzleGame] 开始强制调整剩余原位块...`);
        
        // 找出所有剩余的原位块
        const remainingInPlaceBlocks: number[] = [];
        for (let [key, value] of this.chipsDataMap.entries()) {
            const currentPos = value["puzzlePos"];
            const correctPos = key;
            if (currentPos === correctPos) {
                remainingInPlaceBlocks.push(key);
            }
        }
        
        DebugLog.instance.log(`[puzzleGame] 发现 ${remainingInPlaceBlocks.length} 个剩余原位块: [${remainingInPlaceBlocks.join(', ')}]`);
        
        if (remainingInPlaceBlocks.length === 0) {
            DebugLog.instance.log(`[puzzleGame] 无剩余原位块，强制调整完成`);
            return;
        }
        
        // 强制调整策略：将每个原位块与随机位置交换
        for (const inPlaceIndex of remainingInPlaceBlocks) {
            const maxPos = this.selectedLevel.x * this.selectedLevel.y;
            let targetIndex = Math.floor(Math.random() * maxPos);
            
            // 确保不与自己交换
            while (targetIndex === inPlaceIndex) {
                targetIndex = Math.floor(Math.random() * maxPos);
            }
            
            // 执行强制交换
            this.swapPuzzleChips(inPlaceIndex, targetIndex);
            DebugLog.instance.log(`[puzzleGame] 强制交换位置${inPlaceIndex}和位置${targetIndex}`);
        }
        
        DebugLog.instance.log(`[puzzleGame] 强制调整完成`);
    }

    onClickDisturbPuzzleButton() {
        this.selectedLevelIndex = (this.sceneModel as any).difficulty - 1;
        this.selectedLevel = this.levelList[this.selectedLevelIndex];
        // 使用智能交换方法，确保每次交换都不会让图片回到原本位置
        this.smartSwapPuzzleChipsNTimes(this.selectedLevel.x * this.selectedLevel.y);
        
        // 打乱完成后检测是否完全打乱
        const shuffleResult = this.checkPuzzleShuffleResult();
        
        // 如果未完全打乱，进行原位块调整
        if (!shuffleResult.isFullyShuffled) {
            this.adjustInPlaceBlocks();
        }
        
        // 更新所有chipNode的border状态
        this.updateAllChipBorders();
    }

    onClickChangeLevel(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                this.selectedLevelIndex = (this.sceneModel as any).difficulty - 1;
            } else {
                this.selectedLevelIndex = (this.sceneModel as any).difficulty - 1;
            }

            this.selectedLevel = this.levelList[this.selectedLevelIndex];
            this.textureIndex = ((this.sceneModel as any).level - 1) % this.randomPlayIndex.length;
            this.cleanChipsCache();

            let textureID = this.randomPlayIndex[this.textureIndex];
            this.loadPuzzleTexture(textureID).then((texture) => {
                this.currentTexture2d = texture;
                this.cropTextureToSprites(this.levelList[this.selectedLevelIndex], this.currentTexture2d);
                this.updatePreviewSprite(this.currentTexture2d);
                resolve();
            });
        });

    }

    private updatePreviewSprite(texture: Texture2D) {
        let newSpriteFrame = new SpriteFrame();
        newSpriteFrame.texture = texture;
        this.previewSprite.spriteFrame = newSpriteFrame;
        this.showSprite.spriteFrame = newSpriteFrame;
    }

    onClickStartTimer() {
        this.timerComponent.resetTimer();
        this.timerComponent.startTimer(10);
        this._startTime = TimeUtil.getNow();
    }

    onTimerEnd() {
        DebugLog.instance.log("计时器结束了，执行相应逻辑");
        this.processGameFail();
    }

    processGameFail() {
        DebugLog.instance.log("失败");
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            // EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this.failRequestSkewersGameComplete, this);
            this.requestGameResult();
        } else {
            this._requestGameCenterComplete(0);
            (this.sceneModel as any).showFailView();
        }
        this.playFail();
    }


    private _requestGameCenterComplete(win: number = 0) {
        const curGame = (this.sceneModel as any).game;
        this._endTime = TimeUtil.getNow();
        let level = curGame.level;
        let difficulty = curGame.difficulty;//level % 3 == 0?3:level % 3;
        let duration = (this._endTime - this._startTime) / 1000;
        let complete = this.getCorrentCounts() / this.chipsInstances.length;

        this.requestGameComplete({
            sessionId: curGame.sessionid,
            count: win,
            level,
            complete,
            duration,
            timelimit: this.gameLength,
            difficulty,
            levelMode: curGame.levelMode
        });
    }

    onClickTimeOut() {
        this.timerComponent.resetTimer();
        this.onTimerEnd();
    }

    public onClickShowAnswer(context) {
        super.onClickShowAnswer(context);
        context.showResultContinueButton.active = true;
        context.touchMask.active = true;
        // 遍历所有拼图块
        for (let [key, value] of context.chipsDataMap.entries()) {
            const currentPos = value["puzzlePos"];
            const correctPos = key;

            // 如果当前位置不是正确位置，则交换
            if (currentPos !== correctPos) {
                // 找到当前在正确位置的拼图块
                const chipAtCorrectPos = context.getChipDataByPuzzlePos(correctPos);
                if (chipAtCorrectPos) {
                    // 交换两个拼图块的位置
                    context.swapPuzzleChips(currentPos, correctPos);
                }
            }
        }
    }

    public onClickRetryGame() {
        this.onClickRetryCurrentLevel();
    }

    public onclickContinue() {
        this.touchMask.active = false;
        this.showResultContinueButton.active = false;
        (this.sceneModel as any).dzanswerHandler(this);
    }



    private async gameCenterGoonHandler() {
        this.enableDragAndResetGame();
        this.onClickChangeLevel().then(() => {
            this.startGameMask.active = true;
            this.timerComponent.resetTimer();
            this.onClickStartGame();
        })
    }

    private gameCenterRetryCurrentLevel() {
        this.enableDragAndResetGame();

        this.cleanChipsCache();

        this.startGameMask.active = true;
        this.timerComponent.resetTimer();

        let textureID = this.randomPlayIndex[this.textureIndex];
        this.loadPuzzleTexture(textureID).then((texture) => {
            this.currentTexture2d = texture;
            this.cropTextureToSprites(this.levelList[this.selectedLevelIndex], this.currentTexture2d);
            this.updatePreviewSprite(this.currentTexture2d);
            this.onClickStartGame();
        });
    }

    onAgain(): void {
        this.gameCenterRetryCurrentLevel();
    }

    onFailNextLevel(): void {
        this.gameCenterGoonHandler();
    }

    onSuccessNextLevel(): void {
        this.gameCenterGoonHandler();
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
        DebugLog.instance.log("应用进入后台，暂停游戏并显示退出弹窗");
        
        // 暂停计时器
        if (this.timerComponent) {
            this.timerComponent.pauseTimer();
        }
        
        // 如果正在加载中，暂停加载超时检测
        if (this.isLoading && this.loadingTimeoutId) {
            clearTimeout(this.loadingTimeoutId);
            this.loadingTimeoutId = null;
            DebugLog.instance.log("应用进入后台，暂停加载超时检测");
        }
        
        // 显示退出弹窗
        this.showPauseAlert();
        // 暂停拖拽功能
        this.isQuitEnabled = false;
        this.resetDragState();
    }
    
    /**
     * 应用回到前台时的处理
     */
    private onAppShow() {
        DebugLog.instance.log("应用回到前台，恢复游戏");
        
        // 如果游戏在结算阶段，不恢复倒计时
        if (this._isGameCompleted) {
            DebugLog.instance.log("游戏在结算阶段，不恢复倒计时");
            return;
        }
        
        // 如果正在加载中，恢复加载超时检测
        if (this.isLoading && !this.loadingTimeoutId) {
            this.restartLoadingTimeout();
            DebugLog.instance.log("应用回到前台，恢复加载超时检测");
        }
        
        // // 恢复计时器
        // if (this.timerComponent) {
        //     this.timerComponent.resumeTimer();
        // }
        
        // 恢复游戏状态
        this.isQuitEnabled = true;
    }

    /**
     * 显示暂停弹窗
     */
    private showPauseAlert() {
        // 使用现有的quitGame方法显示退出弹窗
        this.quitGame();
    }

    /**
     * 处理加载超时
     */
    private handleLoadingTimeout() {
        DebugLog.instance.error(`[puzzleGame] 加载超时，超过${this.LOADING_TIMEOUT}ms`);
        
        // 完全重置所有状态，确保用户可以正常交互
        this.resetAllStatesAfterTimeout();
        
        // 检查应用是否在前台，只有在前台时才显示超时弹窗
        if (game.isPaused) {
            DebugLog.instance.log("应用在后台，延迟显示超时弹窗");
            // 应用在后台，延迟显示弹窗，等待应用回到前台
            this.scheduleOnce(() => {
                this.showLoadingTimeoutAlert();
            }, 0.1);
        } else {
            // 应用在前台，直接显示超时弹窗
            this.showLoadingTimeoutAlert();
        }
    }

    /**
     * 显示加载超时弹窗
     */
    private showLoadingTimeoutAlert() {
        DebugLog.instance.error("网络加载超时：", SocketUtil.getInstance().socketType);
        const alertData: AlertData = new AlertData();
        alertData.title = "加载超时";
        alertData.message = '资源加载超时，请检查网络连接后重试。';
        alertData.messageFontColor = "#FFFFFF";
        alertData.confirmButtonText = "重试";
        alertData.cancelButtonText = "退出";
        alertData.cancelButtonVisible = true;
        alertData.guideButtonVisible = false;
        alertData.x = 0;
        alertData.y = 0;
        alertData.confirmCb = () => {
            // 用户选择重试，重新加载当前关卡
            DebugLog.instance.log("用户选择重试加载");
            this.retryLoadingCurrentLevel();
        }
        alertData.cancelCb = () => {
            // 用户选择退出，执行退出游戏逻辑
            DebugLog.instance.log("用户选择退出游戏");
            this.quitGame();
        };
        alertData.contentClickCb = null;
        alertData.guideCallBack = null;

        AlertManager.getInstance().showAlert(alertData);
    }

    /**
     * 重试加载当前关卡
     */
    private retryLoadingCurrentLevel() {
        DebugLog.instance.log("开始重试加载当前关卡");
        
        // 确保所有状态都已重置
        this.resetAllStatesAfterTimeout();
        
        // 重新加载当前关卡
        this.onClickRetryCurrentLevel();
    }

    /**
     * 恢复加载超时检测
     */
    private restartLoadingTimeout() {
        if (this.isLoading && !this.loadingTimeoutId) {
            this.loadingTimeoutId = setTimeout(() => {
                this.handleLoadingTimeout();
            }, this.LOADING_TIMEOUT);
            DebugLog.instance.log("恢复加载超时检测，超时时间：" + this.LOADING_TIMEOUT + "ms");
        }
    }

    /**
     * 超时后重置所有状态
     */
    private resetAllStatesAfterTimeout() {
        DebugLog.instance.log("开始重置超时后的所有状态");
        
        // 重置加载状态
        this.isLoading = false;
        
        // 清除超时定时器
        if (this.loadingTimeoutId) {
            clearTimeout(this.loadingTimeoutId);
            this.loadingTimeoutId = null;
        }
        
        // 重置拖拽状态
        this.resetDragState();
        
        // 恢复退出按钮交互
        this.setQuitButtonInteractable(true);
        
        // 恢复拖拽功能
        this.isDragEnabled = true;
        
        // 确保游戏完成状态为false，允许重新开始
        this._isGameCompleted = false;
        
        // 清理加载相关的Promise状态
        this.loadTextureResolver = null;
        this.loadTextureRejector = null;
        
        DebugLog.instance.log("超时后状态重置完成");
    }

}
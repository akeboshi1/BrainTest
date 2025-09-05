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
    Label
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

    protected audioUrls = ['music/puzzleBG', "music/drag", "music/win"];

    private bgmClip: AudioClip;

    private async loadPuzzleTexture(id: number): Promise<Texture2D> {
        const bundle = assetManager.getBundle(this.bundleName);
        return new Promise<Texture2D>((resolve, reject) => {
            this.loadTextureResolver = resolve;
            this.loadTextureRejector = reject;

            bundle.load("texture/pintu" + (id).toString() + "/texture", Texture2D, (err, data) => {
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

    private textureLen = 469;
    start() {
        super.start();
        for (let i = 1; i < this.textureLen; i++) {
            this.randomPlayIndex.push(i);
        }
        this.showSpriteNode.active = false;
        this.showResultContinueButton.active = false;
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
                DebugLog.instance.error(`[puzzleGame] getChipDataByPuzzlePos 报错，拖拽图片返回原位置`);
                this.processTouchCancel();
                this.dragInstance = null;
                return;
            }

            if (this.chipsInstances.indexOf(this.dragInstance) != selectedObjectIndex) {
                this.swapPuzzleChips(selectedObjectIndex, this.chipsInstances.indexOf(this.dragInstance));
                if (this.checkPuzzleResult()) {
                    this.processGameSuccess();
                }
            } else {
                this.processTouchCancel();
            }
        } catch (error) {
            DebugLog.instance.debug(`[puzzleGame] onTouchEnd 发生错误: ${error}，拖拽图片返回原位置`);
            this.processTouchCancel();
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
    }

    onClickStartGame() {
        this.enableDragAndResetGame();

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

    goonHandler() {
        this.enableDragAndResetGame();

        if (this.sceneModel.gameType == GameType.SKEWERS) {
            (this.sceneModel as any).goonHandler(this);
            return;
        }

        this.onClickChangeLevel().then(() => {
            this.startGameMask.active = true;
            this.timerComponent.resetTimer();
        });
    }

    dzgoonHandler(resuleBoo: boolean = true) {
        this.clearGameView();
        if (this.sceneModel) {
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                // 直接发送训练完成请求，不处理弹窗逻辑
                // 直接向服务器发送请求，但不处理回调
                let self = this;
                let trainData = SkewersManager.getInstance().getUnCompleteGameData();
                let _boo = trainData.type != SkewersGameType.Executionability;
                if (!_boo) {
                    EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, (data) => {
                        (self.sceneModel as any).goonHandler(self, true);
                    }, this, true);
                    this.clearGameView();
                    SkewersManager.getInstance().requestGameComplete(this.complete, this.duration);
                } else {
                    (this.sceneModel as any).goonHandler(self, true);
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
            
            // 重玩时重新开始倒计时
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
            
            // 重玩时也需要播放背景音乐
            this.playBgmAudio("music/puzzleBG", true);
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
        for (let [key, value] of this.chipsDataMap.entries()) {
            const rect: Rect = value["rect"];
            if (rect.contains(new Vec2(currentPos.x, currentPos.y))) {
                puzzlePos = value["puzzlePos"];
                break;
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

            this.outputMapData();
        } catch (error) {
            DebugLog.instance.error(`[puzzleGame] swapPuzzleChips 发生错误: ${error}`);
            // 如果交换过程中出现错误，尝试让拖拽的图片返回原位置
            if (this.dragInstance) {
                this.processTouchCancel();
            }
        }
    }

    // private _difficulty:number = 0;

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

    private outputMapData() {
        let outputString = "";
        let lineCount = 0;
        for (let [key, value] of this.chipsDataMap.entries()) {
            if (lineCount % this.selectedLevel.x == 0) {
                DebugLog.instance.log("outputMapData  ---- " + outputString);
                outputString = "";
            }
            outputString += " " + value["puzzlePos"];
            lineCount++;
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

    private getCorrentCounts() {
        let counts = 0;
        for (let [key, value] of this.chipsDataMap.entries()) {
            if (value["puzzlePos"] == key) {
                counts++;
            }
        }
        return counts;
    }
    // 随机交换拼图位置n次的方法
    private randomSwapPuzzleChipsNTimes(n: number) {
        const maxPos = this.selectedLevel.x * this.selectedLevel.y;
        let positions: number[] = [];
        for (let i = 0; i < maxPos; i++) {
            positions.push(i);
        }
        this.shuffleArray(positions);
        for (let i = 0; i < n; i++) {
            this.swapPuzzleChips(positions[i], positions[(i + 1) % maxPos]);
        }
    }

    private shuffleArray(array: number[]) {
        for (let i = array.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    onClickDisturbPuzzleButton() {
        this.selectedLevelIndex = (this.sceneModel as any).difficulty - 1;
        this.selectedLevel = this.levelList[this.selectedLevelIndex];
        this.randomSwapPuzzleChipsNTimes(this.selectedLevel.x * this.selectedLevel.y);
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

    public onClickShowAnswer() {
        super.onClickShowAnswer();
        this.showResultContinueButton.active = true;
        this.touchMask.active = true;
        // 遍历所有拼图块
        for (let [key, value] of this.chipsDataMap.entries()) {
            const currentPos = value["puzzlePos"];
            const correctPos = key;

            // 如果当前位置不是正确位置，则交换
            if (currentPos !== correctPos) {
                // 找到当前在正确位置的拼图块
                const chipAtCorrectPos = this.getChipDataByPuzzlePos(correctPos);
                if (chipAtCorrectPos) {
                    // 交换两个拼图块的位置
                    this.swapPuzzleChips(currentPos, correctPos);
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

}
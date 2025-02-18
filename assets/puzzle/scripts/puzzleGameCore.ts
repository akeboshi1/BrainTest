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
    Vec3
} from 'cc';
import { puzzleSummaryAlert } from './puzzleSummaryAlert';
import { DebugLog } from "../../scripts/Core/Util/DebugLog";
import { TimeUtil } from "db://assets/scripts/Core/Util/TimeUtil";
import { AudioManager } from "db://assets/scripts/Core/Manager/Audio/AudioManager";
import { BundleName } from '../../scripts/Core/Manager/Load/BundleName';
import { BaseScene } from '../../scene/Core/BaseScene';
import { GameType, IBaseGameChild } from '../../scripts/Game/GameDataFactory/BaseGameData';
import { TimerCommonComponent } from '../../scripts/Game/UI/Common/TimerCommonComponent';

const { ccclass, property } = _decorator;
@ccclass('puzzleGameCore')
export default class PuzzleGameCore extends BaseScene<IBaseGameChild> {
    @property(Node)
    public viewNode: Node = null;

    protected bundleName: string = BundleName.PUZZLE;

    @property(Prefab)
    private chipNodePrefab: Prefab;

    @property(Node)
    private chipParentNode: Node;

    // 可拖拽的节点
    @property(Node)
    private draggableNode: Node;

    @property(Number)
    private chipGap: number = 1;

    @property(Number)
    private gameLength: number = 180;

    @property(Sprite)
    private previewSprite: Sprite;

    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent;

    @property(Node)
    private buttonStartGame: Node;

    @property(Node)
    private startGameMask: Node;

    @property(puzzleSummaryAlert)
    private summaryAlert: puzzleSummaryAlert;

    @property(Node)
    private bgNode: Node = null;

    @property(Sprite)
    private showSprite: Sprite;

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
        this.audioUrls = ["music/drag", "music/win"];
        this.loadAudio().then();
    }

    start() {
        super.start();
        this.summaryAlert.node.active = false;
        this.showSprite.node.active = false;
        this.cleanChipsCache();
        let playIndex = 0;
        if (this.sceneData.gameType == GameType.SKEWERS) {
            let game = (this.sceneData as any).game;
            this.selectedLevelIndex = (this.sceneData as any).difficulty - 1;
            this.gameLength = game.timeLimit;
            playIndex = game.seq;
        }

        for (let i = 1; i < 21; i++) {
            this.randomPlayIndex.push(i);
        }
        this.randomPlayIndex.sort(() => Math.random() - 0.5);

        this.textureIndex = this.selectedLevelIndex + playIndex > this.randomPlayIndex.length - 1 ? 0 : this.selectedLevelIndex + playIndex;
        let textureID = this.randomPlayIndex[this.textureIndex];
        this.loadPuzzleTexture(textureID).then((texture) => {
            this.currentTexture2d = texture;
            this.cropTextureToSprites(this.levelList[this.selectedLevelIndex], this.currentTexture2d);
            this.updatePreviewSprite(this.currentTexture2d);
        });
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
        if (this.timerComponent) this.timerComponent.off('timer-end', this.onTimerEnd, this);
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
        this.loadTextureRejector = null;
        this.loadTextureResolver = null;
    }

    update(deltaTime: number) {

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
        if (!this.dragStartFlag) {
            this.dragStartFlag = true;
            let currentPos: Vec2 = event.getUILocation();
            const vec3 = this.chipParentNode.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(currentPos.x, currentPos.y, 0));
            const startpos = new Vec2(vec3.x, vec3.y);
            let selectedObjectIndex = this.checkTouchedObjectIndex(startpos);
            if (selectedObjectIndex != -1) {
                this.dragInstance = this.chipsInstances[selectedObjectIndex];
                this.dragObjectStartPos = this.getChipDataByPuzzlePos(selectedObjectIndex)["objectPos"];
                this.dragStartPos = startpos; // 记录触摸起始位置
                DebugLog.instance.log("onTouchStart  ---- selectIndex = " + selectedObjectIndex);
                this.dragInstance.setSiblingIndex(100);
            }
        }
    }

    onTouchMove(event: EventTouch) {
        if (this.dragInstance == null || !this.dragStartFlag) return;

        let currentPos: Vec2 = event.getUILocation();
        const vec3 = this.chipParentNode.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(currentPos.x, currentPos.y, 0));
        const offset = vec3.subtract(new Vec3(this.dragStartPos.x, this.dragStartPos.y, 0)); // 计算偏移量
        this.dragInstance.setPosition(this.dragObjectStartPos.x + offset.x, this.dragObjectStartPos.y + offset.y);
    }

    onTouchEnd(event: EventTouch) {
        if (this.dragInstance == null || !this.dragStartFlag) return;
        this.playAudio("music/drag", true);
        this.dragStartFlag = false;
        const currentPos: Vec2 = event.getUILocation();
        const vec3 = this.chipParentNode.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(currentPos.x, currentPos.y, 0));
        const endpos = new Vec2(vec3.x, vec3.y);
        const selectedObjectIndex = this.checkTouchedObjectIndex(endpos);
        if (this.chipsInstances.indexOf(this.dragInstance) != selectedObjectIndex) {
            DebugLog.instance.log("onTouchEnd  ---- swap target index = " + selectedObjectIndex);
            this.swapPuzzleChips(selectedObjectIndex, this.chipsInstances.indexOf(this.dragInstance));

            const puzzleResult = this.checkPuzzleResult();
            DebugLog.instance.log("puzzleResult  ----  " + puzzleResult);
            if (puzzleResult) {
                this.processGameSuccess();
            }
        }
        else {
            this.processTouchCancel();
        }

    }

    onTouchCancel(event: EventTouch) {
        if (this.dragInstance == null || !this.dragStartFlag) return;

        this.dragStartFlag = false;
        this.processTouchCancel();
    }

    quitGame() {
        super.quitGame({ parentNode: this.viewNode, context: this });
        // this.pauseTime();
        if (this._timeID) {
            clearTimeout(this._timeID);
        }
        // if (this.sceneData.gameType == GameType.SKEWERS) {
        //     let trainData = SkewersManager.getInstance().getUnCompleteGameData();
        //     let maxCount = trainData.length;
        //     let curCount = trainData.seq - 1 < 0 ? 0 : trainData.seq - 1;
        //     SkewersManager.getInstance().quitGame(this.viewNode, curCount, maxCount, this.goonCallBack, this.exitCallBack, this);
        // } else {
        //     GameCenterManager.getInstance().quitGame(this.viewNode, this.goonCallBack, this.exitCallBack, this);
        // }
    }

    private requestGameResult(win: boolean = true) {
        // 上报数据
        let endTime = TimeUtil.getNow();
        let complete = Number(win);
        if (this._startTime == 0) {
            this._startTime = endTime;
        }
        let duration = (endTime - this._startTime) / 1000;
        this.requestGameComplete({ context: this, parentNode: this.viewNode, complete, duration });
        // SkewersManager.getInstance().requestGameComplete(complete, duration);
    }

    public exitCallBack(context) {
        context.pauseTime();
        AudioManager.getInstance().stop();
        super.exitCallBack(this);
        // if (Global.isSkewersGame) {
        //     SkewersManager.getInstance().exitCallBack();
        // } else {
        //     GameCenterManager.getInstance().exitCallBack();
        // }
    }

    private autoExitCallBack(context) {
        clearInterval(context.timerId);
        clearTimeout(context._setTimeOutId);
        //上报数据
        context.requestGameResult(false);
        super.exitCallBack(this);
        // if (Global.isSkewersGame) {
        //     SkewersManager.getInstance().exitCallBack();
        // } else {
        //     GameCenterManager.getInstance().exitCallBack();
        // }
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

    private processTouchCancel() {
        const targetPosition = this.dragObjectStartPos;
        const duration = 0.3;

        tween(this.dragInstance)
            .to(duration, { position: targetPosition })
            .start();

        this.dragInstance.setSiblingIndex(0);
        this.dragInstance = null;
    }


    private swapPuzzleChips(puzzlePos1: number, puzzlePos2: number) {
        const chipData1 = this.getChipDataByPuzzlePos(puzzlePos1);
        const chipData2 = this.getChipDataByPuzzlePos(puzzlePos2);
        if (!chipData1 || !chipData2) {
            DebugLog.instance.error(`1:${chipData1} 2:${chipData2} is null`)
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
    }

    private getChipDataByPuzzlePos(puzzlePos: number): Object {
        for (let [key, value] of this.chipsDataMap.entries()) {
            const pos: number = value["puzzlePos"];
            if (pos == puzzlePos) {
                return value;
            }
        }
        return null;
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
        if (this.sceneData.gameType == GameType.SKEWERS) {
            this.selectedLevelIndex = (this.sceneData as any).difficulty - 1;
            this.selectedLevel = this.levelList[this.selectedLevelIndex];
        }
        this.randomSwapPuzzleChipsNTimes(this.selectedLevel.x * this.selectedLevel.y);
    }

    onClickChangeLevel() {
        if (this.sceneData.gameType == GameType.SKEWERS) {
            this.selectedLevelIndex = (this.sceneData as any).difficulty - 1;
        } else {
            this.selectedLevelIndex = (this.selectedLevelIndex + 1) % this.levelList.length;
        }

        this.selectedLevel = this.levelList[this.selectedLevelIndex];
        this.textureIndex = (this.textureIndex + 1) % this.randomPlayIndex.length;

        this.cleanChipsCache();

        let textureID = this.randomPlayIndex[this.textureIndex];
        this.loadPuzzleTexture(textureID).then((texture) => {
            this.currentTexture2d = texture;
            this.cropTextureToSprites(this.levelList[this.selectedLevelIndex], this.currentTexture2d);
            this.updatePreviewSprite(this.currentTexture2d);
        });
    }

    private updatePreviewSprite(texture: Texture2D) {
        let newSpriteFrame = new SpriteFrame();
        newSpriteFrame.texture = texture;
        this.previewSprite.spriteFrame = newSpriteFrame;
        this.showSprite.spriteFrame = newSpriteFrame;
    }

    // pauseTime() {
    //     this.timerComponent.pauseTimer();
    // }

    // resumeTime() {
    //     this.timerComponent.resumeTimer();
    // }

    onClickStartTimer() {
        this.timerComponent.resetTimer();
        this.timerComponent.startTimer(10);
        this._startTime = TimeUtil.getNow();
    }

    onTimerEnd() {
        DebugLog.instance.log("计时器结束了，执行相应逻辑");
        this.processGameFail();
    }

    onClickStartGame() {
        this._startTime = TimeUtil.getNow();
        if (this.sceneData.gameType == GameType.SKEWERS) {
            this.timerComponent.startTimer((this.sceneData as any).game.timeLimit);
        } else {
            this.timerComponent.startTimer(this.gameLength.valueOf());
        }
        this.onClickDisturbPuzzleButton();
        this.bgNode.active = false;
        this.startGameMask.active = false;
    }

    processGameFail() {
        DebugLog.instance.log("失败");

        if (this.sceneData.gameType == GameType.SKEWERS) {
            // EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this.failRequestSkewersGameComplete, this);
            this.requestGameResult(false);
        } else {
            this.summaryAlert.node.active = true;
            this.summaryAlert.initByResult(false);
            this.summaryAlert.fadeIn();
        }
    }

    // private failRequestSkewersGameComplete(data) {
    //     EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this);
    //     let trainData = SkewersManager.getInstance().getTrainData(data);//SkewersManager.getInstance().getUnCompleteGameData();
    //     let maxCount = trainData.length;
    //     let curCount = trainData.seq < 0 ? 0 : trainData.seq;
    //     if (curCount == maxCount) {
    //         SkewersManager.getInstance().showGameAlert(this.viewNode, AlertType.Normal, SkewersManager.getInstance().failCompleteStr, "", curCount, maxCount, this.failCompleteHandler, this.exitCallBack, this);
    //     } else {
    //         SkewersManager.getInstance().showGameAlert(this.viewNode, AlertType.Normal, SkewersManager.getInstance().failCompleteStr, "", curCount, maxCount, this.onClickGotoNextlevel, this.exitCallBack, this);
    //     }
    // }

    // failCompleteHandler(context) {
    //     context.pauseTime();
    //     if (!SkewersManager.getInstance().isRunOver()) {
    //         SkewersManager.getInstance().showGameAlert(context.viewNode, AlertType.Sucess_Small, SkewersManager.getInstance().currentSkewersCompleteGameStr, SkewersManager.getInstance().singleCompleteStr, 0, 0, context.nextAlertHandler, context.exitCallBack, context);
    //     } else {
    //         SkewersManager.getInstance().showGameAlert(context.viewNode, AlertType.Sucess_Big, SkewersManager.getInstance().totalCompleteStr, SkewersManager.getInstance().totalBrainScore, 0, 0, context.totalComplete, context.remoteClick, context);
    //     }
    // }

    // private totalComplete(context) {
    //     context.pauseTime();
    //     AudioManager.getInstance().stop();
    //     SkewersManager.getInstance().exitCallBack();
    // }



    private gamepasslevelCallback() {

    }

    private _timeID;

    private _endTime: number = 0;
    processGameSuccess() {
        if (this._timeID) {
            clearTimeout(this._timeID);
        }
        DebugLog.instance.log("成功");
        this.playAudio("music/win", true);
        this.timerComponent.pauseTimer();
        this.showSprite.node.active = true;

        const minScale = 1;
        const maxScale = 1.1;
        const duration = 2;
        // this.chipParentNode.
        let _tween = tween(this.showSprite.node)
            .to(duration, { scale: new Vec3(maxScale, maxScale, maxScale) }, { easing: 'cubicOut' }) // 放大
            .to(duration, { scale: new Vec3(minScale, minScale, minScale) }, { easing: 'cubicOut' }) // 缩小
            .union()
            .repeatForever()
            .start();
        let self = this;
        this._timeID = setTimeout(() => {
            this.showSprite.node.setScale(new Vec3(1, 1, 1));
            this.showSprite.node.active = false;
            if (_tween) {
                _tween.stop();
                _tween = null;
            }
            if (this.sceneData.gameType == GameType.SKEWERS) {
                this._requestSkewersGameComplete();
                // if (SkewersManager.getInstance().isRunOver()) {
                //     SkewersManager.getInstance().showGameAlert(self.viewNode, AlertType.Sucess_Big, SkewersManager.getInstance().totalCompleteStr, SkewersManager.getInstance().totalBrainScore, 0, 0, self.totalComplete, self.remoteClick, self);
                //     return;
                // }
                // EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, self.requestSkewersGameComplete, self);
            } else {
                // 通小关后发送消息
                // let curGame = GameCenterManager.getInstance().currentGame;
                // GameCenterManager.getInstance().gamePassLevel(curGame.sessionid, 0, curGame.level, 1, 30, self.gameLength, curGame.difficulty, self.gamepasslevelCallback);
                this._requestGameCenterComplete(1);
                self.summaryAlert.node.active = true;
                self.summaryAlert.initByResult(true);
                self.summaryAlert.fadeIn();
            }
        }, 4000);
    }

    private _requestSkewersGameComplete() {
        this.requestGameResult(true)
    }

    private _requestGameCenterComplete(win: number = 0) {
        const curGame = (this.sceneData as any).game;
        this._endTime = TimeUtil.getNow();
        let level = curGame.level + 1;
        let complete = win;
        let duration = (this._endTime - this._startTime) / 1000;
        this.requestGameComplete({
            sessionId: curGame.sessionid,
            count: 1,
            level,
            complete,
            duration,
            timelimit: this.gameLength,
            difficulty: curGame.difficulty
        });
    }





    // private requestSkewersGameComplete(data) {
    //     let trainid = data;
    //     let trainData = SkewersManager.getInstance().getTrainData(trainid);
    //     EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this);
    //     let maxCount = trainData.parentSkewersGameData.trains.length;
    //     let curCount = trainData.seq;
    //     // 游戏内界面提示
    //     if (maxCount != curCount) {
    //         SkewersManager.getInstance().showGameAlert(this.viewNode, AlertType.Normal, SkewersManager.getInstance().singleCompleteStr, "", curCount, maxCount, this.onClickGotoNextlevel, this.exitCallBack, this);
    //     } else {
    //         if (!SkewersManager.getInstance().isRunOver()) {
    //             SkewersManager.getInstance().showGameAlert(this.viewNode, AlertType.Sucess_Small, SkewersManager.getInstance().currentSkewersCompleteGameStr, SkewersManager.getInstance().singleCompleteStr, 0, 0, this.nextAlertHandler, this.exitCallBack, this);
    //         } else {
    //             SkewersManager.getInstance().showGameAlert(this.viewNode, AlertType.Sucess_Big, SkewersManager.getInstance().totalCompleteStr, SkewersManager.getInstance().totalBrainScore, 0, 0, this.totalComplete, this.remoteClick, this);
    //         }
    //     }
    // }

    // private remoteClick() {
    //     this.exitCallBack(this);
    //     UIManager.getInstance().showPanel(GenerateReport.NAME);
    // }

    goonHandler() {
        if (this.sceneData.gameType == GameType.SKEWERS) {
            (this.sceneData as any).goonHandler(this);
            return;
        }

        // if (Global.isSkewersGame) {
        //     if (!SkewersManager.getInstance().isRunOver()) {
        //         if (SkewersManager.getInstance().getUnCompleteGameData() && SkewersManager.getInstance().getUnCompleteGameData().type != SkewersGameType.Executionability) {
        //             SkewersManager.getInstance().runNextGame();
        //             return;
        //         } else {
        //             SkewersManager.getInstance().runNextGame(false);
        //         }
        //     } else {
        //         SkewersManager.getInstance().exitCallBack();
        //         return;
        //     }
        // }
        // 下一关
        this.onClickChangeLevel();
        this.startGameMask.active = true;
        this.bgNode.active = true;
        this.timerComponent.resetTimer();
    }

    // private nextAlertHandler(context) {
    //     context.pauseTime();
    //     SkewersManager.getInstance().showGameAlert(context.viewNode, AlertType.Next, SkewersManager.getInstance().nextSkewersGameStr, '', 0, 0, context.onClickGotoNextlevel, context.exitCallBack, context);
    // }

    onClickRetryCurrentLevel() {
        // if (this.sceneData.gameType == GameType.SKEWERS) {
        //     SkewersManager.getInstance().runNextGame(false);
        // }
        // 重玩
        this.cleanChipsCache();

        let playIndex = 0;
        if (this.sceneData.gameType == GameType.SKEWERS) {
            this.selectedLevelIndex = (this.sceneData as any).difficulty - 1;
            playIndex = (this.sceneData as any).game.seq;
        }

        const textureIndex = this.selectedLevelIndex + playIndex > this.randomPlayIndex.length - 1 ? 0 : this.selectedLevelIndex + playIndex;

        this.startGameMask.active = true;
        this.bgNode.active = true;
        this.timerComponent.resetTimer();

        let textureID = this.randomPlayIndex[textureIndex];
        this.loadPuzzleTexture(textureID).then((texture) => {
            this.currentTexture2d = texture;
            this.cropTextureToSprites(this.levelList[this.selectedLevelIndex], this.currentTexture2d);
            this.updatePreviewSprite(this.currentTexture2d);
        });
    }

    onClickTimeOut() {
        this.timerComponent.resetTimer();
        this.onTimerEnd();
    }
}
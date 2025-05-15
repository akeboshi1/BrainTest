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
import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";
import { TimeUtil } from "db://assets/resources/scripts/Core/Util/TimeUtil";
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { TimerCommonComponent } from '../../resources/scripts/Game/UI/Common/TimerCommonComponent';
import {BaseScene} from "db://assets/resources/scripts/Core/Scene/BaseScene";
import {GameType, IBaseGameChild} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import {Global} from "db://assets/resources/scripts/Core/Manager/Config/Global";
import {SkewersManager} from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
import {SkewersGameType} from "db://assets/resources/scripts/Game/Task/Skewers/SkewersGameData";
import {EventManager} from "db://assets/resources/scripts/Core/Manager/Event/EventManager";

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
    private buttonStartGame: Node;

    @property(Node)
    private startGameMask: Node;

    @property(puzzleSummaryAlert)
    private summaryAlert: puzzleSummaryAlert;

    @property(Node)
    private bgNode: Node = null;

    @property(Sprite)
    private showSprite: Sprite;

    @property(Node)
    guideView:Node;

    @property(Node)
    private showResultContinueButton: Node;

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
        for (let i = 1; i < 201; i++) {
            this.randomPlayIndex.push(i);
        }
        this.summaryAlert.node.active = false;
        this.showSprite.node.active = false;
        this.cleanChipsCache();
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            let game = (this.sceneModel as any).game;
            this.selectedLevelIndex = (this.sceneModel as any).difficulty - 1;
            this.gameLength = game.timeLimit;
            this.bgNode.active = false;
            this.textureIndex =  (game.level - 1) % this.randomPlayIndex.length;
        } else {
            this.bgNode.active = true;
            this.textureIndex = ((this.sceneModel as any).level - 1) % this.randomPlayIndex.length;
        

        }
        this.showStartAlert({ parentNode: this.viewNode, start: this.onClickStartGame, context: this });
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
        const vec3 = this.chipParentNode.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(currentPos.x, currentPos.y, 0));
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
        this.dragInstance.setPosition(this.dragObjectStartPos.x + offset.x, this.dragObjectStartPos.y + offset.y);
    }

    onTouchEnd(event: EventTouch) {
        if (!this.isDragEnabled || this.dragInstance == null || !this.dragStartFlag) return;
        
        this.playAudio("music/drag", true);
        this.dragStartFlag = false;
        
        const currentPos: Vec2 = event.getUILocation();
        const vec3 = this.chipParentNode.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(currentPos.x, currentPos.y, 0));
        const endpos = new Vec2(vec3.x, vec3.y);
        const selectedObjectIndex = this.checkTouchedObjectIndex(endpos);
        
        if (this.chipsInstances.indexOf(this.dragInstance) != selectedObjectIndex) {
            this.swapPuzzleChips(selectedObjectIndex, this.chipsInstances.indexOf(this.dragInstance));
            if (this.checkPuzzleResult()) {
                this.processGameSuccess();
            }
        } else {
            this.processTouchCancel();
        }
        
        this.dragInstance = null;
        DebugLog.instance.log("当前数量：" + this.getCorrentCounts());
        DebugLog.instance.log('总数',this.chipsInstances.length);
        
        
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
        
        tween(this.dragInstance)
            .to(0.3, { position: this.dragObjectStartPos })
            .start();

        this.dragInstance.setSiblingIndex(0);
        this.resetDragState();
    }

    processGameSuccess() {
        this.isDragEnabled = false;
        
        if (this._timeID) {
            clearTimeout(this._timeID);
        }
        
        this.playAudio("music/win", true);
        this.timerComponent.pauseTimer();
        this.showSprite.node.active = true;
        
        // 设置缩放动画（循环2次后完成）
        let _tween = tween(this.showSprite.node)
            .to(2, { scale: new Vec3(1.1, 1.1, 1.1) }, { easing: 'cubicOut' })
            .to(2, { scale: new Vec3(1, 1, 1) }, { easing: 'cubicOut' })
            .union()
            .repeat(1)  // 指定重复次数
            .call(() => {
                // 动画完成回调，在指定次数的动画全部完成后执行
                this.showSprite.node.setScale(new Vec3(1, 1, 1));
                this.showSprite.node.active = false;
                
                // 处理游戏结果
                if (this.sceneModel.gameType == GameType.SKEWERS) {
                    this.requestGameResult();
                } else {
                    this._requestGameCenterComplete(1);
                    this.summaryAlert.node.active = true;
                    this.summaryAlert.initByResult(true);
                    this.summaryAlert.fadeIn();
                }
            })
            .start();
    }
    
    // 启用拖拽功能和重置游戏状态
    private enableDragAndResetGame() {
        this.isDragEnabled = true;
    }
    
    onClickStartGame() {
        this.enableDragAndResetGame();
        
        this._startTime = TimeUtil.getNow();
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.timerComponent.startTimer((this.sceneModel as any).game.timeLimit);
        } else {
            this.timerComponent.startTimer(this.gameLength.valueOf());
        }
        this.onClickDisturbPuzzleButton();
        this.bgNode.active = false;
        this.startGameMask.active = false;
    }
    
    goonHandler() {
        this.enableDragAndResetGame();
        
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            (this.sceneModel as any).goonHandler(this);
            return;
        }

        this.onClickChangeLevel();
        this.startGameMask.active = true;
        this.bgNode.active = true;
        this.timerComponent.resetTimer();
    }

    dzgoonHandler(resuleBoo:boolean = true) {
        this.clearGameView();
        if (this.sceneModel) {
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                // 直接发送游戏完成请求，不处理弹窗逻辑
                // 直接向服务器发送请求，但不处理回调
                let self = this;
                let trainData = SkewersManager.getInstance().getUnCompleteGameData();
                let _boo = trainData.type != SkewersGameType.Executionability;
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

    onClickRetryCurrentLevel() {
        this.enableDragAndResetGame();
        
        this.cleanChipsCache();
        Global.isAgain = true;
        
        this.startGameMask.active = true;
        this.bgNode.active = true;
        this.timerComponent.resetTimer();

        let textureID = this.randomPlayIndex[this.textureIndex];
        this.loadPuzzleTexture(textureID).then((texture) => {
            this.currentTexture2d = texture;
            this.cropTextureToSprites(this.levelList[this.selectedLevelIndex], this.currentTexture2d);
            this.updatePreviewSprite(this.currentTexture2d);
        });
    }

    private requestGameResult() {
        // 上报数据
        let endTime = TimeUtil.getNow();
        let complete = this.getCorrentCounts()/this.chipsInstances.length;
        if (this._startTime == 0) {
            this._startTime = endTime;
        }
        let duration = (endTime - this._startTime) / 1000;
        this.requestGameComplete({ context: this, parentNode: this.viewNode, complete, duration });
    }

    public exitCallBack(context) {
        context.pauseTime();
        super.exitCallBack(this);
    }

    private autoExitCallBack(context) {
        clearInterval(context.timerId);
        clearTimeout(context._setTimeOutId);
        //上报数据
        context.requestGameResult(false);
        super.exitCallBack(this);
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
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.selectedLevelIndex = (this.sceneModel as any).difficulty - 1;
            this.selectedLevel = this.levelList[this.selectedLevelIndex];
        }
        this.randomSwapPuzzleChipsNTimes(this.selectedLevel.x * this.selectedLevel.y);
    }

    onClickChangeLevel() {
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.selectedLevelIndex = (this.sceneModel as any).difficulty - 1;
        } else {
            this.selectedLevelIndex = (this.selectedLevelIndex + 1) % this.levelList.length;
        }

        this.selectedLevel = this.levelList[this.selectedLevelIndex];
        this.textureIndex = (this.textureIndex + 1) % this.randomPlayIndex.length;
        Global.isAgain = false;
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
        this.playFail();
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            // EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this.failRequestSkewersGameComplete, this);
            this.requestGameResult();
        } else {
            this._requestGameCenterComplete(0);
            this.summaryAlert.node.active = true;
            this.summaryAlert.initByResult(false);
            this.summaryAlert.fadeIn();
        }
    }


    private _requestGameCenterComplete(win: number = 0) {
        const curGame = (this.sceneModel as any).game;
        this._endTime = TimeUtil.getNow();
        let level = curGame.level;
        let difficulty = curGame.difficulty;//level % 3 == 0?3:level % 3;
        let duration = (this._endTime - this._startTime) / 1000;
        let complete = this.getCorrentCounts()/this.chipsInstances.length;
   
        this.requestGameComplete({
            sessionId: curGame.sessionid,
            count: win,
            level,
            complete,
            duration,
            timelimit: this.gameLength,
            difficulty,
            levelMode:curGame.levelMode
        });
    }

    onClickTimeOut() {
        this.timerComponent.resetTimer();
        this.onTimerEnd();
    }

    public showResult() {
        this.showResultContinueButton.active = true;
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

    public onClickShowResultContinueButton() {
        this.showResultContinueButton.active = false;
        this.dzgoonHandler(false);
    }
}
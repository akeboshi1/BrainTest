import {
    _decorator,
    Component,
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
    assetManager,
    AudioClip
} from 'cc';
import { timerComponent } from './timerComponent';
import { puzzleSummaryAlert } from './puzzleSummaryAlert';
import { Global } from "../../scripts/Core/Manager/Config/Global";
import { SkewersManager } from "../../scripts/Game/Task/Skewers/SkewersManager";
import { DebugLog } from "../../scripts/Core/Util/DebugLog";
import { GameCenterManager } from "db://assets/scripts/Game/GameCenter/GameCenterManager";
import { AlertType } from "db://assets/scripts/Game/UI/Alert/GameAlert";
import { EventManager } from "db://assets/scripts/Core/Manager/Event/EventManager";
import { TimeUtil } from "db://assets/scripts/Core/Util/TimeUtil";
import {AudioManager} from "db://assets/scripts/Core/Manager/Audio/AudioManager";

const { ccclass, property } = _decorator;

@ccclass('puzzleGameCore')
export class puzzleGameCore extends Component {

    @property([Texture2D])
    private cachedTextures: Texture2D[] = [];

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

    @property(timerComponent)
    private timerComponent: timerComponent;

    @property(Node)
    private buttonStartGame: Node;

    @property(Node)
    private startGameMask: Node;

    @property(puzzleSummaryAlert)
    private summaryAlert: puzzleSummaryAlert;

    @property(Node)
    private viewNode: Node = null;

    @property(Node)
    private bgNode: Node = null;

    @property(Sprite)
    private showSprite:Sprite;

    //显示对象
    private chipsInstances: Node[] = [];
    //数据 矩形区域 rect 位置编号 position
    private chipsDataMap: Map<number, Object> = new Map();

    private dragStartPos: Vec2 = new Vec2(); //触点起始位置
    private dragObjectStartPos: Vec3 = new Vec3();
    private dragInstance: Node = null;
    private dragStartFlag: boolean = false;
    private selectedLevelIndex: number = 0;

    private levelList: number[] = [2, 3, 4];
    private selectedLevel: number = this.levelList[this.selectedLevelIndex];
    private textureIndex: number = 0;

    private _startTime: number = 0;

    private audioUrls=["music/drag","music/win"];
    private audioMap:Map<string,AudioClip> = new Map();
    private bundleName: string = 'puzzle';

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

    onLoad(){
        this.loadAudio().then();
    }

    start() {
        this.summaryAlert.node.active = false;
        this.showSprite.node.active = false;
        this.cleanChipsCache();
        let playIndex = 0;
        if (Global.isSkewersGame) {
            this.selectedLevelIndex = Global.userData.curSkewerGameData.difficulty - 1;
            this.gameLength = Global.userData.curSkewerGameData.timeLimit;
            playIndex = Global.userData.curSkewerGameData.seq;
        }
        this.cachedTextures.sort(() => Math.random() - 0.5);

        this.textureIndex = this.selectedLevelIndex + playIndex > this.cachedTextures.length - 1 ? 0 : this.selectedLevelIndex + playIndex;
        this.cropTextureToSprites(this.levelList[this.selectedLevelIndex], this.cachedTextures[this.textureIndex]);
        this.updatePreviewSprite();
    }

    onEnable() {
        if (this.draggableNode) {
            this.draggableNode.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
            this.draggableNode.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
            this.draggableNode.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
            this.draggableNode.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        }
        if (this.timerComponent) this.timerComponent.on('timer-end', this.onTimerEnd, this);
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
    }

    update(deltaTime: number) {

    }

    cropTextureToSprites(cropNum: number, texture: Texture2D) {
        const textureRect = new Size(texture.width, texture.height);
        const cropWidth = textureRect.width / cropNum;
        const cropHeight = textureRect.height / cropNum;

        const rectList: Rect[] = [];

        for (let i = 0; i < cropNum; i++) {
            for (let j = 0; j < cropNum; j++) {
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

            const rect = new Rect(rectList[i].x * scaleRate, (0 - rectList[i].y - rectList[i].height) * scaleRate, rectList[i].width * scaleRate, rectList[i].height * scaleRate);

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
        this.playAudio("music/drag",true);
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
        this.pauseTime();
        if (Global.isSkewersGame) {
            let trainData = SkewersManager.getInstance().getUnCompleteGameData();
            let maxCount = SkewersManager.getInstance().getGameCount();
            let curCount = trainData.seq - 1 < 0 ? 0 : trainData.seq - 1;
            SkewersManager.getInstance().quitGame(this.viewNode, curCount, maxCount, this.goonCallBack, this.exitCallBack, this);
        } else {
            GameCenterManager.getInstance().quitGame(this.viewNode, this.goonCallBack, this.exitCallBack, this);
        }
    }

    private goonCallBack(context) {
        if (Global.isSkewersGame) {
            if (!SkewersManager.getInstance().isRunOver()) {
                context.resumeTime();
                // if(!context._previewBoo)context.previewCard(2);
            }
        } else {
            context.resumeTime();
            // if(!context._previewBoo)context.previewCard(2);
        }
    }

    private requestGameResult(win: boolean = true) {
        // 上报数据
        let endTime = TimeUtil.getNow();
        let complete = Number(win);
        if (this._startTime == 0) {
            this._startTime = endTime;
        }
        let duration = (endTime - this._startTime) / 1000;
        SkewersManager.getInstance().requestGameComplete(complete, duration);
    }

    private exitCallBack(context) {
        context.pauseTime();
        AudioManager.getInstance().stop();
        if (Global.isSkewersGame) {
            SkewersManager.getInstance().exitCallBack();
        } else {
            GameCenterManager.getInstance().exitCallBack();
        }
    }

    private autoExitCallBack(context) {
        clearInterval(context.timerId);
        clearTimeout(context._setTimeOutId);
        //上报数据
        context.requestGameResult(false);
        if (Global.isSkewersGame) {
            SkewersManager.getInstance().exitCallBack();
        } else {
            GameCenterManager.getInstance().exitCallBack();
        }
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
            if (lineCount % this.selectedLevel == 0) {
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
        const maxPos = this.selectedLevel * this.selectedLevel;
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
        if (Global.isSkewersGame) {
            this.selectedLevelIndex = Global.userData.curSkewerGameData.difficulty - 1;
            this.selectedLevel = this.levelList[this.selectedLevelIndex];
        }
        this.randomSwapPuzzleChipsNTimes(this.selectedLevel * this.selectedLevel);
    }

    onClickChangeLevel() {
        if (Global.isSkewersGame) {
            this.selectedLevelIndex = Global.userData.curSkewerGameData.difficulty - 1;
        } else {
            this.selectedLevelIndex = (this.selectedLevelIndex + 1) % this.levelList.length;
        }

        this.selectedLevel = this.levelList[this.selectedLevelIndex];
        this.textureIndex = (this.textureIndex + 1) % this.cachedTextures.length;

        this.cleanChipsCache();
        this.cropTextureToSprites(this.levelList[this.selectedLevelIndex], this.cachedTextures[this.textureIndex]);

        this.updatePreviewSprite();
    }

    private updatePreviewSprite() {
        let newSpriteFrame = new SpriteFrame();
        newSpriteFrame.texture = this.cachedTextures[this.textureIndex];
        this.previewSprite.spriteFrame = newSpriteFrame;
        this.showSprite.spriteFrame = newSpriteFrame;
    }

    pauseTime() {
        this.timerComponent.pauseTimer();
    }

    resumeTime() {
        this.timerComponent.resumeTimer();
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

    onClickStartGame() {
        this._startTime = TimeUtil.getNow();
        this.timerComponent.startTimer(this.gameLength.valueOf());
        this.onClickDisturbPuzzleButton();
        this.bgNode.active = false;
        this.startGameMask.active = false;
    }

    processGameFail() {
        DebugLog.instance.log("失败");

        if (Global.isSkewersGame) {
            EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this.failRequestSkewersGameComplete, this);
            this.requestGameResult(false);
        } else {
            this.summaryAlert.node.active = true;
            this.summaryAlert.initByResult(false);
            this.summaryAlert.fadeIn();
        }
    }

    private failRequestSkewersGameComplete() {
        EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this);
        let trainData = SkewersManager.getInstance().getUnCompleteGameData();
        let maxCount = SkewersManager.getInstance().getGameCount();
        let curCount = trainData.seq - 1 < 0 ? 0 : trainData.seq - 1;
        SkewersManager.getInstance().showGameAlert(this.viewNode, AlertType.Normal, "真遗憾，请加油！", '', curCount, maxCount, this.onClickGotoNextlevel, this.exitCallBack, this);
    }


    private gamepasslevelCallback() {

    }

    processGameSuccess() {
        DebugLog.instance.log("成功");
        this.playAudio("music/win",true);
        this.timerComponent.pauseTimer();
        this.showSprite.node.active = true;

        const minScale = 1;
        const maxScale = 1.1;
        const duration = 2;
        // this.chipParentNode.
        let _tween = tween(this.showSprite.node)
            .to(duration, { scale: new Vec3(maxScale, maxScale, maxScale) },{ easing: 'cubicOut' }) // 放大
            .to(duration, { scale: new Vec3(minScale, minScale, minScale) },{ easing: 'cubicOut' }) // 缩小
            .union()
            .repeatForever()
            .start();
        let self = this;
        setTimeout(()=>{
            this.showSprite.node.setScale(new Vec3(1,1,1));
            this.showSprite.node.active = false;
            if(_tween){
                _tween.stop();
                _tween = null;
            }
            if (Global.isSkewersGame) {
               self.requestGameResult(true)
               if (SkewersManager.getInstance().isRunOver()) {
                   SkewersManager.getInstance().showGameAlert(self.viewNode, AlertType.Sucess_Big, "太棒了，恭喜你全部通关", "收获xxx点脑力值！", 0, 0, null, self.exitCallBack, self);
                   return;
               }
               EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, self.requestSkewersGameComplete, self);
            } else {
               // 通小关后发送消息
               let curGame = GameCenterManager.getInstance().currentGame;
               GameCenterManager.getInstance().gamePassLevel(curGame.sessionid, 0, curGame.level, 1, 30, self.gameLength, curGame.difficulty, self.gamepasslevelCallback);
               self.summaryAlert.node.active = true;
               self.summaryAlert.initByResult(true);
               self.summaryAlert.fadeIn();
            }
        }, 4000);
    }

    private requestSkewersGameComplete(data) {
        let trainid = data;
        let trainData = SkewersManager.getInstance().getTrainData(trainid);
        EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, this);
        let maxCount = trainData.parentSkewersGameData.trains.length;
        let curCount = trainData.seq;
        // 游戏内界面提示
        if (maxCount != curCount) {
            SkewersManager.getInstance().showGameAlert(this.viewNode, AlertType.Normal, "太棒了，请继续！", "", curCount, maxCount, this.onClickGotoNextlevel, this.exitCallBack, this);
        } else {
            if (!SkewersManager.getInstance().isRunOver()) {
                SkewersManager.getInstance().showGameAlert(this.viewNode, AlertType.Sucess_Small, "太棒了，恭喜你通关拼图游戏", "收获xxx点脑力值！", 0, 0, this.nextAlertHandler, this.exitCallBack, this);
            } else {
                SkewersManager.getInstance().showGameAlert(this.viewNode, AlertType.Sucess_Big, "太棒了，恭喜你全部通关", "收获xxx点脑力值！", 0, 0, this.exitCallBack, this.exitCallBack, this);
            }
        }
    }

    onClickGotoNextlevel() {
        if (Global.isSkewersGame) {
            if (!SkewersManager.getInstance().isRunOver()) {
                SkewersManager.getInstance().runNextGame();
            } else {
                SkewersManager.getInstance().exitCallBack();
            }
            return;
        }
        // 下一关
        this.onClickChangeLevel();
        this.startGameMask.active = true;
        this.bgNode.active = true;
        this.timerComponent.resetTimer();
    }

    private nextAlertHandler(context) {
        context.pauseTime();
        let gameData = SkewersManager.getInstance().getUnCompleteGameData();
        SkewersManager.getInstance().showGameAlert(context.viewNode, AlertType.Next, `接下来将进入${gameData.gameName}游戏`, '', 0, 0, context.onClickGotoNextlevel, context.exitCallBack, context);
    }


    onClickRetryCurrentLevel() {

        if (Global.isSkewersGame) {
            SkewersManager.getInstance().runNextGame();
            return;
        }
        // 重玩
        this.cleanChipsCache();


        let playIndex = 0;
        if (Global.isSkewersGame) {
            this.selectedLevelIndex = Global.userData.curSkewerGameData.difficulty - 1;
            playIndex = Global.userData.curSkewerGameData.seq;
        }

        const textureIndex = this.selectedLevelIndex + playIndex > this.cachedTextures.length - 1 ? 0 : this.selectedLevelIndex + playIndex;
        this.cropTextureToSprites(this.levelList[this.selectedLevelIndex], this.cachedTextures[textureIndex]);

        this.startGameMask.active = true;
        this.bgNode.active = true;
        this.timerComponent.resetTimer();
    }

    onClickTimeOut() {
        this.timerComponent.resetTimer();
        this.onTimerEnd();
    }
}
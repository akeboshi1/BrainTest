import { _decorator, AnimationComponent, AudioClip, Button, Component, EventTouch, instantiate, Node, Prefab, Rect, Sprite, SpriteFrame, tween, UITransform, Vec2, Vec3 } from 'cc';
import { SentenceMakingModel } from './SentenceMakingModel';
import AlertManager, { AlertData } from '../../scripts/Core/Manager/Alert/AlertManager';
import { SceneManager } from '../../scripts/Core/Manager/Scene/SceneManager';
import { SentenceMakingQuestion } from './SentenceMakingConfig';
import { CardCtrl } from './CardCtrl';
import { DebugLog } from '../../scripts/Core/Util/DebugLog';
import { AudioManager } from '../../scripts/Core/Manager/Audio/AudioManager';
import { SentenceMakingTimerComponent } from './SentenceMakingTimerComponent';
import { Global } from '../../scripts/Core/Manager/Config/Global';
import { GameCenterManager } from '../../scripts/Game/GameCenter/GameCenterManager';
import { SkewersManager } from '../../scripts/Game/Task/Skewers/SkewersManager';
import {LayerUtil} from "db://assets/scripts/Core/Util/LayerUtil";
const { ccclass, property } = _decorator;

@ccclass('SentenceMakingScene')
export class SentenceMakingScene extends Component {
    @property(Prefab)
    cardModel: Prefab = null;

    @property(Prefab)
    emptyModel: Prefab = null;

    @property(Node)
    cardContainer: Node;

    @property(Node)
    resultOffsetNode: Node;

    @property(Node)
    emptyContainer: Node;

    @property(Button)
    btn_commitresult: Button;

    @property(Button)
    btn_nextlevel: Button;

    @property(AudioClip)
    cardAudioClip: AudioClip;

    @property([SpriteFrame])
    btnSps: SpriteFrame[] = [];

    @property(SentenceMakingTimerComponent)
    timer: SentenceMakingTimerComponent;

    @property(AnimationComponent)
    animShow: AnimationComponent;

    @property(AnimationComponent)
    animRotate: AnimationComponent;

    private rawMaxNum: number = 5;//一行最多放几个对象
    private lineMaxNum: number = 3;//最大行数
    private leftOffset: number = 50;//左侧的留白像素
    private topOffset: number = 10;//顶部的留白像素
    private paddingX: number = 10;//水平间距
    private paddingy: number = 10;//垂直间距
    private itemWidth: number = 188;//对象宽度
    private itemheight: number = 235;//对象高度

    private sourceContainerRects: Rect[] = [];
    private resultContainerRects: Rect[] = [];

    private model: SentenceMakingModel = new SentenceMakingModel();

    private sourceContainerMap: Map<number, Node> = new Map();//key 0 - 14 , value 是资源容器的cardModel实例
    private resultContainerMap: Map<number, Node> = new Map();//key 0 - 14 , value 是答案容器的cardModel实例
    private cardModelInstPool: Node[] = [];//

    private resultContainerEmptyInstance: Map<number, Node> = new Map();

    private isDragging = false;
    private startDragPos: Vec2;
    private startDragObjectPos: Vec2;
    private touchResult: number = 0;
    private touchIndex: number = 0;
    private currentQuestion: SentenceMakingQuestion = null;

    start() {
        this.initRects();
        this.model.init(this).then(() => {
            this.showGameTipAlert()
        }).catch(() => {
            let ad: AlertData = new AlertData();
            ad.title = "提示";
            ad.message = "配置加载失败，请检查网络";
            ad.cancelButtonVisible = false;
            ad.confirmCb = () => {
                this.processBack();
            };
            AlertManager.getInstance().showAlert(ad);
        });
    }

    protected onEnable(): void {
        this.timer.on("timer-end", this.onTimeout, this);
    }

    protected onDisable(): void {
        this.timer.off("timer-end", this.onTimeout, this);
    }

    protected onDestroy(): void {
        AudioManager.getInstance().stop();

        this.sourceContainerMap.clear();
        this.resultContainerMap.clear();
        this.resultContainerEmptyInstance.clear();

        this.model.dispose();
    }

    private initRects() {
        for (let i = 0; i < (this.lineMaxNum * this.rawMaxNum); i++) {
            let sourceRect = new Rect();
            let resultRect = new Rect();
            let offsetPos = this.getPositionByIndex(i);
            sourceRect.x = this.cardContainer.position.x + offsetPos.x;
            sourceRect.y = this.cardContainer.position.y + offsetPos.y - this.itemheight;
            sourceRect.height = this.itemheight;
            sourceRect.width = this.itemWidth;
            this.sourceContainerRects.push(sourceRect);

            offsetPos = this.getPositionByIndex(i, true);
            resultRect.x = this.cardContainer.position.x + offsetPos.x;
            resultRect.y = this.cardContainer.position.y + offsetPos.y - this.itemheight;
            resultRect.height = this.itemheight;
            resultRect.width = this.itemWidth;
            this.resultContainerRects.push(resultRect);
        }
    }

    private showGameTipAlert() {
        let ad: AlertData = new AlertData();
        ad.title = "提示";
        ad.message = "将麻将按照正确语序，移动到地板上，组成句子，然后点击“胡”！";
        ad.cancelButtonVisible = false;
        ad.confirmCb = () => {
            this.startGameFlow();
        };
        AlertManager.getInstance().showAlert(ad);
    }

    private async startGameFlow() {
        this.btn_nextlevel.node.active = false;
        this.btn_commitresult.node.active = true;
        this.hideAnimHupai();

        this.btn_commitresult.node.getComponent(Sprite).spriteFrame = this.btnSps[1];

        this.recyleCardModel();
        let question: SentenceMakingQuestion = this.model.getCurrentQuestion();
        this.currentQuestion = question;
        await this.initCardsInstance(question);
    }

    private recyleCardModel() {
        //遍历sourceContainerMap和resultContainerMap 把其中的Node实例转移到cardModelInstPool中
        for (let [key, node] of this.sourceContainerMap) {
            this.cardModelInstPool.push(node);
            node.off(Node.EventType.TOUCH_START, this.onDragStart, this);
            node.off(Node.EventType.TOUCH_MOVE, this.onDragMove, this);
            node.off(Node.EventType.TOUCH_END, this.onDragEnd, this);
            node.off(Node.EventType.TOUCH_CANCEL, this.onDragEnd, this);
            node.active = false;
        }
        this.sourceContainerMap.clear();

        for (let [key, node] of this.resultContainerMap) {
            this.cardModelInstPool.push(node);
            node.off(Node.EventType.TOUCH_START, this.onDragStart, this);
            node.off(Node.EventType.TOUCH_MOVE, this.onDragMove, this);
            node.off(Node.EventType.TOUCH_END, this.onDragEnd, this);
            node.off(Node.EventType.TOUCH_CANCEL, this.onDragEnd, this);
            node.active = false;
        }
        this.resultContainerMap.clear();
    }


    private getPositionByIndex(index: number, isResult: boolean = false): Vec3 {
        const col = index % this.rawMaxNum;
        const row = Math.floor(index / this.rawMaxNum);
        const x = this.leftOffset + col * (this.itemWidth + this.paddingX);
        let y = 0 - this.topOffset - row * (this.itemheight + this.paddingy);
        if (isResult) {
            y += this.resultOffsetNode.position.y;
        }
        return new Vec3(x, y, 0);
    }

    private async initCardsInstance(question: SentenceMakingQuestion) {
        let sentence: string[] = question.sentence;
        let fixed: number[] = question.fixed;

        let durationList: number[] = [];
        let moveDuration = 0.1;
        for (let i = 0; i < sentence.length; i++) {
            durationList.push((i + 1) * moveDuration);
        }

        let emptyIndexList: number[] = [];
        for (let i = 0; i < sentence.length - fixed.length; i++) {
            emptyIndexList.push(i);
        }

        const flipDelay = 0.1;
        for (let i = 0; i < sentence.length; i++) {
            let inst: Node;
            if (this.cardModelInstPool.length > 0) {
                inst = this.cardModelInstPool.pop();
                inst.active = true;
            } else {
                inst = instantiate(this.cardModel);
                inst.getComponent(UITransform).setContentSize(this.itemWidth, this.itemheight);
                inst.parent = this.cardContainer;
            }

            let cardCtrl = inst.getComponent(CardCtrl);
            cardCtrl.setid(i);
            cardCtrl.setLabel(sentence[i]);
            cardCtrl.setNormal();

            const rdduration = Math.floor(Math.random() * durationList.length);
            const dur = durationList[rdduration];
            durationList.splice(rdduration, 1);
            const delay = dur - moveDuration;

            if (fixed.indexOf(i) >= 0) {
                this.resultContainerMap.set(i, inst);
                cardCtrl.lock();

                this.cardMoveInFlow(inst, this.getPositionByIndex(i, true), moveDuration, delay);
            } else {
                cardCtrl.unlock();
                const randomIndex = Math.floor(Math.random() * emptyIndexList.length);
                const pos = emptyIndexList[randomIndex];
                emptyIndexList.splice(randomIndex, 1);
                this.sourceContainerMap.set(pos, inst);

                this.cardMoveInFlow(inst, this.getPositionByIndex(pos), moveDuration, delay);
                cardCtrl.resetAnim();
            }

            // 去resultContainerEmptyInstance查看是否存在当前index的emptyModel实例，如果没有则创建（并且设置位置），有的话就不动；
            if (!this.resultContainerEmptyInstance.has(i)) {
                let emptyInst = instantiate(this.emptyModel);
                emptyInst.getComponent(UITransform).setContentSize(this.itemWidth, this.itemheight);
                emptyInst.parent = this.emptyContainer;
                emptyInst.setPosition(this.getPositionByIndex(i));
                this.resultContainerEmptyInstance.set(i, emptyInst);
            }
        }

        // 清理cardModelInstPool 遍历一下然后把其中的node都removefromparent
        for (let node of this.cardModelInstPool) {
            if (node && node.parent) {
                node.removeFromParent();
            }
        }
        this.cardModelInstPool = [];
        // 清理resultContainerEmptyInstance里超过sentence长度的实例
        let keysToDelete: number[] = [];
        for (let key of this.resultContainerEmptyInstance.keys()) {
            if (key >= sentence.length) {
                keysToDelete.push(key);
            }
        }
        for (let key of keysToDelete) {
            let node = this.resultContainerEmptyInstance.get(key);
            if (node) {
                node.removeFromParent();
                this.resultContainerEmptyInstance.delete(key);
            }
        }

        this.timer.resetTimer();

        await this.processFlipAnim();

        this.timer.startTimer(this.model.gameTime);

        for (let [key, inst] of this.sourceContainerMap) {
            inst.on(Node.EventType.TOUCH_START, this.onDragStart, this);
            inst.on(Node.EventType.TOUCH_MOVE, this.onDragMove, this);
            inst.on(Node.EventType.TOUCH_END, this.onDragEnd, this);
            inst.on(Node.EventType.TOUCH_CANCEL, this.onDragEnd, this);
        }
    }

    private async processFlipAnim(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let moveDuration = 0.1;
            let flipDelay = 0.1;
            let finishCount = 0;
            for (let [key, inst] of this.sourceContainerMap) {
                tween(inst).delay(this.currentQuestion.sentence.length * moveDuration + key * flipDelay).call(() => {
                    inst.getComponent(CardCtrl).playFlip();
                    AudioManager.getInstance().playOneShot(this.cardAudioClip);
                    finishCount++;
                    if (finishCount == this.sourceContainerMap.size) {
                        resolve();
                    }
                }).start();
            }
        });
    }

    private async cardMoveInFlow(node: Node, targetPos: Vec3, duration: number, delay: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            node.setPosition(new Vec3(targetPos.x + 1080, targetPos.y, 0));
            tween(node).delay(delay).call(() => {
                AudioManager.getInstance().playOneShot(this.cardAudioClip);
            }).to(duration, { position: targetPos }).call(() => {
                resolve();
            }).start();
        });
    }

    private onDragStart(event: EventTouch) {
        if (this.isDragging) {
            return;
        }
        this.isDragging = true;
        this.touchResult = 0;
        let currentPos: Vec2 = event.getUILocation();
        const vec3 = event.target.parent.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(currentPos.x, currentPos.y, 0));
        const startpos = new Vec2(vec3.x, vec3.y);
        this.startDragPos = startpos;
        this.startDragObjectPos = new Vec2(event.target.position.x, event.target.position.y);
        event.target.setSiblingIndex(1000);
    }

    private onDragMove(event: EventTouch) {
        if (this.isDragging) {
            let currentPos: Vec2 = event.getUILocation();
            const vec3 = event.target.parent.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(currentPos.x, currentPos.y, 0));
            const offset = vec3.subtract(new Vec3(this.startDragPos.x, this.startDragPos.y, 0)); // 计算偏移量
            event.target.setPosition(this.startDragObjectPos.x + offset.x, this.startDragObjectPos.y + offset.y);

            this.checkTouchedRect(event.target);
            DebugLog.instance.log("onTouchEnd  ---- result = " + this.touchResult + ", index = " + this.touchIndex);
        }
    }

    private onDragEnd(event: EventTouch) {
        if (!this.isDragging) {
            return;
        }

        this.isDragging = false;
        event.target.setSiblingIndex(0);

        if (this.touchResult == 0) {
            this.processTouchCancel(event.target);
        } else {
            let targetInstMap = this.touchResult == 1 ? this.sourceContainerMap : this.resultContainerMap;
            let mp1 = this.getMapKeyByValue(event.target, this.sourceContainerMap) >= 0 ? this.sourceContainerMap : this.resultContainerMap;
            let mp2 = targetInstMap;
            let i1 = this.getMapKeyByValue(event.target, mp1);
            let i2 = this.touchIndex;

            if (targetInstMap.has(this.touchIndex)) {
                let targetInst = targetInstMap.get(this.touchIndex);
                if (targetInst.getComponent(CardCtrl).isLocked()) {
                    this.processTouchCancel(event.target);
                } else {
                    this.processSwapCard(mp1, i1, mp2, i2);
                }
            } else {
                this.processSwapCard(mp1, i1, mp2, i2);
            }

            this.updateCommitButtonState();
        }
    }

    private getMapKeyByValue(target, map: Map<number, Node>): number {
        for (let [key, value] of map.entries()) {
            if (value === target) {
                return key;
            }
        }
        return -1;
    }

    private processTouchCancel(target: Node) {
        const targetPosition = new Vec3(this.startDragObjectPos.x, this.startDragObjectPos.y, 0);
        const duration = 0.3;

        tween(target)
            .to(duration, { position: targetPosition })
            .start();
    }

    private processSwapCard(mp1: Map<number, Node>, index1: number, mp2: Map<number, Node>, index2: number) {
        const t1 = mp1.get(index1);
        const hast2 = mp2.has(index2);
        let t2 = hast2 ? mp2.get(index2) : null;

        mp2.set(index2, t1);
        if (t2) {
            mp1.set(index1, t2);
        } else {
            mp1.delete(index1);
        }

        const targetPosition1 = this.getPositionByIndex(index2, mp2 == this.resultContainerMap);
        const targetPosition2 = this.getPositionByIndex(index1, mp1 == this.resultContainerMap);

        const duration = 0.3;
        AudioManager.getInstance().playOneShot(this.cardAudioClip);
        tween(t1).to(duration, { position: targetPosition1 }).call(() => {
        }).start();
        if (t2) {
            tween(t2).to(duration, { position: targetPosition2 }).start();
        }

        this.printMpData();
    }

    private printMpData() {
        for (let [index, node] of this.sourceContainerMap.entries()) {
            let cardCtrl = node.getComponent(CardCtrl);
            if (cardCtrl) {
                DebugLog.instance.log(`sourceContainerMap, index: ${index}, value.getComponent(CardCtrl).getid(): ${cardCtrl.getid()}`);
            }
        }

        for (let [index, node] of this.resultContainerMap.entries()) {
            let cardCtrl = node.getComponent(CardCtrl);
            if (cardCtrl) {
                DebugLog.instance.log(`resultContainerMap, index: ${index}, value.getComponent(CardCtrl).getid(): ${cardCtrl.getid()}`);
            }
        }
    }

    private checkTouchedRect(target: Node) {
        let rect = new Rect();
        rect.x = target.position.x + target.parent.position.x;
        rect.y = target.position.y + target.parent.position.y - this.itemheight;
        rect.width = this.itemWidth;
        rect.height = this.itemheight;

        let maxOverlapArea = 0;
        let overlapCount = 0;
        this.touchResult = 0;
        this.touchIndex = 0;

        for (let i = 0; i < this.sourceContainerRects.length; i++) {
            const sourceRect = this.sourceContainerRects[i];
            const overlapArea = this.calculateOverlapArea(rect, sourceRect);

            if (overlapArea > maxOverlapArea) {
                maxOverlapArea = overlapArea;
                this.touchResult = 1;
                this.touchIndex = i;
            }

            if (overlapArea > 0) {
                overlapCount++;
                if (overlapCount >= 4) {
                    //减少多余判断
                    return;
                }
            }
        }

        for (let i = 0; i < this.resultContainerRects.length; i++) {
            const resultRect = this.resultContainerRects[i];
            const overlapArea = this.calculateOverlapArea(rect, resultRect);
            if (overlapArea > maxOverlapArea) {
                maxOverlapArea = overlapArea;
                this.touchResult = 2;
                this.touchIndex = i;
            }

            if (overlapArea > 0) {
                overlapCount++;
                if (overlapCount >= 4) {
                    //减少多余判断
                    return;
                }
            }
        }
    }

    private calculateOverlapArea(rect1: Rect, rect2: Rect): number {
        const xOverlap = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
        const yOverlap = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
        return xOverlap * yOverlap;
    }

    public onClickBack() {
        this.model.quitGame();
    }

    private processBack(){
        if (Global.isSkewersGame) {
            SkewersManager.getInstance().exitCallBack();
        } else {
            GameCenterManager.getInstance().exitCallBack();
        }
    }

    private updateCommitButtonState() {
        let isActive = true;
        if (this.sourceContainerMap.size > 0) {
            isActive = false;
        }

        for (let i = 0; i < this.resultContainerMap.size; i++) {
            let node = this.resultContainerMap.get(i);
            if (!node) {
                isActive = false;
                break;
            }
        }

        this.btn_commitresult.node.getComponent(Sprite).spriteFrame = isActive ? this.btnSps[0] : this.btnSps[1];
    }

    public processGameSummary() {
        let isSuccess = true;
        let wrongIndices = [];
        let ad: AlertData = new AlertData();
        ad.cancelButtonVisible = false;
        let showAlert = true;

        if (this.sourceContainerMap.size > 0) {
            ad.title = "提示";
            ad.message = "你还有牌没有使用";
            AlertManager.getInstance().showAlert(ad);
            return;
        }

        for (let i = 0; i < this.resultContainerMap.size; i++) {
            let node = this.resultContainerMap.get(i);
            if (!node) {
                ad.title = "提示";
                ad.message = "你还有牌没有使用";
                AlertManager.getInstance().showAlert(ad);
                return;
            }
            let cardCtrl = node.getComponent(CardCtrl);
            node.off(Node.EventType.TOUCH_START, this.onDragStart, this);
            node.off(Node.EventType.TOUCH_MOVE, this.onDragMove, this);
            node.off(Node.EventType.TOUCH_END, this.onDragEnd, this);
            node.off(Node.EventType.TOUCH_CANCEL, this.onDragEnd, this);
            if (cardCtrl) {
                let currentIndex = cardCtrl.getid();
                if (currentIndex !== i) {
                    isSuccess = false;
                    wrongIndices.push(node);
                }
            }
        }

        if (isSuccess) {
            // 处理游戏成功逻辑，例如弹出成功提示，解锁下一关等
            DebugLog.instance.log("游戏成功！");
            this.showAnimHupai();
            showAlert = false;
        } else {
            // 处理游戏失败逻辑，标记错误位置
            for (let wrongNode of wrongIndices) {
                let cardCtrl = wrongNode.getComponent(CardCtrl);
                if (cardCtrl) {
                    cardCtrl.setWrong();
                }
            }
            ad.title = "可惜";
            ad.message = "挑战失败了";
        }

        if (showAlert) {
            AlertManager.getInstance().showAlert(ad);
        }

        this.btn_nextlevel.node.active = this.model.hasNextLevel();
        this.btn_commitresult.node.active = false;
        this.model.postGameData(Number(isSuccess), this.timer.getElapsedTime());
        this.timer.resetTimer();
    }

    public clickNextLeve() {
        this.model.goNextQuestion();
        this.startGameFlow();
    }

    public pause(){
        this.timer.pauseTimer();
        this.onDisable();
    }

    public resume(){
        this.timer.resumeTimer();
        this.onEnable();
    }

    private onTimeout() {
        let ad: AlertData = new AlertData();
        ad.cancelButtonVisible = false;
        ad.title = "没有时间啦";
        ad.message = "挑战失败";
        AlertManager.getInstance().showAlert(ad);

        for (let [key, node] of this.sourceContainerMap) {
            node.off(Node.EventType.TOUCH_START, this.onDragStart, this);
            node.off(Node.EventType.TOUCH_MOVE, this.onDragMove, this);
        }

        for (let [key, node] of this.resultContainerMap) {
            node.off(Node.EventType.TOUCH_START, this.onDragStart, this);
            node.off(Node.EventType.TOUCH_MOVE, this.onDragMove, this);
        }

        this.btn_nextlevel.node.active = true;
        this.btn_commitresult.node.active = false;

        this.model.postGameData(0, this.model.gameTime);
    }

    private showAnimHupai() {
        this.animShow.node.active = true;
        this.animShow.play();
        this.animRotate.play();
    }

    private hideAnimHupai() {
        this.animShow.node.active = false;
    }
}

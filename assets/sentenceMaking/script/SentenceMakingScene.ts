import { _decorator, AnimationComponent, AudioClip, Button, EventTouch, instantiate, Label, Node, Prefab, Rect, RichText, Sprite, SpriteFrame, tween, UITransform, Vec2, Vec3 } from 'cc';
import { SentenceMakingModel } from './SentenceMakingModel';
import AlertManager, { AlertData } from '../../resources/scripts/Core/Manager/Alert/AlertManager';
import { SentenceMakingQuestion } from './SentenceMakingConfig';
import { CardCtrl } from './CardCtrl';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
import { TimerCommonComponent } from '../../resources/scripts/Game/UI/Common/TimerCommonComponent';
import { LayerUtil } from '../../resources/scripts/Core/Util/LayerUtil';
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";
import { GameType, IBaseGameChild } from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import {SkewersManager} from "db://assets/resources/scripts/Game/Task/Skewers/SkewersManager";
import {Global} from "db://assets/resources/scripts/Core/Manager/Config/Global";
import { TimeUtil } from '../../resources/scripts/Core/Util/TimeUtil';
import { EventManager } from '../../resources/scripts/Core/Manager/Event/EventManager';
const { ccclass, property } = _decorator;

@ccclass('SentenceMakingScene')
export class SentenceMakingScene extends BaseScene<IBaseGameChild> {

    // @property(Node)
    // viewNode: Node = null; 

    private audioUrl: string = 'card';

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

    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent;

    @property(AnimationComponent)
    animShow: AnimationComponent;

    @property(AnimationComponent)
    animRotate: AnimationComponent;

    @property(Node)
    correctAnswerNode: Node;

    @property(RichText)
    correctAnswerLabel: RichText;

    private rawMaxNum: number = 5;//一行最多放几个对象
    private lineMaxNum: number = 3;//最大行数
    private leftOffset: number = 25;//左侧的留白像素
    private topOffset: number = 10;//顶部的留白像素
    private paddingX: number = 10;//水平间距
    private paddingy: number = 10;//垂直间距
    private itemWidth: number = 180;//对象宽度
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


    onLoad(): void {
        this.loadAudio().then();
        this.audioMap.set(this.audioUrl, this.cardAudioClip);
    }

    start() {
        super.start();
        this.viewNode = LayerUtil.getPanelLayer();

        this.model.init(this).then(() => {
            this.showGameTipAlert()
        }).catch((error) => {
            let ad: AlertData = new AlertData();
            ad.title = "提示";
            ad.message = "配置加载失败，请检查网络";
            ad.cancelButtonVisible = false;
            ad.confirmCb = () => {
                this.exitCallBack(this);
            };
            AlertManager.getInstance().showAlert(ad);
        });
    }

    protected onDestroy(): void {
        // AudioManager.getInstance().stop();

        this.sourceContainerMap.clear();
        this.resultContainerMap.clear();
        this.resultContainerEmptyInstance.clear();

        this.model.dispose();
    }

    quitGame(): void {
        super.quitGame({ parentNode: this.viewNode, context: this });
    }

    requestSkewersGameComplete(complete: number, duration: number) {
        this.sceneModel.requestGameComplete({ context: this, parentNode: this.viewNode, complete, duration });
    }

    requestGameCenterComplete(count: number, level: number, complete: number, duration: number, timelimit: number, difficulty: number, levelMode: number) {
        const curGame = (this.sceneModel as any).game;
        this.requestGameComplete({
            sessionId: curGame.sessionid,
            count,
            level,
            complete,
            duration,
            timelimit,
            difficulty,
            levelMode
        });
    }

    requestGameCompleteCallBack() {
        this.model.requestGameCompleteCallBack();
    }

    private initRects(question: SentenceMakingQuestion) {
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

        // 生成resultContainerRects
        this.resultContainerRects = [];
        const startY = this.resultOffsetNode.position.y - this.topOffset;
        let currentX = this.leftOffset;
        let currentY = startY;
        let lineItemCount = 0; // 当前行元素计数（标点算0.5）
        let lineHeight = 0;

        question.sentence.forEach((text, index) => {
            // 判断是否为标点符号
            const isPunctuation = question.punctuationOptions.some(p => p.index === index);

            // 计算元素宽度
            const elementWidth = isPunctuation
                ? (this.itemWidth * 0.5 - this.paddingX * 2)
                : this.itemWidth;

            // 检查是否需要换行
            if (!isPunctuation && lineItemCount + (isPunctuation ? 0.5 : 1) > this.rawMaxNum) {
                currentX = this.leftOffset;
                currentY -= (lineHeight + this.paddingy);
                lineItemCount = 0;
                lineHeight = 0;
            }

            // 创建rect
            const rect = new Rect();
            rect.x = this.cardContainer.position.x + currentX;
            rect.y = this.cardContainer.position.y + currentY - this.itemheight; // Y轴向下为负
            rect.width = elementWidth;
            rect.height = this.itemheight;
            this.resultContainerRects.push(rect);

            // 更新布局参数
            currentX += elementWidth + this.paddingX;
            lineItemCount += isPunctuation ? 0.5 : 1;
            lineHeight = Math.max(lineHeight, this.itemheight);
        });
    }


    private showGameTipAlert() {
        let ad: AlertData = new AlertData();
        ad.title = "提示";
        ad.message = '将麻将按照正确语序，移动到地板上，组成句子，然后点击"胡"！';
        ad.cancelButtonVisible = false;
        ad.confirmCb = () => {
            this.startGameFlow();
        };
        AlertManager.getInstance().showAlert(ad);
    }

    private async startGameFlow() {
        this.btn_nextlevel.node.active = false;
        this.btn_commitresult.node.active = true;
        this.correctAnswerNode.active = false;
        this.hideAnimHupai();

        this.btn_commitresult.node.getComponent(Sprite).spriteFrame = this.btnSps[1];

        this.recyleCardModel();
        let question: SentenceMakingQuestion = this.model.getCurrentQuestion();
        if (!question) return;
        this.currentQuestion = question;
        this.initRects(question);

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
        if (!isResult) {
            const col = index % this.rawMaxNum;
            const row = Math.floor(index / this.rawMaxNum);
            const x = this.leftOffset + col * (this.itemWidth + this.paddingX) + this.itemWidth / 4;
            const y = 0 - this.topOffset - row * (this.itemheight + this.paddingy);
            return new Vec3(x, y, 0);
        } else {
            if (index < 0 || index >= this.resultContainerRects.length) {
                DebugLog.instance.warn(`无效的结果容器索引：${index}`);
                return Vec3.ZERO;
            }

            const rect = this.resultContainerRects[index];
            return new Vec3(
                rect.x - this.cardContainer.position.x,
                rect.y + this.itemheight - this.cardContainer.position.y,
                0
            );
        }
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

        for (let i = 0; i < sentence.length; i++) {
            const isPunctuation = question.punctuationOptions.some(p => p.index === i);
            let inst: Node;
            if (this.cardModelInstPool.length > 0) {
                inst = this.cardModelInstPool.pop();
                inst.active = true;
            } else {
                inst = instantiate(this.cardModel);
                inst.parent = this.cardContainer;
                inst.getComponent(UITransform).setContentSize(this.itemWidth, this.itemheight);
            }

            let cardCtrl = inst.getComponent(CardCtrl);
            cardCtrl.setid(i);
            if (isPunctuation) {
                cardCtrl.setPunctuation(sentence[i]);
            } else {
                cardCtrl.setLabel(sentence[i]);
            }
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
            if (!this.resultContainerEmptyInstance.has(i) && !isPunctuation) {
                let emptyInst = instantiate(this.emptyModel);
                emptyInst.getComponent(UITransform).setContentSize(this.itemWidth, this.itemheight);
                emptyInst.parent = this.emptyContainer;

                this.resultContainerEmptyInstance.set(i, emptyInst);
            }
            if (this.resultContainerEmptyInstance.has(i)) {
                let node = this.resultContainerEmptyInstance.get(i);
                if (node) {
                    if (isPunctuation) {
                        node.removeFromParent();
                        this.resultContainerEmptyInstance.delete(i);
                    } else {
                        node.setPosition(this.getPositionByIndex(i, true));
                    }
                }
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

        this.timerComponent.resetTimer();

        await this.processFlipAnim();

        this.timerComponent.startTimer(this.model.gameTime);

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
                    this.playAudio(this.audioUrl, true);
                    // AudioManager.getInstance().playOneShot(this.cardAudioClip);
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
                this.playAudio(this.audioUrl, true);
                // AudioManager.getInstance().playOneShot(this.cardAudioClip);
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

        // 添加保护逻辑，判断起始点和松手点是否相同
        let currentPos: Vec2 = event.getUILocation();
        const vec3 = event.target.parent.getComponent(UITransform).convertToNodeSpaceAR(new Vec3(currentPos.x, currentPos.y, 0));
        const endPos = new Vec2(vec3.x, vec3.y);
        if (Vec2.equals(this.startDragPos, endPos)) {
            this.isDragging = false;
            event.target.setSiblingIndex(0);
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
        this.playAudio(this.audioUrl, true);
        // AudioManager.getInstance().playOneShot(this.cardAudioClip);
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

        // 打印被检测的矩形
        // DebugLog.instance.log(`开始检测碰撞区域：
        //    目标矩形: X=${rect.x.toFixed(1)} Y=${rect.y.toFixed(1)}
        //    尺寸: ${rect.width.toFixed(1)}x${rect.height.toFixed(1)}
        //    所属卡片: ${target.getComponent(CardCtrl)?.getid()}`);

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
        }

        // 在检测结束时打印最终结果
        // DebugLog.instance.log(`碰撞检测结果：
        //    最大重叠区域: ${maxOverlapArea.toFixed(1)}
        //    目标容器: ${this.touchResult === 1 ? '源容器' : '结果容器'}
        //    索引: ${this.touchIndex}`);
    }

    private calculateOverlapArea(rect1: Rect, rect2: Rect): number {
        const xOverlap = Math.max(0, Math.min(rect1.x + rect1.width, rect2.x + rect2.width) - Math.max(rect1.x, rect2.x));
        const yOverlap = Math.max(0, Math.min(rect1.y + rect1.height, rect2.y + rect2.height) - Math.max(rect1.y, rect2.y));
        return xOverlap * yOverlap;
    }

    public onClickBack() {
        this.model.quitGame();
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

        let user_answer: string[] = [];
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

                user_answer.push(this.model.getCurrentQuestion().sentence[currentIndex]);
            }
        }

        if (isSuccess) {
            // 处理游戏成功逻辑，例如弹出成功提示，解锁下一关等
            DebugLog.instance.log("游戏成功！");
            this.showAnimHupai();
            this.playWin();
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
            this.playFail();
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                showAlert = false;
            }
        }

        if (showAlert) {
            AlertManager.getInstance().showAlert(ad);
        }

        this.btn_nextlevel.node.active = this.model.hasNextLevel();
        this.btn_commitresult.node.active = false;
        this.model.postGameData(isSuccess, this.timerComponent.getElapsedTime(), user_answer);
        this.timerComponent.resetTimer();
    }

    public clickNextLeve() {
        this.model.goNextQuestion();
        this.startGameFlow();
    }

    resumeCallBack(context?: any): void {
        super.resumeCallBack(context);
    }

    goonHandler() {
        this.clearGameView();
        if (this.sceneModel) {
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                if(SkewersManager.getInstance().isRunOver()) {
                    this.correctAnswerNode.active = false;
                   this.showNextSuccessHandler();
                } else {
                    if(SkewersManager.getInstance().curGame && SkewersManager.getInstance().curGame.getCurTrainData() == null){
                        (this.sceneModel as any).goonHandler(this, true);
                    } else {
                        (this.sceneModel as any).goonHandler(this, this.model.isRunOver);
                        if (!this.model.isRunOver) this.clickNextLeve();
                    }
                }
            } else {
                this.sceneModel.goonHandler();
            }
        }
    }

    onclickContinue() {
        (this.sceneModel as any).dzanswerHandler(this);
        // this.requestSkewersGameComplete(Number(this.model._resultBoo), this.model._duration);
    }

    dzgoonHandler(win:boolean = true) {
        this.clearGameView();
        if (this.sceneModel) {
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                // 直接发送游戏完成请求，不处理弹窗逻辑
                // 使用模型中的运行结果
                let complete = win?1:0
                let duration = 0;
        




                // 直接向服务器发送请求，但不处理回调
                EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE, (data) => {
                    // 请求完成后不做弹窗处理
                    // 然后直接继续下一个游戏
                    (this.sceneModel as any).goonHandler(this, this.model.isRunOver);
                }, this, true);
                
                SkewersManager.getInstance().requestGameComplete(complete, duration);
            }
        }
    }

    gotoNextGame() {
        this.clearGameView();
        if (this.sceneModel) {
            if (this.sceneModel.gameType == GameType.SKEWERS) {
                (this.sceneModel as any).goonHandler(this, this.model.isRunOver);
            }
        }
    }

    onTimerEnd() {
        if (this.sceneModel.gameType != GameType.SKEWERS) {
            let ad: AlertData = new AlertData();
            ad.cancelButtonVisible = false;
            ad.title = "没有时间啦";
            ad.message = "挑战失败";
            AlertManager.getInstance().showAlert(ad);
        }

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

        this.model.postGameData(false, this.model.gameTime);
    }

    private showAnimHupai() {
        this.animShow.node.active = true;
        this.animShow.play();
        this.animRotate.play();
    }

    private hideAnimHupai() {
        this.animShow.node.active = false;
    }

    public onClickRetryGame() {
        Global.isAgain = true;
        this.startGameFlow();
    }

    public onClickShowAnswer() {
        Global.isAgain = false;
        this.correctAnswerNode.active = true;
        const question = this.model.getCurrentQuestion();
        let fixed: number[] = question.fixed;
        let correctAnswerText: string = "";
        let lineItemCount = 0; // 当前行元素计数（标点算0.5） 

        for (let i = 0; i < question.sentence.length; i++) {
            if (lineItemCount > (this.rawMaxNum - 1)) {
                correctAnswerText += "\n";
                lineItemCount = 0;
            }
            const isPunctuation = question.punctuationOptions.some(p => p.index === i);
            if (fixed.indexOf(i) >= 0) {
                correctAnswerText += `<color=#A60202>${question.sentence[i]}</color> `;
            } else {
                correctAnswerText += `<color=#000000>${question.sentence[i]}</color> `;
            }
            lineItemCount = lineItemCount + (isPunctuation ? 0.5 : 1);
        }

        this.correctAnswerLabel.string = correctAnswerText;
    }

}

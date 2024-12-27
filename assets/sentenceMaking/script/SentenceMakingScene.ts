import { _decorator, Button, Component, EventMouse, EventTouch, instantiate, Node, Prefab, Rect, tween, UITransform, Vec2, Vec3 } from 'cc';
import { SentenceMakingModel } from './SentenceMakingModel';
import AlertManager, { AlertData } from '../../scripts/Core/Manager/Alert/AlertManager';
import { SceneManager } from '../../scripts/Core/Manager/Scene/SceneManager';
import { SentenceMakingQuestion } from './SentenceMakingConfig';
import { CardCtrl } from './CardCtrl';
import { DebugLog } from '../../scripts/Core/Util/DebugLog';
const { ccclass, property } = _decorator;

@ccclass('SentenceMakingScene')
export class SentenceMakingScene extends Component {
    @property(Prefab)
    cardModel: Prefab = null;

    @property(Prefab)
    emptyModel: Prefab = null;

    @property(Node)
    sourceContainer: Node;

    @property(Node)
    emptyContainer: Node;

    @property(Node)
    resultContainer: Node;

    @property(Button)
    btn_commitresult: Button;

    @property(Button)
    btn_nextlevel: Button;

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

    start() {
        this.initRects();
        this.model.init().then(() => {
            this.showGameTipAlert()
        }).catch(() => {
            let ad: AlertData = new AlertData();
            ad.title = "提示";
            ad.message = "配置加载失败，请检查网络";
            AlertManager.getInstance().showAlert(ad);
            ad.cancelButtonVisible = false;
            ad.confirmCb = () => {
                SceneManager.getInstance().backToHall();
            };
        });
    }

    protected onDestroy(): void {
        this.sourceContainerMap.clear();
        this.resultContainerMap.clear();
        this.resultContainerEmptyInstance.clear();
    }

    private initRects() {
        for (let i = 0; i < (this.lineMaxNum * this.rawMaxNum); i++) {
            let sourceRect = new Rect();
            let resultRect = new Rect();
            let offsetPos = this.getPositionByIndex(i);
            sourceRect.x = this.sourceContainer.position.x + offsetPos.x;
            sourceRect.y = this.sourceContainer.position.y + offsetPos.y - this.itemheight;
            sourceRect.height = this.itemheight;
            sourceRect.width = this.itemWidth;
            this.sourceContainerRects.push(sourceRect);
            resultRect.x = this.resultContainer.position.x + offsetPos.x;
            resultRect.y = this.resultContainer.position.y + offsetPos.y - this.itemheight;
            resultRect.height = this.itemheight;
            resultRect.width = this.itemWidth;
            this.resultContainerRects.push(resultRect);
        }
    }

    private showGameTipAlert() {
        let ad: AlertData = new AlertData();
        ad.title = "提示";
        ad.message = "将麻将按照正确语序，移动到地板上，组成句子，然后点击“胡”！";
        AlertManager.getInstance().showAlert(ad);
        ad.cancelButtonVisible = false;
        ad.confirmCb = () => {
            this.startGameFlow();
        };
    }

    private async startGameFlow() {
        this.recyleCardModel();
        let question: SentenceMakingQuestion = this.model.getCurrentQuestion();
        await this.initCardsInstance(question);
    }

    private recyleCardModel() {
        //遍历sourceContainerMap和resultContainerMap 把其中的Node实例转移到cardModelInstPool中
        for (let [key, value] of this.sourceContainerMap) {
            this.cardModelInstPool.push(value);
        }
        this.sourceContainerMap.clear();

        for (let [key, value] of this.resultContainerMap) {
            this.cardModelInstPool.push(value);
        }
        this.resultContainerMap.clear();
    }


    private getPositionByIndex(index: number): Vec3 {
        const col = index % this.rawMaxNum;
        const row = Math.floor(index / this.rawMaxNum);
        const x = this.leftOffset + col * (this.itemWidth + this.paddingX);
        const y = this.topOffset + row * (this.itemheight + this.paddingy);
        return new Vec3(x, -y, 0);
    }

    private initCardsInstance(question: SentenceMakingQuestion) {
        let sentence: string[] = question.sentence;
        let fixed: number[] = question.fixed;

        for (let i = 0; i < sentence.length; i++) {
            let inst: Node;
            if (this.cardModelInstPool.length > 0) {
                inst = this.cardModelInstPool.pop();
            } else {
                inst = instantiate(this.cardModel);
                inst.getComponent(UITransform).setContentSize(this.itemWidth, this.itemheight);
            }

            let cardCtrl = inst.getComponent(CardCtrl);
            cardCtrl.setid(i);
            cardCtrl.setLabel(sentence[i]);

            if (fixed.indexOf(i) > 0) {
                inst.parent = this.resultContainer;
                inst.setPosition(this.getPositionByIndex(i));
                inst.off(Node.EventType.TOUCH_START, this.onDragStart, this);
                inst.off(Node.EventType.TOUCH_MOVE, this.onDragMove, this);
                inst.off(Node.EventType.TOUCH_END, this.onDragEnd, this);
                inst.off(Node.EventType.TOUCH_CANCEL, this.onDragEnd, this);
                this.resultContainerMap.set(i, inst);
                cardCtrl.lock();
            } else {
                inst.parent = this.sourceContainer;
                inst.setPosition(this.getPositionByIndex(i));
                inst.on(Node.EventType.TOUCH_START, this.onDragStart, this);
                inst.on(Node.EventType.TOUCH_MOVE, this.onDragMove, this);
                inst.on(Node.EventType.TOUCH_END, this.onDragEnd, this);
                inst.on(Node.EventType.TOUCH_CANCEL, this.onDragEnd, this);
                this.sourceContainerMap.set(i, inst);
                cardCtrl.unlock();
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

        // 清理cardModelInstPool
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
        this.isDragging = false;
        

        if (this.touchResult == 0) {
            this.processTouchCancel(event.target);
        } else {
            let targetInstMap = this.touchResult == 1 ? this.sourceContainerMap : this.resultContainerMap;
            let mp1 = event.target.parent == this.sourceContainer ? this.sourceContainerMap : this.resultContainerMap;
            let mp2 = targetInstMap;
            let i1;
            for (let [key, value] of mp1.entries()) {
                if (value === event.target) {
                    i1 = key;
                    break;
                }
            }

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
        }
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

        const tp1 = t1.parent;
        let tp2 = t2 ? t2.parent : null;
        if(!tp2){
            tp2 = mp2 == this.sourceContainerMap ? this.sourceContainer : this.resultContainer;
        }

        mp2.set(index2, t1);
        if (t2) {
            mp1.set(index1, t2);
        } else {
            mp1.delete(index1);
        }

        const targetPosition1 = this.getPositionByIndex(index2);
        const targetPosition2 = this.getPositionByIndex(index1);

        //计算出t1当前位置 如果使用t2的父节点需要添加的偏移量
        if (tp1 != tp2) {
            let tp1p = tp1.position;
            let tp2p = tp2.position;
            let t2tot1 = tp1p.subtract(tp2p);
            let t1tot2 = tp2p.subtract(tp1p);
            t1.position = new Vec3(t1.position.add(t1tot2));
            t1.parent = tp2;
            if(t2){
                t2.position = new Vec3(t2.position.add(t2tot1));
                t2.parent = tp1;
            }
        }

        const duration = 0.3;
        tween(t1).to(duration, { position: targetPosition1 }).start();
        if (t2) {
            tween(t2).to(duration, { position: targetPosition2 }).start();
        }

        this.printMpData();
    }

    private printMpData() {
        //遍历sourceContainerMap 和resultContainerMap 中的node
        //打印sourceContainerMap , index , value.getComponent(CardCtrl).getid(); 这三项
        // 遍历sourceContainerMap
        for (let [index, node] of this.sourceContainerMap.entries()) {
            let cardCtrl = node.getComponent(CardCtrl);
            if (cardCtrl) {
                DebugLog.instance.log(`sourceContainerMap, index: ${index}, value.getComponent(CardCtrl).getid(): ${cardCtrl.getid()}`);
            }
        }

        // 遍历resultContainerMap
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

    public onClickBack(){
        SceneManager.getInstance().backToHall();
    }
}

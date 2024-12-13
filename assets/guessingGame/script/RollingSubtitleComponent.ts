import { _decorator, Component, Label, Node, UITransform } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('RollingSubtitleComponent')
export class RollingSubtitleComponent extends Component {
    // 用于显示字幕的节点
    @property(Node)
    private labelNode: Node = null;

    // 滚动速度，单位为像素/秒，默认值为100，可以在编辑器中调整
    @property({ type: Number, tooltip: "滚动速度，单位为像素/秒" })
    private scrollSpeed: number = 100;

    // 滚动开始前停顿的时间，单位为秒，默认值为 2，可以在编辑器中调整
    @property({ type: Number, tooltip: "滚动开始前停顿的时间，单位为秒" })
    private startDelay: number = 2;

    // 滚动结束后停顿的时间，单位为秒，默认值为3，可以在编辑器中调整
    @property({ type: Number, tooltip: "滚动结束后停顿的时间，单位为秒" })
    private stayDuration: number = 3;

    // 用于记录是否正在滚动
    private isScrolling: boolean = false;
    // 用于记录当前滚动的进度（位置）
    private currentScrollPosition: number = 0;
    // 用于记录滚动开始前的停顿倒计时
    private startDelayCountdown: number = 0;
    // 用于记录滚动结束后的停顿倒计时
    private stayCountdown: number = 0;

    start() {
        this.init();
    }

    update(deltaTime: number) {
        if (this.startDelayCountdown > 0) {
            this.startDelayCountdown -= deltaTime;
            if (this.startDelayCountdown <= 0) {
                this.isScrolling = true;
            }
        } else if (this.isScrolling) {
            this.scroll(deltaTime);
            this.checkScrollEnd();
        } else if (this.stayCountdown > 0) {
            this.stayCountdown -= deltaTime;
            if (this.stayCountdown <= 0) {
                this.resetAndDelayBeforeRestart();
            }
        }
    }

    // 初始化方法，检查是否需要开始滚动
    private init() {
        const labelUITransform = this.labelNode.getComponent(UITransform);
        const nodeUITransform = this.node.getComponent(UITransform);
        if (labelUITransform && nodeUITransform) {
            if (labelUITransform.width > nodeUITransform.width) {
                this.startDelayCountdown = this.startDelay;
            }
        }
    }

    // 执行滚动操作，修复设置位置的方式
    private scroll(deltaTime: number) {
        this.currentScrollPosition += this.scrollSpeed * deltaTime;
        this.labelNode.setPosition(-this.currentScrollPosition,this.labelNode.position.y);
    }

    // 检查滚动是否结束
    private checkScrollEnd() {
        const labelUITransform = this.labelNode.getComponent(UITransform);
        const nodeUITransform = this.node.getComponent(UITransform);
        if (labelUITransform && nodeUITransform) {
            if (this.currentScrollPosition >= labelUITransform.width - nodeUITransform.width) {
                this.isScrolling = false;
                this.stayCountdown = this.stayDuration;
            }
        }
    }

    // 重置滚动相关参数，先归位labelNode，然后进行停顿，再启动滚动
    private resetAndDelayBeforeRestart() {
        this.labelNode.setPosition(0,this.labelNode.position.y);
        this.currentScrollPosition = 0;
        this.startDelayCountdown = this.startDelay;
    }

    // 提供外部调用的方法，用于手动从头开始滚动
    public reroll() {
        this.resetAndDelayBeforeRestart();
    }

    public resetString(str:string){
        this.labelNode.getComponent(Label).string = str;
        this.init();
        this.reroll();
    }
}
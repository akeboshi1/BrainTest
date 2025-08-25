import { _decorator, Color, Component, Graphics, Label, log, Node, resources, Sprite, SpriteFrame, UITransform, EventHandler, Button, macro } from 'cc';
import { AbilityType, CogAbilityWeeklyScoresData, ReportManager } from '../ManagerV2/ReportManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { DataProvider } from '../Core/Data/DataProvider';
import { DebugLog } from '../Core/Util/DebugLog';
const { ccclass, property } = _decorator;

@ccclass('OtherChartView')
export class OtherChartView extends Component {
    @property(Node)
    lineChart: Node = null;

    @property(Node)
    leftArrow: Node = null;

    @property(Node)
    rightArrow: Node = null;

    @property(Label)
    title: Label = null;

    @property(Label)
    waitLabel: Label = null;

    @property(Node)
    waitNode: Node = null;

    @property(Node)
    dataNode: Node = null;

    private scoreData: number[] = [];
    private leftPadding = 114;
    private color: Color = new Color(0, 0, 0);
    private width: number = 0;
    private height: number = 0;
    private dataPoints: Node[] = [];

    private currentIndex: number = 0;
    private total: number = 0;

    private _currentDataProvider: DataProvider<CogAbilityWeeklyScoresData> = null;
    private _currentAbilityType: AbilityType = null;

    // 文本动画相关属性
    private _dotCountForAnim: number = 1;
    private _dotAnimStarted: boolean = false;

    start() {
        
    }

    onEnable(): void {
        this._currentAbilityType = ReportManager.getInstance().getCurrentAbilityType();

        this.width = this.lineChart.getComponent(UITransform).width - this.leftPadding;
        this.height = this.lineChart.getComponent(UITransform).height;

        this.setArrowButtonInteractable(this.leftArrow, false);
        this.setArrowButtonInteractable(this.rightArrow, false);

        this.setDataProvider();
    }

    onDisable(): void {
        if (this._currentDataProvider != null) {
            this._currentDataProvider.removeAllListeners();
            this._currentDataProvider = null;
        }

        // 停止文本动画
        this.unscheduleAllCallbacks();
        this._dotAnimStarted = false;
    }

    setDataProvider() {
        if (this._currentDataProvider != null) {
            this._currentDataProvider.removeAllListeners();
        }

        this._currentDataProvider = ReportManager.getInstance().getWeeklyScoresDataProvider(this._currentAbilityType, this.currentIndex);
        if (this._currentDataProvider.data == null) {
            this.startWaitAnim();
        }

        this._currentDataProvider.addListener(this.onDataChange.bind(this));
    }

    onDataChange(data: CogAbilityWeeklyScoresData) {
        this.unscheduleAllCallbacks();
        this._dotAnimStarted = false;

        if (data.available) {
            this.dataNode.active = true;
            this.waitNode.active = false;
            this.scoreData = data.result.map(item => item.score);
            this.total = data.total;

            this.drawLineChart();
            this.setArrowButtonInteractable(this.leftArrow, this.currentIndex < this.total - 1);
            this.setArrowButtonInteractable(this.rightArrow, this.currentIndex > 0);

            this.showTitleContentByIndex();
        } else {
            this.waitLabel.string = '暂无数据';
        }
    }

    setArrowButtonInteractable(target: Node, isInteractable: boolean) {
        const targetSprite = target.getComponent(Sprite);
        targetSprite.color = new Color(0, 0, 0, isInteractable ? 100 : 50);
        target.getComponent(Button).interactable = isInteractable;
    }

    drawLineChart() {
        let g = this.lineChart.getComponent(Graphics);

        // 清除所有内容
        g.clear();

        // 清除所有子节点（包括标签）
        this.lineChart.removeAllChildren();
        this.dataPoints = [];

        // 先绘制主线条
        g.strokeColor = new Color(0, 89, 247);
        g.lineWidth = 6;

        // 刻度高
        let _h = this.height / 100;
        let centerX = this.width / 2;
        let centerY = this.height / 2;

        // 绘制折线图 - 跳过null值的连线
        for (let i = 0; i < this.scoreData.length - 1; i++) {
            // 如果当前点或下一个点为null，则跳过连线
            if (this.scoreData[i] === null || this.scoreData[i + 1] === null) {
                continue;
            }

            const x1 = i * this.width / (this.scoreData.length - 1) - centerX;
            const x2 = (i + 1) * this.width / (this.scoreData.length - 1) - centerX;
            const y1 = this.scoreData[i] * _h - centerY;
            const y2 = this.scoreData[i + 1] * _h - centerY;

            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
        }
        g.stroke();

        // 绘制网格线
        this.drawGridLine(g);

        // 绘制数据点和圆点 - 跳过null值的点
        for (let i = 0; i < this.scoreData.length; i++) {
            // 如果当前点为null，则在dataPoints数组中插入null，保持索引一致
            if (this.scoreData[i] === null) {
                this.dataPoints.push(null);
                continue;
            }

            const x = i * this.width / (this.scoreData.length - 1) - centerX;
            const y = this.scoreData[i] * _h - centerY;

            // 创建数据点节点
            const pointNode = new Node();
            pointNode.setPosition(x, y);
            this.lineChart.addChild(pointNode);
            this.dataPoints.push(pointNode);

            // 绘制圆点
            const pointGraphics = pointNode.addComponent(Graphics);
            pointGraphics.fillColor = new Color(0, 89, 247);
            pointGraphics.circle(0, 0, 8);
            pointGraphics.fill();

            // 添加点击事件组件
            const uiTransform = pointNode.addComponent(UITransform);
            uiTransform.setContentSize(30, 30);

            // 为每个圆点添加点击事件
            pointNode.on(Node.EventType.TOUCH_START, (event) => this.onPointClick(i), this);
        }

        this.drawXAxisLabel();
    }

    clickLeftArrow() {
        if (this.currentIndex < this.total - 1) {
            this.currentIndex++;
            this.setDataProvider();
            DebugLog.instance.log('左侧点击')
        }
    }

    clickRightArrow() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.setDataProvider();
            DebugLog.instance.log('右侧点击')
        }
    }


    showTitleContentByIndex() {
        let data = ReportManager.getInstance().getWeeklyScoresDataProvider(this._currentAbilityType, this.currentIndex).data;
        if (this.currentIndex == 0) {
            this.title.string = `本周`;
        } else {
            this.title.string = `${data.first_day} - ${data.last_day}`;
        }
    }

    /**
     * 生成从开始日期到结束日期之间的所有日期字符串
     * @param startDate 开始日期，格式：xxxx-xx-xx
     * @param endDate 结束日期，格式：xxxx-xx-xx
     * @returns 日期字符串数组，格式：["1.2", "1.3", ...]
     */
    private generateDateStrings(startDate: string, endDate: string): string[] {
        const dateStrings: string[] = [];
        
        // 解析开始日期
        const start = new Date(startDate);
        // 解析结束日期
        const end = new Date(endDate);
        
        // 验证日期格式
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            DebugLog.instance.log('日期格式错误');
            return dateStrings;
        }
        
        // 确保开始日期不大于结束日期
        if (start > end) {
            DebugLog.instance.log('开始日期不能大于结束日期');
            return dateStrings;
        }
        
        // 遍历从开始日期到结束日期的每一天
        const currentDate = new Date(start);
        while (currentDate <= end) {
            const month = currentDate.getMonth() + 1; // getMonth() 返回 0-11，需要 +1
            const day = currentDate.getDate();
            
            // 格式化为 "月.日" 的字符串
            const dateString = `${month}.${day}`;
            dateStrings.push(dateString);
            
            // 移动到下一天
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return dateStrings;
    }

    drawXAxisLabel() {
        let textArr = this.generateDateStrings(this._currentDataProvider.data.first_day, this._currentDataProvider.data.last_day);
        let g = this.lineChart.getComponent(Graphics);
        g.strokeColor = this.color;
        g.lineWidth = 4;

        let centerX = this.width / 2;
        let centerY = this.height / 2;

        for (let i = 0; i < textArr.length; i++) {
            this.drawLabel(i * this.width / (textArr.length - 1) - centerX, -centerY - 30, textArr[i], new Color(0, 0, 0));
        }
    }

    drawGridLine(g: Graphics) {
        // 设置网格线样式
        g.strokeColor = new Color(0, 0, 0, 30);
        g.lineWidth = 5;

        let centerX = this.width / 2;
        let centerY = this.height / 2;

        // 分别绘制每条横线
        for (let i = 20; i <= 100; i += 20) {
            let y = i * this.height / 100 - centerY;
            // 直接从左到右画一条线
            g.moveTo(-centerX - this.leftPadding / 2, y);
            g.lineTo(this.width - centerX + this.leftPadding / 2, y);
            g.stroke();  // 每画完一条线就stroke
        }
    }

    onPointClick(index: number) {
        // 检查当前圆点是否已经有标签
        const pointNode = this.dataPoints[index];

        // 如果pointNode不存在（对应null值的数据点），直接返回
        if (!pointNode) {
            return;
        }

        const existingLabel = pointNode.children.find(child => child.getComponent(Label));

        if (existingLabel) {
            // 如果已经有标签，则移除它
            existingLabel.destroy();
        } else {
            // 如果没有标签，则添加标签
            // 确保数据不为null
            if (this.scoreData[index] !== null) {
                this.drawLabel(0, 20, `${this.scoreData[index]}`, new Color(148, 149, 153), pointNode);
            }
        }
    }

    drawLabel(x: number, y: number, text: string, color: Color = new Color(148, 149, 153), parent: Node = this.lineChart) {
        const labelNode = new Node();
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.color = color;
        const width = labelNode.getComponent(UITransform).width;
        labelNode.setPosition(x - width / 2, y);
        label.fontSize = 36;
        labelNode.getComponent(UITransform).setAnchorPoint(0, 0);
        parent.addChild(labelNode);
        return labelNode;
    }

    startWaitAnim() {
        this.waitNode.active = true;
        this.dataNode.active = false;
        this._startDotAnimation();
    }

    private _startDotAnimation() {
        if (!this._dotAnimStarted) {
            this._dotAnimStarted = true;
            this._dotCountForAnim = 1;
            this.schedule(() => {
                this._dotCountForAnim = (this._dotCountForAnim % 3) + 1;
                const dots = '.'.repeat(this._dotCountForAnim);
                this.waitLabel.string = `获取数据中${dots}`;
            }, 0.5, macro.REPEAT_FOREVER);
        }
    }

}



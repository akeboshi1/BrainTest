import { _decorator, Color, Component, Graphics, Label, log, Node, resources, Sprite, SpriteFrame, UITransform, EventHandler } from 'cc';
import { ReportManager } from '../ManagerV2/ReportManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
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

    private scoreData: number[] = [];
    private leftPadding = 114;
    private color: Color = new Color(0, 0, 0);
    private width: number = 0;
    private height: number = 0;
    private dataPoints: Node[] = [];

    private currentIndex: number = 0;
    private total: number = 0;

    onEnable() {
        EventManager.getInstance().on(ReportManager.getCogAbilityWeeklyScoresCallback, this.getCogAbilityWeeklyScoresCallback, this);
    }
    onDisable() {
        EventManager.getInstance().off(ReportManager.getCogAbilityWeeklyScoresCallback, this);
    }
  
  
    start() {
        this.width = this.lineChart.getComponent(UITransform).width - this.leftPadding;
        this.height = this.lineChart.getComponent(UITransform).height;
        let cogAbilityBriefData = ReportManager.getInstance().cogAbilityWeeklyScoresData;
        this.scoreData = cogAbilityBriefData.result.map(item => item.score);
        this.initLeftArrow();
        this.total = ReportManager.getInstance().getCogAbilityWeeklyTotalByIndex(this.currentIndex);
        this.showTitleContentByIndex(this.currentIndex);
        this.drawLineChart();
    }
    initLeftArrow(){
        if(this.total <= 1){
            const leftArrowSprite = this.leftArrow.getComponent(Sprite);
            leftArrowSprite.color = new Color(0, 0, 0, 50);
        }
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
        this.currentIndex++;
        if (this.currentIndex >= this.total - 1) {
            const leftArrowSprite = this.leftArrow.getComponent(Sprite);
            leftArrowSprite.color = new Color(0, 0, 0, 50);
            
            console.log('超出索引值范围')
            return;
        }
        const rightArrowSprite = this.rightArrow.getComponent(Sprite);
        rightArrowSprite.color = new Color(0, 0, 0);
        ReportManager.getInstance().getCogAbilityWeeklyScores(null, this.currentIndex);
    }
    clickRightArrow() {
        this.currentIndex--;
        if (this.currentIndex <=-this.total) {
            const rightArrowSprite = this.rightArrow.getComponent(Sprite);
            rightArrowSprite.color = new Color(0, 0, 0,50);
            return;
        }
        const leftArrowSprite = this.leftArrow.getComponent(Sprite);
        leftArrowSprite.color = new Color(0, 0, 0);
        ReportManager.getInstance().getCogAbilityWeeklyScores(null, this.currentIndex);
    }
    getCogAbilityWeeklyScoresCallback() {
        this.showTitleContentByIndex(this.currentIndex);
        let weekDate = ReportManager.getInstance().getCogAbilityWeeklyScoresDataByIndex(this.currentIndex);
        this.scoreData = weekDate.map(item => item.score);
        this.drawLineChart();
    }

    showTitleContentByIndex(index: number) {
        let cogAbilityWeeklyFirstDayAndLastDay = ReportManager.getInstance().getCogAbilityWeeklyFirstDayAndLastDayByIndex(index);
        if (index == 0) {
            this.title.string = `本周`;
        } else {
            this.title.string = `${cogAbilityWeeklyFirstDayAndLastDay.first_day} - ${cogAbilityWeeklyFirstDayAndLastDay.last_day}`;
        }
    }

    drawXAxisLabel(textArr: string[] = ["第1天", "第2天", "第3天", "第4天", "第5天", "第6天", "第7天"]) {
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

}



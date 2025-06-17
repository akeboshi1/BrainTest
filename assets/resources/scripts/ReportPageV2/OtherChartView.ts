import { _decorator, Color, Component, Graphics, Label, log, Node, resources, Sprite, SpriteFrame, UITransform } from 'cc';
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

        // 先绘制主线条
        g.strokeColor =new Color(0, 89, 247);
        g.lineWidth = 6;

        // 刻度高
        let _h = this.height / 100;
        let centerX = this.width / 2;
        let centerY = this.height / 2;

        // 绘制折线图
        for (let i = 0; i < this.scoreData.length - 1; i++) {
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

        // 最后绘制标签，这样不会被网格线覆盖
        for (let i = 0; i < this.scoreData.length - 1; i++) {
            const x1 = i * this.width / (this.scoreData.length - 1) - centerX;
            const x2 = (i + 1) * this.width / (this.scoreData.length - 1) - centerX;
            const y1 = this.scoreData[i] * _h - centerY;
            const y2 = this.scoreData[i + 1] * _h - centerY;

            // 绘制标签
            this.drawLabel(x1, y1, `${this.scoreData[i]}`);
            if (i === this.scoreData.length - 2) {
                this.drawLabel(x2, y2, `${this.scoreData[i + 1]}`);
            }
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

    drawXAxisLabel(textArr: string[] = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]) {
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

    drawLabel(x: number, y: number, text: string, color: Color = new Color(148, 149, 153)) {
        const labelNode = new Node();
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.color = color;
        const width = labelNode.getComponent(UITransform).width;
        labelNode.setPosition(x - width / 2, y);
        label.fontSize = 36;
        labelNode.getComponent(UITransform).setAnchorPoint(0, 0);
        this.lineChart.addChild(labelNode);
    }

}



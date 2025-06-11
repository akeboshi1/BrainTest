import { _decorator, Color, Component, Graphics, Label, log, Node, UITransform } from 'cc';
import { ReportManager } from '../ManagerV2/ReportManager';
const { ccclass, property } = _decorator;

@ccclass('OtherChartView')
export class OtherChartView extends Component {
    @property(Node)
    lineChart: Node = null;
    private scoreData: number[] = [];
    private leftPadding = 57;

    private color: Color = new Color(0, 0, 0);

    private width: number = 0;
    private height: number = 0;


    onLoad() {
        let cogAbilityBriefData = ReportManager.getInstance().cogAbilityWeeklyScoresData;
        this.scoreData = cogAbilityBriefData.result.map(item => item.score);        
    }
    start() {
        this.width = this.lineChart.getComponent(UITransform).width - this.leftPadding;
        this.height = this.lineChart.getComponent(UITransform).height;
        console.log(this.width, this.height);

        let g = this.lineChart.getComponent(Graphics);
        
        // 先绘制网格线
        this.drawGridLine(g);

        // 再设置折线图的样式
        g.strokeColor = this.color;
        g.lineWidth = 4;

        // 刻度高
        let _h = this.height / 100;
        let centerX = this.width / 2;
        let centerY = this.height / 2;

        // 绘制折线图
        for(let i = 0; i < this.scoreData.length - 1; i++) {
            const x1 = i * this.width / (this.scoreData.length - 1) - centerX;
            const x2 = (i + 1) * this.width / (this.scoreData.length - 1) - centerX;
            const y1 = this.scoreData[i] * _h - centerY;
            const y2 = this.scoreData[i + 1] * _h - centerY;

            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
            
            // 绘制标签
            this.drawLabel(x1, y1, `${this.scoreData[i]}分`);
            if (i === this.scoreData.length - 2) {
                this.drawLabel(x2, y2, `${this.scoreData[i + 1]}分`);
            }
        }

        this.drawXAxisLabel();
        
        g.stroke();
    }

    drawXAxisLabel(textArr: string[] = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]) {
        let g = this.lineChart.getComponent(Graphics);
        g.strokeColor = this.color;
        g.lineWidth = 4;
        
        let centerX = this.width / 2;
        let centerY = this.height / 2;

        for(let i = 0; i < textArr.length; i++) {
            this.drawLabel(i * this.width / (textArr.length - 1) - centerX, -centerY - 30, textArr[i]);
        }
        
    }

    drawGridLine(g: Graphics) {
        // 保存当前状态
        const currentColor = g.strokeColor;
        const currentWidth = g.lineWidth;

        // 设置网格线样式
        g.strokeColor = new Color(0, 0, 0, 50);
        g.lineWidth = 0.5;

        let centerX = this.width / 2;
        let centerY = this.height / 2;

        for(let i = 20; i <= 100; i+=20) {
            g.moveTo(0 - centerX, i * this.height / 100 - centerY);
            g.lineTo(this.width - centerX, i * this.height / 100 - centerY);
        }

        // 恢复之前的状态
        g.strokeColor = currentColor;
        g.lineWidth = currentWidth;
    }

    drawLabel(x: number, y: number, text: string) {
        const labelNode = new Node();
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.color = this.color;
        labelNode.setPosition(x - 5, y);
        label.fontSize = 36;
        labelNode.getComponent(UITransform).setAnchorPoint(0, 0);
        this.lineChart.addChild(labelNode);
    }

    update(deltaTime: number) {
        
    }
}



import { _decorator, Component, Node, Graphics, Color, Vec2, Label } from 'cc';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { ReportData, ReportManager } from '../ManagerV2/ReportManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
const { ccclass, property } = _decorator;

@ccclass('RadiaGraph')
export class RadiaGraph extends Component {

    @property([Label])
     labels:Label[]=[];

    private graphics: Graphics = null;
    private centerPos: Vec2 = new Vec2(0, 0);
    private readonly maxRadius: number = 200;
    private readonly minRadius: number = 20;
    private readonly circleRadius: number = 15;
    private readonly lineWidth: number = 8;
    private values:number[]=[];
    onEnable() {
        EventManager.getInstance().on(ReportManager.getBrainTrainingTiersCallback, this.getBrainTrainingTiersCallback, this);
    }
    onDisable() {
        EventManager.getInstance().off(ReportManager.getBrainTrainingTiersCallback, this);
    }
         
    start() {
    //   this.setValues([1,5,5,5,5]);
     ReportManager.getInstance().getPersonalReport();
    }
    
    getBrainTrainingTiersCallback(){
        let reportDataList: ReportData[] = ReportManager.getInstance().reportDataList;
        reportDataList.forEach((item,index)=>{
            this.labels[index].string=item.cog_ability_desc
        })  
    }
    setValues(values:number[]){
        this.values=values;
        this.initGraphics();
        this.drawRadarChart();
    }

    update(deltaTime: number) {
        
    }

    private initGraphics() {
        // 获取或创建Graphics组件
        this.graphics = this.node.getComponent(Graphics);
        if (!this.graphics) {
            this.graphics = this.node.addComponent(Graphics);
        }
    }

    /**
     * 绘制雷达图
     */
    public drawRadarChart() {
        if (!this.graphics) return;

        this.graphics.clear();
        
        // 计算五个角的坐标
        const points: Vec2[] = this.calculatePentagonPoints(this.values);

        // 绘制填充区域
        this.drawFillArea(points);
        
        // 绘制边线
        this.drawLines(points);
        
        // 绘制角上的空心圆
        this.drawCornerCircles(points);
    }

    /**
     * 计算五边形五个角的坐标
     */
    private calculatePentagonPoints(values: number[]): Vec2[] {
        const points: Vec2[] = [];
        const angleStep = (Math.PI * 2) / 5; // 五边形每个角的角度间隔
        const startAngle = Math.PI / 2; // 从正上方开始

        for (let i = 0; i < 5; i++) {
            const angle = startAngle + i * angleStep;
            const radius = this.valueToRadius(values[i]);
            const x = this.centerPos.x + Math.cos(angle) * radius;
            const y = this.centerPos.y + Math.sin(angle) * radius;
            points.push(new Vec2(x, y));
        }

        return points;
    }

    /**
     * 将属性值(1-10)转换为半径(20-200)
     */
    private valueToRadius(value: number): number {
        const clampedValue = Math.max(1, Math.min(10, value));
        return this.minRadius + (clampedValue - 1) * (this.maxRadius - this.minRadius) / 9;
    }

    /**
     * 绘制五边形填充区域
     */
    private drawFillArea(points: Vec2[]) {
        this.graphics.fillColor = new Color(173, 216, 230, 128); // 半透明浅蓝色 (LightBlue with alpha)
        
        this.graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.graphics.lineTo(points[i].x, points[i].y);
        }
        this.graphics.close();
        this.graphics.fill();
    }

    /**
     * 绘制五边形边线
     */
    private drawLines(points: Vec2[]) {
        this.graphics.strokeColor = new Color(0, 0, 255, 255); // 正蓝色
        this.graphics.lineWidth = this.lineWidth;

        // 绘制每条边，从圆边缘到圆边缘
        for (let i = 0; i < points.length; i++) {
            const currentPoint = points[i];
            const nextPoint = points[(i + 1) % points.length]; // 最后一个点连接到第一个点
            
            // 计算从当前圆边缘到下一个圆边缘的线段
            const linePoints = this.calculateLineFromCircleToCircle(currentPoint, nextPoint);
            
            this.graphics.moveTo(linePoints.start.x, linePoints.start.y);
            this.graphics.lineTo(linePoints.end.x, linePoints.end.y);
            this.graphics.stroke();
        }
    }

    /**
     * 计算从一个圆的边缘到另一个圆的边缘的线段端点
     */
    private calculateLineFromCircleToCircle(point1: Vec2, point2: Vec2): { start: Vec2, end: Vec2 } {
        // 计算两点之间的方向向量
        const direction = new Vec2(point2.x - point1.x, point2.y - point1.y);
        const distance = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
        
        // 单位化方向向量
        const unitDirection = new Vec2(direction.x / distance, direction.y / distance);
        
        // 计算起点：从point1向point2方向移动圆半径的距离
        const startPoint = new Vec2(
            point1.x + unitDirection.x * this.circleRadius,
            point1.y + unitDirection.y * this.circleRadius
        );
        
        // 计算终点：从point2向point1方向移动圆半径的距离
        const endPoint = new Vec2(
            point2.x - unitDirection.x * this.circleRadius,
            point2.y - unitDirection.y * this.circleRadius
        );
        
        return { start: startPoint, end: endPoint };
    }

    /**
     * 绘制角上的空心圆
     */
    private drawCornerCircles(points: Vec2[]) {
        this.graphics.strokeColor = new Color(0, 0, 255, 255); // 正蓝色
        this.graphics.lineWidth = 8; // 圆的线宽改为8像素

        for (const point of points) {
            this.graphics.circle(point.x, point.y, this.circleRadius);
            this.graphics.stroke();
        }
    }

    /**
     * 更新雷达图数据并重新绘制
     */
    public updateValues(v1: number, v2: number, v3: number, v4: number, v5: number) {
        this.values[0] = Math.max(1, Math.min(10, v1));
        this.values[1] = Math.max(1, Math.min(10, v2));
        this.values[2] = Math.max(1, Math.min(10, v3));
        this.values[3] = Math.max(1, Math.min(10, v4));
        this.values[4] = Math.max(1, Math.min(10, v5));
        
        this.drawRadarChart();
    }
}



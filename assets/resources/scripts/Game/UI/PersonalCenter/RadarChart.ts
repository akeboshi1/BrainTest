import { _decorator, Color, Component, Graphics, Node } from 'cc';
const { ccclass, property, executeInEditMode } = _decorator;
@ccclass('RadarChart')
@executeInEditMode
export class RadarChart extends Component {

    private _graphics:Graphics;
    private _baseRadius:number =200;
    private _angleOffset:number=0;
    public rates=[1,1,1,1,1,1];
    // start() {
    //     this.draw();
    // }
    draw(){
        // 获取当前节点的 graphics 组件
        this._graphics = this.node.getComponent(Graphics) || this.node.addComponent(Graphics);

        // 设置线条的宽度和颜色
        this._graphics.lineWidth = 10;
        this._graphics.strokeColor = new Color(66, 97, 142);

        // 计算正五边形的顶点坐标
        this._baseRadius = 200; // 设置半径
        let radius =  this._baseRadius; // 设置半径
        this._angleOffset = (Math.PI * 2) / 6; // 计算每个顶点之间的角度间隔

        // 圈数
        const count = 4;
        // 开始绘制路径
        for (let j = 0; j < count; j++) {
            this._graphics.moveTo(radius * Math.sin(0), radius * Math.cos(0));
            for (let i = 1; i <= 5; i++) {
                const angle = i * this._angleOffset;
                const x = radius * Math.sin(angle);
                const y = radius * Math.cos(angle);
                this._graphics.lineTo(x, y);
            }

            // 闭合路径
            this._graphics.close();
            // 绘制线条
            this._graphics.stroke();

            this._graphics.lineWidth = 5;
            radius *= 0.7;
            this._graphics.strokeColor = new Color(66, 97, 142, 255 * (1 - (1 + j) * 0.25));
        }

        //this.rates = [1,1,1,1,1,1];
        let rate = this.rates[0];
        let radius1 =  this._baseRadius * rate;
        this._graphics.moveTo(radius1 * Math.sin(0), radius1 * Math.cos(0));
        for (let i = 0; i < this.rates.length; i++) {
            const angle = (i + 1) * this._angleOffset;
            rate = this.rates[(i + 1) % this.rates.length];
            radius1 =  this._baseRadius * rate;
            this._graphics.lineTo(radius1 * Math.sin(angle), radius1 * Math.cos(angle));
        }
        // 闭合路径
        this._graphics.close();
        // 填充颜色
        this._graphics.fillColor = new Color(51, 135, 185, 127);
        // 填充
        this._graphics.fill();


        this._graphics.strokeColor = new Color(66, 97, 142, 255);
        for (let i = 1; i <= 6; i++) {
            const angle = i * this._angleOffset;
            const x = this._baseRadius * Math.sin(angle);
            const y = this._baseRadius * Math.cos(angle);
            this._graphics.moveTo(0, 0);
            this._graphics.lineTo(x, y);
        }
        // 绘制线条
        this._graphics.stroke();

    }
    
    setRates(rates){
        this.rates = rates;
        this.draw();
    }

    onEnable(){


    }


}

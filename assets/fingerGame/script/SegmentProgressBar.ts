import { _decorator, Component, Node, SpriteFrame, UITransform, Sprite, Vec3, Color, Size } from 'cc';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
const { ccclass, property } = _decorator;

@ccclass('SegmentProgressBar')
export class SegmentProgressBar extends Component {
    @property(SpriteFrame)
    private progressBg: SpriteFrame = null;

    @property(SpriteFrame)
    private progressFillBg: SpriteFrame = null;

    @property(Color)
    private bgColor: Color = new Color(255, 255, 255, 255);

    @property(Color)
    private fillColor: Color = new Color(255, 255, 255, 255);

    @property
    private totalWidth: number = 500;

    @property
    private height: number = 20;

    @property
    private segmentCount: number = 5;

    @property
    private segmentGap: number = 2;

    private segments: Node[] = [];
    private fillSegments: Node[] = [];
    private currentProgress: number = 0;
    private segmentWidth: number = 0;  // 添加成员变量存储段宽度

    onLoad() {
        DebugLog.instance.log(`SegmentProgressBar initializing with ${this.segmentCount} segments`);
        this.initializeSegments();
    }

    private initializeSegments() {
        // 清除现有的段
        this.segments.forEach(segment => segment.destroy());
        this.fillSegments.forEach(segment => segment.destroy());
        this.segments = [];
        this.fillSegments = [];

        // 计算每个段的宽度
        this.segmentWidth = (this.totalWidth - (this.segmentGap * (this.segmentCount - 1))) / this.segmentCount;
        
        // 计算起始x坐标，使段落居中
        const startX = -this.totalWidth / 2 + this.segmentWidth / 2;

        // 创建背景段
        for (let i = 0; i < this.segmentCount; i++) {
            // 创建背景段
            const segment = new Node('segment_' + i);
            this.node.addChild(segment);
            const sprite = segment.addComponent(Sprite);
            sprite.type = Sprite.Type.SLICED;
            sprite.spriteFrame = this.progressBg;
            sprite.color = this.bgColor;
            
            const transform = segment.getComponent(UITransform);
            transform.setContentSize(this.segmentWidth, this.height);
            segment.position = new Vec3(startX + i * (this.segmentWidth + this.segmentGap), 0, 0);
            
            // 设置背景段的层级
            sprite.node.setSiblingIndex(i);
            this.segments.push(segment);

            // 创建填充段
            const fillSegment = new Node('fill_segment_' + i);
            this.node.addChild(fillSegment);
            const fillSprite = fillSegment.addComponent(Sprite);
            fillSprite.type = Sprite.Type.SLICED;
            fillSprite.spriteFrame = this.progressFillBg;
            fillSprite.color = this.fillColor;
            
            const fillTransform = fillSegment.getComponent(UITransform);
            fillTransform.setAnchorPoint(0, 0.5); // 锚点左中
            fillTransform.setContentSize(new Size(0, this.height));
            // 位置左移半个段宽
            fillSegment.position = segment.position.clone().add(new Vec3(-this.segmentWidth / 2, 0, 0));
            
            // 设置填充段的层级比背景高
            fillSprite.node.setSiblingIndex(i + this.segmentCount);
            this.fillSegments.push(fillSegment);
        }
    }

    /**
     * 设置背景颜色
     * @param color 颜色值
     */
    public setBgColor(color: Color) {
        this.bgColor = color;
        this.segments.forEach(segment => {
            const sprite = segment.getComponent(Sprite);
            sprite.color = color;
        });
    }

    /**
     * 设置填充颜色
     * @param color 颜色值
     */
    public setFillColor(color: Color) {
        this.fillColor = color;
        this.fillSegments.forEach(segment => {
            const sprite = segment.getComponent(Sprite);
            sprite.color = color;
        });
    }

    /**
     * 设置进度条进度
     * @param progress 进度值（0-1之间）
     */
    public setProgress(progress: number) {
        this.currentProgress = Math.max(0, Math.min(1, progress));
        
        // 计算完整填充的段数和最后一段的填充比例
        const totalProgress = this.currentProgress * this.segmentCount;
        const fullSegments = Math.floor(totalProgress);  // 完全填充的段数
        const lastSegmentProgress = totalProgress - fullSegments;  // 最后一段的填充比例

        // 更新所有段的显示状态和宽度
        this.fillSegments.forEach((segment, index) => {
            const transform = segment.getComponent(UITransform);
            
            if (index < fullSegments) {
                // 完全填充的段
                transform.setContentSize(new Size(this.segmentWidth, this.height));
            } else if (index === fullSegments && lastSegmentProgress > 0) {
                // 部分填充的段
                const partialWidth = this.segmentWidth * lastSegmentProgress;
                transform.setContentSize(new Size(partialWidth, this.height));
            } else {
                // 未填充的段
                transform.setContentSize(new Size(0, this.height));
            }
        });
    }

    start() {

    }

    update(deltaTime: number) {
        
    }
}



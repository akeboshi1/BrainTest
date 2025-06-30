import { _decorator, Component, Rect, Sprite, SpriteAtlas, SpriteFrame, UITransform } from 'cc';
import { DebugLog } from '../Util/DebugLog';
const { ccclass, property } = _decorator;

@ccclass('FrameComponent')
export class FrameComponent extends Component {
    // 关联Sprite组件，用于显示动画帧
    @property({ type: Sprite })
    sprite: Sprite = null;

    // 关联Sprite Atlas资源，存放动画帧图片
    @property({ type: SpriteAtlas })
    spriteAtlas: SpriteAtlas = null;

    @property({
        tooltip: "当非循环动画播放完毕后，是否自动隐藏节点"
    })
    hideOnComplete: boolean = true;

    @property({
        tooltip: "是否自动调整Sprite大小以适应节点大小"
    })
    autoResize: boolean = true;

    // 用于存储不同动画名对应的SpriteFrame数组，即动画序列帧
    private animationFrames: { [key: string]: SpriteFrame[] } = {};

    // 当前播放的动画名
    private currentAnimation: string = '';

    // 当前动画播放的帧索引
    private currentFrameIndex: number = 0;

    // 动画每秒播放的帧数
    private fps: number = 12;

    // 每帧间隔时间（秒）
    private frameInterval: number = 0;

    // 是否正在播放动画
    private isPlaying: boolean = false;

    // 是否循环播放动画，默认为true（循环播放）
    private isLoop: boolean = true;

    private isPingpang: boolean = false;

    // 动画播放方向，1表示正向，-1表示反向，初始化为正向
    private playDirection: number = 1;

    onLoad() {
        // 初始化每帧间隔时间
        this.frameInterval = 1 / this.fps;

        // 遍历Sprite Atlas中的所有SpriteFrame，按照命名规则解析并存储动画序列帧
        const spriteFrames = this.spriteAtlas.getSpriteFrames();
        spriteFrames.forEach((spriteFrame) => {
            const frameName = spriteFrame.name;
            const parts = frameName.split('_');
            if (parts.length === 2) {
                const animationName = parts[0];
                if (!this.animationFrames[animationName]) {
                    this.animationFrames[animationName] = [];
                }
                this.animationFrames[animationName].push(spriteFrame);
            }
        });
    }

    // 对外提供的接口，用于根据动画名播放动画，添加了是否循环播放的参数
    playAnimation(animationName: string, fps: number = 12, isLoop: boolean = true ,isPingpang:boolean = false) {
        if (!this.spriteAtlas ||!this.sprite) {
            return;
        }

        this.fps = fps;
        this.frameInterval = 1 / this.fps;
        this.currentAnimation = animationName;
        this.currentFrameIndex = 0;
        this.isPlaying = true;
        this.isLoop = isLoop;
        this.isPingpang = isPingpang;
        this.playDirection = 1; 

        const frames = this.animationFrames[animationName];
        if (frames && frames.length > 0) {
            this.updateAnimationFrame();
        }
    }

    update(dt: number) {
        if (this.isPlaying) {
            this.currentFrameIndex += dt / this.frameInterval * this.playDirection;
            const frames = this.animationFrames[this.currentAnimation];
            if (frames && frames.length > 0) {
                // 处理帧索引超出范围的情况（正向或反向），根据是否乒乓播放来调整逻辑
                if (this.isPingpang) {
                    if (this.playDirection === 1 && this.currentFrameIndex >= frames.length - 1) {
                        // 正向播放到最后一帧，改变播放方向为反向
                        this.playDirection = -1;
                        this.currentFrameIndex = frames.length - 2; // 回退一帧，避免重复播放最后一帧
                    } else if (this.playDirection === -1 && this.currentFrameIndex <= 0) {
                        // 反向播放到第一帧，改变播放方向为正向
                        this.playDirection = 1;
                        this.currentFrameIndex = 1; // 前进一帧，避免重复播放第一帧
                    }
                } else {
                    // 非乒乓播放时，正常处理帧索引超出范围的情况（循环或停止）
                    if (this.currentFrameIndex >= frames.length) {
                        if (this.isLoop) {
                            this.currentFrameIndex %= frames.length;
                        } else {
                            this.isPlaying = false;
                            this.currentFrameIndex = frames.length - 1;
                            if (this.hideOnComplete) {
                                this.sprite.spriteFrame = null;
                                return;
                            }
                        }
                    }
                    
                }
                const frameIndex = Math.floor(this.currentFrameIndex);
                this.sprite.spriteFrame = frames[frameIndex];
                if (this.autoResize) {
                    this.resizeSpriteFrameToNodeSize();
                }
            }
        }
    }

    private resizeSpriteFrameToNodeSize() {
        if (this.sprite && this.node) {
            const nodeTrans = this.node.getComponent(UITransform);
            this.sprite.node.getComponent(UITransform).setContentSize(nodeTrans.width,nodeTrans.height);
        }
    }

    private updateAnimationFrame() {
        const frames = this.animationFrames[this.currentAnimation];
        if (frames && frames.length > 0) {
            const frameIndex = Math.floor(this.currentFrameIndex) % frames.length;
            this.sprite.spriteFrame = frames[frameIndex];
        }
    }
}
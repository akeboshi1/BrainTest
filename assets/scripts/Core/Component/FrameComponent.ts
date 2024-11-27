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
    playAnimation(animationName: string, fps: number = 12, isLoop: boolean = true) {
        if (!this.spriteAtlas ||!this.sprite) {
            return;
        }

        this.fps = fps;
        this.frameInterval = 1 / this.fps;
        this.currentAnimation = animationName;
        this.currentFrameIndex = 0;
        this.isPlaying = true;
        this.isLoop = isLoop;

        const frames = this.animationFrames[animationName];
        if (frames && frames.length > 0) {
            this.updateAnimationFrame();
        }
    }

    update(dt: number) {
        if (this.isPlaying) {
            this.currentFrameIndex += dt / this.frameInterval;
            if (this.currentFrameIndex >= 0) {
                const frames = this.animationFrames[this.currentAnimation];
                if (frames && frames.length > 0) {
                    const frameIndex = Math.floor(this.currentFrameIndex) % frames.length;
                    this.sprite.spriteFrame = frames[frameIndex];
                    this.resizeSpriteFrameToNodeSize();

                    // 判断是否播放到最后一帧且不循环播放，若是则停止动画
                    if (!this.isLoop && frameIndex === frames.length - 1) {
                        this.isPlaying = false;
                    }
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
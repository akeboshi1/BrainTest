import { _decorator, Component, Node, Sprite, SpriteFrame, Vec2, Vec3, tween, UITransform, instantiate, Prefab, UIOpacity } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('ParticleEmitter')
export class ParticleEmitter extends Component {
    @property(Node)
    particleParent: Node = null; // 粒子父节点

    @property(Prefab)
    particlePrefab: Prefab = null; // 粒子预制体

    @property(SpriteFrame)
    particleSpriteFrame: SpriteFrame = null; // 粒子图片

    @property(Number)
    maxParticleCount: number = 50; // 最大粒子数量

    @property(Vec2)
    durationRange: Vec2 = new Vec2(1, 3); // 持续时长范围（秒）

    @property(Vec2)
    scaleRange: Vec2 = new Vec2(0.5, 1.5); // 缩放大小范围

    @property(Number)
    emissionRate: number = 10; // 发射频率（每秒发射数量）

    @property(Boolean)
    autoStart: boolean = true; // 自动开始发射

    @property(Boolean)
    loop: boolean = true; // 是否循环发射

    // 私有属性
    private particles: Node[] = []; // 当前粒子列表
    private emissionTimer: number = 0; // 发射计时器
    private isEmitting: boolean = false; // 是否正在发射
    private emissionInterval: number = 0; // 发射间隔

    start() {
        // 计算发射间隔
        this.emissionInterval = 1 / this.emissionRate;
        
        // 如果没有设置粒子父节点，使用当前节点
        if (!this.particleParent) {
            this.particleParent = this.node;
        }

        // 如果设置了自动开始，开始发射
        if (this.autoStart) {
            this.startEmission();
        }
    }

    update(deltaTime: number) {
        if (!this.isEmitting) return;

        // 更新发射计时器
        this.emissionTimer += deltaTime;

        // 检查是否需要发射新粒子
        if (this.emissionTimer >= this.emissionInterval) {
            this.emitParticle();
            this.emissionTimer = 0;
        }

        // 清理已完成的粒子
        this.cleanupParticles();
    }

    /**
     * 开始发射粒子
     */
    startEmission() {
        this.isEmitting = true;
        this.emissionTimer = 0;
    }

    /**
     * 停止发射粒子
     */
    stopEmission() {
        this.isEmitting = false;
    }

    /**
     * 发射一个粒子
     */
    private emitParticle() {
        // 检查是否达到最大数量
        if (this.particles.length >= this.maxParticleCount) {
            return;
        }

        // 创建粒子实例
        let particleNode: Node;
        if (this.particlePrefab) {
            particleNode = instantiate(this.particlePrefab);
        } else {
            particleNode = new Node('Particle');
            const sprite = particleNode.addComponent(Sprite);
            if (this.particleSpriteFrame) {
                sprite.spriteFrame = this.particleSpriteFrame;
            }
        }

        // 设置粒子父节点
        particleNode.setParent(this.particleParent);

        // 在组件节点范围内生成随机位置
        const randomPosition = this.getRandomPositionInNodeBounds();
        particleNode.setPosition(randomPosition);

        // 生成随机缩放
        const randomScale = this.scaleRange.x + Math.random() * (this.scaleRange.y - this.scaleRange.x);
        particleNode.setScale(randomScale, randomScale, 1);

        // 生成随机持续时长
        const randomDuration = this.durationRange.x + Math.random() * (this.durationRange.y - this.durationRange.x);

        // 设置粒子动画
        this.animateParticle(particleNode, randomDuration);

        // 添加到粒子列表
        this.particles.push(particleNode);
    }

    /**
     * 获取节点范围内的随机位置
     */
    private getRandomPositionInNodeBounds(): Vec3 {
        // 获取当前节点的UITransform组件
        const uiTransform = this.node.getComponent(UITransform);
        if (!uiTransform) {
            console.warn(`[ParticleEmitter] 当前节点没有UITransform组件，使用默认位置`);
            return new Vec3(0, 0, 0);
        }

        // 获取节点的内容大小
        const contentSize = uiTransform.contentSize;
        const width = contentSize.width;
        const height = contentSize.height;

        // 在节点范围内生成随机位置
        // 使用节点中心为原点，在宽度和高度范围内均匀分布
        const randomX = (Math.random() - 0.5) * width;
        const randomY = (Math.random() - 0.5) * height;
        
        return new Vec3(randomX, randomY, 0);
    }

    /**
     * 设置粒子动画
     */
    private animateParticle(particle: Node, duration: number) {
        // 添加UIOpacity组件用于透明度控制
        const uiOpacity = particle.getComponent(UIOpacity) || particle.addComponent(UIOpacity);
        uiOpacity.opacity = 0;
        
        tween(uiOpacity)
            .to(0.1, { opacity: 255 }) // 淡入
            .delay(duration - 0.2) // 保持
            .to(0.1, { opacity: 0 }) // 淡出
            .call(() => {
                // 动画完成后销毁粒子
                if (particle && particle.isValid) {
                    particle.destroy();
                }
            })
            .start();

        // 可选：添加移动动画
        const moveDistance = 50;
        const randomMoveX = (Math.random() - 0.5) * moveDistance;
        const randomMoveY = (Math.random() - 0.5) * moveDistance;
        
        tween(particle)
            .to(duration, { 
                position: new Vec3(
                    particle.position.x + randomMoveX,
                    particle.position.y + randomMoveY,
                    particle.position.z
                )
            })
            .start();
    }

    /**
     * 清理已完成的粒子
     */
    private cleanupParticles() {
        this.particles = this.particles.filter(particle => {
            return particle && particle.isValid;
        });
    }

    /**
     * 清除所有粒子
     */
    clearAllParticles() {
        this.particles.forEach(particle => {
            if (particle && particle.isValid) {
                particle.destroy();
            }
        });
        this.particles = [];
    }

    /**
     * 设置发射参数
     */
    setEmissionParams(params: {
        maxCount?: number;
        durationRange?: Vec2;
        scaleRange?: Vec2;
        emissionRate?: number;
    }) {
        if (params.maxCount !== undefined) this.maxParticleCount = params.maxCount;
        if (params.durationRange !== undefined) this.durationRange = params.durationRange;
        if (params.scaleRange !== undefined) this.scaleRange = params.scaleRange;
        if (params.emissionRate !== undefined) {
            this.emissionRate = params.emissionRate;
            this.emissionInterval = 1 / this.emissionRate;
        }
    }

    /**
     * 获取当前粒子数量
     */
    getCurrentParticleCount(): number {
        return this.particles.length;
    }

    /**
     * 是否正在发射
     */
    isCurrentlyEmitting(): boolean {
        return this.isEmitting;
    }
}



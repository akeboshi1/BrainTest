import { _decorator, Component, Node, view, Vec3, UITransform } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 节点自动适配组件
 * 根据屏幕分辨率自动调整节点大小以适配不同屏幕
 * 设计分辨率：1920 * 1080 竖屏
 */
@ccclass('NodeAdapter')
export class NodeAdapter extends Component {
    
    /** 设计分辨率宽度 */
    private static readonly DESIGN_WIDTH: number = 1080;
    
    /** 设计分辨率高度 */
    private static readonly DESIGN_HEIGHT: number = 1920;
    
    /** 设计分辨率高宽比 */
    private static readonly DESIGN_ASPECT_RATIO: number = NodeAdapter.DESIGN_HEIGHT / NodeAdapter.DESIGN_WIDTH;

    start() {
        this.adaptToScreen();
    }

    /**
     * 适配到屏幕尺寸
     */
    private adaptToScreen(): void {
        // 获取屏幕显示分辨率
        const screenSize = view.getVisibleSize();
        const screenWidth = screenSize.width;
        const screenHeight = screenSize.height;
        
        // 计算屏幕高宽比
        const screenAspectRatio = screenHeight / screenWidth;
        
        // 获取当前节点的原始尺寸
        const nodeSize = this.node.getComponent(UITransform);
        if (!nodeSize) {
            console.warn('NodeAdapter: 节点缺少UITransform组件');
            return;
        }
        
        const originalWidth = nodeSize.contentSize.width;
        const originalHeight = nodeSize.contentSize.height;
        
        let targetWidth: number = originalWidth;
        let targetHeight: number = originalHeight;
        
        // 计算缩放比例，使宽度适配屏幕宽度
        const scaleX = screenWidth / originalWidth;
        if (screenAspectRatio > NodeAdapter.DESIGN_ASPECT_RATIO) {
            // 屏幕高宽比更大（更窄），需要缩小节点
            // 应用缩放
            const currentScale = this.node.getScale();
            this.node.setScale(new Vec3(scaleX, scaleX, currentScale.z));
            
            // 调整高度以适配屏幕高度
            targetWidth = originalWidth;
            targetHeight = originalHeight / scaleX;
        }
        
        // 更新节点尺寸
        nodeSize.setContentSize(targetWidth, targetHeight);
        
        console.log(`NodeAdapter: 节点适配完成 - 屏幕: ${screenWidth}x${screenHeight}, 节点: ${targetWidth.toFixed(2)}x${targetHeight.toFixed(2)}`);
    }

    /**
     * 手动触发适配（可在运行时调用）
     */
    public refreshAdaptation(): void {
        this.adaptToScreen();
    }

    /**
     * 获取适配信息
     */
    public getAdaptationInfo(): { screenSize: { width: number, height: number }, nodeSize: { width: number, height: number }, scale: Vec3 } {
        const screenSize = view.getVisibleSize();
        const nodeSize = this.node.getComponent(UITransform);
        const scale = this.node.getScale();
        
        return {
            screenSize: { width: screenSize.width, height: screenSize.height },
            nodeSize: { width: nodeSize?.contentSize.width || 0, height: nodeSize?.contentSize.height || 0 },
            scale: scale
        };
    }
}

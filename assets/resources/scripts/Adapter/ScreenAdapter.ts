import { Node, UITransform, Widget, Label } from "cc";
import { DebugLog } from "../Core/Util/DebugLog";
import { ScreenSizeUtil } from "./ScreenSizeUtil";

/**
 * 屏幕适配器
 * 负责处理UI面板的屏幕适配逻辑
 */
export class ScreenAdapter {
    private static _instance: ScreenAdapter;
    
    public static getInstance(): ScreenAdapter {
        if (!ScreenAdapter._instance) {
            ScreenAdapter._instance = new ScreenAdapter();
        }
        return ScreenAdapter._instance;
    }

    /**
     * 对面板进行UI适配
     * @param panel 面板根节点
     */
    public adaptPanelUI(panel: Node): void {
        try {
            // 获取适合UI适配的尺寸
            const uiSize = ScreenSizeUtil.getUISize();
            const screenWidth = uiSize.width;
            const screenHeight = uiSize.height;

            // 面板适配屏幕尺寸
            panel.setPosition(0, 0);
            const panelTransform = panel.getComponent(UITransform);
            if (!panelTransform) {
                DebugLog.instance.warn('Panel UITransform component not found');
                return;
            }
            panelTransform.setContentSize(screenWidth, screenHeight);

            // 只在宽度小于设计宽度时才进行缩放处理
            if (screenWidth < 1080) { // 设计宽度
                const scaleFactor = screenWidth / 1080;
                
                // 只对viewNode进行缩放
                this.scaleViewNode(panel, scaleFactor);
                this.updateWidgetAlignment(panel, screenWidth, screenHeight);
                DebugLog.instance.log(`[ScreenAdapter] 宽度不足，只对viewNode进行缩放: 实际宽度${screenWidth} < 设计宽度1080, 缩放比例${scaleFactor.toFixed(3)}`);
            } else {
                // 宽度足够时，更新 Widget 对齐到实际宽度，不进行缩放
                this.updateWidgetAlignment(panel, screenWidth, screenHeight);
                DebugLog.instance.log(`[ScreenAdapter] 宽度足够，更新Widget对齐到实际尺寸: 实际宽度${screenWidth} >= 设计宽度1080`);
            }
        } catch (error) {
            DebugLog.instance.error(`[ScreenAdapter] Panel UI adaptation failed: ${error}`);
        }
    }

    /**
     * 更新Widget对齐
     * @param panel 面板根节点
     * @param actualWidth 实际宽度
     * @param actualHeight 实际高度
     */
    private updateWidgetAlignment(panel: Node, actualWidth?: number, actualHeight?: number): void {
        // 强制更新所有Widget的对齐
        this.forceUpdateAllWidgets(panel, actualWidth, actualHeight);
    }

    /**
     * 强制更新所有Widget的对齐
     * @param panel 面板根节点
     * @param actualWidth 实际宽度
     * @param actualHeight 实际高度
     */
    private forceUpdateAllWidgets(panel: Node, actualWidth?: number, actualHeight?: number): void {
        const updateNodeWidget = (node: Node) => {
            // 如果节点有Widget组件，强制更新对齐
            const widget = node.getComponent(Widget);
            if (widget) {
                // 获取Widget的实际父节点
                const parentNode = node.parent;
                if (parentNode) {
                    const parentTransform = parentNode.getComponent(UITransform);
                    if (parentTransform) {
                        // 记录原始尺寸
                        const originalWidth = parentTransform.width;
                        const originalHeight = parentTransform.height;
                        
                        // 如果传入了实际尺寸，且父节点是面板根节点，则使用实际尺寸
                        if (actualWidth && actualHeight && parentNode === panel) {
                            // 设置父节点为实际尺寸
                            parentTransform.setContentSize(actualWidth, actualHeight);
                            
                            // 强制更新Widget对齐
                            widget.updateAlignment();
                            
                            // 恢复父节点原始尺寸
                            parentTransform.setContentSize(originalWidth, originalHeight);
                            
                            DebugLog.instance.log(`[ScreenAdapter] 强制Widget对齐更新: ${node.name}, 父节点尺寸: ${actualWidth}x${actualHeight}`);
                        } else {
                            // 对于其他情况，也强制更新Widget对齐
                            widget.updateAlignment();
                            
                            // 记录Widget的对齐信息
                            if (widget.isAlignBottom || widget.isAlignTop || widget.isAlignLeft || widget.isAlignRight) {
                                DebugLog.instance.log(`[ScreenAdapter] 强制Widget对齐更新: ${node.name}, 父节点: ${parentNode.name}, 对齐方式: ${this.getWidgetAlignmentInfo(widget)}`);
                            }
                        }
                    } else {
                        widget.updateAlignment();
                    }
                } else {
                    widget.updateAlignment();
                }
            }

            // 递归处理子节点
            node.children.forEach(child => updateNodeWidget(child));
        };

        updateNodeWidget(panel);
    }

    /**
     * 获取Widget对齐信息
     * @param widget Widget组件
     * @returns 对齐信息字符串
     */
    private getWidgetAlignmentInfo(widget: Widget): string {
        const alignments = [];
        if (widget.isAlignBottom) alignments.push('Bottom');
        if (widget.isAlignTop) alignments.push('Top');
        if (widget.isAlignLeft) alignments.push('Left');
        if (widget.isAlignRight) alignments.push('Right');
        if (widget.isAlignVerticalCenter) alignments.push('VerticalCenter');
        if (widget.isAlignHorizontalCenter) alignments.push('HorizontalCenter');
        
        return alignments.join(', ') || 'None';
    }

    /**
     * 只对viewNode进行缩放
     * @param panel 面板根节点
     * @param scaleFactor 缩放比例
     */
    private scaleViewNode(panel: Node, scaleFactor: number): void {
        // 查找viewNode
        const viewNode = panel.getChildByName('viewNode');
        if (!viewNode) {
            DebugLog.instance.warn('[ScreenAdapter] viewNode not found in panel');
            return;
        }

        // 使用setScale对viewNode进行缩放
        viewNode.setScale(scaleFactor, scaleFactor, 1);
        
        // 处理viewNode内的Label组件
        this.scaleLabelsInNode(viewNode, scaleFactor);
        
        DebugLog.instance.log(`[ScreenAdapter] viewNode缩放完成: 缩放比例${scaleFactor.toFixed(3)}`);
    }

    /**
     * 递归缩放节点内的Label组件
     * @param node 节点
     * @param scaleFactor 缩放比例
     */
    private scaleLabelsInNode(node: Node, scaleFactor: number): void {
        // 处理当前节点的Label
        const label = node.getComponent(Label);
        if (label) {
            const originalFontSize = label.fontSize;
            const minFontSize = 12;
            const maxFontSize = 48;
            label.fontSize = Math.max(minFontSize, Math.min(maxFontSize, originalFontSize * scaleFactor));
            
            const originalLineHeight = label.lineHeight;
            label.lineHeight = originalLineHeight * scaleFactor;
        }

        // 递归处理子节点
        node.children.forEach(child => this.scaleLabelsInNode(child, scaleFactor));
    }

    /**
     * 更新面板内所有Widget组件的对齐
     * @param panel 面板根节点
     */
    public updatePanelWidgets(panel: Node): void {
        const updateNodeWidget = (node: Node) => {
            // 如果节点有Widget组件，更新对齐
            const widget = node.getComponent(Widget);
            if (widget) {
                widget.updateAlignment();
            }

            // 递归处理子节点
            node.children.forEach(child => updateNodeWidget(child));
        };

        updateNodeWidget(panel);
    }
}

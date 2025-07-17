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

    private _scaleFactor:number = 1;
    public get scaleFactor():number{
        return this._scaleFactor
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
                this._scaleFactor = screenWidth / 1080;
                
                // 只对viewNode进行缩放
                this.scaleViewNode(panel, this._scaleFactor);
                this.updateWidgetAlignment(panel, screenWidth, screenHeight);
                DebugLog.instance.log(`[ScreenAdapter] 宽度不足，只对viewNode进行缩放: 实际宽度${screenWidth} < 设计宽度1080, 缩放比例${this._scaleFactor.toFixed(3)}`);
            } else {
                this._scaleFactor = screenWidth / 1080;
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
                        // 检查节点是否在viewNode内（需要考虑缩放）
                        const isInViewNode = this.isNodeInViewNode(node, panel);
                        
                        // 如果传入了实际尺寸，且父节点是面板根节点，则使用实际尺寸
                        if (actualWidth && actualHeight && parentNode === panel) {
                            // 设置父节点为实际尺寸
                            parentTransform.setContentSize(actualWidth, actualHeight);
                            
                            // 强制更新Widget对齐
                            widget.updateAlignment();
                            
                            DebugLog.instance.log(`[ScreenAdapter] 强制Widget对齐更新: ${node.name}, 父节点尺寸: ${actualWidth}x${actualHeight}`);
                        } else if (isInViewNode && this._scaleFactor !== 1) {
                            // 对于viewNode内的Widget，需要考虑缩放因素
                            this.updateWidgetWithScale(widget, parentTransform, node);
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
     * 检查节点是否在viewNode内
     * @param node 要检查的节点
     * @param panel 面板根节点
     * @returns 是否在viewNode内
     */
    private isNodeInViewNode(node: Node, panel: Node): boolean {
        let currentNode = node;
        while (currentNode && currentNode !== panel) {
            if (currentNode.name === 'viewNode') {
                return true;
            }
            currentNode = currentNode.parent;
        }
        return false;
    }

    /**
     * 考虑缩放因素更新Widget对齐
     * @param widget Widget组件
     * @param parentTransform 父节点的UITransform
     * @param node 当前节点
     */
    private updateWidgetWithScale(widget: Widget, parentTransform: UITransform, node: Node): void {
        // 记录原始的对齐参数
        const originalTop = widget.top;
        const originalBottom = widget.bottom;
        const originalLeft = widget.left;
        const originalRight = widget.right;
        
        // 根据缩放比例调整对齐参数
        if (widget.isAlignTop && widget.top !== 0) {
            widget.top = originalTop / this._scaleFactor;
        }
        if (widget.isAlignBottom && widget.bottom !== 0) {
            widget.bottom = originalBottom / this._scaleFactor;
        }
        if (widget.isAlignLeft && widget.left !== 0) {
            widget.left = originalLeft / this._scaleFactor;
        }
        if (widget.isAlignRight && widget.right !== 0) {
            widget.right = originalRight / this._scaleFactor;
        }
        
        // 更新Widget对齐
        widget.updateAlignment();
        
        // 恢复原始对齐参数（避免影响后续的Widget更新）
        widget.top = originalTop;
        widget.bottom = originalBottom;
        widget.left = originalLeft;
        widget.right = originalRight;
        
        DebugLog.instance.log(`[ScreenAdapter] 缩放Widget对齐更新: ${node.name}, 缩放比例: ${this._scaleFactor.toFixed(3)}, 对齐方式: ${this.getWidgetAlignmentInfo(widget)}`);
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
        
        // 对非viewNode中的节点进行特殊处理
        this.scaleNonViewNodeElements(panel, scaleFactor);
        
        // 处理viewNode内的Label组件
       // this.scaleLabelsInNode(viewNode, scaleFactor);
        
        DebugLog.instance.log(`[ScreenAdapter] viewNode缩放完成: 缩放比例${scaleFactor.toFixed(3)}`);
    }

    /**
     * 对非viewNode中的节点进行特殊缩放处理
     * @param panel 面板根节点
     * @param scaleFactor 缩放比例
     */
    private scaleNonViewNodeElements(panel: Node, scaleFactor: number): void {
        DebugLog.instance.log(`[ScreenAdapter] 开始处理非viewNode中的节点缩放`);
        
        // 遍历panel的直接子节点（排除viewNode）
        panel.children.forEach(child => {
            if (child.name !== 'viewNode') {
                const widget = child.getComponent(Widget);
                if (widget) {
                    // 检查是否上下适配（vertical stretch）
                    const isVerticalStretch = widget.isAlignTop && widget.isAlignBottom;
                    
                    if (isVerticalStretch) {
                        // 上下适配的节点，只做横向缩放，竖向不变
                        const currentScale = child.scale;
                        child.setScale(scaleFactor, currentScale.y, currentScale.z);
                        DebugLog.instance.log(`[ScreenAdapter] 非viewNode节点横向缩放: ${child.name}, 缩放前: x=${currentScale.x.toFixed(3)}, y=${currentScale.y.toFixed(3)}, 缩放后: x=${scaleFactor.toFixed(3)}, y=${currentScale.y.toFixed(3)}`);
                    } else {
                        // 其他情况，保持原有缩放
                        DebugLog.instance.log(`[ScreenAdapter] 非viewNode节点保持原有缩放: ${child.name}, 对齐方式: ${this.getWidgetAlignmentInfo(widget)}`);
                    }
                } else {
                    DebugLog.instance.log(`[ScreenAdapter] 非viewNode节点无Widget组件: ${child.name}`);
                }
            }
        });
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
                // 检查节点是否在viewNode内（需要考虑缩放）
                const isInViewNode = this.isNodeInViewNode(node, panel);
                
                if (isInViewNode && this._scaleFactor !== 1) {
                    // 对于viewNode内的Widget，需要考虑缩放因素
                    const parentNode = node.parent;
                    if (parentNode) {
                        const parentTransform = parentNode.getComponent(UITransform);
                        if (parentTransform) {
                            this.updateWidgetWithScale(widget, parentTransform, node);
                        } else {
                            widget.updateAlignment();
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
}

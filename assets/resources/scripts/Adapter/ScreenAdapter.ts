import { _decorator, Component, Node, UITransform, view, Widget, Vec3, Size, Label, math, sys, screen, Enum } from 'cc';
import { ScreenSizeUtil } from './ScreenSizeUtil';
const { ccclass, property } = _decorator;

// 声明枚举
enum AdaptMode {
    FIT_HEIGHT,
    FIT_WIDTH,
    FIT_BOTH,
    STRETCH
}

@ccclass('ScreenAdapter')
export class ScreenAdapter extends Component {
    @property(Node)
    parentNode: Node = null!;

    @property([Node])
    childNodes: Node[] = [];

    @property({ type: AdaptMode, tooltip: '适配模式...' })
    adaptMode: AdaptMode = AdaptMode.FIT_HEIGHT;

    private readonly designWidth: number = 1080;
    private readonly designHeight: number = 1920;
    private originalChildSizes: Map<string, Size> = new Map();
    private originalChildPositions: Map<string, Vec3> = new Map();
    private originalLabelFontSizes: Map<string, number> = new Map(); // 存储Label原始字体大小
    private originalLabelLineHeights: Map<string, number> = new Map();// 保存原始行间距
    onLoad() {
        this.saveOriginalProperties();
        this.adaptScreen();
        view.on('canvas-resize', this.adaptScreen, this);
        sys.getSafeAreaRect(); // 获取安全区域
    }

    private saveOriginalProperties() {
        const saveNodeProperties = (node: Node) => {
            const childTransform = node.getComponent(UITransform);
            if (childTransform) {
                this.originalChildSizes.set(node.uuid, new Size(childTransform.width, childTransform.height));
                this.originalChildPositions.set(node.uuid, new Vec3(node.position));
            }

            // 如果是Label，保存原始字体大小
            const label = node.getComponent(Label);
            if (label) {
                this.originalLabelFontSizes.set(node.uuid, label.fontSize);
                this.originalLabelLineHeights.set(node.uuid, label.lineHeight);
            }

            node.children.forEach(child => saveNodeProperties(child));
        };
        this.childNodes.forEach(child => saveNodeProperties(child));
    }

    private adaptScreen() {
        // 获取适合UI适配的尺寸
        const uiSize = ScreenSizeUtil.getUISize();
        const screenWidth = uiSize.width;
        const screenHeight = uiSize.height;

        // 父节点适配屏幕尺寸
        this.parentNode.setPosition(0, 0);
        const parentTransform = this.parentNode.getComponent(UITransform);
        parentTransform?.setContentSize(screenWidth, screenHeight);

        // 只在宽度小于设计宽度时才进行缩放处理
        if (screenWidth < this.designWidth) {
            const scaleFactor = this.calculateScaleFactor(screenWidth, screenHeight);
            this.adaptChildNodes(scaleFactor);
            console.log(`[ScreenAdapter] 宽度不足，进行缩放处理: 实际宽度${screenWidth} < 设计宽度${this.designWidth}, 缩放比例${scaleFactor.toFixed(3)}`);
        } else {
            // 宽度足够时，更新 Widget 对齐到实际宽度，不进行缩放
            this.updateWidgetAlignment(screenWidth, screenHeight);
            console.log(`[ScreenAdapter] 宽度足够，更新Widget对齐到实际尺寸: 实际宽度${screenWidth} >= 设计宽度${this.designWidth}`);
        }
    }

    /**
     * 计算适配缩放比例
     * 只在宽度小于设计宽度时调用，根据适配模式计算缩放比例
     */
    private calculateScaleFactor(screenWidth: number, screenHeight: number): number {
        // 计算高度和宽度的缩放比例
        const heightScale = screenHeight / this.designHeight;
        const widthScale = screenWidth / this.designWidth;
        
        switch (this.adaptMode) {
            case AdaptMode.FIT_HEIGHT:
                // fitHeight 模式：使用宽度比例进行缩放（因为已经确定宽度不足）
                console.log(`[fitHeight] 宽度不足处理: 设计${this.designWidth}x${this.designHeight}, 实际${screenWidth}x${screenHeight}, 使用宽度比例${widthScale.toFixed(3)}`);
                return widthScale;
                
            case AdaptMode.FIT_WIDTH:
                // fitWidth 模式：使用宽度比例进行缩放
                console.log(`[fitWidth] 宽度不足处理: 设计${this.designWidth}x${this.designHeight}, 实际${screenWidth}x${screenHeight}, 使用宽度比例${widthScale.toFixed(3)}`);
                return widthScale;
                
            case AdaptMode.FIT_BOTH:
                // fitBoth 模式：取最小值，确保内容完全显示
                const minScale = Math.min(widthScale, heightScale);
                console.log(`[fitBoth] 宽度不足处理: 设计${this.designWidth}x${this.designHeight}, 实际${screenWidth}x${screenHeight}, 使用最小比例${minScale.toFixed(3)}`);
                return minScale;
                
            case AdaptMode.STRETCH:
                // stretch 模式：取最大值，可能裁剪内容但填满屏幕
                const maxScale = Math.max(widthScale, heightScale);
                console.log(`[stretch] 宽度不足处理: 设计${this.designWidth}x${this.designHeight}, 实际${screenWidth}x${screenHeight}, 使用最大比例${maxScale.toFixed(3)}`);
                return maxScale;
                
            default:
                // 默认使用宽度比例
                return widthScale;
        }
    }

    /**
     * 更新所有子节点的 Widget 对齐
     * 用于宽度足够时，更新对齐到实际尺寸而不进行缩放
     */
    private updateWidgetAlignment(actualWidth?: number, actualHeight?: number) {
        const updateNodeWidget = (node: Node) => {
            // 如果子节点有Widget组件，更新对齐
            const childWidget = node.getComponent(Widget);
            if (childWidget) {
                // 如果有传入实际尺寸，先临时设置父节点尺寸，然后更新Widget对齐
                if (actualWidth && actualHeight) {
                    const parentTransform = this.parentNode.getComponent(UITransform);
                    if (parentTransform) {
                        // 临时设置父节点为实际尺寸，让Widget基于实际尺寸计算对齐
                        const originalWidth = parentTransform.width;
                        const originalHeight = parentTransform.height;
                        
                        parentTransform.setContentSize(actualWidth, actualHeight);
                        childWidget.updateAlignment();
                        
                        // 恢复父节点原始尺寸
                        parentTransform.setContentSize(originalWidth, originalHeight);
                    } else {
                        childWidget.updateAlignment();
                    }
                } else {
                    childWidget.updateAlignment();
                }
            }

            // 递归处理子节点
            node.children.forEach(child => updateNodeWidget(child));
        };

        this.childNodes.forEach(child => updateNodeWidget(child));
    }

    private adaptChildNodes(scale: number) {
        const adaptNode = (node: Node) => {
            const childTransform = node.getComponent(UITransform);
            if (!childTransform) return;

            const originalSize = this.originalChildSizes.get(node.uuid);
            const originalPos = this.originalChildPositions.get(node.uuid);
            if (!originalSize || !originalPos) return;

            

            // 缩放尺寸和位置
            childTransform.width = originalSize.width * scale;
            childTransform.height = originalSize.height * scale;
            node.setPosition(
                originalPos.x * scale,
                originalPos.y * scale,
                originalPos.z
            );

            // 如果子节点有Widget组件，更新对齐
            const childWidget = node.getComponent(Widget);
            if (childWidget) {
                childWidget.updateAlignment();
            }

            // ==== 特殊处理 Label 组件 ====
            const label = node.getComponent(Label);
            if (label) {
                const originalFontSize = this.originalLabelFontSizes.get(node.uuid) || 24;
                // 限制字体最小和最大大小
                const minFontSize = 12;
                const maxFontSize = 48;
                label.fontSize = math.clamp(originalFontSize * scale, minFontSize, maxFontSize);
                label.fontSize = originalFontSize * scale; // 缩放字体大小
                const originalLineHeight = this.originalLabelLineHeights.get(node.uuid);
                label.lineHeight = originalLineHeight * scale;
                // 可选：处理行间距（如果设计中有行间距）
                // label.lineHeight = originalLineHeight * scale;
            }

            // 递归处理子节点
            node.children.forEach(child => adaptNode(child));
        };

        this.childNodes.forEach(child => adaptNode(child));
    }
}

// import { _decorator, Component, Node, UITransform, sys, view, Label, Rect, Vec3, Size } from 'cc';
// const { ccclass, property } = _decorator;

// @ccclass('SafeAreaAdapter')
// export class SafeAreaAdapter extends Component {
//     @property(Node)
//     rootNode: Node = null!; // 根节点（需适配安全区域的父节点）

//     private designWidth: number = 1080;
//     private designHeight: number = 1920;
//     private originalSizes: Map<string, Size> = new Map();
//     private originalPositions: Map<string, Vec3> = new Map();
//     private originalFontSizes: Map<string, number> = new Map();

//     onLoad() {
//         this.captureOriginalProperties(this.rootNode);
//         this.adaptSafeArea();
//         view.on('canvas-resize', this.adaptSafeArea, this);
//     }

//     onDestroy() {
//         view.off('canvas-resize', this.adaptSafeArea, this);
//     }

//     // 记录所有子节点的原始属性
//     private captureOriginalProperties(node: Node) {
//         const traverse = (currentNode: Node) => {
//             const uiTransform = currentNode.getComponent(UITransform);
//             if (uiTransform) {
//                 this.originalSizes.set(currentNode.uuid, new Size(uiTransform.width, uiTransform.height));
//                 this.originalPositions.set(currentNode.uuid, new Vec3(currentNode.position));
//                 const label = currentNode.getComponent(Label);
//                 if (label) this.originalFontSizes.set(currentNode.uuid, label.fontSize);
//             }
//             currentNode.children.forEach(child => traverse(child));
//         };
//         traverse(node);
//     }

//     // 核心适配逻辑
//     private adaptSafeArea() {
//         // 获取安全区域（关键修正：使用 sys 模块）
//         const safeArea = sys.getSafeAreaRect();
//         const screenWidth = view.getVisibleSize().width;
//         const screenHeight = view.getVisibleSize().height;

//         // Step 1: 调整根节点位置和尺寸
//         this.adjustRootNode(safeArea);

//         // Step 2: 计算安全区域内的缩放比例
//         const scale = this.calculateScale(safeArea);

//         // Step 3: 递归适配子节点
//         this.adaptChildren(this.rootNode, scale, safeArea);
//     }

//     // 调整根节点到安全区域
//     private adjustRootNode(safeArea: Rect) {
//         const rootTransform = this.rootNode.getComponent(UITransform);
//         if (!rootTransform) return;

//         // 设置根节点锚点为左下角 (0,0)
//         rootTransform.setAnchorPoint(0, 0);

//         // 定位到安全区域起点，并设置尺寸
//         this.rootNode.setPosition(safeArea.x, safeArea.y);
//         rootTransform.width = safeArea.width;
//         rootTransform.height = safeArea.height;
//     }

//     // 计算缩放比例（基于安全区域）
//     private calculateScale(safeArea: Rect): number {
//         const widthScale = safeArea.width / this.designWidth;
//         const heightScale = safeArea.height / this.designHeight;
//         return Math.min(widthScale, heightScale); // 保证内容完整显示
//     }

//     // 递归适配子节点
//     // 根据缩放比例和安全区域，调整节点的子节点
//     private adaptChildren(node: Node, scale: number, safeArea: Rect) {
//         // 定义递归函数，用于遍历节点及其子节点
//         const traverse = (currentNode: Node) => {
//             // 获取当前节点的UITransform组件
//             const uiTransform = currentNode.getComponent(UITransform);
//             if (!uiTransform) return;

//             // 获取原始属性
//             const originalSize = this.originalSizes.get(currentNode.uuid);
//             const originalPos = this.originalPositions.get(currentNode.uuid);
//             if (!originalSize || !originalPos) return;

//             // 缩放尺寸
//             uiTransform.width = originalSize.width * scale;
//             uiTransform.height = originalSize.height * scale;

//             // 计算位置（相对安全区域）
//             const posX = originalPos.x * scale;
//             const posY = originalPos.y * scale;
//             currentNode.setPosition(posX, posY);

//             // 处理Label字体
//             const label = currentNode.getComponent(Label);
//             if (label) {
//                 const originalFontSize = this.originalFontSizes.get(currentNode.uuid) || 24;
//                 label.fontSize = originalFontSize * scale;
//             }

//             // 递归处理子节点
//             currentNode.children.forEach(child => traverse(child));
//         };

//         // 从根节点开始遍历
//         traverse(node);
//     }
// }
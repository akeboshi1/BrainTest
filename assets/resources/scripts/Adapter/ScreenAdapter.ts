// import { _decorator, Component, Node, UITransform, view, Widget, Vec3, Size, Label,math,sys } from 'cc';
// const { ccclass, property } = _decorator;

// @ccclass('ScreenAdapter')
// export class ScreenAdapter extends Component {
//     @property(Node)
//     parentNode: Node = null!;

//     @property([Node])
//     childNodes: Node[] = [];

//     private readonly designWidth: number = 1080;
//     private readonly designHeight: number = 1920;
//     private originalChildSizes: Map<string, Size> = new Map();
//     private originalChildPositions: Map<string, Vec3> = new Map();
//     private originalLabelFontSizes: Map<string, number> = new Map(); // 存储Label原始字体大小
//     private originalLabelLineHeights: Map<string, number> = new Map();// 保存原始行间距
//     onLoad() {
//         this.saveOriginalProperties();
//         this.adaptScreen();
//         view.on('canvas-resize', this.adaptScreen, this);
//         sys.getSafeAreaRect(); // 获取安全区域
//     }

//     private saveOriginalProperties() {
//         const saveNodeProperties = (node: Node) => {
//             const childTransform = node.getComponent(UITransform);
//             if (childTransform) {
//                 this.originalChildSizes.set(node.uuid, new Size(childTransform.width, childTransform.height));
//                 this.originalChildPositions.set(node.uuid, new Vec3(node.position));
//             }

//             // 如果是Label，保存原始字体大小
//             const label = node.getComponent(Label);
//             if (label) {
//                 this.originalLabelFontSizes.set(node.uuid, label.fontSize);
//                 this.originalLabelLineHeights.set(node.uuid, label.lineHeight);
//             }

//             node.children.forEach(child => saveNodeProperties(child));
//         };
//         this.childNodes.forEach(child => saveNodeProperties(child));
//     }

//     private adaptScreen() {
//         const safeArea = view.getVisibleSize();
//         const screenWidth = safeArea.width;
//         const screenHeight = safeArea.height;

//         // 父节点适配安全区域
//         this.parentNode.setPosition(safeArea.x, safeArea.y);
//         const parentTransform = this.parentNode.getComponent(UITransform);
//         parentTransform?.setContentSize(screenWidth, screenHeight);

//         // 统一缩放比例（基于安全区域）
//         const scaleFactor = Math.min(screenWidth / this.designWidth, screenHeight / this.designHeight);
//         this.adaptChildNodes(scaleFactor);
//     }

//     private adaptChildNodes(scale: number) {
//         const adaptNode = (node: Node) => {
//             const childTransform = node.getComponent(UITransform);
//             if (!childTransform) return;

//             const originalSize = this.originalChildSizes.get(node.uuid);
//             const originalPos = this.originalChildPositions.get(node.uuid);
//             if (!originalSize || !originalPos) return;

//             // 如果子节点有Widget组件，更新对齐
//             const childWidget = node.getComponent(Widget);
//             if (childWidget) {
//                 childWidget.updateAlignment();
//             }

//             // 缩放尺寸和位置
//             childTransform.width = originalSize.width * scale;
//             childTransform.height = originalSize.height * scale;
//             node.setPosition(
//                 originalPos.x * scale,
//                 originalPos.y * scale,
//                 originalPos.z
//             );

//             // ==== 特殊处理 Label 组件 ====
//             const label = node.getComponent(Label);
//             if (label) {
//                 const originalFontSize = this.originalLabelFontSizes.get(node.uuid) || 24;
//                 // 限制字体最小和最大大小
//                 const minFontSize = 12;
//                 const maxFontSize = 48;
//                 label.fontSize = math.clamp(originalFontSize * scale, minFontSize, maxFontSize);
//                 label.fontSize = originalFontSize * scale; // 缩放字体大小
//                 const originalLineHeight = this.originalLabelLineHeights.get(node.uuid);
//                 label.lineHeight = originalLineHeight * scale;
//                 // 可选：处理行间距（如果设计中有行间距）
//                 // label.lineHeight = originalLineHeight * scale;
//             }

//             // 递归处理子节点
//             node.children.forEach(child => adaptNode(child));
//         };

//         this.childNodes.forEach(child => adaptNode(child));
//     }
// }

import { _decorator, Component, Node, UITransform, sys, view, Label, Rect, Vec3, Size } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SafeAreaAdapter')
export class SafeAreaAdapter extends Component {
    @property(Node)
    rootNode: Node = null!; // 根节点（需适配安全区域的父节点）

    private designWidth: number = 1080;
    private designHeight: number = 1920;
    private originalSizes: Map<string, Size> = new Map();
    private originalPositions: Map<string, Vec3> = new Map();
    private originalFontSizes: Map<string, number> = new Map();

    onLoad() {
        this.captureOriginalProperties(this.rootNode);
        this.adaptSafeArea();
        view.on('canvas-resize', this.adaptSafeArea, this);
    }

    onDestroy() {
        view.off('canvas-resize', this.adaptSafeArea, this);
    }

    // 记录所有子节点的原始属性
    private captureOriginalProperties(node: Node) {
        const traverse = (currentNode: Node) => {
            const uiTransform = currentNode.getComponent(UITransform);
            if (uiTransform) {
                this.originalSizes.set(currentNode.uuid, new Size(uiTransform.width, uiTransform.height));
                this.originalPositions.set(currentNode.uuid, new Vec3(currentNode.position));
                const label = currentNode.getComponent(Label);
                if (label) this.originalFontSizes.set(currentNode.uuid, label.fontSize);
            }
            currentNode.children.forEach(child => traverse(child));
        };
        traverse(node);
    }

    // 核心适配逻辑
    private adaptSafeArea() {
        // 获取安全区域（关键修正：使用 sys 模块）
        const safeArea = sys.getSafeAreaRect();
        const screenWidth = view.getVisibleSize().width;
        const screenHeight = view.getVisibleSize().height;

        // Step 1: 调整根节点位置和尺寸
        this.adjustRootNode(safeArea);

        // Step 2: 计算安全区域内的缩放比例
        const scale = this.calculateScale(safeArea);

        // Step 3: 递归适配子节点
        this.adaptChildren(this.rootNode, scale, safeArea);
    }

    // 调整根节点到安全区域
    private adjustRootNode(safeArea: Rect) {
        const rootTransform = this.rootNode.getComponent(UITransform);
        if (!rootTransform) return;

        // 设置根节点锚点为左下角 (0,0)
        rootTransform.setAnchorPoint(0, 0);

        // 定位到安全区域起点，并设置尺寸
        this.rootNode.setPosition(safeArea.x, safeArea.y);
        rootTransform.width = safeArea.width;
        rootTransform.height = safeArea.height;
    }

    // 计算缩放比例（基于安全区域）
    private calculateScale(safeArea: Rect): number {
        const widthScale = safeArea.width / this.designWidth;
        const heightScale = safeArea.height / this.designHeight;
        return Math.min(widthScale, heightScale); // 保证内容完整显示
    }

    // 递归适配子节点
    // 根据缩放比例和安全区域，调整节点的子节点
    private adaptChildren(node: Node, scale: number, safeArea: Rect) {
        // 定义递归函数，用于遍历节点及其子节点
        const traverse = (currentNode: Node) => {
            // 获取当前节点的UITransform组件
            const uiTransform = currentNode.getComponent(UITransform);
            if (!uiTransform) return;

            // 获取原始属性
            const originalSize = this.originalSizes.get(currentNode.uuid);
            const originalPos = this.originalPositions.get(currentNode.uuid);
            if (!originalSize || !originalPos) return;

            // 缩放尺寸
            uiTransform.width = originalSize.width * scale;
            uiTransform.height = originalSize.height * scale;

            // 计算位置（相对安全区域）
            const posX = originalPos.x * scale;
            const posY = originalPos.y * scale;
            currentNode.setPosition(posX, posY);

            // 处理Label字体
            const label = currentNode.getComponent(Label);
            if (label) {
                const originalFontSize = this.originalFontSizes.get(currentNode.uuid) || 24;
                label.fontSize = originalFontSize * scale;
            }

            // 递归处理子节点
            currentNode.children.forEach(child => traverse(child));
        };

        // 从根节点开始遍历
        traverse(node);
    }
}
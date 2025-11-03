import { _decorator, Component, Node, Label, Button, EventTouch } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 拖拽测试辅助脚本
 * 用于测试和调试拖拽功能
 */
@ccclass('DragTestHelper')
export class DragTestHelper extends Component {

    @property(Label)
    debugLabel: Label = null;

    @property(Button)
    testButton: Button = null;

    private debugInfo: string[] = [];

    onLoad() {
        // 添加测试按钮事件
        if (this.testButton) {
            this.testButton.node.on(Button.EventType.CLICK, this.onTestClick, this);
        }
    }

    /**
     * 测试按钮点击事件
     */
    private onTestClick() {
        this.addDebugInfo('测试按钮被点击');
        this.testDragFunctionality();
    }

    /**
     * 测试拖拽功能
     */
    private testDragFunctionality() {
        this.addDebugInfo('开始测试拖拽功能');
        
        // 检查场景中的节点
        const balanceScene = this.node.parent?.getComponent('balance');
        if (balanceScene) {
            this.addDebugInfo('找到balance场景组件');
            
            // 检查answerFamas数组
            const answerFamas = (balanceScene as any).answerFamas;
            if (answerFamas && answerFamas.length > 0) {
                this.addDebugInfo(`answerFamas数组长度: ${answerFamas.length}`);
                
                answerFamas.forEach((famaNode: any, index: number) => {
                    if (famaNode && famaNode.node) {
                        this.addDebugInfo(`FamaNode[${index}]: ${famaNode.name}`);
                        
                        // 检查触摸事件
                        this.checkTouchEvents(famaNode.node, index);
                    } else {
                        this.addDebugInfo(`FamaNode[${index}] 无效`);
                    }
                });
            } else {
                this.addDebugInfo('answerFamas数组为空或未定义');
            }
        } else {
            this.addDebugInfo('未找到balance场景组件');
        }
        
        this.updateDebugLabel();
    }

    /**
     * 检查触摸事件
     */
    private checkTouchEvents(node: Node, index: number) {
        // 检查节点是否有触摸事件监听器
        const hasTouchEvents = node.hasEventListener(Node.EventType.TOUCH_START) ||
                              node.hasEventListener(Node.EventType.TOUCH_MOVE) ||
                              node.hasEventListener(Node.EventType.TOUCH_END);
        
        if (hasTouchEvents) {
            this.addDebugInfo(`节点 ${node.name} 有触摸事件监听器`);
        } else {
            this.addDebugInfo(`节点 ${node.name} 没有触摸事件监听器`);
        }
        
        // 检查节点是否可见和可交互
        if (node.active) {
            this.addDebugInfo(`节点 ${node.name} 处于激活状态`);
        } else {
            this.addDebugInfo(`节点 ${node.name} 处于非激活状态`);
        }
    }

    /**
     * 添加调试信息
     */
    private addDebugInfo(info: string) {
        this.debugInfo.push(`[${new Date().toLocaleTimeString()}] ${info}`);
        
        // 限制调试信息数量
        if (this.debugInfo.length > 20) {
            this.debugInfo.shift();
        }
    }

    /**
     * 更新调试标签
     */
    private updateDebugLabel() {
        if (this.debugLabel) {
            this.debugLabel.string = this.debugInfo.join('\n');
        }
    }

    /**
     * 清空调试信息
     */
    public clearDebugInfo() {
        this.debugInfo = [];
        this.updateDebugLabel();
    }

    /**
     * 手动触发触摸事件测试
     */
    public testTouchEvent(nodeName: string) {
        this.addDebugInfo(`手动测试触摸事件: ${nodeName}`);
        
        const targetNode = this.findNodeByName(nodeName);
        if (targetNode) {
            this.addDebugInfo(`找到目标节点: ${targetNode.name}`);
            
            // 模拟触摸事件
            this.simulateTouchEvent(targetNode);
        } else {
            this.addDebugInfo(`未找到节点: ${nodeName}`);
        }
        
        this.updateDebugLabel();
    }

    /**
     * 查找指定名称的节点
     */
    private findNodeByName(name: string): Node | null {
        return this.node.parent?.getChildByName(name) || null;
    }

    /**
     * 模拟触摸事件
     */
    private simulateTouchEvent(node: Node) {
        // 这里可以添加模拟触摸事件的逻辑
        this.addDebugInfo(`模拟触摸事件: ${node.name}`);
    }

    onDestroy() {
        if (this.testButton) {
            this.testButton.node.off(Button.EventType.CLICK, this.onTestClick, this);
        }
    }
}

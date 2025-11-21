import { _decorator, Color, Component, Label, Node, resources, Sprite, SpriteFrame, UITransform, Size, Widget } from 'cc';
import { PersonalCenterManager } from '../../PersonalCenterManager/PersonalCenterManager';
import { ChatModel } from './Model/ChatModel';
import { DebugLog } from '../../../Core/Util/DebugLog';
import { DataProvider } from '../../../Core/Data/DataProvider';
import { ChatPanel } from './ChatPanel';
const { ccclass, property } = _decorator;

interface SubtitleItem {
    text: string;
    speaker: string;
    aiColor: Color;
    userColor: Color;
    spDataProvider: DataProvider<SpriteFrame>;
}

@ccclass('ChatSublineItem')
export class ChatSublineItem extends Component {
    @property(Label)
    private itemLabel: Label = null;

    @property(Sprite)
    private itemIcon: Sprite = null;

    @property(Node)
    private bgNode:Node = null;

    @property(Node)
    private cornorNode:Node = null;

    @property({ tooltip: "背景节点高度相对于文本高度的额外边距（上下各加多少）" })
    private bgHeightPadding: number = 20;

    @property({ tooltip: "背景节点的最小高度" })
    private minBgHeight: number = 180;

    @property({ tooltip: "item节点的最小高度" })
    private minItemHeight: number = 210;

    @property({ tooltip: "item节点高度相对于背景节点高度的额外高度" })
    private itemHeightExtra: number = 30;

    @property(Widget)
    private labelWidget: Widget = null;

    private _subtitleItem: SubtitleItem = null;

    private _spListenerID: string = null;

    private aiColor: Color = new Color(255, 255, 255, 255);
    private userColor: Color = new Color(122, 91, 254, 255); // #7A5BFE

    public removeAllListeners(): void {
        if(this._spListenerID){
            this._subtitleItem.spDataProvider.removeListenerById(this._spListenerID);
            this._spListenerID = null;
        }
        this._subtitleItem = null;
    }

    public setData(subtitleItem: SubtitleItem): void {
        this._subtitleItem = subtitleItem;
        this._refresh();
    }

    public addSubtitleText(text:string){
        this.itemLabel.string += text;
        // 文本更新后，延迟一帧更新背景高度，确保文本已渲染完成
        this.scheduleOnce(() => {
            this._updateBgHeight();
        }, 0);
    }

    public changeSpProvider(spDataProvider: DataProvider<SpriteFrame>): void {
        if(this._spListenerID){
            this._subtitleItem.spDataProvider.removeListenerById(this._spListenerID);
        }
        this._spListenerID = spDataProvider.addListener(this.onIconLoaded.bind(this));
        this._subtitleItem.spDataProvider = spDataProvider;
    }

    get speaker():string{
        return this._subtitleItem.speaker;
    }

    private _refresh() {
        let subtitleItem = this._subtitleItem;
        this.itemLabel.string = subtitleItem.text;
        // this.itemLabel.color = subtitleItem.speaker == "assistant" ? subtitleItem.aiColor : subtitleItem.userColor;

        // 根据说话者设置背景颜色
        this._updateBgColor(subtitleItem.speaker);

        if(this.itemIcon){
            if(this._spListenerID){
                this._subtitleItem.spDataProvider.removeListenerById(this._spListenerID);
            }
            this._spListenerID = this._subtitleItem.spDataProvider.addListener(this.onIconLoaded.bind(this));
        }

        // 文本更新后，延迟一帧更新背景高度，确保文本已渲染完成
        this.scheduleOnce(() => {
            this._updateBgHeight();
        }, 0);
    }

    /**
     * 根据说话者更新背景颜色
     * @param speaker 说话者类型："assistant" 或 "user"
     */
    private _updateBgColor(speaker: string): void {
        // 确定目标颜色：用户用 userColor，AI 用 aiColor
        const targetColor = speaker == "assistant" ? this.aiColor : this.userColor;

        // 更新 bgNode 的颜色
        this._setNodeColor(this.bgNode, targetColor);

        // 更新 cornorNode 的颜色（如果存在）
        if (this.cornorNode) {
            this._setNodeColor(this.cornorNode, targetColor);
        }

        DebugLog.instance.log(`更新背景颜色: speaker=${speaker}, color=${speaker == "assistant" ? "aiColor" : "userColor"}`);
    }

    /**
     * 设置节点的颜色（支持直接设置或通过子节点设置）
     * @param node 目标节点
     * @param color 目标颜色
     */
    private _setNodeColor(node: Node, color: Color): void {
        if (!node || !node.isValid) {
            return;
        }

        // 尝试直接获取节点的 Sprite 组件
        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.color = color;
            return;
        }

        // 如果没有 Sprite 组件，尝试在子节点中查找
        const spriteNode = node.getChildByName("sprite") || node.children[0];
        if (spriteNode) {
            const childSprite = spriteNode.getComponent(Sprite);
            if (childSprite) {
                childSprite.color = color;
            }
        }
    }

    /**
     * 根据文本高度更新背景节点的高度
     */
    private _updateBgHeight(): void {
        if (!this.bgNode || !this.itemLabel) {
            return;
        }

        const labelTransform = this.itemLabel.node.getComponent(UITransform);
        const bgTransform = this.bgNode.getComponent(UITransform);

        if (!labelTransform || !bgTransform) {
            return;
        }

        // 强制更新 Label 的渲染数据
        this.itemLabel.updateRenderData(true);
        
        // 使用递归方式，多次尝试获取正确的高度
        this._tryUpdateBgHeight(0);
    }

    /**
     * 尝试更新背景高度（递归调用，最多尝试3次）
     * @param attempt 当前尝试次数
     */
    private _tryUpdateBgHeight(attempt: number): void {
        if (attempt >= 3) {
            // 如果尝试3次后仍然获取不到，使用估算值
            this._updateBgHeightWithEstimate();
            return;
        }

        if (!this.bgNode || !this.itemLabel || !this.bgNode.isValid || !this.itemLabel.node.isValid) {
            return;
        }

        const labelTransform = this.itemLabel.node.getComponent(UITransform);
        const bgTransform = this.bgNode.getComponent(UITransform);

        if (!labelTransform || !bgTransform) {
            return;
        }

        // 获取文本的实际内容高度
        let labelHeight = labelTransform.contentSize.height;
        
        // 如果高度为0或很小，延迟一帧后重试
        if (labelHeight <= 0 || labelHeight < 10) {
            this.scheduleOnce(() => {
                this._tryUpdateBgHeight(attempt + 1);
            }, 0);
            return;
        }

        // 计算背景高度：文本高度加上上下边距，但不能小于最小高度
        const calculatedHeight = labelHeight + this.bgHeightPadding * 2;
        const oldHeight = bgTransform.height;
        const newHeight = Math.max(calculatedHeight, this.minBgHeight);
        bgTransform.height = newHeight;
        
        // 同步更新item节点本身的contentSize，以便父节点的Layout正确计算布局
        this._updateItemContentSize(newHeight);
        
        // 更新labelWidget，确保对齐正确
        this._updateLabelWidget();
        
        DebugLog.instance.log(`更新背景高度成功: 文本高度=${labelHeight}, 背景高度=${newHeight}, 尝试次数=${attempt + 1}`);
        
        // 如果高度发生变化，通知父容器更新所有节点位置
        if (Math.abs(oldHeight - newHeight) > 1) {
            this._notifyParentUpdatePositions();
        }
    }

    /**
     * 使用估算方式更新背景高度（当无法获取实际高度时）
     */
    private _updateBgHeightWithEstimate(): void {
        if (!this.bgNode || !this.itemLabel) {
            return;
        }

        const labelTransform = this.itemLabel.node.getComponent(UITransform);
        const bgTransform = this.bgNode.getComponent(UITransform);

        if (!labelTransform || !bgTransform) {
            return;
        }

        const text = this.itemLabel.string || '';
        const lineHeight = this.itemLabel.lineHeight || this.itemLabel.fontSize || 30;
        const maxWidth = labelTransform.width || 1000;
        const fontSize = this.itemLabel.fontSize || 30;
        
        // 估算文本行数
        // 使用更准确的估算：考虑中文字符宽度约为字体大小的0.6倍
        const charWidth = fontSize * 0.6;
        const charsPerLine = Math.floor(maxWidth / charWidth) || 1;
        const estimatedLines = Math.ceil(text.length / charsPerLine) || 1;
        const labelHeight = estimatedLines * lineHeight;
        
        // 计算背景高度：文本高度加上上下边距，但不能小于最小高度
        const calculatedHeight = labelHeight + this.bgHeightPadding * 2;
        const oldHeight = bgTransform.height;
        const newHeight = Math.max(calculatedHeight, this.minBgHeight);
        bgTransform.height = newHeight;
        
        // 同步更新item节点本身的contentSize，以便父节点的Layout正确计算布局
        this._updateItemContentSize(newHeight);
        
        // 更新labelWidget，确保对齐正确
        this._updateLabelWidget();
        
        DebugLog.instance.log(`使用估算更新背景高度: 文本长度=${text.length}, 估算行数=${estimatedLines}, 文本高度=${labelHeight}, 背景高度=${newHeight}`);
        
        // 如果高度发生变化，通知父容器更新所有节点位置
        if (Math.abs(oldHeight - newHeight) > 1) {
            this._notifyParentUpdatePositions();
        }
    }

    /**
     * 更新item节点本身的contentSize
     * @param bgHeight 背景节点的高度值
     */
    private _updateItemContentSize(bgHeight: number): void {
        if (!this.node || !this.node.isValid) {
            return;
        }

        const nodeTransform = this.node.getComponent(UITransform);
        if (!nodeTransform) {
            return;
        }

        // item节点的高度 = 背景节点高度 + 额外高度
        const calculatedHeight = bgHeight + this.itemHeightExtra;
        
        // 确保item节点的高度不小于最小高度
        const finalHeight = Math.max(calculatedHeight, this.minItemHeight);

        // 更新节点的高度，保持宽度不变
        const currentWidth = nodeTransform.contentSize.width;
        nodeTransform.setContentSize(new Size(currentWidth, finalHeight));
        
        DebugLog.instance.log(`更新item节点contentSize: 宽度=${currentWidth}, 高度=${finalHeight} (背景高度=${bgHeight}, 额外高度=${this.itemHeightExtra}, 最小高度=${this.minItemHeight})`);
    }

    /**
     * 更新labelWidget的对齐
     */
    private _updateLabelWidget(): void {
        if (!this.labelWidget || !this.labelWidget.isValid) {
            return;
        }

        // 更新Widget对齐，确保在父节点尺寸变化后正确对齐
        this.labelWidget.updateAlignment();
        
        DebugLog.instance.log(`更新labelWidget对齐完成`);
    }

    /**
     * 通知父容器更新所有节点的位置
     */
    private _notifyParentUpdatePositions(): void {
        // 延迟一帧调用，确保高度更新完成
        this.scheduleOnce(() => {
            // 查找父容器中的 ChatPanel 组件
            let parent = this.node.parent;
            while (parent) {
                const chatPanel = parent.getComponent(ChatPanel);
                if (chatPanel && (chatPanel as any)._updateAllNodesPosition) {
                    (chatPanel as any)._updateAllNodesPosition();
                    break;
                }
                parent = parent.parent;
            }
        }, 0);
    }

    private onIconLoaded(spriteFrame: SpriteFrame): void {
        if(this.itemIcon){
            this.itemIcon.spriteFrame = spriteFrame;
        }
    }
}



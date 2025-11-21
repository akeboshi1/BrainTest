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

    private bgHeightPadding: number = 20;

    private bgWidthPadding: number = 50;

    private byteWidth: number = 42;

    private maxTextWidth: number = 590;

    private minBgHeight: number = 180;

    private minBgWidght:number = 180;

    private maxBgWidth:number = 712;

    private minItemHeight: number = 210;

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
        // 文本更新后，延迟一帧更新背景高度和宽度，确保文本已渲染完成
        this.scheduleOnce(() => {
            this._updateBgWidth();
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

        // 文本更新后，延迟一帧更新背景高度和宽度，确保文本已渲染完成
        this.scheduleOnce(() => {
            this._updateBgWidth();
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
        

         // 同时更新宽度
         this._updateBgWidth();


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
     * 判断是否为中文字符
     * @param charCode 字符编码
     * @returns 是否为中文字符
     */
    private _isChineseChar(charCode: number): boolean {
        // 中文字符的Unicode范围：
        // \u4e00-\u9fff: 基本中文字符
        // \u3400-\u4dbf: 扩展A区
        // \u3000-\u303f: 中文标点符号
        // \uff00-\uffef: 全角字符
        return (charCode >= 0x4e00 && charCode <= 0x9fff) ||
               (charCode >= 0x3400 && charCode <= 0x4dbf) ||
               (charCode >= 0x3000 && charCode <= 0x303f) ||
               (charCode >= 0xff00 && charCode <= 0xffef);
    }

    /**
     * 计算文本的总宽度（根据字符类型）
     * @param str 字符串
     * @returns 文本总宽度（像素）
     */
    private _getTextLength(str: string): number {
        let totalWidth = 0;
        for (let i = 0; i < str.length; i++) {
            const charCode = str.charCodeAt(i);
            
            // 按优先级判断字符类型并计算宽度
            if (charCode >= 48 && charCode <= 57) {
                // 数字：0-9
                totalWidth += 24;
            } else if ((charCode >= 65 && charCode <= 90) || (charCode >= 97 && charCode <= 122)) {
                // 字母：A-Z, a-z
                totalWidth += 40;
            } else if (this._isChineseChar(charCode)) {
                // 中文字符（包括中文标点符号）
                totalWidth += 56;
            } else {
                // 其他字符（英文标点、空格、特殊符号等）
                // 对于英文标点符号，通常宽度较小，这里使用字母宽度
                // 对于其他特殊字符，使用较小的宽度
                if ((charCode >= 32 && charCode <= 47) || 
                    (charCode >= 58 && charCode <= 64) || 
                    (charCode >= 91 && charCode <= 96) || 
                    (charCode >= 123 && charCode <= 126)) {
                    // 英文标点符号和特殊字符
                    totalWidth += 40;
                } else {
                    // 其他未知字符，使用中文字符宽度
                    totalWidth += 40;
                }
            }
        }
        return totalWidth;
    }

    /**
     * 根据文本宽度更新背景节点的宽度
     */
    private _updateBgWidth(): void {
        if (!this.bgNode || !this.itemLabel) {
            return;
        }

        const bgTransform = this.bgNode.getComponent(UITransform);
        if (!bgTransform) {
            return;
        }

        // 获取文本内容
        const text = this.itemLabel.string || '';
        
        // 计算文本的总宽度（根据字符类型：文字30、字母20、数字15）
        const calculatedTextWidth = this._getTextLength(text);
        
        // 如果计算出的宽度小于maxTextWidth，使用计算宽度；否则使用maxTextWidth（因为会换行）
        const textWidth = Math.min(calculatedTextWidth, this.maxTextWidth);

        // 计算背景宽度：文本宽度加上左右边距，但限制在最小和最大宽度之间
        const calculatedWidth = textWidth + this.bgWidthPadding * 2;
        const oldWidth = bgTransform.width;
        const newWidth = Math.max(this.minBgWidght, Math.min(calculatedWidth, this.maxBgWidth));

        bgTransform.width = newWidth;
        
        DebugLog.instance.log(`更新背景宽度成功: 文本=${text.substring(0, 20)}..., 计算文本宽度=${calculatedTextWidth}, 使用文本宽度=${textWidth}, 背景宽度=${newWidth}`);
        
        // 如果宽度发生变化，通知父容器更新所有节点位置
        if (Math.abs(oldWidth - newWidth) > 1) {
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
        
        // 同时更新宽度
        this._updateBgWidth();
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



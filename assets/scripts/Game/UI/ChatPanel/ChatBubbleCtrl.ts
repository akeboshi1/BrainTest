import { _decorator, Component, Node, Sprite, Label, UITransform } from 'cc';
import { DebugLog } from '../../../Core/Util/DebugLog';
const { ccclass, property } = _decorator;

@ccclass('ChatBubbleCtrl')
export class ChatBubbleCtrl extends Component {
    // 聊天泡泡的背景图片节点，通过属性检查器关联
    @property({ type: Node })
    bgSpriteNode: Node = null;

    // 聊天泡泡的文本标签节点，通过属性检查器关联
    @property({ type: Node })
    labelNode: Node = null;

    // 用于控制文字逐个显示的时间间隔（单位：秒），可在属性检查器中调整
    @property({ type: Number })
    typingInterval: number = 0.1;

    private _label: Label;
    private _bgSprite: Sprite;
    private _bgTransform: UITransform;
    private _isTyping: boolean = false;
    private _textToType: string = "";
    private _currentTypedIndex: number = 0;
    private _typingTimer: number = 0;

    private _maxCharNumInLine: number = 16;
    private _lineCharCount: number = 0;

    private _isInterrupted:boolean = false;

    start() {
        this._label = this.labelNode.getComponent(Label);
        this._bgSprite = this.bgSpriteNode.getComponent(Sprite);
        this._bgTransform = this.bgSpriteNode.getComponent(UITransform);

        this.onLabelSizeChanged();
    }

    update(deltaTime: number) {
        if (this._isTyping && !this._isInterrupted) {
            this._typingTimer += deltaTime;
            if (this._typingTimer >= this.typingInterval) {
                this._typingTimer = 0;
                this._currentTypedIndex++;
                if (this._currentTypedIndex > this._textToType.length) {
                    this._isTyping = false;
                } else {
                    const currentChar = this._textToType.slice(this._currentTypedIndex - 1, this._currentTypedIndex);
                    if (currentChar == "\n") {
                        this._lineCharCount = 0;
                    }

                    this._label.string += currentChar; //this._textToType.slice(0, this._currentTypedIndex);

                    if (this._lineCharCount > this._maxCharNumInLine) {
                        this._label.string += "\n";
                        this._lineCharCount = 0;
                    }
                    else {
                        this._lineCharCount++;
                    }

                    this.onLabelSizeChanged();
                }
            }
        }
    }

    /**
     * 外部调用的接口，用于传入要显示的文本并触发打字动画效果，新文本会拼接到之前缓存文本之后
     * @param text 要显示的文本内容
     */
    public typeText(text: string,duration:number | null = null): void {
        // 将新传入的文本拼接到之前缓存的文本之后
        this._textToType += text;
        this._isTyping = true;
        if(duration != null)
        {
            this.typingInterval = Math.min(this.typingInterval, duration/this._textToType.length);
        }
    }

    public stopTyping():void {
        this._isInterrupted = true;
    }

    private onLabelSizeChanged(): void {
        let labelSize = this.labelNode.getComponent(UITransform).contentSize;

        let margin = 40;
        this._bgTransform.width = labelSize.width + margin * 1.5;
        this._bgTransform.height = labelSize.height + margin;
        this.node.getComponent(UITransform).height = this._bgTransform.height;
    }
}
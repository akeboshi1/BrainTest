import { _decorator, Color, Component, Label, Node, resources, Sprite, SpriteFrame } from 'cc';
import { PersonalCenterManager } from '../../PersonalCenterManager/PersonalCenterManager';
import { ChatModel } from './Model/ChatModel';
import { DebugLog } from '../../../Core/Util/DebugLog';
const { ccclass, property } = _decorator;

interface SubtitleItem {
    text: string;
    speaker: string;
    aiColor: Color;
    userColor: Color;
}

@ccclass('ChatSublineItem')
export class ChatSublineItem extends Component {
    @property(Label)
    private label: Label = null;
    @property(Sprite)
    private icon: Sprite = null;

    private _chatModel: ChatModel = null;
    private _charactorChoosenSkinProviderID: string = '';

    private _subtitleItem: SubtitleItem = null;

    private _spFrameMap: Map<string, SpriteFrame> = new Map();
    private _currentIconUrl: string = '';


    protected onEnable(): void {
        this._chatModel = ChatModel.getInstance();
        this._charactorChoosenSkinProviderID = this._chatModel.charactorChoosenSkin.addListener(this.onCharactorChoosenSkinChanged.bind(this));
    }

    protected onDisable(): void {
        this._chatModel = ChatModel.getInstance();
        this._chatModel.charactorChoosenSkin.removeListenerById(this._charactorChoosenSkinProviderID);
        this._spFrameMap.clear();
        this._currentIconUrl = '';
        this._subtitleItem = null;
    }

    protected onCharactorChoosenSkinChanged(skin: string): void {
        DebugLog.instance.log("刷新测试界面：角色皮肤： " + skin);
        if (this._subtitleItem && this._subtitleItem.speaker == "assistant") {
            let iconUrl = 'texture/chatpanel/icon/icon_' + skin + '/spriteFrame';
            this._currentIconUrl = iconUrl;
            this.loadSprite(iconUrl).then(spriteFrame => {
                this.onIconLoaded(spriteFrame, iconUrl);
            });
        }
    }

    public setData(subtitleItem: SubtitleItem): void {
        this._chatModel = ChatModel.getInstance();
        this._subtitleItem = subtitleItem;
        this._refresh();
    }

    public addSubtitleText(text:string){
        this.label.string += text;
    }

    private _refresh() {
        let subtitleItem = this._subtitleItem;
        this.label.string = subtitleItem.text;
        this.label.color = subtitleItem.speaker == "assistant" ? subtitleItem.aiColor : subtitleItem.userColor;
        let iconUrl = '';
        if (subtitleItem.speaker == "assistant" && this._chatModel.charactorChoosenSkin.data != null) {
            iconUrl = 'texture/chatpanel/icon/icon_' + this._chatModel.charactorChoosenSkin.data + '/spriteFrame';

        } else {
            let userData = PersonalCenterManager.getInstance().userInfoData;
            iconUrl = userData.gender == 1 ? 'textureV2/indexPage/male/spriteFrame' : 'textureV2/indexPage/female/spriteFrame';

        }

        this._currentIconUrl = iconUrl;
        this.loadSprite(iconUrl).then(spriteFrame => {
            this.onIconLoaded(spriteFrame, iconUrl);
        });
    }

    private onIconLoaded(spriteFrame: SpriteFrame, iconUrl: string): void {
        let has = this._spFrameMap.has(this._currentIconUrl);
        if (has) {
            this.icon.spriteFrame = this._spFrameMap.get(this._currentIconUrl);
        } else {
            this.icon.spriteFrame = spriteFrame;
        }
    }

    async loadSprite(path: string): Promise<SpriteFrame> {
        if (this._spFrameMap.has(path)) {
            return this._spFrameMap.get(path);
        }
        return new Promise((resolve, reject) => {
            resources.load(path, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!spriteFrame) {
                    reject(new Error('Loaded sprite frame is null'));
                    return;
                }
                this._spFrameMap.set(path, spriteFrame);
                resolve(spriteFrame);
            });
        })
    }
}



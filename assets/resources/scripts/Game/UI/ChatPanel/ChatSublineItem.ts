import { _decorator, Color, Component, Label, Node, resources, Sprite, SpriteFrame } from 'cc';
import { PersonalCenterManager } from '../../PersonalCenterManager/PersonalCenterManager';
import { ChatModel } from './Model/ChatModel';
import { DebugLog } from '../../../Core/Util/DebugLog';
import { DataProvider } from '../../../Core/Data/DataProvider';
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

    private _subtitleItem: SubtitleItem = null;

    private _spListenerID: string = null;

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
        this.itemLabel.color = subtitleItem.speaker == "assistant" ? subtitleItem.aiColor : subtitleItem.userColor;

        if(this.itemIcon){
            if(this._spListenerID){
                this._subtitleItem.spDataProvider.removeListenerById(this._spListenerID);
            }
            this._spListenerID = this._subtitleItem.spDataProvider.addListener(this.onIconLoaded.bind(this));
        }
    }

    private onIconLoaded(spriteFrame: SpriteFrame): void {
        if(this.itemIcon){
            this.itemIcon.spriteFrame = spriteFrame;
        }
    }
}



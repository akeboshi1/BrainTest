import { _decorator, Component, Label, Node } from 'cc';
import { ChatSong } from './Model/ChatProtocol';
const { ccclass, property } = _decorator;

@ccclass('ChatMusicItem')
export class ChatMusicItem extends Component {
    @property(Node)
    private playingIcon: Node = null;
    @property(Node)
    private pauseIcon: Node = null;

    @property(Node)
    private playingLabel: Node = null;
    @property(Label)
    private musicNameLabel: Label = null;

    private _song: ChatSong = null;
    private _onClick: (song: ChatSong) => void = null;
    public setData(song: ChatSong, onClick: (song: ChatSong) => void): void {
        this._song = song;
        const maxLen = song.isPlaying ? 7 : 11;
        this.musicNameLabel.string = this.truncateText(song.name, maxLen);
        this.playingIcon.active = song.isPlaying;
        this.pauseIcon.active = !song.isPlaying;
        this.playingLabel.active = song.isPlaying;
        this._onClick = onClick;
    }

    private truncateText(text: string, maxLen: number): string {
        if (!text) return "";
        if (text.length <= maxLen) return text;
        return text.slice(0, maxLen) + "...";
    }

    public onClick(): void {
        if(this._onClick) {
            this._onClick(this._song);
        }
    }
}
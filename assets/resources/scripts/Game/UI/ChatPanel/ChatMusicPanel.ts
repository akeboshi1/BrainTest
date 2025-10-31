import { _decorator, Button, Component, instantiate, Label, Node, Prefab, ScrollView } from 'cc';
import { BasePanel } from '../../../Core/UI/BasePanel';
import { ChatModel } from './Model/ChatModel';
import { ChatSong } from './Model/ChatProtocol';
import { ChatMusicItem } from './ChatMusicItem';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
const { ccclass, property } = _decorator;

@ccclass('ChatMusicPanel')
export class ChatMusicPanel extends BasePanel {
    public static NAME: string = "ChatMusicPanel";

    @property(Node)
    private musicListContainer: Node = null;

    @property(Prefab)
    private musicItemPrefab: Prefab = null;

    @property(Node)
    private musicListNode: Node = null;

    @property(Node)
    private musicPlayNode: Node = null;

    @property(Node)
    private playBtnIcon: Node = null;

    @property(Node)
    private pauseBtnIcon: Node = null;

    @property(Node)
    private playCtrlMask: Node = null;

    @property(Label)
    private currentPlayingSongLabel: Label = null;

    private panelState: "list" | "play" | "empty" = "list";

    private _chatModel: ChatModel = null;
    
    private _characterSongsProviderChangeID: string = "";
    private _currentPlayingSongStateChangeID: string = "";
    private _currentPlayingSongChangeID: string = "";
    private _closeCallback: () => void = null;
    public restore(data: { chatModel: ChatModel , closeCallback: () => void }) {
        this.switchPanelState("list");
        this._chatModel = data.chatModel;
        this._characterSongsProviderChangeID = this._chatModel.characterSongsProvider.addListener(this.onCharacterSongsChanged.bind(this));
        this._currentPlayingSongStateChangeID = this._chatModel.currentPlayingSongState.addListener(this.onCurrentPlayingSongStateChanged.bind(this));
        this._currentPlayingSongChangeID = this._chatModel.currentPlayingSong.addListener(this.onCurrentPlayingSongChanged.bind(this));
        this._closeCallback = data.closeCallback;
    }

    onDisable(): void {
        this._chatModel.characterSongsProvider.removeListenerById(this._characterSongsProviderChangeID);
        this._chatModel.currentPlayingSongState.removeListenerById(this._currentPlayingSongStateChangeID);
        this._chatModel.currentPlayingSong.removeListenerById(this._currentPlayingSongChangeID);
    }

    private switchPanelState(state: "list" | "play" | "empty"): void {
        this.panelState = state;
        this.musicListNode.active = this.panelState === "list";
        this.musicPlayNode.active = this.panelState === "play";
    }

    private onCharacterSongsChanged(songs: ChatSong[]): void {
        this.musicListContainer.removeAllChildren();
        songs.forEach(song => {
            const musicItem = instantiate(this.musicItemPrefab);
            musicItem.getComponent(ChatMusicItem).setData(song, this.onClickMusicItem.bind(this));
            this.musicListContainer.addChild(musicItem);
        });
    }

    private onCurrentPlayingSongStateChanged(state: "playing" | "paused" | "ended"): void {
        this.playBtnIcon.active = state === "paused";
        this.pauseBtnIcon.active = state === "playing";
        this.playCtrlMask.active = false;

        if(state === "ended"){
            this.playNextMusic();
        }
    }

    private onCurrentPlayingSongChanged(song: ChatSong): void {
        this.currentPlayingSongLabel.string = "正在播放：" + song.name;
        this.switchPanelState("play");
    }

    private onClickMusicItem(song: ChatSong): void {
        if(this._chatModel.currentPlayingSong.data != null && this._chatModel.currentPlayingSong.data.id === song.id){
            this.switchPanelState("play");
            return;
        }
        this._chatModel.playMusic(song);
        this.switchPanelState("empty");
    }

    public onClickClose(){
        this._chatModel.backToChat();
        if(this._closeCallback){
            this._closeCallback();
        }
        UIManager.getInstance().hidePanel(ChatMusicPanel.NAME);
    }

    public onClickPlayBtn(): void {
        if(this._chatModel.currentPlayingSongState.data === "playing"){
            this._chatModel.pauseMusic();
        }else if(this._chatModel.currentPlayingSongState.data === "paused"){
            this._chatModel.resumeMusic();
        }
        this.playCtrlMask.active = true;
    }

    public onClickPlayNext(): void {
        this.playNextMusic();
    }

    public onClickPlayPrev(): void {
        this.playPrevMusic();
    }

    private playNextMusic(): void {
        const currentSong = this._chatModel.currentPlayingSong.data;
        let nextSong: ChatSong = null;
        let nextSongIndex = 0;
        this._chatModel.characterSongsProvider.data.forEach((song: ChatSong, index: number) => {
            if(song.id === currentSong.id){
                nextSongIndex = index + 1;
                return;
            }
        });
        if(nextSongIndex >= this._chatModel.characterSongsProvider.data.length){
            nextSongIndex = 0;
        }
        nextSong = this._chatModel.characterSongsProvider.data[nextSongIndex];
        this._chatModel.playMusic(nextSong);
        this.playCtrlMask.active = true;
    }

    private playPrevMusic(): void {
        const currentSong = this._chatModel.currentPlayingSong.data;
        let prevSong: ChatSong = null;
        let prevSongIndex = 0;
        this._chatModel.characterSongsProvider.data.forEach((song: ChatSong, index: number) => {
            if(song.id === currentSong.id){
                prevSongIndex = index - 1;
                return;
            }
        });
        if(prevSongIndex < 0){
            prevSongIndex = this._chatModel.characterSongsProvider.data.length - 1;
        }
        prevSong = this._chatModel.characterSongsProvider.data[prevSongIndex];
        this._chatModel.playMusic(prevSong);
        this.playCtrlMask.active = true;
    }

    public onClickBackToList(): void {
        this.switchPanelState("list");
    }
}



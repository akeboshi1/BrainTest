import { _decorator, Button, Color, Component, instantiate, Label, Node, NodeEventType, Prefab, Sprite, SpriteFrame, tween, Vec3 } from 'cc';
import { BasePanel, PanelState } from '../../../Core/UI/BasePanel';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
import { ChatModel } from './Model/ChatModel';
import { ChatCharacter, ChatSkin } from './Model/ChatProtocol';
import { ChatChooseItem } from './ChatChooseItem';
const { ccclass, property } = _decorator;

@ccclass('ChatCharactorChoosePanel')
export class ChatCharactorChoosePanel extends BasePanel {
    public static NAME = 'ChatCharactorChoosePanel';

    @property(Node)
    private charactorChooseContent: Node = null;

    @property(Node)
    private skinChooseContent: Node = null;

    @property(Prefab)
    private charactorIconPrefab: Prefab = null;

    @property(Prefab)
    private chooseItemPrefab: Prefab = null;

    @property(Sprite)
    private closeBtnIcon: Sprite = null;
    @property(Label)
    private closeBtnLabel: Label = null;

    @property(SpriteFrame)
    private skinChangedIcon: SpriteFrame = null;
    @property(SpriteFrame)
    private skinNotChangedIcon: SpriteFrame = null;

    @property(Button)
    private closeBtn: Button = null;
    
    private _chatModel: ChatModel = null;
    private _selectedCharactorId: number = 0;
    private _selectedCharactorSkin: number = 0;

    private _oldCharactorId: number = 0;
    private _oldCharactorSkin: number = 0;

    private _closeCallback: (bool: boolean) => void = null;

    onEnable(): void {
        this._chatModel = ChatModel.getInstance();
        this._selectedCharactorId = this._chatModel.selectedCharactorId;
        this._selectedCharactorSkin = this._chatModel.selectedCharactorSkin;
        this._oldCharactorId = this._selectedCharactorId;
        this._oldCharactorSkin = this._selectedCharactorSkin;
        this.initChooseItems();

        this.closeBtn.node.on(Node.EventType.TOUCH_START, this.setButtonPressed.bind(this, true), this);
        this.closeBtn.node.on(Node.EventType.TOUCH_END, this.setButtonPressed.bind(this, false), this);
        this.closeBtn.node.on(Node.EventType.TOUCH_CANCEL, this.setButtonPressed.bind(this, false), this);
    }

    restore(data: {closeCallback: (bool: boolean) => void}): void {
        this._closeCallback = data.closeCallback;
    }
    
    public initChooseItems():void {
        let charactorMap = this._chatModel.charactorListProvider.data;
        
        let self = this;
        charactorMap.forEach((character: ChatCharacter) => {
                let charactorChooseItem = instantiate(self.charactorIconPrefab);
                charactorChooseItem.setParent(self.charactorChooseContent);
                charactorChooseItem.setPosition(0, 0, 0);
                let iconUrl = "texture/chatpanel/v2/charactorIcon/icon_" + character.id + "/spriteFrame";
                charactorChooseItem.getComponent(ChatChooseItem).setData(character.id, "", character.id === self._selectedCharactorId, iconUrl, self.onCharactorChooseItemClick.bind(self));
                if(character.id === self._selectedCharactorId) {
                    character.skins.forEach((skin: ChatSkin) => {
                        let skinChooseItem = instantiate(self.chooseItemPrefab);
                        skinChooseItem.setParent(self.skinChooseContent);
                        skinChooseItem.setPosition(0, 0, 0);
                        skinChooseItem.getComponent(ChatChooseItem).setData(skin.id, skin.name, skin.id === self._selectedCharactorSkin, "", self.onSkinChooseItemClick.bind(self));
                    });
                }
        });
    }

    public onClickBtnClose():void {
        UIManager.getInstance().hidePanel(ChatCharactorChoosePanel.NAME);
        if(this._closeCallback) {
            this._closeCallback(false);
        }
    }

    public onCharactorChooseItemClick(character_id: number):void {
        this._selectedCharactorId = character_id;
        let skins = this._chatModel.charactorListProvider.data.get(character_id).skins;
        if(skins){
            this._selectedCharactorSkin = skins[0].id;
        }
        this.onClickBtnChoose(character_id, this._selectedCharactorSkin);
        let charactorChooseItems = this.charactorChooseContent.getComponentsInChildren(ChatChooseItem);
        charactorChooseItems.forEach((charactorChooseItem: ChatChooseItem) => {
            charactorChooseItem.setSelected(charactorChooseItem.getSelectionId() === character_id);
        });

        this.skinChooseContent.removeAllChildren();
        let charactor = this._chatModel.charactorListProvider.data.get(character_id);
        this._chatModel.updateCharactorChoosenSkinData(charactor);
        let self = this;
        charactor.skins.forEach((skin: ChatSkin) => {
            let skinChooseItem = instantiate(self.chooseItemPrefab);
            skinChooseItem.setParent(self.skinChooseContent);
            skinChooseItem.setPosition(0, 0, 0);
            skinChooseItem.getComponent(ChatChooseItem).setData(skin.id, skin.name, skin.id === self._selectedCharactorSkin, "", self.onSkinChooseItemClick.bind(self));
        });
    }

    public onSkinChooseItemClick(skin_id: number):void {
        this._selectedCharactorSkin = skin_id;
        this.onClickBtnChoose(this._selectedCharactorId, skin_id);
        let skinChooseItems = this.skinChooseContent.getComponentsInChildren(ChatChooseItem);
        skinChooseItems.forEach((skinChooseItem: ChatChooseItem) => {
            skinChooseItem.setSelected(skinChooseItem.getSelectionId() === skin_id);
        });
    }

    public onClickBtnChoose(character_id: number, skin_id: number):void {
        let changed = character_id != this._oldCharactorId || skin_id != this._oldCharactorSkin;
        this._chatModel.chooseCharactor(character_id, skin_id);
    }

    private setButtonPressed(isPressed: boolean) {
        if(isPressed) {
            this.closeBtnIcon.spriteFrame = this.skinChangedIcon;
            this.closeBtnLabel.color = Color.WHITE;
        } else {
            this.closeBtnIcon.spriteFrame = this.skinNotChangedIcon;
            this.closeBtnLabel.color = Color.BLACK;
        }
    }

    public showPanel(skipTween: boolean = false): Promise<void> {
        if (!this.isValidNode()) {
            return Promise.resolve();
        }

        if (skipTween) {
            // 直接显示，不播放动画
            this.node.setPosition(new Vec3(0, 0, 0));
            this.state = PanelState.SHOW;
            return Promise.resolve();
        }

        // 播放从底部向上滑入的动画
        return new Promise<void>((resolve) => {
            const startPos = new Vec3(0, -900, 0);
            const targetPos = new Vec3(0, 0, 0);
            
            this.node.setPosition(startPos);
            tween(this.node)
                .to(0.3, { position: targetPos }, { easing: 'quartOut' })
                .call(() => {
                    this.state = PanelState.SHOW;
                    resolve();
                })
                .start();
        });
    }

    public hidePanel(): Promise<void> {
        if (!this.isValidNode()) {
            return Promise.resolve();
        }

        // 播放向下滑出到屏幕底部的动画
        return new Promise<void>((resolve) => {
            const targetPos = new Vec3(0, -900, 0);
            
            tween(this.node)
                .to(0.3, { position: targetPos }, { easing: 'quartIn' })
                .call(() => {
                    this.state = PanelState.HIDE;
                    this.node.removeFromParent();
                    resolve();
                })
                .start();
        });
    }
}



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
    private _debounceTimer: any = null;

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

    onDisable(): void {
        // 清除防抖定时器，避免内存泄漏
        if(this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }
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
        // 检查被点击的item是否在防抖状态
        let charactorChooseItems = this.charactorChooseContent.getComponentsInChildren(ChatChooseItem);
        let clickedItem = charactorChooseItems.find((item: ChatChooseItem) => item.getSelectionId() === character_id);
        if(clickedItem && clickedItem.isDebouncing()) {
            // 如果item在防抖状态，直接返回，不允许点击
            return;
        }

        // 清除之前的防抖定时器
        if(this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }

        this._selectedCharactorId = character_id;
        let skins = this._chatModel.charactorListProvider.data.get(character_id).skins;
        if(skins){
            this._selectedCharactorSkin = skins[0].id;
        }
        this.onClickBtnChoose(character_id, this._selectedCharactorSkin);
        // 重新获取items（因为上面已经获取过了，但为了代码清晰，这里重新获取）
        charactorChooseItems = this.charactorChooseContent.getComponentsInChildren(ChatChooseItem);
        
        // 设置选中状态，并让未选中的item进入等待状态
        charactorChooseItems.forEach((charactorChooseItem: ChatChooseItem) => {
            if(charactorChooseItem.getSelectionId() === character_id) {
                // 被选中的item：正常选中
                charactorChooseItem.setSelected(true);
            } else {
                // 没有被选中的item：进入等待状态
                charactorChooseItem.setDebouncingState(true);
            }
        });

        // 设置500毫秒防抖定时器，到时后恢复正常状态
        let self = this;
        this._debounceTimer = setTimeout(() => {
            // 重新获取items，避免节点被销毁导致的问题
            let items = self.charactorChooseContent.getComponentsInChildren(ChatChooseItem);
            items.forEach((charactorChooseItem: ChatChooseItem) => {
                if(charactorChooseItem.getSelectionId() !== character_id) {
                    // 没有被选中的item：恢复正常状态
                    charactorChooseItem.isSelected = false;
                    charactorChooseItem.setDebouncingState(false);
                }
            });
            self._debounceTimer = null;
        }, 500);

        this.skinChooseContent.removeAllChildren();
        let charactor = this._chatModel.charactorListProvider.data.get(character_id);
        this._chatModel.updateCharactorChoosenSkinData(charactor);
        charactor.skins.forEach((skin: ChatSkin) => {
            let skinChooseItem = instantiate(self.chooseItemPrefab);
            skinChooseItem.setParent(self.skinChooseContent);
            skinChooseItem.setPosition(0, 0, 0);
            skinChooseItem.getComponent(ChatChooseItem).setData(skin.id, skin.name, skin.id === self._selectedCharactorSkin, "", self.onSkinChooseItemClick.bind(self));
        });

    }



    public onSkinChooseItemClick(skin_id: number):void {
        // 检查被点击的item是否在防抖状态
        let skinChooseItems = this.skinChooseContent.getComponentsInChildren(ChatChooseItem);
        let clickedItem = skinChooseItems.find((item: ChatChooseItem) => item.getSelectionId() === skin_id);
        if(clickedItem && clickedItem.isDebouncing()) {
            // 如果item在防抖状态，直接返回，不允许点击
            return;
        }

        this._selectedCharactorSkin = skin_id;
        this.onClickBtnChoose(this._selectedCharactorId, skin_id);
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



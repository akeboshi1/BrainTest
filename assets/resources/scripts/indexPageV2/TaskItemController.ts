import { _decorator, Component, Label, Node, Sprite, SpriteFrame, resources } from 'cc';

import { DebugLog } from '../Core/Util/DebugLog';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { TaskAndNotificationPanelCtrl } from '../Game/UI/TaskAndNotificationPanel/TaskAndNotificationPanelCtrl';
import { BundleName } from '../Core/Manager/Load/BundleName';
const { ccclass, property } = _decorator;

@ccclass('TaskItemController')
export class TaskItemController extends Component {
    @property(Label)
    private taskTitle: Label = null;
    @property(Label)
    private taskContent: Label = null;
    @property(Sprite)
    private taskBg: Sprite = null;
    @property(Sprite)
    private taskIcon: Sprite = null;
    @property(Label)
    private buttonText: Label = null;
    @property(Node)
    private button: Node = null;
    private taskIndex: number = -1;

    onEnable() {
        // 添加按钮点击事件监听
        if (this.button) {
            this.button.on(Node.EventType.TOUCH_END, this.onButtonClick, this);
        }
    }
    onDisable() {
        // 移除事件监听
        if (this.button) {
            this.button.off(Node.EventType.TOUCH_END, this.onButtonClick, this);
        }
    }

    private onButtonClick() {
        if (this.taskIndex==0) {
            this.onFirstTaskClick();
        } else if (this.taskIndex==1) {
            this.onOtherTaskClick();
        }
    }
    onFirstTaskClick() {
        UIManager.getInstance().registerPanel(TaskAndNotificationPanelCtrl.NAME, BundleName.RESOURCES, "prefab/TaskAndNotification/TaskAndNotificationPanel", TaskAndNotificationPanelCtrl);
        UIManager.getInstance().showPanel(TaskAndNotificationPanelCtrl.NAME);
    }
    onOtherTaskClick() {
        console.log(`Task ${this.taskIndex} clicked`);
    }

    setTaskIndex(index: number) {
        this.taskIndex = index;
    }

    setTaskTitle(title: string) {
        this.taskTitle.string = title;
    }

    setTaskContent(content: string) {
        this.taskContent.string = content;
    }

    async setTaskBg(spritePath) {
        let spriteFrame = await this.loadTaskSprite(spritePath);
        this.taskBg.spriteFrame = spriteFrame;
    }

    async setTaskIcon(spritePath) {
        let spriteFrame = await this.loadTaskSprite(spritePath);
        this.taskIcon.spriteFrame = spriteFrame;
    }
    async loadTaskSprite(path: string): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            resources.load(path, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    DebugLog.instance.error(`Failed to load sprite: ${path}`, err);
                    reject(err);
                    return;
                }

                if (!spriteFrame) {
                    DebugLog.instance.error(`Loaded sprite frame is null: ${path}`);
                    reject(new Error('Loaded sprite frame is null'));
                    return;
                }
                resolve(spriteFrame);
            });
        })
    }

    setIsComplete(isComplete: boolean) {
        this.buttonText.string = isComplete ? "完成" : "去完成";
    }

    update(deltaTime: number) {
        
    }
}



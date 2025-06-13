import { _decorator, Component, Label, Node, Sprite, SpriteFrame, resources } from 'cc';

import { DebugLog } from '../Core/Util/DebugLog';
import { TaskContainerConfig } from './TaskContainerConfig';
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

    public onFirstTaskClick: (taskController: TaskItemController) => void;
    public onOtherTaskClick: (index: number, taskController: TaskItemController) => void;

    // private static _instance: TaskContainerConfig = null;
    
    // public get taskContainerConfig(): TaskContainerConfig {
    //     if (!TaskItemController._instance) {
    //         TaskItemController._instance = new TaskContainerConfig();
    //     }
    //     return TaskItemController._instance;
    // }


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



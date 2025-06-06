import { _decorator, Component, Label, Node, Sprite, SpriteFrame, resources } from 'cc';
import { TaskContainerConfig } from './TaskContainerConfig';
import { DebugLog } from '../Core/Util/DebugLog';
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

    private static _instance: TaskContainerConfig = null;
    
    public get taskContainerConfig(): TaskContainerConfig {
        if (!TaskItemController._instance) {
            TaskItemController._instance = new TaskContainerConfig();
        }
        return TaskItemController._instance;
    }

    async initTaskData(taskId: string) {
        try {
            await this.taskContainerConfig.loadConfig();
            const taskData = this.taskContainerConfig.getTaskData(taskId);
            if (!taskData) {
                DebugLog.instance.warn(`无法初始化任务数据，taskId: ${taskId} 未找到`);
                return;
            }

            // 设置文本内容
            this.taskTitle.string = taskData.title;
            this.taskContent.string = taskData.txt;
            
            // 加载精灵图片
            await Promise.all([
                this.loadSprite(taskData.icon_bg, this.taskBg),
                this.loadSprite(taskData.icon, this.taskIcon)
            ]);
        } catch (err) {
            DebugLog.instance.error(`初始化任务数据失败: ${err}`);
        }
    }

    private loadSprite(path: string, sprite: Sprite): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!path) {
                DebugLog.instance.error('Sprite path is empty or invalid');
                reject(new Error('Invalid sprite path'));
                return;
            }

            if (!sprite) {
                DebugLog.instance.error('Sprite component is null');
                reject(new Error('Invalid sprite component'));
                return;
            }

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

                sprite.spriteFrame = spriteFrame;
                resolve();
            });
        });
    }

    setTaskTitle(title: string) {
        this.taskTitle.string = title;
    }

    setTaskContent(content: string) {
        this.taskContent.string = content;
    }

    setTaskBg(spriteFrame: SpriteFrame) {
        this.taskBg.spriteFrame = spriteFrame;
    }

    setTaskIcon(spriteFrame: SpriteFrame) {
        this.taskIcon.spriteFrame = spriteFrame;
    }

    setIsComplete(isComplete: boolean) {
        this.buttonText.string = isComplete ? "完成" : "去完成";
    }

    update(deltaTime: number) {
        
    }
}



import { _decorator, Node, Label, Button, ProgressBar, UITransform, tween, Sprite, Vec3, AudioClip, resources, SpriteFrame, error, Color } from "cc";
import { EventManager } from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
import { TaskData, TaskStatus, TaskType } from "db://assets/resources/scripts/Game/Task/TaskData";
import { SkewersGameType } from "../../Task/Skewers/SkewersGameData";
import { TaskManager } from "db://assets/resources/scripts/Game/Task/TaskManager";
import { SceneManager } from "../../../Core/Manager/Scene/SceneManager";
import { UIManager } from "../../../Core/Manager/UI/UIManager";
import { BasePanel } from "../../../Core/UI/BasePanel";
import { SkewersManager } from "../../Task/Skewers/SkewersManager";
const { ccclass, property } = _decorator;

@ccclass('GameScoreAlert')
export class GameScoreAlert extends BasePanel {

    public static NAME: string = "GameScoreAlert";

    @property(Label)
    titleLabel: Label = null;

    @property(Label)
    descLabel: Label = null;

    @property(Label)
    totalScoreLabel: Label = null;

    @property(Label)
    timeLabel: Label = null;

    @property({ type: [Node] })
    scoreNodes: Node[] = [];

    @property(Node)
    nextNode: Node = null;

    @property(Node)
    quitNode: Node = null;


    private _scoreDatas;

    restore(data) {
        if (data != null) this._scoreDatas = data;
    }

    start() {

        this.nextNode.active = false;
        let map = TaskManager.getInstance().getTodayUnCompleteTask();
        if (map.size > 0) this.nextNode.active = true;


        let scoreLen = this._scoreDatas.length;
        this.titleLabel.string = TaskManager.getInstance().curTask.name;
        this.descLabel.string = `总关卡数：${scoreLen}个维度，共${SkewersManager.getInstance().getTotalSkewersGamesCount()}关`;
        this.totalScoreLabel.string = SkewersManager.getInstance().curTaskTotalScore + "";
        this.timeLabel.string = "本次任务耗时:" + SkewersManager.getInstance().curTaskDuration + "秒";

        // 初始化所有scoreNode为隐藏状态
        let len = this.scoreNodes.length;
        for (let i: number = 0; i < len; i++) {
            let scoreNode = this.scoreNodes[i];
            if (!scoreNode) continue;
            scoreNode.active = false;
            if (this._scoreDatas[i]) {
                let iconSprite = scoreNode.getChildByName("icon").getComponent(Sprite);
                let nameLabel = scoreNode.getChildByName("name").getComponent(Label);
                let scoreLabel = scoreNode.getChildByName("score").getComponent(Label);


                let name = this._scoreDatas[i]["cog_ability"];
                switch (name) {
                    case SkewersGameType.Calculator:
                        nameLabel.string = "计算力";
                        break;
                    case SkewersGameType.Executionability:
                        nameLabel.string = "执行力";
                        break;
                    case SkewersGameType.Language:
                        nameLabel.string = "语言力";
                        break;
                    case SkewersGameType.Comprehension:
                        nameLabel.string = "理解力";
                        break;
                    case SkewersGameType.Judgment:
                        nameLabel.string = "判断力";
                        break;
                    case SkewersGameType.Memory:
                        nameLabel.string = "记忆力";
                        break;
                    default:
                        nameLabel.string = "未知";
                        break;
                }
                scoreLabel.string = this._scoreDatas[i]["score"];

                // 根据分数设置文本颜色
                const score = parseInt(this._scoreDatas[i]["score"]);
                if (score > 65) {
                    // 分数大于65分，设置为蓝色 #0060F0
                    scoreLabel.color = new Color(0, 96, 240, 255);
                } else {
                    // 分数小于等于65分，设置为红色 #FF5733
                    scoreLabel.color = new Color(255, 87, 51, 255);
                }
            }
        }

        // 延迟显示并播放敲图章动画
        this.scheduleOnce(() => {
            this.playStampAnimation();
        }, 0.5);
    }

    /**
     * 播放敲图章动画效果
     */
    private playStampAnimation() {
        let len = this.scoreNodes.length;

        for (let i: number = 0; i < len; i++) {
            let scoreNode = this.scoreNodes[i];
            if (!scoreNode) continue;
            if (!this._scoreDatas[i]) {
                continue;
            }

            // 延迟每个节点的动画，创造依次出现的效果
            this.scheduleOnce(() => {
                this.playSingleStampAnimation(scoreNode);
            }, i * 0.2);
        }
    }

    /**
     * 播放单个节点的敲图章动画
     * @param scoreNode 要播放动画的节点
     */
    private playSingleStampAnimation(scoreNode: Node) {
        if (!scoreNode) return;

        // 显示节点
        scoreNode.active = true;

        // 设置初始状态：从上方开始，稍微放大
        const originalPosition = scoreNode.position.clone();
        const startPosition = new Vec3(originalPosition.x, originalPosition.y + 100, originalPosition.z);
        const startScale = new Vec3(1.2, 1.2, 1);

        scoreNode.setPosition(startPosition);
        scoreNode.setScale(startScale);

        // 创建敲图章动画序列
        tween(scoreNode)
            .to(0.1, {
                position: new Vec3(originalPosition.x, originalPosition.y - 10, originalPosition.z),
                scale: new Vec3(0.9, 0.9, 1)
            }, { easing: 'quadOut' })
            .to(0.05, {
                position: originalPosition,
                scale: new Vec3(1.05, 1.05, 1)
            }, { easing: 'quadOut' })
            .to(0.1, {
                scale: new Vec3(1, 1, 1)
            }, { easing: 'backOut' })
            .start();
    }


    backToIndexPage() {
        SceneManager.getInstance().backToHall().then(() => {
            UIManager.getInstance().hidePanel(GameScoreAlert.NAME);
        });
    }


    gotoNextTask() {
        EventManager.getInstance().on(TaskManager.TaskListRequestCallBack, this.requestTaskListCallback, this, true);
        TaskManager.getInstance().requestTaskList();
    }

    private requestTaskListCallback() {
        const taskManager = TaskManager.getInstance();
        const taskDatas: TaskData[] = taskManager.taskList || [];

        // 可继续的任务：未完成(0) 或 处理中(1)
        const isRunnable = (t: TaskData) => t && (t.status === TaskStatus.UnComplete || t.status === TaskStatus.Processing);
        const runnableTasks = taskDatas.filter(isRunnable);

        // 若无可继续任务，返回首页
        if (runnableTasks.length === 0) {
            this.backToIndexPage();
            return;
        }

        const curId = taskManager.getCurTaskId;
        let nextTask: TaskData = null;

        if (curId !== -1) {
            // 在所有任务中查找当前任务的位置
            const curIndex = taskDatas.findIndex(t => t && t.id === curId);
            if (curIndex !== -1) {
                // 从当前任务的下一个开始，按队列顺序查找下一个状态为0或1的任务（一个循环）
                for (let i = 1; i <= taskDatas.length; i++) {
                    const t = taskDatas[(curIndex + i) % taskDatas.length];
                    // 类型不是订正/状态未开始/状态进行中 可以作为下一个任务
                    if (t && t.type != TaskType.Revise && (t.status === TaskStatus.UnComplete || t.status === TaskStatus.Processing)) {
                        nextTask = t;
                        break;
                    }
                }
            }
        }

        // 如果没找到或没有当前任务，取第一个状态为0或1的任务
        if (!nextTask) {
            nextTask = runnableTasks[0];
        }

        if (!nextTask || nextTask.status == TaskStatus.Completed || nextTask.status == TaskStatus.Expired) {
            this.backToIndexPage();
            return;
        }

        taskManager.setCurTaskId(nextTask.id);
        taskManager.requestStartTaskContinue(nextTask.id);
    }
}
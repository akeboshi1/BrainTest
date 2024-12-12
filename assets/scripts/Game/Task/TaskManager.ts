import { SkewersManager } from "./Skewers/SkewersManager";
import { RemindManager } from "./Remind/RemindManager";
import { InteractiveManager } from "./Interactive/InteractiveManager";
import { EventManager } from "../../Core/Manager/Event/EventManager";
import { SocketData } from "../../Core/Manager/Net/SocketData";
import { TimeUtil } from "../../Core/Util/TimeUtil";
import { SocketManager } from "../../Core/Manager/Net/SocketManager";
import { TaskData, TaskStatus, TaskType, NotificationData } from "../../Game/Task/TaskData";
import { DebugLog } from "../../Core/Util/DebugLog";
import { SceneManager } from "db://assets/scripts/Core/Manager/Scene/SceneManager";

/**
 * 任务管理器
 */
export class TaskManager {

    private static _instance: TaskManager;

    public static getInstance(): TaskManager {
        if (TaskManager._instance == null) {
            TaskManager._instance = new TaskManager();
        }
        return TaskManager._instance;
    }


    public static TaskListRequestCallBack: string = "TaskListRequestCallBack";
    public static NotificationListRequestCallBack: string = "NotificationListRequestCallBack";

    //===== 串烧任务
    /**
     * 获取任务列表
     * @private
     */
    private task_get_tasks: string = "task.get_tasks";

    /**
     * 开始任务
     * @private
     */
    private task_start_task: string = "task.start_task";

    private task_event: string = "event";


    private _taskDic: Map<number, TaskData>;

    private _taskList: TaskData[];
    // 通知
    private notification_start_notifications: string = "notification.get_notifications";
    private _notificationList: NotificationData[];
    private notification_read: string = "notification.read";


    constructor() {
    }

    get taskDic() {
        return this._taskDic;
    }

    get taskList() {
        return this._taskList;
    }
    get notificationList() {
        return this._notificationList;
    }


    init() {
        // 脑力保健
        SkewersManager.getInstance().init();

        //日常提醒
        RemindManager.getInstance().init();

        //互动
        InteractiveManager.getInstance().init();

    }

    start() {
        this.clearData();
        this.requestTaskList();
    }

    clearData() {
        if (this._taskDic) this._taskDic.clear();
        this._taskDic = new Map();
        this._taskList = [];
        this._notificationList = [];
    }


    /**
     * 请求每日任务列表
     */
    public requestTaskList() {
        EventManager.getInstance().on(this.task_get_tasks, this.requestTaskListCallback, this);
        let requestTaskSocket: SocketData = new SocketData({ action: this.task_get_tasks, data: { task_date: TimeUtil.getNowStr() } });
        SocketManager.getInstance().send(requestTaskSocket);
    }

    private requestTaskListCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(context.task_get_tasks, context);
        let status = data.status;
        if (status == 0) {
            DebugLog.instance.error(data.message);
        } else {
            let results = data.data['result'];

            for (let i = 0; i < results.length; i++) {
                let data = results[i];
                let task = new TaskData();
                task.refrehData(data);
                context._taskDic.set(task.id, task);
                context._taskList.push(task);
            }

            EventManager.getInstance().emit(TaskManager.TaskListRequestCallBack);
        }
    }


    /**
     * 获取当天未完成的任务
     */
    public getTodayUnCompleteTask() {
        let tmpDic: Map<number, TaskData> = new Map();
        this._taskDic.forEach((task: TaskData) => {
            if (task.status <= 1) {
                tmpDic.set(task.id, task);
            }
        })
        return tmpDic;
    }

    /**
     * 请求开启任务
     * @param id
     */
    public requestStartTask(id: number) {
        let task = this._taskDic.get(id);
        if (!task) {
            DebugLog.instance.error(`id：${id} 任务不存在！`);
            return;
        }
        switch (task.status) {
            case TaskStatus.Expired:
                DebugLog.instance.log(`id：${id} 任务已经过期！`);
                return;
            case TaskStatus.Completed:
                DebugLog.instance.log(`id：${id} 任务已经完成！`);
                SceneManager.getInstance().backToHall();
                return;
            case TaskStatus.Processing:
                DebugLog.instance.log(`id：${id} 任务正在进行中！`);
                SkewersManager.getInstance().start();
                return;
            case TaskStatus.UnComplete:
                break;
        }

        EventManager.getInstance().on(this.task_start_task, this.requestStartTaskCallback, this);
        let requestStartTaskSocket: SocketData = new SocketData({ action: this.task_start_task, data: { task_id: id } });
        SocketManager.getInstance().send(requestStartTaskSocket);
    }


    private requestStartTaskCallback(data: SocketData, context: any) {
        let status = data.status;
        if (status == 0) {
            DebugLog.instance.error(data.message);
        } else {
            let id = data.data['task_id'];
            let task = context._taskDic.get(id);
            if (!task) {
                DebugLog.instance.error(`id为：${id}的任务不存在`);
                return;
            }
            let type = task.type;
            switch (type) {
                case TaskType.Remind:
                    break;
                case TaskType.Brains:
                    SkewersManager.getInstance().start();
                    break;
                case TaskType.Interavtive:
                    break;
            }
        }
    }

    /**
     * 获取通知
     */
    public requestStartInform() {
        EventManager.getInstance().on(this.notification_start_notifications, this.requestStartNotificationCallback, this);
        let requestStartTaskSocket: SocketData = new SocketData({
            action: this.notification_start_notifications, data: {
                "is_read": false,
                "notification_type": 2
            }
        });
        SocketManager.getInstance().send(requestStartTaskSocket);
    }
    public requestStartNotificationCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(context.notification_start_notifications, context);
        let status = data.status;
        if (status == 0) {
            DebugLog.instance.error(data.message);
        } else {
            // DebugLog.instance.log(`获取通知成功`);
            let results = data.data['result'];

            for (let i = 0; i < results.length; i++) {
                let data = results[i];
                let notification = new NotificationData();
                notification.refrehData(data);
                context._notificationList.push(notification);
            }
            EventManager.getInstance().emit(TaskManager.NotificationListRequestCallBack, context._notificationList);

        }
    }
    /**
  * 是否已读
  */
    public isReadNotification(notification_ids: number[]) {
        EventManager.getInstance().on(this.notification_read, this.requestReadNotificationCallback, this);
        let requestStartTaskSocket: SocketData = new SocketData({
            action: this.notification_read, data: { notification_ids }
        });
        SocketManager.getInstance().send(requestStartTaskSocket);
    }
    public requestReadNotificationCallback(data: SocketData, context: any) {
        DebugLog.instance.log(`是否已读`,data);
        EventManager.getInstance().off(context.notification_read, context);
    }
}
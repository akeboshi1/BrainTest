import { SkewersManager } from "./Skewers/SkewersManager";
import { RemindManager } from "./Remind/RemindManager";
import { InteractiveManager } from "./Interactive/InteractiveManager";
import { EventManager } from "../../Core/Manager/Event/EventManager";
import { SocketData } from "../../Core/Manager/Net/SocketData";
import { TimeUtil } from "../../Core/Util/TimeUtil";
import { SocketManager } from "../../Core/Manager/Net/SocketManager";
import { NotificationData, TaskData, TaskStatus, TaskType } from "../../Game/Task/TaskData";
import { DebugLog } from "../../Core/Util/DebugLog";
import { SceneManager } from "db://assets/resources/scripts/Core/Manager/Scene/SceneManager";
import { AlertManager, AlertData } from "db://assets/resources/scripts/Core/Manager/Alert/AlertManager";
import { Global } from "db://assets/resources/scripts/Core/Manager/Config/Global";
import { BaseManager } from "../../Core/Manager/BaseManager";

/**
 * 任务管理器
 */
export class TaskManager extends BaseManager {

    private static _instance: TaskManager;

    public static getInstance(): TaskManager {
        if (TaskManager._instance == null) {
            TaskManager._instance = new TaskManager();
        }
        return TaskManager._instance;
    }


    public static TaskListRequestCallBack: string = "TaskListRequestCallBack";
    public static NotificationListRequestCallBack: string = "NotificationListRequestCallBack";
    public static PushEvetCallBack: string = "PushEvetCallBack";
    public static RequestInitTaskCallback: string = "RequestInitTaskCallback";
    // public static infoAlertEvent: string = "infoAlertEvent";

    //===== 串烧任务
    /**
     * 获取任务列表
     *
     */
    public task_get_tasks: string = "task.get_tasks";

    /**
     * 开始任务
     * @private
     */
    private task_start_task: string = "task.start_task";

    private get_initial_eval_task: string = "task.get_initial_eval_task";

    private _taskDic: Map<number, TaskData> = new Map();

    private _taskList: TaskData[] = [];

    private _curTaskId: number = -1;
    // 通知
    private notification_start_notifications: string = "notification.get_notifications";
    private _notificationList: NotificationData[] = [];
    private notification_read: string = "notification.read";
    public static pushEvet: string = "event";

    public get curTask(): TaskData {
        return Global.userData.curTaskData;
    }

    get getCurTaskId(): number {
        return this._curTaskId;
    }
    public setCurTaskId(id: number): void {
        this._curTaskId = id;
    }

    getTaskByID(id: number): TaskData {
        return this._taskDic.get(id);
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

    private _infoDataCache: any[] = [];

    get infoDataCache(): any[] {
        return this._infoDataCache;
    }

    init() {
        // 脑力保健
        SkewersManager.getInstance().init();

        //日常提醒
        RemindManager.getInstance().init();

        //互动
        InteractiveManager.getInstance().init();

    }

    // start 生命周期
    start() {
        // this.requestTaskList();
    }

    clearData() {
        if (this._taskDic) this._taskDic.clear();
        this._taskDic = new Map();
        this._taskList = [];
        this._notificationList = [];
    }

    private _relID: number;
    public requestDingzhenTask(relType?: string, relID?: number) {
        EventManager.getInstance().off(this.task_get_tasks, this);
        EventManager.getInstance().on(this.task_get_tasks, this.requestDingzhenTaskCallBack, this, true);

        // 准备请求数据对象
        const requestData: any = { task_date: TimeUtil.getNowStr() };

        // 只有当relType有值且不为空字符串时才添加
        if (relType !== undefined && relType !== null && relType !== '') {
            requestData.rel_type = relType;
        }

        // 只有当relID有值且为数字类型时才添加
        if (relID !== undefined && relID !== null && !isNaN(Number(relID))) {
            requestData.rel_id = relID;
        }

        this._relID = relID;

        // 创建并发送请求
        let requestTaskSocket: SocketData = new SocketData({
            action: this.task_get_tasks,
            skipDebounce: true,
            data: requestData
        });

        SocketManager.getInstance().send(requestTaskSocket);
    }

    /**
     * 获取订正任务
     * @param data
     * @param context
     */
    private requestDingzhenTaskCallBack(data: SocketData) {
        let status = data.status;
        if (status == 0) {
            DebugLog.instance.error(data.message);
            AlertManager.getInstance().showToastAlert(data.message);
            return;
        } else {
            let results = data.data['result'];

            let relTask = this._taskDic.get(this._relID);

            for (let i = 0; i < results.length; i++) {
                let data = results[i];
                let task = new TaskData();
                task.refrehData(data);
                this.curDingzhenTask = task;

                this._taskDic.set(task.id, task);
                this._taskList.push(task);
            }
            relTask.isCorrection = results.length > 0;

            // type = 0 评测
            // type = 1 串烧
            this._taskList.sort((a, b) => {
                return a.type - b.type;
            })
            EventManager.getInstance().emit(TaskManager.TaskListRequestCallBack);
        }
    }

    // 当前订正任务
    public curDingzhenTask: TaskData;

    public isRevise(id: number): boolean {
        let task = this._taskDic.get(id);
        return task && task.isCorrection;
    }

    public requestInitLevalTask() {
        EventManager.getInstance().on(this.get_initial_eval_task, this.requestInitLevalCallback, this, true);
        let requestTaskSocket: SocketData = new SocketData({
            action: this.get_initial_eval_task,
            skipDebounce: true,
        });

        SocketManager.getInstance().send(requestTaskSocket);
    }

    public requestInitLevalCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.get_initial_eval_task, context);
        if (data.status == 0) {
            AlertManager.getInstance().showToastAlert(data.message);
            DebugLog.instance.error(data.message);
        } else {
            if (!data.data) {
                AlertManager.getInstance().showToastAlert("初始评测任务数据为空");
                return;
            }
            this._curTaskId = data.data.id;
            let task = new TaskData();
            task.refrehData(data.data);
            this._taskDic.set(data.data.id, task);
            DebugLog.instance.log("获取初始评测任务", data.data);
        }
        EventManager.getInstance().emit(TaskManager.RequestInitTaskCallback);
    }

    /**
     * 请求每日任务列表
     */
    public requestTaskList() {
        EventManager.getInstance().off(this.task_get_tasks, this);
        EventManager.getInstance().on(this.task_get_tasks, this.requestTaskListCallback, this, true);

        // 准备请求数据对象
        const requestData: any = { task_date: TimeUtil.getNowStr() };


        // 创建并发送请求
        let requestTaskSocket: SocketData = new SocketData({
            action: this.task_get_tasks,
            skipDebounce: true,
            data: requestData
        });

        SocketManager.getInstance().send(requestTaskSocket);
    }

    private requestTaskListCallback(data: SocketData, context: any) {
        if (!context) {
            DebugLog.instance.error("context为空");
            return;
        }
        context._taskList = [];
        let status = data.status;
        if (status == 0) {
            DebugLog.instance.error(data.message);
            AlertManager.getInstance().showToastAlert(data.message);
            return;
        } else {
            let results = data.data['result'];

            for (let i = 0; i < results.length; i++) {
                let data = results[i];
                let task = new TaskData();
                task.refrehData(data);
                context._taskDic.set(task.id, task);
                context._taskList.push(task);
            }


            // type = 0 评测
            // type = 1 串烧
            context._taskList.sort((a, b) => {
                return a.type - b.type;
            })
            EventManager.getInstance().emit(TaskManager.TaskListRequestCallBack);
        }
    }

    public isCorrection(taskId: number): boolean {
        let task = this._taskDic.get(taskId);
        if (task) {
            return task.type == TaskType.Revise;
        }
        return false;
    }


    public getSkewersGameCount(): number {
        let len = this._taskList.length;
        let count = 0;
        for (let i = 0; i < len; i++) {
            let taskData = this._taskList[i];
            if (taskData != null) {
                if ((taskData.type == TaskType.Brains || taskData.type == TaskType.Review || taskData.type == TaskType.Revise) && (taskData.status != TaskStatus.Completed && taskData.status != TaskStatus.Expired)) {
                    count++;
                }
            }
        }
        return count;
    }


    /**
     * 获取当天未完成的脑力保健任务
     */
    public getTodayUnCompleteTask(): Map<number, TaskData> {
        let tmpDic: Map<number, TaskData> = new Map();
        this._taskDic.forEach((task: TaskData) => {
            if (task.status < 1 && task.type == TaskType.Brains) {
                tmpDic.set(task.id, task);
            }
        })
        return tmpDic;
    }

    public requestStartTaskContinue(id: number) {
        let task = this._taskDic.get(id);
        if (!task) {
            DebugLog.instance.error(`id：${id} 任务不存在！`);
            return;
        }
        let message = "";
        let ad: AlertData;
        Global.userData.curTaskData = task;
        switch (task.status) {
            case TaskStatus.Expired:
                message = `id：${id} 任务已经过期！`;
                DebugLog.instance.log(message);
                ad = new AlertData();
                ad.title = "提示";
                ad.message = message;
                AlertManager.getInstance().showAlert(ad);
                ad.cancelButtonVisible = false;
                ad.confirmCb = this.backToSkewersGameCenter.bind(this);
                break;
            case TaskStatus.Completed:
                message = `id：${id} 任务已经完成！`;
                DebugLog.instance.log(message);
                ad = new AlertData();
                ad.title = "提示";
                ad.message = message;
                AlertManager.getInstance().showAlert(ad);
                ad.cancelButtonVisible = false;
                ad.confirmCb = this.backToSkewersGameCenter.bind(this);
                break;
            case TaskStatus.Processing:
                DebugLog.instance.log(`id：${id} 任务正在进行中！`);
                SkewersManager.getInstance().start(id);
                break;
            case TaskStatus.UnComplete:
                EventManager.getInstance().on(this.task_start_task, this.requestStartTaskContinueCallback.bind(this), this, true);
                let requestStartTaskSocket: SocketData = new SocketData({ action: this.task_start_task, data: { task_id: id } });
                SocketManager.getInstance().send(requestStartTaskSocket);
                break;
        }
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
        let message = "";
        let ad: AlertData;
        Global.userData.curTaskData = task;
        switch (task.status) {
            case TaskStatus.Expired:
                message = `id：${id} 任务已经过期！`;
                DebugLog.instance.log(message);
                ad = new AlertData();
                ad.title = "提示";
                ad.message = message;
                AlertManager.getInstance().showAlert(ad);
                ad.cancelButtonVisible = false;
                ad.confirmCb = this.backToSkewersGameCenter.bind(this);
                break;
            case TaskStatus.Completed:
                message = `id：${id} 任务已经完成！`;
                DebugLog.instance.log(message);
                ad = new AlertData();
                ad.title = "提示";
                ad.message = message;
                AlertManager.getInstance().showAlert(ad);
                ad.cancelButtonVisible = false;
                ad.confirmCb = this.backToSkewersGameCenter.bind(this);
                break;
            case TaskStatus.Processing:
                DebugLog.instance.log(`id：${id} 任务正在进行中！`);
                SkewersManager.getInstance().start(id);
                break;
            case TaskStatus.UnComplete:
                EventManager.getInstance().on(this.task_start_task, this.requestStartTaskCallback.bind(this), this, true);
                let requestStartTaskSocket: SocketData = new SocketData({ action: this.task_start_task, data: { task_id: id } });
                SocketManager.getInstance().send(requestStartTaskSocket);
                break;
        }
    }

    private backToSkewersGameCenter() {
        SceneManager.getInstance().backToHall();
    }

    private requestStartTaskContinueCallback(data: SocketData, context: any) {
        if (!context) {
            DebugLog.instance.error("context为空");
            return;
        }
        let status = data.status;
        if (status == 0) {
            DebugLog.instance.error(data.message);
            AlertManager.getInstance().showToastAlert(data.message);
            return;
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
                case TaskType.Review:
                case TaskType.Brains:
                case TaskType.Revise:
                    task.status = TaskStatus.Processing;
                    EventManager.getInstance().on(SkewersManager.TASK_GET_BRAIN_TRAININGS, this.requestBranisTrainingContinue_listCallBack.bind(this, id), this, true);
                    SkewersManager.getInstance().requestBranisTraining_list(id);
                    break;
                case TaskType.Interavtive:
                    break;
            }
        }
    }

    private requestBranisTrainingContinue_listCallBack(id: number) {
        SkewersManager.getInstance().start(id);
    }

    private requestStartTaskCallback(data: SocketData, context: any) {
        if (!context) {
            DebugLog.instance.error("context为空");
            return;
        }
        let status = data.status;
        if (status == 0) {
            DebugLog.instance.error(data.message);
            AlertManager.getInstance().showToastAlert(data.message);
            return;
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
                case TaskType.Review:
                case TaskType.Brains:
                case TaskType.Revise:
                    task.status = TaskStatus.Processing;
                    SkewersManager.getInstance().start(id);
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
        EventManager.getInstance().on(this.notification_start_notifications, this.requestStartNotificationCallback.bind(this), this);
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
            AlertManager.getInstance().showToastAlert(data.message);
            return;
        } else {
            // DebugLog.instance.log(`获取通知成功`);
            let results = data.data['result'];

            for (let i = 0; i < results.length; i++) {
                let data = results[i];
                let notification = new NotificationData();
                notification.refrehData(data);
                context._notificationList.push(notification);
            }
            EventManager.getInstance().emit(TaskManager.NotificationListRequestCallBack);

        }
    }
    /**
     * 是否已读
     */
    public isReadNotification(notification_ids: number[]) {
        EventManager.getInstance().on(this.notification_read, this.requestReadNotificationCallback.bind(this), this);
        let requestStartTaskSocket: SocketData = new SocketData({
            action: this.notification_read, data: { notification_ids }
        });
        SocketManager.getInstance().send(requestStartTaskSocket);
    }
    public requestReadNotificationCallback(data: SocketData, context: any) {
        DebugLog.instance.log(`是否已读`, data);
        EventManager.getInstance().off(context.notification_read, context);
    }

    /**
     * 服务器推送 任务
     */

    public pushTask() {
        if (EventManager.getInstance().getListenerByContext(TaskManager.pushEvet, this)) {
            return;
        }
        EventManager.getInstance().on(TaskManager.pushEvet, this.pushEventCallback.bind(this), this);
    }
    public pushEventCallback(data: SocketData, context: any) {
        // 
        DebugLog.instance.log(`服务器推送任务`, data);
        if (data.status == 1) {
            this._infoDataCache.push(data.data);
            EventManager.getInstance().emit(TaskManager.PushEvetCallBack, data.data);
        }
    }

    public cleanInfoDataCache() {
        this._infoDataCache = [];
    }

    /**
     * 获取_taskList中第一个状态不等于TaskStatus.Completed或者TaskStatus.Expired的任务
     * @returns 第一个未完成的任务，如果没有则返回null
     */
    public getFirstUnCompleteTask(): TaskData | null {
        for (let i = 0; i < this._taskList.length; i++) {
            const taskData = this._taskList[i];
            if (taskData && taskData.type != TaskType.Revise && taskData.status !== TaskStatus.Completed && taskData.status !== TaskStatus.Expired) {
                return taskData;
            }
        }
        return null;
    }
}
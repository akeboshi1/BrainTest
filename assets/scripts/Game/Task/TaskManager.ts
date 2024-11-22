import {SkewersManager} from "./Skewers/SkewersManager";
import {RemindManager} from "./Remind/RemindManager";
import {InteractiveManager} from "./Interactive/InteractiveManager";
import {EventManager} from "../../Core/Manager/Event/EventManager";
import {SocketData} from "../../Core/Manager/Net/SocketData";
import {TimeUtil} from "../../Core/Util/TimeUtil";
import {SocketManager} from "../../Core/Manager/Net/SocketManager";
import {TaskData} from "../../Game/Task/TaskData";
import {DebugLog} from "../../Core/Util/DebugLog";

/**
 * 任务管理器
 */
export class TaskManager {

    private static _instance: TaskManager;

    public static getInstance(): TaskManager {
        if(TaskManager._instance ==null){
            TaskManager._instance = new TaskManager();
        }
        return TaskManager._instance;
    }


    //===== 串烧任务
    /**
     * 获取任务列表
     * @private
     */
    private task_get_tasks:string = "task.get_tasks";

    /**
     * 开始任务
     * @private
     */
    private task_start_task:string = "task.start_task";




    private _taskDic:Map<number,TaskData>

    constructor() {
    }

    init(){
        // 脑力保健
        SkewersManager.getInstance().init();

        //日常提醒
        RemindManager.getInstance().init();

        //互动
        InteractiveManager.getInstance().init();

        this._taskDic = new Map();
    }

    start(){
        this.requestTaskList();
    }


    /**
     * 请求每日任务列表
     */
    public requestTaskList(){
        EventManager.getInstance().on(this.task_get_tasks,this.requestTaskListCallback,this);
        let requestTaskSocket:SocketData = new SocketData({action:this.task_get_tasks,data:{task_date:TimeUtil.getNowStr()}});
        SocketManager.getInstance().send(requestTaskSocket);
    }

    public requestTaskListCallback(data:SocketData,context:any){
        let status = data.status;
        if(status == 0){
            DebugLog.instance.error(data.message);
        }else{
            let results = data.data['result'];
        }
    }
}
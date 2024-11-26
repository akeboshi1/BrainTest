export enum TaskType {
    Brains=1,
    Remind,
    Interavtive
}

export enum TaskStatus{
    UnComplete,
    Processing,
    Expired,
    Completed=10,

}

export class TaskData {
    public id : number = 0;
    public name : string = "";
    public type : TaskType;
    public startTime:number = 0;
    public endTime:number = 0;
    public status:number = 0; // 0 未完成 1 处理中 10 完成 2 过期
    public completion:number = 0;

    /**
     * 开始玩时间
     */
    public startAt:string = null;
    /**
     * 结束玩时间
     */
    public completedAt:string = null;

    constructor() {
    }

    refrehData(data:any){
         this.id = data["id"];
         this.name = data["task_name"];
         this.type = data["task_type"];
         this.startTime = data["available_start_time"];
         this.endTime = data["available_end_time"];
         this.status = data["status"];
         this.completion = data["completion"];
         this.startAt = data["started_at"];
         this.completedAt = data["completed_at"];
    }
}
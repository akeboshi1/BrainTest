export enum TaskType {
    Review=0,
    Brains = 1,
    Remind,
    Interavtive,
    Revise
}

export enum TaskStatus {
    UnComplete,
    Processing,
    Expired,
    Completed = 10,

}

import {sys} from "cc"
export class TaskData {
    public id: number = 0;
    public isCorrection:boolean = false;
    public name: string = "";
    public type: TaskType;
    public isAvailable: boolean = false;
    public startTime: number = 0;
    public endTime: number = 0;
    public status: number = 0; // 0 未完成 1 处理中 10 完成 2 过期
    public completion: number = 0;
    public rel_type:string = undefined;
    /**
     * 开始玩时间
     */
    public startAt: string = null;
    /**
     * 结束玩时间
     */
    public completedAt: string = null;

    constructor() {
    }

    refrehData(data: any) {
        this.id = data["id"];
        this.name = data["task_name"];
        this.isAvailable=data["is_available"];
        this.startTime = data["available_start_time"];
        this.endTime = data["available_end_time"];
        this.status = data["status"];
        this.completion = data["completion"];
        this.startAt = data["started_at"];
        this.completedAt = data["completed_at"];
        if (data["rel_type"] !== undefined && data["rel_type"] !== null && data["rel_type"] !== '') {
            this.rel_type = data["rel_type"];
        }
        this.type = this.rel_type!= undefined ?TaskType.Revise:data["task_type"];
    }
}
export class NotificationData {
    public id: number = 0;
    public start_at: string;
    public type: number;
    public content: string;
    constructor() {
    }

    refrehData(data: any) {
        this.id = data["id"];
        this.start_at = data["start_at"];
        this.type = data["type"];
        this.content = data["content"];
    }
}
export enum TaskType {
    Brains,
    Remind,
    Interavtive
}

export enum TaskStatus{
    UnComplete,
    Processing,
    Completed,
    Expired
}

export class TaskData {
    public id : number = 0;
    public name : string = "";
    public type : TaskType;
    public startTime:number = 0;
    public endTime:number = 0;
    public status:number = 0;
    public completion:number = 0;

    constructor() {
    }

    refrehData(data:any){
         this.id = data.id;
         this.name = data.name;
         this.type = data.type;
         this.startTime = data.startTime;
         this.endTime = data.endTime;
         this.status = data.status;
         this.completion = data.completion;
    }
}
import {SkewersGameStatus} from "../../../Core/Data/GameState";
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";
import {TaskType} from "db://assets/scripts/Game/Task/TaskData";

export enum GameType{
    // 理解力
    Comprehension="COMPREHENSION",
    // 执行力
    Executionability="EXECUTION",
    // 语言力
    Language="LANGUAGE",
    // 计算力
    Calculator="CALCULATION",
    // 判断力
    Judgment="JUDGMENT",
    // 记忆力
    Memory="MEMORY",
}



/**
 * 游戏串烧数据
 */
export class SkewersGameData {
    // ============== game
    // 游戏名字
    public gameName:string='未知';

    // 游戏id
    public gameID:number;

    // 当前串烧游戏code
    public gameCode:string;

    // 当前串烧游戏类型
    public type:GameType;

    // 串烧游戏训练队列数据
    public trains:SkewersGameTrainData[];

    // 一类串烧游戏状态
    private _status:number;

    // 难度
    private _difficulty:number;

    public get TypeName():string{
        switch(this.type){
            case GameType.Calculator:
                return "计算力";
           case GameType.Executionability:
                return "执行力";
            case GameType.Language:
                return "语言力";
            case GameType.Comprehension:
                return "理解力";
            case GameType.Judgment:
                return "判断力";
            case GameType.Memory:
                return "记忆力"
        }
    }

    public hasGuid():boolean{
        return this.getCurTrainData()?this.getCurTrainData().hasGuide:false;
    }

    public refreshData(data:any){
        this.gameID = data['game_id'];
        this.gameCode = data['game_code'];
        this.type = data['cog_ability'];
        this._difficulty = data['difficulty'];
        switch(this.type){
            case GameType.Memory:
                this.gameName = "翻牌";
                break;
            case GameType.Executionability:
                this.gameName = "拼图";
                break;
            case GameType.Language:
                this.gameName = "组词造句";
                break;
           case GameType.Comprehension:
                this.gameName = "猜谜";
                break;
            case GameType.Calculator:
                this.gameName = "数字捕鱼"
                break;
            case GameType.Judgment:
                this.gameName = "找茬";
                break;
        }
        if(this.trains == null){
            this.trains = [];
        }
        let trains = data['games'];
        let len = trains.length;
        for(let i:number = 0; i < len; ++i){
            let tmpData = trains[i];
            let train = new SkewersGameTrainData();
            train.parentSkewersGameData = this;
            train.length = len;
            train.refreshData(tmpData);
            // 评测第一个训练项目给予引导
            if(i == 0 && Global.userData.curTaskData && Global.userData.curTaskData.type == TaskType.Review){
                train.hasGuide = true;
            }
            this.trains.push(train);
        }
    }

    /**
     * 获取当前类型脑力保健小关数据
     */
    getCurTrainData():SkewersGameTrainData{
        let len = this.trains.length;
        for(let i:number = 0; i < len; ++i){
            let tmpData:SkewersGameTrainData = this.trains[i];
            if(tmpData.status == SkewersGameStatus.unCompleted){
                return tmpData;
            }
        }
        return null;
    }



    getTrainDataByID(id){
        let len = this.trains.length;
        for(let i:number = 0; i < len; ++i){
            let tmpData:SkewersGameTrainData = this.trains[i];
            if(tmpData.brain_training_id == id)return tmpData;
        }
        return null;
    }


    get difficulty():number{
        let curTrainData = this.getCurTrainData();
        if(!curTrainData){
            this._difficulty = -1;
            return this._difficulty;
        }
        this._difficulty = curTrainData.difficulty;
        return this._difficulty;
    }

    set difficulty(value:number){
        this._difficulty = value;
    }

    get timeLimit():number{
        let curTrainData = this.getCurTrainData();
        if(!curTrainData){
            return -1;
        }
        return curTrainData.timeLimit;
    }

    get length():number{
        let curTrainData = this.getCurTrainData();
        if(!curTrainData){
            return -1;
        }
        return curTrainData.length;
    }

    get seq():number{
        let curTrainData = this.getCurTrainData();
        if(!curTrainData){
            return -1;
        }
        return curTrainData.seq;
    }

    get id():number{
        let curTrainData = this.getCurTrainData();
        if(!curTrainData){
            return -1;
        }
        return curTrainData.brain_training_id;
    }

    get progress():number{
        let len = this.trains.length;
        let count = 0;
        for(let i:number = 0; i < len; ++i){
            let tmpData:SkewersGameTrainData = this.trains[i];
            if(tmpData.status == SkewersGameStatus.Completed){
                count++;
            }
        }
        return count / len ;
    }

    get progressStr():string{
        let len = this.trains.length;
        let count = 0;
        for(let i:number = 0; i < len; ++i){
            let tmpData:SkewersGameTrainData = this.trains[i];
            if(tmpData.status == SkewersGameStatus.Completed){
                count++;
            }
        }
        return count +" / "+ len ;
    }


    /**
     * 获取整个队列得数据状态
     */
    get status():number{
        let curTrainData = this.getCurTrainData();
        this._status = curTrainData?curTrainData.status:1;
        return this._status;
    }

    /**
     * 更新某一小关数据
     * @param id
     * @param data
     */
    updateData(id:number,data:any){
        let len = this.trains.length;
        for(let i:number = 0; i < len; ++i){
            let tmpData:SkewersGameTrainData = this.trains[i];
            if(tmpData.brain_training_id == id){
                this.updateParam(tmpData,data.data);
                return;
            }
        }
    }

    private updateParam(trainData:SkewersGameTrainData,data:any){
        // 遍历data对象的属性
        for (let key in data) {
            if (data.hasOwnProperty(key)) {
                trainData[key] = data[key];
            }
        }
    }

}

export class SkewersGameTrainData{
    // ============== trains

    // 串烧任务
    public parentSkewersGameData:SkewersGameData;

    // 任务id
    public brain_training_id:number;

    // 游戏索引
    public seq:number;

    // 游戏状态 未完成0 已完成1
    public status:number=0;

    // 游戏完成度 最低0 最高1
    public complete:number=0;

    // 游戏用时
    public duration:number = 0;

    // 当前串烧游戏难度
    public difficulty:number = 0;

    // 当前串烧游戏游戏时间
    public timeLimit:number = 0;

    //关卡计数器
    public level:number = 0;

    // 游戏得分
    public score:number = 0;

    // 完成得时间格式 “2024-11-22 07:30:00”
    public completedAt:string = null;

    private _hasGuide:boolean = false;

    // 当前类型训练内容的长度
    public length:number = 0;

    public set hasGuide(value:boolean){
        this._hasGuide = value;
    }

    public get hasGuide():boolean{
        return this._hasGuide
    }

    public refreshData(data:any){
        this.brain_training_id = data['id'];
        this.seq = data['seq'];
        this.status = data['status'];
        this.difficulty = data['difficulty'];
        this.duration = data['duration'];
        this.timeLimit = data['time_limit'];
        this.complete = data['completion']||0;
        this.score = data['score']||0;
        this.completedAt = data['completed_at']||null;
        if(data['level'] == ""){
            data['level'] = 1;
        }
        this.level = Number(data['level']);
    }
}
import {GameState, SkewersGameStatus} from "../../../Core/Data/GameState";

export enum GameType{
    // 认知
    cognition,
    // 执行力
    Executionability,
    // 语言
    Language,
    // 计算力
    Calculator,
    // 判断力
    Judgment,
    // 记忆力
    Memory
}



/**
 * 游戏串烧数据
 */
export class SkewersGameData {
    // 任务id
    public id:number;

    // 游戏索引
    public seq:number;

    // 游戏id
    public gameID:number;

    // 当前串烧游戏code
    public gameCode:string;

    // 当前串烧游戏类型
    public type:GameType;

    // 游戏状态 未完成0 已完成1
    public status:number=0;

    // 游戏完成度 最低0 最高1
    public completion:number=0;

    // 游戏用时
    public duration:number = 0;

    // 当前串烧游戏难度
    public difficulty:number = 0;

    // 当前串烧游戏游戏时间
    public timeLimit:number = 0;

    // 游戏得分
    public score:number = 0;

    // 完成得时间格式 “2024-11-22 07:30:00”
    public completedAt:string = null;

    public refreshData(data:any){
        this.id = data['id'];
        this.seq = data['seq'];
        this.gameID = data['game_id'];
        this.gameCode = data['game_code'];
        this.type = data['cog_ability'];
        this.status = data['status'];
        this.difficulty = data['difficulty'];
        this.duration = data['duration'];
        this.timeLimit = data['time_limit'];
        this.completion = data['completion']||0;
        this.score = data['score']||0;
        this.completedAt = data['completed_at']||null;
    }


}
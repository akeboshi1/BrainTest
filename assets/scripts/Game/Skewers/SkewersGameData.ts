import {GameState} from "../../Core/Data/GameState";

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
    // 当前串烧游戏难度
    public hard:number = 0;
    // 当前串烧游戏游戏时间
    public durTime:number = 0;
    // 当前串烧游戏，玩的次数
    public count:number=0;
    // 当前串烧游戏code
    public sceneName:string;
    // 当前串烧游戏类型
    public type:GameType;



    private _gameStates:GameState;

    public refreshData(data:any){
        this.hard = data.hard;
        this.durTime = data.durTime;
        this.type = data.type;
        this.sceneName = data.code;
    }

    public set gameState(state:GameState){
        this._gameStates = state;
    }

}
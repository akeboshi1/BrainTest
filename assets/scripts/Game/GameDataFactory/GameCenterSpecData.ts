import { Node } from "cc";
import { GameCenterData, GameCenterManager } from "../GameCenter/GameCenterManager";
import { BaseGameData, GameType, IBaseGameChild, IQuitGameConfig } from "./BaseGameData";
import { BaseScene } from "db://assets/scene/Core/BaseScene";

// 游戏大厅进入上报参数
interface IGameCenterStartConfig {
    gameID:number;
    callback?:Function;
}

// 游戏大厅退出上报参数
interface IGameCenterEndConfig {
    sessionId:string;
    count:number;
    level:number;
    complete:number;
    duration:number;
    timelimit:number;
    difficulty:number;
    callback?:Function;
}

// 游戏大厅特性
interface IGameCenterSpecific extends IBaseGameChild{
    sessionid: string;

    endGame();
    gameMatch();
    gamePassLevel();
}


export class GameCenterSpecData extends BaseGameData<IGameCenterSpecific> {    
    constructor() {
        super();
        this.gameType = GameType.GAME_CENTER;
    }

    get game():GameCenterData{
        return GameCenterManager.getInstance().currentGame;
    }

    get level():number{
        return GameCenterManager.getInstance().currentGame.level;
    }

    get sessionid():string{
        return GameCenterManager.getInstance().currentGame.sessionid;
    }

    get hasGuide():boolean{
        return (GameCenterManager.getInstance().currentGame && GameCenterManager.getInstance().currentGame.level == 1)
    }

    runNextGame(): void {
        // 大厅游戏切换逻辑...
    }

    startGame(config?:IGameCenterStartConfig): void {
        console.log("Entering game center...");
        GameCenterManager.getInstance().startGame(config.gameID,config.callback);
    }

    quitGame(config:IQuitGameConfig){
        GameCenterManager.getInstance().quitGame(config.parentNode, config.context.resumeCallBack,config.context.exitCallBack,config.context);
    }

    gameMatch(){
        GameCenterManager.getInstance().gameMatch(this.sessionid);
    }

    requestGameComplete(config?:IGameCenterEndConfig){
        GameCenterManager.getInstance().gamePassLevel(this.sessionid,config.count,config.level,
            config.complete,config.duration,config.timelimit,config.difficulty,config.callback);
    }

    exitCallBack(): void {
        GameCenterManager.getInstance().exitCallBack();
    }

    resumeCallBack(): boolean {
        return true;
    }

    
    requestGameCompleteCallBack(data:any){

    }


    nextHandler():void{

    }

    goonHandler(context?: any): void {
      
    }
    
    failCompleteHandler(context?: any): void {
        
    }

    
    // 实现所有抽象方法...
    refreshData(data: any): void {
        // 大厅数据刷新逻辑...
    }

}
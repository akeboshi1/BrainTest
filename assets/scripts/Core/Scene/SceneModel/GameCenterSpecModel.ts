import {BaseGameModel, GameType, IBaseGameChild, IQuitGameConfig, IStartConfig} from "./BaseGameModel";
import { GameCenterData, GameCenterManager } from "../../../Game/GameCenter/GameCenterManager";

// 游戏大厅进入上报参数
interface IGameCenterStartConfig {
    gameID: number;
    callback?: Function;
}

// 游戏大厅退出上报参数
interface IGameCenterEndConfig {
    sessionId: string;
    count: number;
    level: number;
    complete: number;
    duration: number;
    timelimit: number;
    difficulty: number;
    levelMode: number;
    callback?: Function;
}

// 游戏大厅特性
interface IGameCenterSpecific extends IBaseGameChild {
    sessionid: string;

    gameMatch();
    gamePassLevel();
}


export class GameCenterSpecModel extends BaseGameModel<IGameCenterSpecific> {
    constructor() {
        super();
        this.gameType = GameType.GAME_CENTER;
    }

    get game(): GameCenterData {
        return GameCenterManager.getInstance().currentGame;
    }

    get level(): number {
        return GameCenterManager.getInstance().currentGame.level;
    }

    get sessionid(): string {
        return GameCenterManager.getInstance().currentGame.sessionid;
    }

    get levelMode(): number {
        return GameCenterManager.getInstance().currentGame.levelMode;
    }

    get hasGuide(): boolean {
        return (GameCenterManager.getInstance().currentGame && GameCenterManager.getInstance().currentGame.level == 1)
    }

    showStartAlert(config: IStartConfig) {

    }

    runNextGame(): void {
        // 大厅游戏切换逻辑...
    }

    quitGame(config: IQuitGameConfig) {
        GameCenterManager.getInstance().quitGame(config.parentNode, config.context.resumeCallBack, config.context.exitCallBack, config.context);
    }

    gameMatch() {
        GameCenterManager.getInstance().gameMatch(this.sessionid);
    }

    requestGameComplete(config?: IGameCenterEndConfig) {
        GameCenterManager.getInstance().gamePassLevel(this.sessionid, config.count, config.level,
            config.complete, config.duration, config.timelimit, config.difficulty, config.levelMode, config.callback);
    }

    exitCallBack(): void {
        GameCenterManager.getInstance().exitCallBack();
    }

    resumeCallBack(): boolean {
        return true;
    }


    requestGameCompleteCallBack(data: any) {

    }


    nextHandler(): void {

    }

    goonHandler(context?: any): void {

    }

    failCompleteHandler(context?: any): void {

    }

    showNextSuccessHandler(context?: any) {

    }

    showNextFailHandler(context?: any) {

    }

    totalCompleteHandler(context?: any) {

    }

    remoteExitCallBack() {

    }


    // 实现所有抽象方法...
    refreshData(data: IGameCenterSpecific): void {
        // 大厅数据刷新逻辑...
    }

    destory(): void {

    }

}
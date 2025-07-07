import {BaseGameModel, GameType, IBaseGameChild, IQuitGameConfig, IStartConfig} from "./BaseGameModel";
import { GameCenterData, GameCenterManager } from "../../../Game/GameCenter/GameCenterManager";
import {EventManager} from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";

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

// 游戏难度选择参数
interface IGameDifficultyConfig {
    difficulty: number;  // 难度等级 1-简单 2-中等 3-困难
    callback?: Function; // 选择难度后的回调
}

// 游戏大厅特性
interface IGameCenterSpecific extends IBaseGameChild {
    sessionid: string;

    gameMatch();
    gamePassLevel();
}


export class GameCenterSpecModel extends BaseGameModel<IGameCenterSpecific> {
    // 默认难度等级
    private currentDifficulty: number = 1;

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

    get levelLen():number{
        return GameCenterManager.getInstance().currentGame.levels.length;
    }

    get difficulty(): number {
        return GameCenterManager.getInstance().currentGame.difficulty;
    }

    get sessionid(): string {
        return GameCenterManager.getInstance().currentGame.sessionid;
    }

    get levelMode(): number {
        return GameCenterManager.getInstance().currentGame.levelMode;
    }

    get hasGuide(): boolean {
        return false;//(GameCenterManager.getInstance().currentGame && GameCenterManager.getInstance().currentGame.level == 1)
    }

    showStartAlert(config: IStartConfig) {

    }

    dzanswerHandler(){

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

    get settleMentHasShow():boolean{
        return GameCenterManager.getInstance().settleMentPanelShow;
    }

    showSuccessView(){
        GameCenterManager.getInstance().showSuccessView();
    }

    showFailView(){
        GameCenterManager.getInstance().showFailView();
    }

    /**
     * 选择游戏难度
     * @param config 难度配置参数
     */
    selectDifficulty(config: IGameDifficultyConfig) {
        if (config.difficulty < 1 || config.difficulty > 3) {
            DebugLog.instance.warn("Invalid difficulty level. Must be between 1 and 3.");
            return;
        }

        this.currentDifficulty = config.difficulty;
        
        // 通知游戏中心管理器难度变更
        GameCenterManager.getInstance().setDifficulty(this.currentDifficulty);

        // 如果有回调函数，执行回调
        if (config.callback) {
            config.callback();
        }

        // 发送难度变更事件
        EventManager.getInstance().emit("GAME_DIFFICULTY_CHANGED", this.currentDifficulty);
    }

    /**
     * 获取当前难度等级
     */
    getCurrentDifficulty(): number {
        return this.currentDifficulty;
    }

    /**
     * 重写 requestGameComplete 方法，使用当前选择的难度
     */
    requestGameComplete(config?: IGameCenterEndConfig) {
        EventManager.getInstance().on(GameCenterManager.GAMEPASSLEVEL, this.requestGameCompleteCallBack, this, true);
        
        // 使用当前选择的难度，如果没有设置则使用配置中的难度
        const difficulty = config.difficulty;
        
        GameCenterManager.getInstance().gamePassLevel(
            this.sessionid, 
            config.count, 
            config.level + 1,
            config.complete, 
            config.duration, 
            config.timelimit, 
            difficulty, 
            config.levelMode, 
            config.callback
        );
    }

    /**
     * 重置难度到默认值
     */
    resetDifficulty() {
        this.currentDifficulty = 1;
        GameCenterManager.getInstance().setDifficulty(this.currentDifficulty);
        EventManager.getInstance().emit("GAME_DIFFICULTY_CHANGED", this.currentDifficulty);
    }

    exitCallBack(): void {
        GameCenterManager.getInstance().exitCallBack();
    }

    resumeCallBack(): boolean {
        return true;
    }


    requestGameCompleteCallBack(data: any) {

    }

    reviseHandler(context?:any){

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

    retryHandler(context?: any){
    }

    answerHandler(context?: any): void {
    }

    remoteExitCallBack() {

    }


    // 实现所有抽象方法...
    refreshData(data: IGameCenterSpecific): void {
        // 大厅数据刷新逻辑...
    }

    destory() {
        this.resetDifficulty(); // 销毁时重置难度
        EventManager.getInstance().disableContext(this);
    }

}
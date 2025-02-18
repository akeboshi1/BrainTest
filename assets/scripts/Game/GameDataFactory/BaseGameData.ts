import { Node, Scene } from "cc";
import { SkewersGameTrainData } from "../Task/Skewers/SkewersGameData";
import { BaseScene } from "db://assets/scene/Core/BaseScene";

// 基础游戏数据类型
interface IBaseGameData<T extends IBaseGameChild> {
    hasGuide:boolean;
    refreshData(data: T): void;
    runNextGame(): void;
    quitGame(): void;
    requestGameComplete():void;
    requestGameCompleteCallBack():void;

    nextHandler();
    goonHandler();
    failCompleteHandler();

    exitCallBack():void;
    resumeCallBack():boolean;
}
export interface INextConfig {
    nextGame?: Function;
}

export interface IQuitGameConfig{
    parentNode:Node;
    context:any;
}

export enum GameType{
    GAME_CENTER = "GAME_CENTER",
    SKEWERS = "SKEWERS"
}


export abstract class BaseGameData<T extends IBaseGameChild> implements IBaseGameData<T> {
    private _scene: BaseScene<T>;
    public get scene(): BaseScene<T> {
        return this._scene;
    }
    public set scene(value: BaseScene<T>) {
        this._scene = value;
    }
    private _hasGuide: boolean = false;
    public get hasGuide(): boolean {
        return this._hasGuide;
    }
    public set hasGuide(value: boolean) {
        this._hasGuide = value;
    }
    public gameType?: string = "BASE";

    // 必须实现得方法
    abstract refreshData(data: T): void;

    abstract runNextGame(): void;
    abstract quitGame(config?: IQuitGameConfig): void;

    abstract gameMatch():void;

    abstract requestGameComplete(config?:any): void;
    abstract requestGameCompleteCallBack(data?:any):void;

    abstract nextHandler(context?:any):void;
    abstract goonHandler(context?:any):void;
    abstract failCompleteHandler(context?:any):void;

    abstract exitCallBack():void;
    abstract resumeCallBack(): boolean;
}


// 基础子任务类型
export interface IBaseGameChild {
    gameId: number;
    gameName: string;
    level: number;
    difficulty: number;
    time: number;

}




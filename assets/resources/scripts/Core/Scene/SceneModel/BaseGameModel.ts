import { Node } from "cc";
import { BaseScene } from "db://assets/resources/scripts/Core/Scene/BaseScene";

export interface IStartConfig{
    parentNode:Node,
    start:Function,
    context:any
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


export abstract class BaseGameModel<T extends IBaseGameChild> {
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
    abstract reviseHandler(context?:any):void;
    abstract retryHandler(context?:any):void;
    abstract answerHandler(context?:any):void;
    abstract failCompleteHandler(context?:any):void;
    abstract showStartAlert(config?:any):void;
    abstract showNextSuccessHandler(context?:any);
    abstract showNextFailHandler(context?:any)

    abstract exitCallBack():void;
    abstract resumeCallBack(): boolean;

    abstract totalCompleteHandler(context?:any):void;

    abstract remoteExitCallBack(cotext?:any):void;

    abstract destory():void;
}


// 基础子任务类型
export interface IBaseGameChild {
    gameId: number;
    gameName: string;
    level: number;
    difficulty: number;
    time: number;

}




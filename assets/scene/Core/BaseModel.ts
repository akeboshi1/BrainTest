import {BaseScene} from "./BaseScene";

/**
 * 项目数据类基类
 */
export class BaseModel {
    constructor(private _view:BaseScene<any>) {

    }

    startGame(): void {

    }

    endGame(): void {

    }

    requestGameComplete(){

    }
}
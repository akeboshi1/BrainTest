import {UserData} from "../../../Core/Data/UserData";

/**
 * 全局变量
 */
export class Global {
    static API_Root = "";
    static RES_Root = "";
    static remote_bundle:boolean = false;
    static remote_url:string = "";


    static userData:UserData;

    /**
     * 是否是串烧游戏状态
     * true  串烧游戏状态
     * false 游戏大厅游戏状态
     */
    static isSkewersGame:boolean = false;

    /**
     * 当前游戏是否处于重玩
     */
    static isAgain:boolean = false;
}
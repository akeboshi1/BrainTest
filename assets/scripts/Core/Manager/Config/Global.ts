import {UserData} from "../../../Core/Data/UserData";

/**
 * 全局变量
 */
export class Global {
    static API_Root = "";
    static RES_Root = "";

    static userData:UserData;

    /**
     * 是否是串烧游戏状态
     * true  串烧游戏状态
     * false 游戏大厅游戏状态
     */
    static isSkewersGame:boolean = false;
}
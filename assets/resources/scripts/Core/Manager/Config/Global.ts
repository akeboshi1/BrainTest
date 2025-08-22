import {UserData} from "../../../Core/Data/UserData";

/**
 * 全局变量
 */
export class Global {
    static API_Root = "";
    static RES_Root = "";

    static userData:UserData;

    /**
     * 上一个界面name，用于回退
     */
    static prePanel:string = '';

    /**
     * 是否是串烧训练状态
     * true  串烧训练状态
     * false 训练大厅训练状态
     */
    static isSkewersGame:boolean = false;

    /**
     * 当前训练是否处于重玩
     */
    static isAgain:boolean = false;
}
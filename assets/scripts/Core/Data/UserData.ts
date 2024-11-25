import {SkewersGameData} from "db://assets/scripts/Game/Task/Skewers/SkewersGameData";

export class UserData {
    public id: string;
    public name: string;
    public token: string;
    public tokenExpires:number=0;


    /**
     * 当前游戏串烧数据组
     */
    public skewerGameDatas:SkewersGameData[] = [];


    /**
     * 当前游戏串烧数据
     */
    public curSkewerGameData:SkewersGameData;

}
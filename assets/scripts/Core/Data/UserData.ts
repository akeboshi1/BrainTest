import {SkewersGameData} from "../../Game/Skewers/SkewersGameData";

export class UserData {
    public id: string;
    public name: string;
    public token: string;


    /**
     * 当前游戏串烧数据组
     */
    public skewerGameDatas:SkewersGameData[] = [];


    /**
     * 当前游戏串烧数据
     */
    public curSkewerGameData:SkewersGameData;

}
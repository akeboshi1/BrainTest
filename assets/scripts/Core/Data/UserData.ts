import {SkewersGameData} from "db://assets/scripts/Game/Task/Skewers/SkewersGameData";
import {TaskData} from "db://assets/scripts/Game/Task/TaskData";

export class UserData {
    public id: string;
    public name: string;
    public token: string;
    public tokenExpires:number=0;
    public phoneNumber:string="";

    /**
     * 邀请码
     */
    public inviteCode:string="";


    /**
     * 当前游戏串烧数据组
     */
    public skewerGameDatas:SkewersGameData[] = [];


    /**
     * 当前游戏串烧数据
     */
    public curSkewerGameData:SkewersGameData;

    /**
     * 当前任务数据
     */
    public curTaskData:TaskData;
}
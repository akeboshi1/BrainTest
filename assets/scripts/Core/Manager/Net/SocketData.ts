import {TimeUtil} from "../../../Core/Util/TimeUtil";
import {Global} from "../../../Core/Manager/Config/Global";

/**
 * socket数据data
 */
export class SocketData {

    public uid:string;

    public action:string;

    public token:string;

    public status:number = 0; // 0失败 1成功

    public message:string;

    public data:any;

    constructor(data:any) {
        //==== 独立数据
        this.action = data.action;
        this.data = data.data;

        //==== 通用数据默认处理
        this.uid = data.uid||TimeUtil.getNow();
        this.token = Global.userData.token;
    }

    refureshUid(uid:string){
        this.uid = uid;
    }


}
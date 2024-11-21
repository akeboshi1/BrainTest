import {TimeUtil} from "../../../Core/Util/TimeUtil";

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
        // 在构造函数中处理传入的 data 对象
        this.action = data.action;
        this.data = data.data;
        this.uid = data.uid||TimeUtil.getNow();
        this.token = data.token;
    }

    refureshUid(uid:string){
        this.uid = uid;
    }


}
import {TimeUtil} from "../../../Core/Util/TimeUtil";

/**
 * socket数据data
 */
export class SocketData {

    public uid:string;

    public action:string;

    public sendData:any;

    public receiveData:any;

    public status:number = 0; // 0失败 1成功

    public message:string;

    constructor(data:any) {
        // 在构造函数中处理传入的 data 对象
        this.action = data.action;
        this.sendData = data.data;
        this.uid = data.uid||TimeUtil.getNow();
    }

    refureshUid(uid:string){
        this.uid = uid;
    }

    refureshData(data:any){
        this.status = data.status;
        this.receiveData = data.data;
    }


}
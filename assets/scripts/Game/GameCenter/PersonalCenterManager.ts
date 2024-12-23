import { _decorator, Component, Node } from 'cc';
import { SocketData } from '../../Core/Manager/Net/SocketData';
import { EventManager } from '../../Core/Manager/Event/EventManager';
import { DebugLog } from '../../Core/Util/DebugLog';
import { SocketManager } from '../../Core/Manager/Net/SocketManager';
import { UserInfoData } from '../PersonalCenterManager/UserInfoData';

export class PersonalCenterManager {
    private static _instance: PersonalCenterManager;

    public static getInstance(): PersonalCenterManager {
        if (PersonalCenterManager._instance == null) {
            PersonalCenterManager._instance = new PersonalCenterManager();
        }
        return PersonalCenterManager._instance;
    }
    public static getUserInfoCallBack: string = "TaskListRequestCallBack";

    // 获取个人中心数据
    private user_get_info: string = "user.get_user_info";

     private _userInfoData: UserInfoData;

    constructor() {
    }

    init() {
        //初始化个人中心
    }

    public requestUserInfo() {
        //请求个人中心数据
        EventManager.getInstance().on(this.user_get_info, this.requestUserInfoCallback, this);
        let requestStartUserInfoSocket: SocketData = new SocketData({
            action: this.user_get_info
        });
        SocketManager.getInstance().send(requestStartUserInfoSocket);
    }
    public requestUserInfoCallback(data: SocketData, context: any) {
        if(data.status == 0) {
            DebugLog.instance.error(data.message);
        }else {
          
            // this._userInfoData = data.data;
            // let userInfoData: UserInfoData = new UserInfoData(data.data);
            EventManager.getInstance().emit(PersonalCenterManager.getUserInfoCallBack, data);
        }
    }

}


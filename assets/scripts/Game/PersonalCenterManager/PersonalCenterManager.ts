import { _decorator, Component, Node } from 'cc';
import { SocketData } from '../../Core/Manager/Net/SocketData';
import { EventManager } from '../../Core/Manager/Event/EventManager';
import { DebugLog } from '../../Core/Util/DebugLog';
import { SocketManager } from '../../Core/Manager/Net/SocketManager';
import { UserInfoData } from './UserInfoData';

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

    //更新用户信息
    private user_update_info: string = "user.update_user_info";

    //  private _curGame:GameCenterData;
    private _userInfoData: UserInfoData;
    constructor() {
    }

     public get userInfoData():UserInfoData {
            return this._userInfoData;
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
        DebugLog.instance.log("请求个人中心数据", data);
        if(data.status == 0) {
            DebugLog.instance.error(data.message);
        }else {
            this._userInfoData = new UserInfoData(data.data);
            EventManager.getInstance().emit(PersonalCenterManager.getUserInfoCallBack, data.data);
        }
    }

    public updateUserInfo(full_name: string, gender: number, birthday: string, education: number) {
        EventManager.getInstance().on(this.user_update_info, this.requestUpdateInfoCallback, this);
        let requestUpdateUserInfoSocket: SocketData = new SocketData({
            "action": this.user_update_info,
            "data":{
                full_name:full_name,
                gender:gender,
                birthday:birthday,
                education:education,
            }
        });
        SocketManager.getInstance().send(requestUpdateUserInfoSocket);
    }
    public requestUpdateInfoCallback(data: SocketData, context: any){
        DebugLog.instance.log("更新个人中心数据", data);
    }
}


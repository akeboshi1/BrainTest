import { _decorator, Component, Node } from 'cc';
import { SocketData } from '../../Core/Manager/Net/SocketData';
import { EventManager } from '../../Core/Manager/Event/EventManager';
import { DebugLog } from '../../Core/Util/DebugLog';
import { SocketManager } from '../../Core/Manager/Net/SocketManager';
import { UserInfoData } from './UserInfoData';
export enum ReportAblity {
    LANGUAGE = "语言力",
    JUDGMENT = "判断力",
    MEMORY = "记忆力",
    EXECUTION = "执行力",
    CALCULATION = "计算力",
    COMPREHENSION = "理解力"
}


export class PersonalCenterManager {
    private static _instance: PersonalCenterManager;

    public static getInstance(): PersonalCenterManager {
        if (PersonalCenterManager._instance == null) {
            PersonalCenterManager._instance = new PersonalCenterManager();
        }
        return PersonalCenterManager._instance;
    }
    public static getUserInfoCallBack: string = "getUserInfoCallBack";

    public static personalReportCallback: string = "personalReportCallback";

    // 获取个人中心数据
    private user_get_info: string = "user.get_user_info";

    //更新用户信息
    private user_update_info: string = "user.update_user_info";

    //获取用户报告
    private user_get_report: string = "user.get_user_reports";

    private _userInfoData: UserInfoData;

    //报告数据
    private _reportDataList= [];

    constructor() {
    }

    public get userInfoData(): UserInfoData {
        return this._userInfoData;
    }

    public get reportDataList():any[] {
        return this._reportDataList;
    }

    init() {
        //初始化个人中心
    }
    //请求个人中心数据
    public requestUserInfo() {
        EventManager.getInstance().on(this.user_get_info, this.requestUserInfoCallback, this, true);
        let requestStartUserInfoSocket: SocketData = new SocketData({
            action: this.user_get_info
        });
        SocketManager.getInstance().send(requestStartUserInfoSocket);
    }


    public requestUserInfoCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.user_get_info,context);
        DebugLog.instance.log("请求个人中心数据", data);
        if (data.status == 0) {
            DebugLog.instance.error(data.message);
            EventManager.getInstance().emit(PersonalCenterManager.getUserInfoCallBack, {data});
        } else {
            this._userInfoData = new UserInfoData(data.data);
            EventManager.getInstance().emit(PersonalCenterManager.getUserInfoCallBack);
        }
    }
    //更新个人中心数据
    public updateUserInfo(nick_name: string, full_name: string, gender: number, birthday: string, education: number) {
        EventManager.getInstance().on(this.user_update_info, this.requestUpdateInfoCallback, this, true);
        let requestUpdateUserInfoSocket: SocketData = new SocketData({
            "action": this.user_update_info,
            "data": {
                nickname: nick_name,
                full_name: full_name,
                gender: gender,
                birthday: birthday,
                education: education,
            }
        });
        SocketManager.getInstance().send(requestUpdateUserInfoSocket);
    }

    public requestUpdateInfoCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.user_update_info, context);
        if (data.status == 0) {
            DebugLog.instance.error(data.message);
        } else {
            this._userInfoData.gender = data.data.gender;
            this._userInfoData.full_name = data.data.full_name;
            this._userInfoData.birthday = data.data.birthday;
            this._userInfoData.education = data.data.education;
            // DebugLog.instance.log("更新个人中心数据", this._userInfoData);
            EventManager.getInstance().emit(PersonalCenterManager.getUserInfoCallBack );
        }
    }
    //获取个人报告
    public getPersonalReport() {
        EventManager.getInstance().on(this.user_get_report, this.requestPersonalReportCallback, this, true);
        let requestPersonalReportSocket: SocketData = new SocketData({
            action: this.user_get_report
        });
        SocketManager.getInstance().send(requestPersonalReportSocket);
    }

    public requestPersonalReportCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.user_get_report,context);
        if (data.status == 0) {
            DebugLog.instance.error(data.message);
        } else {
            let result = data.data['result'];
            if (result.length == 0) {
                // DebugLog.instance.log('暂无个人报告');
                EventManager.getInstance().emit(PersonalCenterManager.personalReportCallback, {});
                return;
            }
        // DebugLog.instance.log("个人报告数据", result);
          this._reportDataList=  this.proccess(result);
          EventManager.getInstance().emit(PersonalCenterManager.personalReportCallback, {});
        }
    }

    proccess(data: any[]) { 
        const ablityList = Object.keys(ReportAblity);
    
        const rs = []
    
        ablityList.forEach(ab => {
            const element = {
                abilityEnum: ReportAblity[ab],
                lastlastWeek: 0,
                lastWeek: 0,
                currentWeek: 0,
                latestScore:0,
                age_group_percentile: 0,
            }
            data.forEach(e => {
                const abilityScore = e.scores.find(s => s.cog_ability == ab);
                if (abilityScore) {
                    const dateKey = this.judgeTimePeriod(e.report_date);
                    element[dateKey] = abilityScore.score;
        
                    if (e.is_latest) {
                        element.latestScore = abilityScore.score;
                        element.age_group_percentile = abilityScore.age_group_percentile;
                    }
                }
            })
    
            rs.push(element)
        })
     
        return rs
    }
    judgeTimePeriod(ts) {
        const targetDate = new Date(ts);
        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
    
        const twoWeeksAgo = new Date(startOfWeek.getTime() - 14 * 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
    
        if (targetDate >= twoWeeksAgo && targetDate < oneWeekAgo) {
            return "lastlastWeek";
        } else if (targetDate >= oneWeekAgo && targetDate < startOfWeek) {
            return "lastWeek";
        } else if (targetDate >= startOfWeek && targetDate < new Date(startOfWeek.getTime() + 7 * 24 * 60 * 60 * 1000)) {
            return "currentWeek";
        }
        return "";
    }
}



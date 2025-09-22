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

    private _userInfoData: UserInfoData | undefined;

    //报告数据
    private _reportDataList= [];

    // 数据缓存和请求状态管理
    private _isRequestingUserInfo: boolean = false;
    private _userInfoRequestPromise: Promise<void> | null = null;
    private _userInfoRequestResolve: Function | null = null;

    constructor() {
    }

    public get userInfoData(): UserInfoData | undefined {
        return this._userInfoData;
    }

    public get reportDataList():any[] {
        return this._reportDataList;
    }

    init() {
        //初始化个人中心
    }
    //请求个人中心数据
    public requestUserInfo(): Promise<void> {
        // 如果数据已存在，直接返回Promise
        if (this._userInfoData) {
            DebugLog.instance.log("用户信息已缓存，直接返回");
            return Promise.resolve();
        }

        // 如果正在请求中，返回现有的Promise
        if (this._isRequestingUserInfo && this._userInfoRequestPromise) {
            DebugLog.instance.log("用户信息正在请求中，返回现有Promise");
            return this._userInfoRequestPromise;
        }

        // 创建新的请求Promise
        this._isRequestingUserInfo = true;
        this._userInfoRequestPromise = new Promise<void>((resolve) => {
            this._userInfoRequestResolve = resolve;
        });

        EventManager.getInstance().on(this.user_get_info, this.requestUserInfoCallback, this, true);
        let requestStartUserInfoSocket: SocketData = new SocketData({
            action: this.user_get_info,
            skipDebounce:true
        });
        SocketManager.getInstance().send(requestStartUserInfoSocket);

        return this._userInfoRequestPromise;
    }


    public requestUserInfoCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.user_get_info,context);
        DebugLog.instance.log("请求个人中心数据", data);
        
        // 重置请求状态
        this._isRequestingUserInfo = false;
        
        if (data.status == 0) {
            DebugLog.instance.error("请求用户信息失败:", data.message);
            EventManager.getInstance().emit(PersonalCenterManager.getUserInfoCallBack, {error: data.message});
        } else {
            if (this._userInfoData) {
                // 如果已存在用户数据，更新现有数据
                this._userInfoData.updateData(data.data);
            } else {
                // 如果不存在用户数据，创建新实例
                this._userInfoData = new UserInfoData(data.data);
                EventManager.getInstance().emit(PersonalCenterManager.getUserInfoCallBack);
            }
        }

        // 解析Promise
        if (this._userInfoRequestResolve) {
            this._userInfoRequestResolve();
            this._userInfoRequestResolve = null;
        }
        this._userInfoRequestPromise = null;
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
            if (this._userInfoData) {
                // 使用updateData方法更新数据，会自动触发数据变化事件
                this._userInfoData.updateData(data.data);
            } else {
                // 如果用户数据不存在，创建新实例
                this._userInfoData = new UserInfoData(data.data);
                EventManager.getInstance().emit(PersonalCenterManager.getUserInfoCallBack);
            }
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
    /**
     * 清除用户信息缓存，强制重新请求
     */
    public clearUserInfoCache() {
        this._userInfoData = null;
        this._isRequestingUserInfo = false;
        this._userInfoRequestPromise = null;
        this._userInfoRequestResolve = null;
        DebugLog.instance.log("用户信息缓存已清除");
    }

    /**
     * 强制刷新用户信息（清除缓存后重新请求）
     */
    public refreshUserInfo(): Promise<void> {
        this.clearUserInfoCache();
        return this.requestUserInfo();
    }

    /**
     * 当UserInfoData发生变化时调用
     * @param updatedUserInfoData 更新后的用户信息数据
     */
    public onUserInfoDataChanged(updatedUserInfoData: UserInfoData): void {
        // 更新缓存的用户信息数据
        this._userInfoData = updatedUserInfoData;
        
        // 触发用户信息变化事件，通知所有监听者
        EventManager.getInstance().emit(PersonalCenterManager.getUserInfoCallBack);
        
        DebugLog.instance.log("用户信息数据已更新并刷新缓存");
    }

    clean(){
        if(this._userInfoData){
            this._userInfoData = null;
        }
        if(this._reportDataList){
            this._reportDataList = null;
        }
        // 清除请求状态
        this._isRequestingUserInfo = false;
        this._userInfoRequestPromise = null;
        this._userInfoRequestResolve = null;
    }
}




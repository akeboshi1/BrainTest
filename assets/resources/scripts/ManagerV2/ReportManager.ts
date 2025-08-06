import { EventManager } from "../Core/Manager/Event/EventManager";
import { SocketData } from "../Core/Manager/Net/SocketData";
import { SocketManager } from "../Core/Manager/Net/SocketManager";
import { DebugLog } from "../Core/Util/DebugLog";

export interface ReportData {
    cog_ability: string,
    cog_ability_desc: string,
    last_tier: number,
    tier: number
}
export interface UserSumReport {
    report: {
        analysis: [],
        detail: ReportData[],
    },
    report_period: string,
    report_date: string,
}
export interface CogAbilityBriefData {
    cog_ability: string,
    definition_desc: string,// 定义说明
    score_desc: string,  // 得分说明
    norm_ranking: number,  // 常模排名
    tier: number,  // 本周等级
    last_tier: number,  // 上周等级 0 不显示
}
export interface WeekStatisticsData {
    start_date: string,
    end_date: string,
}

export interface CogAbilityWeeklyScoresData {
    index: number,  // 索引
    total: number, // 总共数据（有多少周）， 如果index == total-1 表示最早一周的数据
    first_day: string, // 开始第一天
    last_day: string, // 最后一天
    result: [
        {
            date: string,
            score: number,
        }
    ]
}

export class ReportManager {

    public static getBrainTrainingTiersCallback: string = "getBrainTrainingTiersCallback";
    public static getUserSumReportCallback: string = "getUserSumReportCallback";
    public static getCogAbilityWeeklyScoresCallback: string = "getCogAbilityWeeklyScoresCallback";

    private static _instance: ReportManager;
    private get_brain_training_tiers: string = "user.get_brain_training_tiers";
    private get_user_report: string = "user.get_user_report";
    private get_cog_ability_brief: string = "user.get_cog_ability_brief";
    private get_cog_ability_weekly_scores: string = "user.get_cog_ability_weekly_scores";
    private _reportDataList = [];
    private _reportDataListInitial = [];
    private _userSumReport:UserSumReport;
    private _weekStatistics : WeekStatisticsData = {
        start_date:'',
        end_date:''
    };
    private _cogAbilityBriefData: CogAbilityBriefData = null;
    private _cogAbilityWeeklyScoresData: CogAbilityWeeklyScoresData = null;
    private cog_ability: string = "";
    public static getInstance(): ReportManager {
        if (ReportManager._instance == null) {
            ReportManager._instance = new ReportManager();
        }
        return ReportManager._instance;
    }
    public get cogAbilityBriefData(): CogAbilityBriefData {
        return this._cogAbilityBriefData;
    }
    public get cogAbilityWeeklyScoresData(): CogAbilityWeeklyScoresData {
        return this._cogAbilityWeeklyScoresData;
    }
    public get reportDataList(): ReportData[] {
        return this._reportDataList;
    }
    public get weekStatistics(): WeekStatisticsData {
        return this._weekStatistics;
    }
    public get reportDataListInitial(): ReportData[] {
        return this._reportDataListInitial;
    }
    public get userSumReport(): any {
        return this._userSumReport;
    }

    private clearReportList() {
        this._reportDataList = [];
    }
    private clearReportListInitial() {
        this._reportDataListInitial = [];
    }
    private clearWeekStatistics() {
        this._weekStatistics = {
            start_date: '',
            end_date: ''
        };
    }
    private isInitial:boolean = false;
    public getPersonalReport(param?) {
        this.isInitial = param || false;
        EventManager.getInstance().on(this.get_brain_training_tiers, this.requestBrainTrainingTiersCallback, this);
        let socketData: any = {
            action: this.get_brain_training_tiers,
            skipDebounce: true
        };
        if (param) {
            socketData.data = {
                "initial": param
            };
        }
        let requestBrainTrainingTiersSocket: SocketData = new SocketData(socketData);
        SocketManager.getInstance().send(requestBrainTrainingTiersSocket);
    }

    requestBrainTrainingTiersCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.get_brain_training_tiers, context);
        if(!this.isInitial){
            this.clearReportList();
            this.clearWeekStatistics();
        }else{
            this.clearReportListInitial();
        }
        if (data.status == 0) {
            DebugLog.instance.error(data.message);
        } else {
            if(!this.isInitial){
                if (data.data) {
                    if(data.data['start_date']){
                        this._weekStatistics.start_date = data.data['start_date'];
                    }
                    if(data.data['end_date']){
                        this._weekStatistics.end_date = data.data['end_date'];
                    }
                    let result = data.data['result'];
                    if (result.length == 0) {
                        // DebugLog.instance.log('暂无个人报告');
                        EventManager.getInstance().emit(ReportManager.getBrainTrainingTiersCallback, {});
                        return;
                    }
                    this._reportDataList = result;
                    this.processReportData(this._reportDataList); 
                }
            }else{
                if(data.data){
                    this._reportDataListInitial = data.data['result'];
                    this.processReportData(this._reportDataListInitial);
                }
            }
            EventManager.getInstance().emit(ReportManager.getBrainTrainingTiersCallback, {});
        }
    }
    processReportData(reportDataList: ReportData[]) {
        // 期望的顺序
        const expectedOrder = ['LANGUAGE', 'JUDGMENT', 'MEMORY', 'EXECUTION', 'CALCULATION'];
        const sortedReportDataList = expectedOrder.map(ability => {
            return reportDataList.find(item => item.cog_ability === ability);
        }).filter(item => item !== undefined);
        reportDataList.length = 0;
        reportDataList.push(...sortedReportDataList);
    }

    // public getPersonalInitialReport() {
    //     EventManager.getInstance().on(this.get_brain_training_tiers, this.requestBrainTrainingInitialCallback, this, true);
    //     let requestBrainTrainingTiersSocket: SocketData = new SocketData({
    //         action: this.get_brain_training_tiers,
    //         data: {
    //             "initial": true
    //         },
    //         skipDebounce: true
    //     });
    //     SocketManager.getInstance().send(requestBrainTrainingTiersSocket);
    // }
    // requestBrainTrainingInitialCallback(data: SocketData, context: any) {
    //     EventManager.getInstance().off(this.get_brain_training_tiers, context);
    //     this.clearReportListInitial();
    //     if (data.status == 0) {
    //         DebugLog.instance.error(data.message);
    //     } else {
    //         if(data.data){
    //             let result = data.data['result'];
    //             if (result.length == 0) {
    //                 return;
    //             }
    //             this._reportDataListInitial = result;
    //             this.processReportData(this._reportDataListInitial);
    //         }
    //     }
    // }

    clearUserSumReport() {
        this._userSumReport = null;
    }
    public getUserSumReport() {
        this.clearUserSumReport();
        EventManager.getInstance().on(this.get_user_report, this.requestUserSumReportCallback, this, true);
        let requestUserSumReportSocket: SocketData = new SocketData({
            action: this.get_user_report,
            skipDebounce: true
        });
        SocketManager.getInstance().send(requestUserSumReportSocket);
    }
   
    requestUserSumReportCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.get_user_report, context);
        if (data.status == 0) {
            DebugLog.instance.error(data.message);
        } else {
            // let result = data.data;
            this._userSumReport = data.data;  
        }
        EventManager.getInstance().emit(ReportManager.getUserSumReportCallback);
    }
    getUserSumReportMonthData(){
        let detail=this._userSumReport.report.detail;
        if(!detail){
            return null;
        }
        const expectedOrder = ['LANGUAGE', 'JUDGMENT', 'MEMORY', 'EXECUTION', 'CALCULATION'];
        const sortedReportDataList = expectedOrder.map(ability => { 
            return detail.find(item => item.cog_ability === ability);
        }).filter(item => item !== undefined);
        return sortedReportDataList;
    }
    getFirstAnalysisDataByIndex(index: number):string{
       let array:string[] = this._userSumReport.report.analysis[index];
       return array.join(' ; ');  
    }

    public getCogAbilityBrief(cog_ability: string) {
        EventManager.getInstance().on(this.get_cog_ability_brief, this.requestCogAbilityBriefCallback, this, true);
        let requestCogAbilityBriefSocket: SocketData = new SocketData({
            action: this.get_cog_ability_brief,
            data: {
                cog_ability: cog_ability
            },
            skipDebounce: true
        });
        SocketManager.getInstance().send(requestCogAbilityBriefSocket);
    }

    requestCogAbilityBriefCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.get_cog_ability_brief, context);
        if (data.status == 0) {
            DebugLog.instance.error(data.message);
        } else {
            if (!data.data) {
                return;
            }
            this._cogAbilityBriefData = data.data['result'];
        }
    }

    public getCogAbilityWeeklyScores(cog_ability: string, index: number) {
        if (cog_ability == null) {
            cog_ability = this.cog_ability;
        } else {
            this.cog_ability = cog_ability;
        }
        this.clearCogAbilityWeeklyScoresData();
        EventManager.getInstance().on(this.get_cog_ability_weekly_scores, this.requestCogAbilityWeeklyScoresCallback, this, true);
        let requestCogAbilityWeeklyScoresSocket: SocketData = new SocketData({
            action: this.get_cog_ability_weekly_scores,
            data: {
                cog_ability: cog_ability,
                index: index
            },
            skipDebounce: true
        });
        SocketManager.getInstance().send(requestCogAbilityWeeklyScoresSocket);
    }

    requestCogAbilityWeeklyScoresCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.get_cog_ability_weekly_scores, context);
        if (data.status == 0) {
            DebugLog.instance.error(data.message);
        } else {

            let result = data.data;
        
            this._cogAbilityWeeklyScoresData = result;
            EventManager.getInstance().emit(ReportManager.getCogAbilityWeeklyScoresCallback, {});         
        }
    }
    clearCogAbilityWeeklyScoresData() {
        this._cogAbilityWeeklyScoresData = null;
    }
    getCogAbilityWeeklyFirstDayAndLastDay() {
        return {
            first_day: this._cogAbilityWeeklyScoresData.first_day,
            last_day: this._cogAbilityWeeklyScoresData.last_day
        };
    }
    getCogAbilityWeeklyTotal() {
        return this._cogAbilityWeeklyScoresData.total;
    }
}



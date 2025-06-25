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
export interface CogAbilityBriefData {
    cog_ability: string,
    definition_desc: string,// 定义说明
    score_desc: string,  // 得分说明
    norm_ranking: number,  // 常模排名
    tier: number,  // 本周等级
    last_tier: number,  // 上周等级 0 不显示
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
    private _userSumReport = ''

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
    public get reportDataListInitial(): ReportData[] {
        return this._reportDataListInitial;
    }
    public get userSumReport():string{
        return this._userSumReport;
    }

    private clearReportList() {
        this._reportDataList = [];
    }
    private clearReportListInitial() {
        this._reportDataListInitial = [];
    }

    public getPersonalReport() {
        EventManager.getInstance().on(this.get_brain_training_tiers, this.requestBrainTrainingTiersCallback, this, true);
        let requestBrainTrainingTiersSocket: SocketData = new SocketData({
            action: this.get_brain_training_tiers
        });
        SocketManager.getInstance().send(requestBrainTrainingTiersSocket);
    }

    requestBrainTrainingTiersCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.get_brain_training_tiers, context);
        this.clearReportList();
        if (data.status == 0) {
            DebugLog.instance.error(data.message);
        } else {
            let result = data.data['result'];

            console.log(result);
            if (result.length == 0) {
                // DebugLog.instance.log('暂无个人报告');
                EventManager.getInstance().emit(ReportManager.getBrainTrainingTiersCallback, {});
                return;
            }
            this._reportDataList = result;
            this.processReportData(this._reportDataList);
            EventManager.getInstance().emit(ReportManager.getBrainTrainingTiersCallback, {});
        }
    }
    processReportData(reportDataList: ReportData[]) {
        // console.log('processReportData1', reportDataList);
        // 期望的顺序
        const expectedOrder = ['LANGUAGE', 'JUDGMENT', 'MEMORY', 'EXECUTION', 'CALCULATION'];
        const sortedReportDataList = expectedOrder.map(ability => {
            return reportDataList.find(item => item.cog_ability === ability);
        }).filter(item => item !== undefined);
        reportDataList.length = 0;
        reportDataList.push(...sortedReportDataList);
        // console.log('processReportData2', reportDataList);
    }

    public getPersonalInitialReport() {
        EventManager.getInstance().on(this.get_brain_training_tiers, this.requestBrainTrainingInitialCallback, this, true);
        let requestBrainTrainingTiersSocket: SocketData = new SocketData({
            action: this.get_brain_training_tiers,
            data: {
                "initial": true
            }
        });
        SocketManager.getInstance().send(requestBrainTrainingTiersSocket);
    }
    requestBrainTrainingInitialCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.get_brain_training_tiers, context);
        this.clearReportListInitial();
        if (data.status == 0) {
            DebugLog.instance.error(data.message);
        } else {
            let result = data.data['result'];
            console.log(result);
            if (result.length == 0) {
                return;
            }
            this._reportDataListInitial = result;
            this.processReportData(this._reportDataListInitial);  

        }
    }

    public getUserSumReport() {
        EventManager.getInstance().on(this.get_user_report, this.requestUserSumReportCallback, this, true);
        let requestUserSumReportSocket: SocketData = new SocketData({
            action: this.get_user_report
        });
        SocketManager.getInstance().send(requestUserSumReportSocket);
    }

    requestUserSumReportCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.get_user_report, context);
        if (data.status == 0) {
            DebugLog.instance.error(data.message);
        } else {
            if (!data.data) {
                console.log('数据总结没有数据')
                return;
            }
            let result = data.data;
            this._userSumReport=data.data;
            EventManager.getInstance().emit(ReportManager.getUserSumReportCallback);
        }
    }

    public getCogAbilityBrief(cog_ability: string) {
        EventManager.getInstance().on(this.get_cog_ability_brief, this.requestCogAbilityBriefCallback, this, true);
        let requestCogAbilityBriefSocket: SocketData = new SocketData({
            action: this.get_cog_ability_brief,
            data: {
                cog_ability: cog_ability
            }
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
            }
        });
        SocketManager.getInstance().send(requestCogAbilityWeeklyScoresSocket);
    }

    requestCogAbilityWeeklyScoresCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.get_cog_ability_weekly_scores, context);
        if (data.status == 0) {
            DebugLog.instance.error(data.message);
        } else {
            if (!data.data) {
                DebugLog.instance.log('数据为空')
                return;
            }
            let result = data.data;
            // let isExist = false;
            // for(let i=0;i<this._cogAbilityWeeklyScoresDataList.length;i++) {
            //     if(this._cogAbilityWeeklyScoresDataList[i].index == result.index) {
            //         isExist = true;
            //         break;
            //     }
            // }
            // if(!isExist) {
            //     this._cogAbilityWeeklyScoresDataList.push(result);
            //     console.log('this._cogAbilityWeeklyScoresDataList',this._cogAbilityWeeklyScoresDataList);
            // }
            this._cogAbilityWeeklyScoresData = result;
            EventManager.getInstance().emit(ReportManager.getCogAbilityWeeklyScoresCallback, {});
            // 只有在收到第一个数据包（index为0）时，才请求所有数据
            // if (result.index === 0 && result.total > 1) {
            //     this.requestAllCogAbilityWeeklyScores(result);
            // }
        }
    }
    // requestAllCogAbilityWeeklyScores(data: CogAbilityWeeklyScoresData) {
    //     for(let i = 1; i < data.total; i++) {
    //         this.getCogAbilityWeeklyScores(this.cog_ability, i);
    //     }
    // }
    clearCogAbilityWeeklyScoresData() {
        this._cogAbilityWeeklyScoresData = null;
    }
    getCogAbilityWeeklyScoresDataByIndex(index: number) {
        return this._cogAbilityWeeklyScoresData.result;
    }
    getCogAbilityWeeklyFirstDayAndLastDayByIndex(index: number) {
        return {
            first_day: this._cogAbilityWeeklyScoresData.first_day,
            last_day: this._cogAbilityWeeklyScoresData.last_day
        };
    }
    getCogAbilityWeeklyTotalByIndex(index: number) {
        return this._cogAbilityWeeklyScoresData.total;
    }
}



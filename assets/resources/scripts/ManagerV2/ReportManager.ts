import { DataProvider } from "../Core/Data/DataProvider";
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
    public static getUserSumReportCallback: string = "getUserSumReportCallback";
    public static getCogAbilityWeeklyScoresCallback: string = "getCogAbilityWeeklyScoresCallback";
    public static getRecentReportCallback: string = "getRecentReportCallback";
    public static getInitialReportCallback: string = "getInitialReportCallback";

    private static _instance: ReportManager;
    private get_brain_training_tiers: string = "user.get_brain_training_tiers";
    private get_user_report: string = "user.get_user_report";
    private get_cog_ability_brief: string = "user.get_cog_ability_brief";
    private get_cog_ability_weekly_scores: string = "user.get_cog_ability_weekly_scores";

    private _reportDataList: DataProvider<ReportData[]> = new DataProvider<ReportData[]>();
    private _reportDataListInitial: DataProvider<ReportData[]> = new DataProvider<ReportData[]>();

    private _userSumReport: DataProvider<UserSumReport> = new DataProvider<UserSumReport>();
    private _weekStatistics: DataProvider<WeekStatisticsData> = new DataProvider<WeekStatisticsData>();

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

    public get reportDataList(): DataProvider<ReportData[]> {
        return this._reportDataList;
    }

    public get weekStatistics(): DataProvider<WeekStatisticsData> {
        return this._weekStatistics;
    }

    public get reportDataListInitial(): DataProvider<ReportData[]> {
        return this._reportDataListInitial;
    }

    public get userSumReport(): DataProvider<UserSumReport> {
        return this._userSumReport;
    }

    private clearReportList() {
        this._reportDataList.data = [];
    }

    private clearReportListInitial() {
        this._reportDataListInitial.data = [];
    }

    private clearWeekStatistics() {
        this._weekStatistics.data = {
            start_date: '',
            end_date: ''
        };
    }

    //获取近期报告
    public async getRecentReport(): Promise<void> {
        return new Promise((resolve, reject) => {
            const callback = (data: SocketData) => {
                if (data.status == 0) {
                    reject(new Error(data.message));
                } else {
                    if (data.data) {
                        let weekStatistics: WeekStatisticsData = {
                            start_date: '',
                            end_date: ''
                        };
                        if (data.data['start_date']) {
                            weekStatistics.start_date = data.data['start_date'];
                        }
                        if (data.data['end_date']) {
                            weekStatistics.end_date = data.data['end_date'];
                        }
                        this._weekStatistics.data = weekStatistics;

                        let result = data.data['result'];
                        if (result.length > 0) {
                            this.processReportData(this._reportDataList.data);
                            this._reportDataList.data = result;
                        }
                    }
                    resolve();
                }
            };

            this.clearReportList();
            this.clearWeekStatistics();

            EventManager.getInstance().on(this.get_brain_training_tiers, callback, this, true);
            this.getPersonalReport(false);
        });
    }

    //获取初始报告
    public async getInitialReport(): Promise<void> {
        return new Promise((resolve, reject) => {
            const callback = (data: SocketData) => {
                if (data.status == 0) {
                    reject(new Error(data.message));
                } else {
                    if (data.data) {
                        this.processReportData(this._reportDataListInitial.data);
                        this._reportDataListInitial.data = data.data['result'];
                    }
                    resolve();
                }
            };

            this.clearReportListInitial();

            EventManager.getInstance().on(this.get_brain_training_tiers, callback, this, true);
            this.getPersonalReport(true);
        });
    }

    private getPersonalReport(param?: boolean) {
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

    processReportData(reportDataList: ReportData[]) {
        // 期望的顺序
        const expectedOrder = ['LANGUAGE', 'JUDGMENT', 'MEMORY', 'EXECUTION', 'CALCULATION'];
        const sortedReportDataList = expectedOrder.map(ability => {
            return reportDataList.find(item => item.cog_ability === ability);
        }).filter(item => item !== undefined);
        reportDataList.length = 0;
        reportDataList.push(...sortedReportDataList);
    }

    clearUserSumReport() {
        this._userSumReport.data = null;
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
            this._userSumReport.data = data.data;
        }
        EventManager.getInstance().emit(ReportManager.getUserSumReportCallback);
    }

    getUserSumReportMonthData() {
        let userSumReport = this._userSumReport.data;
        if (!userSumReport) {
            return null;
        }
        let detail = userSumReport.report.detail;
        if (!detail) {
            return null;
        }
        const expectedOrder = ['LANGUAGE', 'JUDGMENT', 'MEMORY', 'EXECUTION', 'CALCULATION'];
        const sortedReportDataList = expectedOrder.map(ability => {
            return detail.find(item => item.cog_ability === ability);
        }).filter(item => item !== undefined);
        return sortedReportDataList;
    }

    getFirstAnalysisDataByIndex(index: number): string {
        let userSumReport = this._userSumReport.data;
        if (!userSumReport) {
            return null;
        }
        let array: string[] = userSumReport.report.analysis[index];
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
            if (!data.data) {
                DebugLog.instance.log('数据为空')
                return;
            }
            let result = data.data;

            this._cogAbilityWeeklyScoresData = result;
            EventManager.getInstance().emit(ReportManager.getCogAbilityWeeklyScoresCallback, {});
        }
    }

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



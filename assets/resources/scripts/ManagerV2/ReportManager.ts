import { DataProvider } from "../Core/Data/DataProvider";
import { EventManager } from "../Core/Manager/Event/EventManager";
import { SocketData } from "../Core/Manager/Net/SocketData";
import { SocketManager } from "../Core/Manager/Net/SocketManager";
import { DebugLog } from "../Core/Util/DebugLog";

/**
 * 认知能力类型枚举
 */
export enum AbilityType {
    JUDGMENT = "JUDGMENT",      // 判断
    MEMORY = "MEMORY",          // 记忆
    EXECUTION = "EXECUTION",    // 执行
    CALCULATION = "CALCULATION", // 计算
    LANGUAGE = "LANGUAGE",       // 语言
}

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
    available: boolean,
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

    private _cogAbilityBriefDataMap: Map<AbilityType, DataProvider<CogAbilityBriefData>> = new Map<AbilityType, DataProvider<CogAbilityBriefData>>();
    private cog_ability: AbilityType = null;
    private cog_ability_index: number = 0;
    
    private _cogAbilityWeeklyScoresData: CogAbilityWeeklyScoresData = null;
    private _weeklyScoresDataMap: Map<AbilityType, Map<number, DataProvider<CogAbilityWeeklyScoresData>>> = new Map<AbilityType, Map<number, DataProvider<CogAbilityWeeklyScoresData>>>();
    private _fetchWeeklyScoresDataQueue: Array<{cog_ability: AbilityType, index: number}> = [];
    private _isFetchingWeeklyScores: boolean = false; // 标记是否有进行中的请求

    private _fetchBriefDataQueue: Array<{cog_ability: AbilityType}> = [];
    private _isFetchingBriefData: boolean = false; // 标记是否有进行中的brief请求

    private _currentAbilityType: AbilityType = null; //当前选中的报告页签

    public static getInstance(): ReportManager {
        if (ReportManager._instance == null) {
            ReportManager._instance = new ReportManager();
        }
        return ReportManager._instance;
    }

    public clean() {
        this.clearCogAbilityWeeklyScoresData();
        this.clearReportList();
        this.clearReportListInitial();
        this.clearWeekStatistics();
        this.clearWeeklyScoresDataQueue();
        this.clearBriefDataQueue();
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

    public getWeeklyScoresDataProvider(cog_ability: AbilityType, index: number): DataProvider<CogAbilityWeeklyScoresData> {
        if (!this._weeklyScoresDataMap.has(cog_ability)) {
            let newarr: Map<number, DataProvider<CogAbilityWeeklyScoresData>> = new Map<number, DataProvider<CogAbilityWeeklyScoresData>>();
            this._weeklyScoresDataMap.set(cog_ability, newarr);
        }

        if(!this._weeklyScoresDataMap.get(cog_ability).has(index)){
            this._weeklyScoresDataMap.get(cog_ability).set(index, new DataProvider<CogAbilityWeeklyScoresData>());
            this.getCogAbilityWeeklyScores(cog_ability, index);
        }

        return this._weeklyScoresDataMap.get(cog_ability).get(index);
    }

    public getAbilityBriefData(): DataProvider<CogAbilityBriefData> {
        if(!this._cogAbilityBriefDataMap.has(this._currentAbilityType)){
            this._cogAbilityBriefDataMap.set(this._currentAbilityType, new DataProvider<CogAbilityBriefData>());
            this.getCogAbilityBrief(this._currentAbilityType);
        }

        return this._cogAbilityBriefDataMap.get(this._currentAbilityType);
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

    public setCurrentAbilityType(abilityType: AbilityType) {
        this._currentAbilityType = abilityType;
    }

    public getCurrentAbilityType(): AbilityType {
        return this._currentAbilityType;
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
                            this.processReportData(result);
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
                        let result = data.data['result'];
                        this.processReportData(result);
                        this._reportDataListInitial.data = result;
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
        const expectedOrder = [AbilityType.LANGUAGE, AbilityType.JUDGMENT, AbilityType.MEMORY, AbilityType.EXECUTION, AbilityType.CALCULATION];
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
        const expectedOrder = [AbilityType.LANGUAGE, AbilityType.JUDGMENT, AbilityType.MEMORY, AbilityType.EXECUTION, AbilityType.CALCULATION];
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

    public getCogAbilityBrief(cog_ability: AbilityType) {
        // 检查是否已经有进行中的请求
        if (this._isFetchingBriefData) {
            // 如果有进行中的请求，将当前请求添加到队列中
            this._fetchBriefDataQueue.push({cog_ability});
            return;
        }

        // 开始新的请求
        this._startFetchBriefData(cog_ability);
    }

    /**
     * 开始获取能力简介数据
     */
    private _startFetchBriefData(cog_ability: AbilityType) {
        this._isFetchingBriefData = true;
        this._currentAbilityType = cog_ability;
        
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

    /**
     * 处理brief数据队列中的下一个请求
     */
    private _processNextBriefQueueRequest() {
        if (this._fetchBriefDataQueue.length > 0) {
            // 从队列中取出下一个请求
            const nextRequest = this._fetchBriefDataQueue.shift();
            if (nextRequest) {
                this._startFetchBriefData(nextRequest.cog_ability);
            }
        } else {
            // 队列为空，标记没有进行中的请求
            this._isFetchingBriefData = false;
        }
    }

    requestCogAbilityBriefCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.get_cog_ability_brief, context);
        if (data.status == 0) {
            DebugLog.instance.error(data.message);
        } else {
            if (!data.data) {
                return;
            }
            this._cogAbilityBriefDataMap.get(this._currentAbilityType).data = data.data['result'];
        }
        
        // 处理完一个请求后，检查队列并开始下一个
        this._processNextBriefQueueRequest();
    }

    public getCogAbilityWeeklyScores(cog_ability: AbilityType, index: number) {
        // 检查是否已经有进行中的请求
        if (this._isFetchingWeeklyScores) {
            // 如果有进行中的请求，将当前请求添加到队列中
            this._fetchWeeklyScoresDataQueue.push({cog_ability, index});
            return;
        }

        // 开始新的请求
        this._startFetchWeeklyScores(cog_ability, index);
    }

    /**
     * 开始获取周分数数据
     */
    private _startFetchWeeklyScores(cog_ability: AbilityType, index: number) {
        this._isFetchingWeeklyScores = true;
        this.cog_ability = cog_ability;
        this.cog_ability_index = index;
        
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

    /**
     * 处理队列中的下一个请求
     */
    private _processNextQueueRequest() {
        if (this._fetchWeeklyScoresDataQueue.length > 0) {
            // 从队列中取出下一个请求
            const nextRequest = this._fetchWeeklyScoresDataQueue.shift();
            if (nextRequest) {
                this._startFetchWeeklyScores(nextRequest.cog_ability, nextRequest.index);
            }
        } else {
            // 队列为空，标记没有进行中的请求
            this._isFetchingWeeklyScores = false;
        }
    }

    requestCogAbilityWeeklyScoresCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.get_cog_ability_weekly_scores, context);
        if (data.status == 0) {
            DebugLog.instance.error(data.message);
        } else {
            let result = data.data;
            if(data.data != null){
                result.available = true;
                this._weeklyScoresDataMap.get(this.cog_ability).get(this.cog_ability_index).data = result;
            }else{
                this._weeklyScoresDataMap.get(this.cog_ability).get(this.cog_ability_index).data = {
                    available: false,
                    index: this.cog_ability_index,
                    total: 0,
                    first_day: '',
                    last_day: '',
                    result: null
                }
            }
        }
        
        // 处理完一个请求后，检查队列并开始下一个
        this._processNextQueueRequest();
    }

    clearCogAbilityWeeklyScoresData() {
        this._weeklyScoresDataMap.clear();
    }

    /**
     * 清理周分数数据请求队列
     */
    clearWeeklyScoresDataQueue() {
        this._fetchWeeklyScoresDataQueue = [];
        this._isFetchingWeeklyScores = false;
    }

    /**
     * 清理brief数据请求队列
     */
    clearBriefDataQueue() {
        this._fetchBriefDataQueue = [];
        this._isFetchingBriefData = false;
    }

    getCogAbilityWeeklyTotal() {
        return this._cogAbilityWeeklyScoresData.total;
    }
}



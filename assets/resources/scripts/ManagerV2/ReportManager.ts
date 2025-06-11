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

    private static _instance: ReportManager;
    private get_brain_training_tiers: string = "user.get_brain_training_tiers";
    private get_user_report: string = "user.get_user_report";
    private get_cog_ability_brief: string = "user.get_cog_ability_brief";
    private get_cog_ability_weekly_scores: string = "user.get_cog_ability_weekly_scores";
    private _reportDataList = [];
    private _cogAbilityWeeklyScoresDataList:CogAbilityWeeklyScoresData[] = [];

    private _cogAbilityBriefData: CogAbilityBriefData = null;
    private _cogAbilityWeeklyScoresData: CogAbilityWeeklyScoresData = null;
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

    public getPersonalReport() {
        EventManager.getInstance().on(this.get_brain_training_tiers, this.requestBrainTrainingTiersCallback, this, true);
        let requestBrainTrainingTiersSocket: SocketData = new SocketData({
            action: this.get_brain_training_tiers
        });
        SocketManager.getInstance().send(requestBrainTrainingTiersSocket);
    }
    requestBrainTrainingTiersCallback(data: SocketData, context: any) {
        EventManager.getInstance().off(this.get_brain_training_tiers, context);
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
            EventManager.getInstance().emit(ReportManager.getBrainTrainingTiersCallback, {});
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
                return;
            }
            let result = data.data;
            EventManager.getInstance().emit(ReportManager.getUserSumReportCallback, result);
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
        this._cogAbilityBriefData =data.data['result'];
        }
    }

    public getCogAbilityWeeklyScores(cog_ability: string, index: number) {
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
            let result = data.data['result'];
            this._cogAbilityWeeklyScoresData = result;
        }
    }

    update(deltaTime: number) {

    }
}



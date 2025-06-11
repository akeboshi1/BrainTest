import { EventManager } from "../Core/Manager/Event/EventManager";
import { SocketData } from "../Core/Manager/Net/SocketData";
import { SocketManager } from "../Core/Manager/Net/SocketManager";
import { DebugLog } from "../Core/Util/DebugLog";

 export interface ReportData {
    cog_ability: string,
    cog_ability_desc : string,
    last_tier : number,
    tier : number
}

export class ReportManager {

    public static getBrainTrainingTiersCallback: string = "getBrainTrainingTiersCallback";
    public static getUserSumReportCallback: string = "getUserSumReportCallback";

    private static _instance: ReportManager;
    private get_brain_training_tiers: string = "user.get_brain_training_tiers";
    private get_user_report: string = "user.get_user_report";
    private _reportDataList = [];


    public static getInstance(): ReportManager {
        if (ReportManager._instance == null) {
            ReportManager._instance = new ReportManager();
        }
        return ReportManager._instance;
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
            let result = data.data;
            EventManager.getInstance().emit(ReportManager.getUserSumReportCallback, result);
        }
    }


    update(deltaTime: number) {

    }
}



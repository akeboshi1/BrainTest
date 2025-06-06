import { EventManager } from "../Core/Manager/Event/EventManager";
import { SocketData } from "../Core/Manager/Net/SocketData";
import { SocketManager } from "../Core/Manager/Net/SocketManager";
import { DebugLog } from "../Core/Util/DebugLog";

interface ReportData {
    cog_ability: string,
    cog_ability_desc : string,
    last_tier : number,
    tier : number
}

export class ReportManage {

    public static getBrainTrainingTiersCallback: string = "getBrainTrainingTiersCallback";
    private static _instance: ReportManage;

    public static getInstance(): ReportManage {
        if (ReportManage._instance == null) {
            ReportManage._instance = new ReportManage();
        }
        return ReportManage._instance;
    }
    private get_brain_training_tiers: string = "user.get_brain_training_tiers";
    private _reportDataList = [];
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
                EventManager.getInstance().emit(ReportManage.getBrainTrainingTiersCallback, {});
                return;
            }
            this._reportDataList = result;
            EventManager.getInstance().emit(ReportManage.getBrainTrainingTiersCallback, {});
        }
    }



    update(deltaTime: number) {

    }
}



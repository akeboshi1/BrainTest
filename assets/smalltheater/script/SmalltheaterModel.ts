
import { DebugLog } from "../../scripts/Core/Util/DebugLog";
import { Plot, PlotsConfig, StageLine } from "./PlotsConfig";

export class SmalltheaterModel {
	private plotsConfig: PlotsConfig = new PlotsConfig();

	private _currentPlot:Plot = null;
	private _currentStageIndex:number = 0;

	init() {

	}

	dispose() {

	}

	async loadConfigByID(id: number): Promise<void> {
		try {
			this._currentPlot = await this.plotsConfig.loadConfigByID(id);
		} catch (error) {
			DebugLog.instance.error(error);
		}
	}

	get currentPlot():Plot{
		return this._currentPlot;
	}

	initDemo(){
		this._currentStageIndex = 0;
	}

	hasNextStageLine():boolean{
		return true;
	}

	getCurrentStageLine():StageLine{
		return null;
	}
}
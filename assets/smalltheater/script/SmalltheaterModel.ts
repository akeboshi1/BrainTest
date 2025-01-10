
import { assetManager, AudioClip, Prefab } from "cc";
import { AbortablePromise } from "../../scripts/Core/StateMachine/AbortablePromise";
import { DebugLog } from "../../scripts/Core/Util/DebugLog";
import { Character, Plot, PlotsConfig, StageLine } from "./PlotsConfig";
import { BundleName } from "../../scripts/Core/Manager/Load/BundleName";

export class AutoPlayLineData {
	audioClip: AudioClip;
	line: string;
	characterid: number;
	characterName: string;
}

export class SmalltheaterModel {
	private plotsConfig: PlotsConfig = new PlotsConfig();

	private _currentPlot: Plot = null;
	private _currentStageIndex: number = 0;
	private _selectedCharacterIndex: number = -1;

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

	get currentPlot(): Plot {
		return this._currentPlot;
	}

	get selectedCharacterIndex():number{
		return this._selectedCharacterIndex;
	}

	set selectedCharacterIndex(v:number){
		this._selectedCharacterIndex = v;
	}

	initDemoState() {
		this._currentStageIndex = 0;
		this._selectedCharacterIndex = -1;
	}

	initInteractionState(){
		this._currentStageIndex = 0;
	}

	hasCurrentStageLine(): boolean {
		if (this._currentStageIndex < this._currentPlot.stagelines.length) {
			return true;
		}
		return false;
	}

	getCurrentStageLine(): StageLine {
		if (this.hasCurrentStageLine()) {
			return this._currentPlot.stagelines[this._currentStageIndex];
		}
		return null;
	}

	goNextStageLine() {
		this._currentStageIndex++;
	}

	async prepareAutoPlayData(): Promise<AutoPlayLineData> {
		let sl = this.getCurrentStageLine();
		let data: AutoPlayLineData = new AutoPlayLineData();
		data.characterid = sl.character;
		data.characterName = this._currentPlot.character[sl.character].name;
		data.line = sl.line;
		data.audioClip = await this.loadBundleAudioClip(sl.audioClip);
		return data;
	}

	loadBundleAudioClip(path: string): Promise<AudioClip> {
		let bundle = assetManager.getBundle(BundleName.SMALLTHEATER);
		return new Promise<AudioClip>((resolve, reject) => {
			bundle.load(path, AudioClip, (err: Error | null, data: AudioClip) => {
				if (err) {
					DebugLog.instance.warn("加载MP3文件失败: path = " + path + " ,err :" + err);
					reject(err);
				} else {
					resolve(data);
				}
			});
		});
	}

	loadCharacterPrefab(path: string): Promise<Prefab> {
		let bundle = assetManager.getBundle(BundleName.SMALLTHEATER);
		return new Promise<Prefab>((resolve, reject) => {
			bundle.load(path, Prefab, (err: Error | null, data: Prefab) => {
				if (err) {
					DebugLog.instance.warn("加载prefab失败: path = " + path + " ,err :" + err);
					reject(err);
				} else {
					resolve(data);
				}
			});
		});
	}
}
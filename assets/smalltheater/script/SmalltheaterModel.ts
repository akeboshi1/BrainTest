
import { assetManager, AudioClip, Prefab } from "cc";
import { DebugLog } from "../../scripts/Core/Util/DebugLog";
import { Plot, PlotsConfig, StageLine } from "./PlotsConfig";
import { BundleName } from "../../scripts/Core/Manager/Load/BundleName";
import { GlobalConfigManager } from "../../scripts/Config/GlobalConfigManager";
import { SocketManager } from "../../scripts/Core/Manager/Net/SocketManager";
import { SocketData } from "../../scripts/Core/Manager/Net/SocketData";
import { EventManager } from "../../scripts/Core/Manager/Event/EventManager";
import { AbortablePromise } from "../../scripts/Core/StateMachine/AbortablePromise";

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

	private _playerLineTextCache: string[] = [];
	private _currentAsrResult: string = "";
	private _score: number = -1;
	private _remoteRandomNum = 111;
	private _plotID: number = -1;

	private _timeStampMap: Map<number, number> = new Map();

	private _postResultSocket: string = "language.evaluate";
	private _postResultResolver: (v: number) => void = null;

	init() {
		EventManager.getInstance().on(this._postResultSocket, this.onPostResultCallback, this);
	}

	dispose() {
		EventManager.getInstance().off(this._postResultSocket, this);
	}

	async loadConfigByID(id: number): Promise<void> {
		this._plotID = id;
		try {
			this._currentPlot = await this.plotsConfig.loadConfigByID(id);
		} catch (error) {
			DebugLog.instance.error(error);
		}
	}

	get currentPlot(): Plot {
		return this._currentPlot;
	}

	get selectedCharacterIndex(): number {
		return this._selectedCharacterIndex;
	}

	set selectedCharacterIndex(v: number) {
		this._selectedCharacterIndex = v;
	}

	get score(): number {
		return this._score;
	}

	get timeStampMap() {
		return this._timeStampMap;
	}

	get plotID(): number {
		return this._plotID;
	}

	initDemoState() {
		this._currentStageIndex = 0;
		this._selectedCharacterIndex = -1;
	}

	initInteractionState() {
		this._score = -1;
		this._currentStageIndex = 0;
		this._playerLineTextCache = [];
		this._timeStampMap.clear();
	}

	initReplayState() {
		this._currentStageIndex = 0;
		this._remoteRandomNum = Math.floor(Math.random() * 1000000);
	}

	cleanAsrResult() {
		this._currentAsrResult = "";
	}

	pushAsrResult(v: string) {
		this._currentAsrResult += v;
	}

	confirmCurrentStageResult() {
		this._playerLineTextCache.push(this._currentAsrResult);
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

	async prepareAutoPlayData(remoteAudioID: string = null): Promise<AutoPlayLineData> {
		let sl = this.getCurrentStageLine();
		let data: AutoPlayLineData = new AutoPlayLineData();
		data.characterid = sl.character;
		data.characterName = this._currentPlot.character[sl.character].name;
		data.line = sl.line;
		if (remoteAudioID != null) {
			data.audioClip = await this.loadRemoteAudioClip(remoteAudioID);
		} else {
			data.audioClip = await this.loadBundleAudioClip(sl.audioClip);
		}
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

	loadRemoteAudioClip(id: string): Promise<AudioClip> {
		let remoteUrl = GlobalConfigManager.getInstance().asrAudiosUrl + `/${id}/audio.wav?random=${this._remoteRandomNum}`;
		return new Promise<AudioClip>((resolve, reject) => {
			assetManager.loadRemote<AudioClip>(remoteUrl, (err, data: AudioClip) => {
				if (err) {
					DebugLog.instance.warn("加载远程audioClip文件失败: remoteUrl = " + remoteUrl + " ,err :" + err);
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

	postPlayerResult(): AbortablePromise<number> {
		let originLines: string[] = [];
		for (let i = 0; i < this._currentPlot.stagelines.length; i++) {
			let sl = this._currentPlot.stagelines[i];
			if (sl.character == this._selectedCharacterIndex) {
				originLines.push(sl.line);
			}
		}

		SocketManager.getInstance().send(new SocketData({ "action": this._postResultSocket, "data": { origin_sentences: originLines, user_sentences: this._playerLineTextCache } }));

		return new AbortablePromise<number>((resolve, reject) => {
			this._postResultResolver = resolve;
		}).onAbort(() => {
			this._postResultResolver = null;
		});
	}

	onPostResultCallback(data) {
		if (data.status == 1) {
			let score = data.data.result.score;
			this._score = score;
			if (this._postResultResolver) {
				this._postResultResolver(score);
			}
		}
	}

}
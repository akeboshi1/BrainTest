import { assetManager, JsonAsset } from "cc";
import { DebugLog } from "../../scripts/Core/Util/DebugLog";
import { BundleName } from "../../scripts/Core/Manager/Load/BundleName";

// 定义角色接口
export interface Character {
    id: number;
    name: string;
    prefab: string;
}

// 定义台词接口
export interface StageLine {
    id: number;
    character: number;
    line: string;
    audioClip: string;
    richTextLine: string;
    tipline: string;
}

// 定义剧情类
export class Plot {
    constructor(
        public poltName: string,
        public character: Character[],
        public background: string,
        public description: string,
        public stagelines: StageLine[]
    ) { }
}

export class PlotsConfig {
    private basePath: string = "config/plot_";
    private configCache: Map<number, Plot> = new Map();

    async loadConfigByID(id: number): Promise<Plot> {
        if (this.configCache.has(id)) {
            return this.configCache.get(id);
        }

        let bundle = assetManager.getBundle(BundleName.SMALLTHEATER);
        let configPath = this.basePath + id.toString();
        let self = this;
        return new Promise<Plot>((resolve, reject) => {
            bundle.load(configPath, JsonAsset, (err: Error | null, data: JsonAsset) => {
                if (err) {
                    DebugLog.instance.warn("加载配置文件失败: " + err);
                    reject(err);
                } else {
                    const jsonData = data.json;
                    const plot = new Plot(
                        jsonData.poltName,
                        jsonData.character,
                        jsonData.background,
                        jsonData.description,
                        jsonData.stagelines
                    );
                    self.configCache.set(id, plot);
                    resolve(plot);
                }
            });
        });
    }
}
import { JsonAsset, resources } from "cc";
import { DebugLog } from "../Core/Util/DebugLog";

export interface UIConfig {
    title: string;
    icon0: string;
    icon1: string;
}

export interface IndexPageConfigData {
    ui: UIConfig;
}

export class IndexPageConfig {
    private jsonFilePath: string = "scripts/indexPageV2/indexPageConfig";
    private _normalConfig: IndexPageConfigData = null;

    get normalConfig(): IndexPageConfigData {
        return this._normalConfig;
    }



    async loadConfig() {
        try {
            const jsonAsset = await this.loadJsonAsset(this.jsonFilePath);
            if (jsonAsset && jsonAsset.json) {
                // 加载通用配置
                if (jsonAsset.json['normal']) {
                    this._normalConfig = jsonAsset.json['normal'];
                }

            } else {
                DebugLog.instance.warn("加载首页配置文件为空");
            }
        } catch (err) {
            DebugLog.instance.warn("加载首页配置文件失败:", err);
        }
    }

    private loadJsonAsset(path: string): Promise<JsonAsset> {
        return new Promise((resolve, reject) => {
            resources.load(path, JsonAsset, (err, jsonAsset) => {
                if (err) {
                    DebugLog.instance.error(`加载配置文件失败，路径: ${path}`, err);
                    reject(err);
                    return;
                }
                resolve(jsonAsset);
            });
        });
    }
}
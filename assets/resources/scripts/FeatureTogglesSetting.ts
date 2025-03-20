import { JsonAsset, resources } from "cc";
import { DebugLog } from "./Core/Util/DebugLog";

// 功能开关枚举
export enum FeatureToggle {
    PersonalCenter = "personal_center",
    Skewers = "skewers",
    GameCenter = "game_center",
    PersonalCenterReporter = "personal_center_reporter",
    PersonalCenterVip = "personal_center_vip",
    Chat = "chat",
    LanguageTraining = "language_training",
    PersonalCenterKefu = "personal_center_kefu",
}

class FeatureTogglesSetting {
    private static instance: FeatureTogglesSetting;
    private config: Record<string, boolean>;


    public static getInstance(): FeatureTogglesSetting {
        if (!FeatureTogglesSetting.instance) {
            FeatureTogglesSetting.instance = new FeatureTogglesSetting();
        }
        return FeatureTogglesSetting.instance;
    }

    public async init(isMCI: boolean) {
        const configPath = isMCI ?
            "config/featureToggles/featureTogglesConfig-MCI" :
            "config/featureToggles/featureTogglesConfig";

        await new Promise((resolve, reject) => {
            resources.load(configPath, JsonAsset, (err: Error | null, data: JsonAsset) => {
                if (err) {
                    DebugLog.instance.warn("加载配置文件失败:" + err);
                    reject(err);
                } else {
                    this.config = data.json;
                    DebugLog.instance.log("FeatureTogglesSetting load success!!! ");
                    resolve(data);
                }
            });
        });
    }

    public getToggleValue(toggle: FeatureToggle): boolean {
        return this.config[toggle];
    }
}

export default FeatureTogglesSetting;

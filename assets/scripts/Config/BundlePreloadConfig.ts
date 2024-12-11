import { AudioClip, JsonAsset, Prefab, Scene, SpriteFrame, Texture2D } from "cc";
import { ConfigManager } from "../Core/Manager/Config/ConfigManager";
import { DebugLog } from "../Core/Util/DebugLog";

export class BundlePreloadConfig {
    private configData: any = {};
    private jsonFilePath: string = "bundlePreloadConfig";

    private assetTypeMap: Object = {
        "Texture2D": Texture2D,
        "Prefab": Prefab,
        "SpriteFrame": SpriteFrame,
        "AudioClip": AudioClip,
        "Scene": Scene,
        "JsonAsset": JsonAsset
    };

    // 加载JSON文件并缓存数据的方法
    loadConfig(): void {
        ConfigManager.getInstance().loadJson(this.jsonFilePath).then((res) => {
            DebugLog.instance.log("bundlePreloadConfig load success !!! ");
            this.configData = res;
        }).catch((err) => {
            DebugLog.instance.warn("bundlePreloadConfig load fail : ", err);
        });
    }

    // 获取指定游戏模块的预加载场景名称的方法
    getPreloadScene(gameModule: string): string | undefined {
        return this.configData[gameModule]?.preloadScene;
    }

    // 获取指定游戏模块的预加载资源列表的方法
    getPreloadAssets(gameModule: string): any[] {
        return this.configData[gameModule]?.preloadAssets || [];
    }

    // 获取所有游戏模块名称的方法（方便后续遍历等操作）
    getGameModuleNames(): string[] {
        return Object.keys(this.configData);
    }

    stringToAssetType(assetTypeStr: string): any {
        if (this.assetTypeMap.hasOwnProperty(assetTypeStr)) {
            return this.assetTypeMap[assetTypeStr];
        } else {
            DebugLog.instance.warn("BundlePreloadConfig convert to type error! ---- assetTypeStr:" + assetTypeStr);
            return null;
        }
    }

}
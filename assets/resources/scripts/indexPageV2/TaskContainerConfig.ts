import { JsonAsset, resources, SpriteFrame } from "cc";
import { DebugLog } from "../Core/Util/DebugLog";


export class TaskContainerConfig {
    private jsonFilePath: string = "scripts/indexPageV2/taskContainer";  // 不需要.json后缀
    private _normalTaskData = [];  // 通用配置任务数据
    private _festivalConfigs: { [key: string]: any[] } = {};  // 节日配置数据，key为节日名称

    get normalTaskData() {   
        return this._normalTaskData
    }

    get festivalConfigs() {   
        return this._festivalConfigs
    }

    getFestivalTaskDataByType(type: string) {   
        return this._festivalConfigs[type];
    }

    async loadConfig() {
        try {
            const jsonAsset = await this.loadJsonAsset(this.jsonFilePath);          
            if (jsonAsset && jsonAsset.json) {
                // 加载通用配置
                if (jsonAsset.json['normal'] && jsonAsset.json['normal']['tasks']) {
                    this._normalTaskData = jsonAsset.json['normal']['tasks'];
                }
                
                // 动态加载所有节日配置
                this._festivalConfigs = {};
                const configKeys = Object.keys(jsonAsset.json);
                for (const key of configKeys) {
                    if (key !== 'normal' && jsonAsset.json[key] && jsonAsset.json[key]['tasks']) {
                        this._festivalConfigs[key] = jsonAsset.json[key]['tasks'];
                        DebugLog.instance.log(`加载节日配置: ${key}, 任务数量: ${jsonAsset.json[key]['tasks'].length}`);
                    }
                }
                
                DebugLog.instance.log("任务配置加载完成 - 通用任务:", this._normalTaskData.length, "节日配置数量:", Object.keys(this._festivalConfigs).length);
            } else {
                DebugLog.instance.warn("加载的配置文件为空");
            }
        } catch (err) {
            DebugLog.instance.warn("加载配置文件失败:", err);
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

    /**
     * 根据节日名称获取任务数据
     * @param festivalName 节日名称，如 'midAutumn', 'springFestival' 等
     * @returns 对应节日的任务数据数组
     */
    getFestivalTaskData(festivalName: string): any[] {
        if (this._festivalConfigs[festivalName]) {
            return this._festivalConfigs[festivalName];
        } else {
            DebugLog.instance.warn(`未找到节日配置: ${festivalName}`);
            return [];
        }
    }

    /**
     * 获取当前应该使用的任务数据
     * @param currentFestival 当前节日名称，如果为null或空字符串则使用通用配置
     * @returns 任务数据数组
     */
    getCurrentTaskData(currentFestival?: string): any[] {
        if (currentFestival && this._festivalConfigs[currentFestival]) {
            return this._festivalConfigs[currentFestival];
        }
        return this._normalTaskData;
    }

    /**
     * 获取所有可用的节日名称
     * @returns 节日名称数组
     */
    getAvailableFestivals(): string[] {
        return Object.keys(this._festivalConfigs);
    }

    /**
     * 检查是否有指定节日的配置
     * @param festivalName 节日名称
     * @returns 是否有该节日的配置
     */
    hasFestivalConfig(festivalName: string): boolean {
        return this._festivalConfigs.hasOwnProperty(festivalName) && this._festivalConfigs[festivalName].length > 0;
    }

    /**
     * 检查是否有任何节日配置
     * @returns 是否有任何节日配置
     */
    hasAnyFestivalConfig(): boolean {
        return Object.keys(this._festivalConfigs).length > 0;
    }

    /**
     * 根据当前日期自动判断应该使用哪个节日配置
     * @returns 节日名称，如果不是节日则返回null
     */
    getCurrentFestivalByDate(): string | null {
        const now = new Date();
        const month = now.getMonth() + 1; // 0-11 转为 1-12
        const day = now.getDate();

        // 这里可以根据实际节日日期进行判断
        // 示例：中秋节（农历八月十五，这里用阳历9月15日作为示例）
        if (month === 9 && day === 15) {
            return 'midAutumn';
        }
        
        // 示例：春节（农历正月初一，这里用阳历2月10日作为示例）
        if (month === 2 && day === 10) {
            return 'springFestival';
        }

        // 可以根据需要添加更多节日判断逻辑
        return null;
    }
}



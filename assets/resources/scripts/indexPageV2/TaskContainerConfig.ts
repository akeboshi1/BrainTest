import { JsonAsset, resources, SpriteFrame } from "cc";
import { DebugLog } from "../Core/Util/DebugLog";


export class TaskContainerConfig {
    private jsonFilePath: string = "scripts/IndexPageV2/taskContainer";  // 不需要.json后缀
    private _taskData = [];  // 修改为数组类型

    get taskData() {   
        return this._taskData
    }
    async loadConfig() {
        try {
            const jsonAsset = await this.loadJsonAsset(this.jsonFilePath);          
            if (jsonAsset && jsonAsset.json) {
                this._taskData = jsonAsset.json['tasks'];
                // console.log("JSON数据:", jsonAsset.json['tasks'],this._taskData);
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

    // getTaskData(task: string): TaskData | null {
    //     if (!this.taskData.hasOwnProperty(task)) {
    //         DebugLog.instance.warn(`Task key "${task}" not found in taskData. Available keys: ${Object.keys(this.taskData).join(', ')}`);
    //         return null;
    //     }
    //     return this.taskData[task];

    // }
}



import { JsonAsset, resources, SpriteFrame } from "cc";
import { DebugLog } from "../Core/Util/DebugLog";

// 定义任务数据接口
interface TaskData {
    title: string;
    txt: string;
    icon: string;
    icon_bg: string;
}

export class TaskContainerConfig {
    private jsonFilePath: string = "scripts/IndexPageV2/taskContainer";  // 不需要.json后缀
    private taskData: { [key: string]: TaskData } = {};  // 使用索引签名定义对象类型

    async loadConfig() {
        try {
            const jsonAsset = await this.loadJsonAsset(this.jsonFilePath);
            if (jsonAsset && jsonAsset.json) {
                this.taskData = jsonAsset.json;
                DebugLog.instance.log("加载配置文件成功:", this.taskData);
            }
        } catch (err) {
            DebugLog.instance.warn("加载配置文件失败:", err);
        }
    }

    private loadJsonAsset(path: string): Promise<JsonAsset> {
        return new Promise((resolve, reject) => {
            resources.load(path, JsonAsset, (err, jsonAsset) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(jsonAsset);
            });
        });
    }

    getTaskData(task: string): TaskData | null {
        if (!this.taskData.hasOwnProperty(task)) {
            DebugLog.instance.warn(`Task key "${task}" not found in taskData. Available keys: ${Object.keys(this.taskData).join(', ')}`);
            return null;
        }
        return this.taskData[task];

    }
}



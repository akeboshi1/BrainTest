import { JsonAsset, assetManager } from 'cc';
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';

export interface IListeningConfig {
    path: string;
    duration: number;
    name:string;
    isCorrect?: boolean; // 是否为正确答案（用于选项题库中标记）
}

export class ListeningModel {
    private static _instance: ListeningModel = null;

    public static getInstance(): ListeningModel {
        if (!this._instance) {
            this._instance = new ListeningModel();
        }
        return this._instance;
    }

    private _configs: IListeningConfig[] = null;

    /**
     * 不同难度对应的关卡最大数量
     */
    private _hardData:number[]=[3,4,5];

    /**
     * 上一局使用的音效（按难度存储，key为难度，value为音效name的Set）
     */
    private _lastRoundQuestions: Map<number, Set<string>> = new Map();


    constructor() {

    }

    public async initModel(): Promise<void> {
        const bundle = assetManager.getBundle(BundleName.LISTENINGMASTER);
        if (!bundle) {
            const error = new Error(`Bundle ${BundleName.LISTENINGMASTER} 未加载`);
            DebugLog.instance.error(error.message);
            throw error;
        }

        return new Promise<void>((resolve, reject) => {
            bundle.load("data/data", JsonAsset, (err, jsonAsset) => {
                if (err) {
                    DebugLog.instance.error(`加载配置文件失败: data/data.json`, err);
                    reject(err);
                    return;
                }

                if (!jsonAsset || !jsonAsset.json) {
                    const error = new Error(`配置文件数据无效: data/data.json`);
                    DebugLog.instance.error(error.message);
                    reject(error);
                    return;
                }

                DebugLog.instance.log(`配置文件加载成功: data/data.json`);

                // 处理 JSON 数据，存储到 _configs
                const jsonData = jsonAsset.json;
                this._configs = [];

                for (const key in jsonData) {
                    if (jsonData.hasOwnProperty(key)) {
                        const item = jsonData[key];
                        const config: IListeningConfig = {
                            name: item.name || key,
                            duration: parseInt(item.duration) || 0,
                            path: item.path || ""
                        };
                        this._configs.push(config);
                    }
                }

                DebugLog.instance.log(`配置文件解析完成，共加载 ${this._configs.length} 个配置项`);
                resolve();
            });
        });
    }

    getQuestion(hard:number =1): IListeningConfig[] {
        if (!this._configs || this._configs.length === 0) {
            DebugLog.instance.warn(`配置数据未加载或为空`);
            return [];
        }

        // 获取对应难度的关卡数量
        const hardIndex = Math.max(0, Math.min(hard - 1, this._hardData.length - 1));
        const count = this._hardData[hardIndex];

        // 获取上一局使用过的音效name集合（排除上一局的音效）
        const lastRoundNames = this._lastRoundQuestions.get(hard) || new Set<string>();

        // 从所有配置中排除上一局使用过的音效
        const availableConfigs = this._configs.filter(config => !lastRoundNames.has(config.name));

        // 如果可用配置数量不足，清空上一局记录，使用所有配置（避免无法获取题目）
        if (availableConfigs.length < count) {
            DebugLog.instance.warn(`可用配置数量不足（${availableConfigs.length} < ${count}），清空上一局记录，使用所有配置`);
            this._lastRoundQuestions.delete(hard);
            // 重新获取可用配置（使用所有配置）
            const allAvailableConfigs = [...this._configs];

            // 如果请求的数量大于可用配置数量，返回所有配置
            if (count >= allAvailableConfigs.length) {
                const result = [...allAvailableConfigs];
                // 更新上一局记录
                this.updateLastRoundQuestions(hard, result);
                return result;
            }

            // 随机选择指定数量的配置
            const result: IListeningConfig[] = [];
            const availableIndices = Array.from({ length: allAvailableConfigs.length }, (_, i) => i);

            for (let i = 0; i < count; i++) {
                const randomIndex = Math.floor(Math.random() * availableIndices.length);
                const selectedIndex = availableIndices.splice(randomIndex, 1)[0];
                result.push(allAvailableConfigs[selectedIndex]);
            }

            // 更新上一局记录
            this.updateLastRoundQuestions(hard, result);
            return result;
        }

        // 如果请求的数量大于可用配置数量，返回所有可用配置
        if (count >= availableConfigs.length) {
            const result = [...availableConfigs];
            // 更新上一局记录
            this.updateLastRoundQuestions(hard, result);
            return result;
        }

        // 从可用配置中随机选择指定数量的配置
        const result: IListeningConfig[] = [];
        const availableIndices = Array.from({ length: availableConfigs.length }, (_, i) => i);

        for (let i = 0; i < count; i++) {
            const randomIndex = Math.floor(Math.random() * availableIndices.length);
            const selectedIndex = availableIndices.splice(randomIndex, 1)[0];
            result.push(availableConfigs[selectedIndex]);
        }

        // 更新上一局记录
        this.updateLastRoundQuestions(hard, result);

        DebugLog.instance.log(`获取题目: 难度=${hard}, 数量=${count}, 排除上一局音效=${lastRoundNames.size}个, 可用配置=${availableConfigs.length}个`);
        return result;
    }

    /**
     * 更新上一局使用的音效记录
     * @param hard 难度等级
     * @param questions 本局使用的音效列表
     */
    private updateLastRoundQuestions(hard: number, questions: IListeningConfig[]): void {
        const questionNames = new Set(questions.map(q => q.name));
        this._lastRoundQuestions.set(hard, questionNames);
        DebugLog.instance.log(`更新上一局记录: 难度=${hard}, 音效数量=${questionNames.size}, 音效名称=[${Array.from(questionNames).join(', ')}]`);
    }

    /**
     * 获取选项题库（随机出的题目 + 对应错题配置，用于选项展示）
     * @param hard 难度等级
     * @param selectedQuestions 已选中的题目（从getQuestion获取的，正确答案）
     * @returns 合并后的选项配置数组（正确答案 + 错误答案）
     */
    getOptionBank(hard: number = 1, selectedQuestions: IListeningConfig[]): IListeningConfig[] {
        if (!this._configs || this._configs.length === 0) {
            DebugLog.instance.warn(`配置数据未加载或为空`);
            return [];
        }

        if (!selectedQuestions || selectedQuestions.length === 0) {
            DebugLog.instance.warn(`已选中的题目为空`);
            return [];
        }

        // 总选项数量固定为8个
        const totalOptionCount = 8;
        const correctAnswerCount = selectedQuestions.length;
        const wrongAnswerCount = totalOptionCount - correctAnswerCount;

        // 获取已选中题目的name集合，用于排除
        const selectedNames = new Set(selectedQuestions.map(q => q.name));

        // 从所有配置中排除已选中的题目，获取错题配置
        const availableConfigs = this._configs.filter(config => !selectedNames.has(config.name));

        // 获取错题配置（从剩余音效中随机选择）
        let wrongAnswerConfigs: IListeningConfig[] = [];

        if (availableConfigs.length > 0 && wrongAnswerCount > 0) {
            // 如果剩余配置数量不足，使用所有剩余配置
            if (availableConfigs.length <= wrongAnswerCount) {
                wrongAnswerConfigs = [...availableConfigs];
            } else {
                // 从剩余配置中随机选择指定数量
                const availableIndices = Array.from({ length: availableConfigs.length }, (_, i) => i);

                for (let i = 0; i < wrongAnswerCount; i++) {
                    const randomIndex = Math.floor(Math.random() * availableIndices.length);
                    const selectedIndex = availableIndices.splice(randomIndex, 1)[0];
                    wrongAnswerConfigs.push(availableConfigs[selectedIndex]);
                }
            }
        }

        // 标记正确答案
        const markedCorrectAnswers = selectedQuestions.map(q => ({
            ...q,
            isCorrect: true
        }));

        // 标记错误答案
        const markedWrongAnswers = wrongAnswerConfigs.map(q => ({
            ...q,
            isCorrect: false
        }));

        // 合并正确答案和错误答案，用于选项展示
        const optionBank = [...markedCorrectAnswers, ...markedWrongAnswers];

        DebugLog.instance.log(`获取选项题库: 难度=${hard}, 正确答案=${correctAnswerCount}个, 错误答案=${wrongAnswerConfigs.length}个, 总计=${optionBank.length}个选项`);
        return optionBank;
    }


}
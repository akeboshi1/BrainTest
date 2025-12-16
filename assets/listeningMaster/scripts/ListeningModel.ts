import { JsonAsset, assetManager } from 'cc';
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
import { EventManager } from '../../resources/scripts/Core/Manager/Event/EventManager';
import { LoginManager } from '../../resources/scripts/Core/Manager/LoginManager/LoginManager';

export interface IListeningConfig {
    path: string;
    duration: number;
    name:string;
    type?: number; // 资源类型：1=环境，2=居家，3=自然，4=宠物，5=动物
    hard?: number; // 难度：1=容易，2=中等，3=难
    isCorrect?: boolean; // 是否为正确答案（用于选项题库中标记）
}

export interface IVideoConfig {
    path: string;
    type: number[]; // 该视频适用的资源类型数组
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
     * 按type和hard分组的配置数据
     * Map<type, IListeningConfig[][]>
     * key: type (1-5)
     * value: [hard1的配置数组, hard2的配置数组, hard3的配置数组]
     */
    private _configsByTypeAndHard: Map<number, IListeningConfig[][]> = new Map();

    /**
     * 不同难度对应的关卡最大数量
     */
    private _hardData:number[]=[3,4,5];

    /**
     * 上一局使用的音效（按难度存储，key为难度，value为音效name的Set）
     */
    private _lastRoundQuestions: Map<number, Set<string>> = new Map();

    /**
     * 视频配置数据（按名字存储）
     * Map<视频名字, IVideoConfig>
     */
    private _videoConfigs: Map<string, IVideoConfig> = new Map();

    /**
     * 缓存上一次游戏的题目（音效），用于重玩
     */
    private _lastSavedQuestions: IListeningConfig[] = null;

    /**
     * 缓存上一次游戏的视频路径，用于重玩
     */
    private _lastSavedVideoPath: string = null;

    /**
     * 缓存上一次游戏的视频名称，用于重玩
     */
    private _lastSavedVideoName: string = null;

    /**
     * 缓存上一次游戏的视频类型，用于重玩
     */
    private _lastSavedVideoTypes: number[] = null;


    constructor() {
        // 监听退出登录事件，清理缓存数据
        EventManager.getInstance().on(LoginManager.LogoutEvent, this.onLogout, this);
    }

    /**
     * 退出登录回调 - 清理所有缓存数据
     */
    private onLogout(): void {
        this.clearLastGameData();
        DebugLog.instance.log(`ListeningModel 收到退出登录事件，清理缓存数据`);
    }

    /**
     * 获取缓存的题目
     */
    public get lastSavedQuestions(): IListeningConfig[] {
        return this._lastSavedQuestions;
    }

    /**
     * 获取缓存的视频路径
     */
    public get lastSavedVideoPath(): string {
        return this._lastSavedVideoPath;
    }

    /**
     * 获取缓存的视频名称
     */
    public get lastSavedVideoName(): string {
        return this._lastSavedVideoName;
    }

    /**
     * 获取缓存的视频类型
     */
    public get lastSavedVideoTypes(): number[] {
        return this._lastSavedVideoTypes;
    }

    /**
     * 保存当前游戏的题目和视频信息（用于重玩）
     * @param questions 题目列表
     * @param videoPath 视频路径
     * @param videoName 视频名称
     * @param videoTypes 视频类型数组
     */
    public saveLastGameData(
        questions: IListeningConfig[],
        videoPath: string,
        videoName: string,
        videoTypes: number[]
    ): void {
        this._lastSavedQuestions = questions ? [...questions] : null;
        this._lastSavedVideoPath = videoPath;
        this._lastSavedVideoName = videoName;
        this._lastSavedVideoTypes = videoTypes ? [...videoTypes] : null;
        DebugLog.instance.log(`ListeningModel 缓存游戏数据: 题目=${this._lastSavedQuestions?.map(q => q.name).join(', ')}, 视频路径=${this._lastSavedVideoPath}`);
    }

    /**
     * 检查是否有缓存的游戏数据
     */
    public hasLastGameData(): boolean {
        return this._lastSavedQuestions && this._lastSavedQuestions.length > 0 && !!this._lastSavedVideoPath;
    }

    /**
     * 清除缓存的游戏数据
     */
    public clearLastGameData(): void {
        this._lastSavedQuestions = null;
        this._lastSavedVideoPath = null;
        this._lastSavedVideoName = null;
        this._lastSavedVideoTypes = null;
        DebugLog.instance.log(`ListeningModel 清除缓存的游戏数据`);
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

                // 处理 JSON 数据，存储到 _configs 并按 type 和 hard 分组
                const jsonData = jsonAsset.json;
                this._configs = [];
                this._configsByTypeAndHard.clear();

                // 初始化分组结构：为每个 type (1-5) 创建3个难度级别的数组
                for (let type = 1; type <= 5; type++) {
                    this._configsByTypeAndHard.set(type, [[], [], []]); // [hard1, hard2, hard3]
                }

                for (const key in jsonData) {
                    if (jsonData.hasOwnProperty(key)) {
                        const item = jsonData[key];
                        const type = parseInt(item.type) || 1;
                        const hard = parseInt(item.hard) || 1;

                        const config: IListeningConfig = {
                            name: item.name || key,
                            duration: parseInt(item.duration) || 0,
                            path: item.path || "",
                            type: type,
                            hard: hard
                        };

                        this._configs.push(config);

                        // 按 type 和 hard 分组
                        if (type >= 1 && type <= 5 && hard >= 1 && hard <= 3) {
                            const typeConfigs = this._configsByTypeAndHard.get(type);
                            if (typeConfigs) {
                                const hardIndex = hard - 1; // hard 1->0, 2->1, 3->2
                                typeConfigs[hardIndex].push(config);
                            }
                        }
                    }
                }

                // 输出分组统计信息
                let totalGrouped = 0;
                for (let type = 1; type <= 5; type++) {
                    const typeConfigs = this._configsByTypeAndHard.get(type);
                    if (typeConfigs) {
                        const hard1Count = typeConfigs[0].length;
                        const hard2Count = typeConfigs[1].length;
                        const hard3Count = typeConfigs[2].length;
                        totalGrouped += hard1Count + hard2Count + hard3Count;
                        DebugLog.instance.log(`Type ${type}: hard1=${hard1Count}, hard2=${hard2Count}, hard3=${hard3Count}`);
                    }
                }

                DebugLog.instance.log(`配置文件解析完成，共加载 ${this._configs.length} 个配置项，分组统计：${totalGrouped} 个`);

                // 加载 video.json
                bundle.load("data/video", JsonAsset, (err, videoJsonAsset) => {
                    if (err) {
                        DebugLog.instance.error(`加载视频配置文件失败: data/video.json`, err);
                        reject(err);
                        return;
                    }

                    if (!videoJsonAsset || !videoJsonAsset.json) {
                        const error = new Error(`视频配置文件数据无效: data/video.json`);
                        DebugLog.instance.error(error.message);
                        reject(error);
                        return;
                    }

                    DebugLog.instance.log(`视频配置文件加载成功: data/video.json`);

                    // 处理视频 JSON 数据，按名字存储
                    const videoJsonData = videoJsonAsset.json;
                    this._videoConfigs.clear();

                    for (const key in videoJsonData) {
                        if (videoJsonData.hasOwnProperty(key)) {
                            const item = videoJsonData[key];
                            const videoConfig: IVideoConfig = {
                                path: item.path || "",
                                type: Array.isArray(item.type) ? item.type : []
                            };
                            this._videoConfigs.set(key, videoConfig);
                        }
                    }

                    DebugLog.instance.log(`视频配置文件解析完成，共加载 ${this._videoConfigs.size} 个视频配置`);
                    resolve();
                });
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

    /**
     * 获取按type和hard分组的配置数据
     * @returns Map<type, IListeningConfig[][]>，其中 value 是 [hard1的配置数组, hard2的配置数组, hard3的配置数组]
     */
    public getConfigsByTypeAndHard(): Map<number, IListeningConfig[][]>;

    /**
     * 根据type和hard获取配置数组
     * @param type 资源类型：1=环境，2=居家，3=自然，4=宠物，5=动物
     * @param hard 难度：1=容易，2=中等，3=难
     * @returns 对应type和hard的配置数组
     */
    public getConfigsByTypeAndHard(type: number, hard: number): IListeningConfig[];

    public getConfigsByTypeAndHard(type?: number, hard?: number): Map<number, IListeningConfig[][]> | IListeningConfig[] {
        if (type !== undefined && hard !== undefined) {
            // 根据type和hard获取配置数组
            const typeConfigs = this._configsByTypeAndHard.get(type);
            if (!typeConfigs) {
                DebugLog.instance.warn(`Type ${type} 不存在`);
                return [];
            }

            const hardIndex = hard - 1; // hard 1->0, 2->1, 3->2
            if (hardIndex < 0 || hardIndex >= typeConfigs.length) {
                DebugLog.instance.warn(`Hard ${hard} 不存在`);
                return [];
            }

            return typeConfigs[hardIndex] || [];
        } else {
            // 返回整个分组Map
            return this._configsByTypeAndHard;
        }
    }

    /**
     * 获取所有视频配置
     * @returns Map<视频名字, IVideoConfig>
     */
    public getVideoConfigs(): Map<string, IVideoConfig> {
        return this._videoConfigs;
    }

    /**
     * 根据名字获取视频配置
     * @param name 视频名字
     * @returns 视频配置，如果不存在则返回 null
     */
    public getVideoConfig(name: string): IVideoConfig | null {
        return this._videoConfigs.get(name) || null;
    }

    /**
     * 随机获取一个视频配置
     * @returns 视频配置，如果不存在则返回 null
     */
    public getRandomVideoConfig(): { name: string; config: IVideoConfig } | null {
        if (this._videoConfigs.size === 0) {
            DebugLog.instance.warn(`视频配置数据未加载或为空`);
            return null;
        }

        const videoNames = Array.from(this._videoConfigs.keys());
        const randomIndex = Math.floor(Math.random() * videoNames.length);
        const randomName = videoNames[randomIndex];
        const config = this._videoConfigs.get(randomName);

        if (!config) {
            return null;
        }

        return { name: randomName, config: config };
    }

    /**
     * 根据视频的type数组和难度要求获取音频配置
     * @param videoTypes 视频支持的type数组
     * @param hard 难度等级（1-3）
     * @returns 音频配置数组
     */
    public getQuestionByVideoType(videoTypes: number[], hard: number = 1): IListeningConfig[] {
        if (!this._configsByTypeAndHard || this._configsByTypeAndHard.size === 0) {
            DebugLog.instance.warn(`配置数据未加载或为空`);
            return [];
        }

        if (!videoTypes || videoTypes.length === 0) {
            DebugLog.instance.warn(`视频type数组为空`);
            return [];
        }

        // 根据难度确定需要的音频数量
        // 难度3：hard1-2个，hard2-2个，hard3-1个（总共5个）
        // 难度2：hard1-2个，hard2-1个，hard3-1个（总共4个）
        // 难度1：hard1-2个，hard2-1个（总共3个）
        const hardRequirements: { [key: number]: { hard1: number; hard2: number; hard3: number } } = {
            1: { hard1: 2, hard2: 1, hard3: 0 },
            2: { hard1: 2, hard2: 1, hard3: 1 },
            3: { hard1: 2, hard2: 2, hard3: 1 }
        };

        const requirements = hardRequirements[hard] || hardRequirements[1];
        const result: IListeningConfig[] = [];

        // 获取上一局使用过的音效name集合（排除上一局的音效）
        const lastRoundNames = this._lastRoundQuestions.get(hard) || new Set<string>();

        // 从所有支持的type中收集可用的音频配置
        const availableConfigsByHard: { [key: number]: IListeningConfig[] } = {
            1: [],
            2: [],
            3: []
        };

        for (const type of videoTypes) {
            const typeConfigs = this._configsByTypeAndHard.get(type);
            if (typeConfigs) {
                // typeConfigs 是 [hard1的配置数组, hard2的配置数组, hard3的配置数组]
                for (let hardLevel = 1; hardLevel <= 3; hardLevel++) {
                    const hardIndex = hardLevel - 1;
                    const configs = typeConfigs[hardIndex] || [];
                    // 排除上一局使用过的音效
                    const filteredConfigs = configs.filter(config => !lastRoundNames.has(config.name));
                    availableConfigsByHard[hardLevel].push(...filteredConfigs);
                }
            }
        }

        // 如果可用配置数量不足，清空上一局记录，使用所有配置
        let needClearLastRound = false;
        for (let hardLevel = 1; hardLevel <= 3; hardLevel++) {
            const required = requirements[`hard${hardLevel}` as keyof typeof requirements];
            if (required > 0 && availableConfigsByHard[hardLevel].length < required) {
                needClearLastRound = true;
                break;
            }
        }

        if (needClearLastRound) {
            DebugLog.instance.warn(`可用配置数量不足，清空上一局记录，使用所有配置`);
            this._lastRoundQuestions.delete(hard);
            // 重新收集所有配置（不排除上一局）
            availableConfigsByHard[1] = [];
            availableConfigsByHard[2] = [];
            availableConfigsByHard[3] = [];
            for (const type of videoTypes) {
                const typeConfigs = this._configsByTypeAndHard.get(type);
                if (typeConfigs) {
                    for (let hardLevel = 1; hardLevel <= 3; hardLevel++) {
                        const hardIndex = hardLevel - 1;
                        const configs = typeConfigs[hardIndex] || [];
                        availableConfigsByHard[hardLevel].push(...configs);
                    }
                }
            }
        }

        // 从每个hard级别中随机选择指定数量的音频
        for (let hardLevel = 1; hardLevel <= 3; hardLevel++) {
            const required = requirements[`hard${hardLevel}` as keyof typeof requirements];
            if (required > 0) {
                const availableConfigs = availableConfigsByHard[hardLevel];
                if (availableConfigs.length === 0) {
                    DebugLog.instance.warn(`hard${hardLevel} 级别没有可用的音频配置`);
                    continue;
                }

                // 随机选择指定数量的配置
                const selectedConfigs: IListeningConfig[] = [];
                const availableIndices = Array.from({ length: availableConfigs.length }, (_, i) => i);
                const selectCount = Math.min(required, availableConfigs.length);

                for (let i = 0; i < selectCount; i++) {
                    const randomIndex = Math.floor(Math.random() * availableIndices.length);
                    const selectedIndex = availableIndices.splice(randomIndex, 1)[0];
                    selectedConfigs.push(availableConfigs[selectedIndex]);
                }

                result.push(...selectedConfigs);
            }
        }

        // 更新上一局记录
        this.updateLastRoundQuestions(hard, result);

        DebugLog.instance.log(`根据视频type获取题目: 难度=${hard}, 视频types=[${videoTypes.join(',')}], 获取数量=${result.length} (hard1=${requirements.hard1}, hard2=${requirements.hard2}, hard3=${requirements.hard3})`);
        return result;
    }

}
import { assetManager, JsonAsset } from "cc";
import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";
import { BundleName } from "../../resources/scripts/Core/Manager/Load/BundleName";

// 新增标点符号选项接口
interface PunctuationOption {
    index: number;
    text: string;
}

export class SentenceMakingQuestion {
    constructor(
        public sentence: string[],
        public fixed: number[],
        public punctuationOptions: PunctuationOption[] = [] // 新增标点选项
    ) { }
}

export class SentenceMakingConfig {
    private jsonFilePath: string = "config/sentenceQuestions";
    private levelQuestions: { [key: string]: SentenceMakingQuestion[] } = {};

    async loadConfig() {
        let bundle = assetManager.getBundle(BundleName.SENTENCEMAKING);
        let self = this;
        await new Promise<void>((resolve, reject) => {
            bundle.load(this.jsonFilePath, JsonAsset, (err: Error | null, data: JsonAsset) => {
                if (err) {
                    DebugLog.instance.warn("加载配置文件失败:" + err);
                    reject(err);
                } else {
                    const rawData = data.json;
                    for (let level in rawData) {
                        if (rawData.hasOwnProperty(level)) {
                            self.levelQuestions[level] = [];
                            const levelData = rawData[level];
                            for (let question of levelData) {
                                // 核心处理逻辑
                                const { modifiedSentence, newFixed, adjustedPunctuations } = this.processQuestion(question);

                                // 创建问题实例时使用处理后的数据
                                const newQuestion = new SentenceMakingQuestion(
                                    modifiedSentence,
                                    newFixed,
                                    adjustedPunctuations // 使用调整后的标点选项
                                );
                                self.levelQuestions[level].push(newQuestion);
                            }
                        }
                    }
                    resolve();
                }
            });
        });
    }

    getQuestionByDifficultAndLevel(difficult: number, level: number): SentenceMakingQuestion {
        let fixedDifficult = difficult <= 0 ? 0 : difficult - 1;
        const questions = this.levelQuestions["level_" + fixedDifficult];
        let fixedLevel = level % questions.length;
        return questions[fixedLevel];
    }

    getQuestionsByDifficult(difficult: number): SentenceMakingQuestion[] {
        let _difficult = difficult <= 0 ? 0 : difficult - 1;
        return this.levelQuestions["level_" + _difficult] || [];
    }

    private processQuestion(question: any): {
        modifiedSentence: string[],
        newFixed: number[],
        adjustedPunctuations: PunctuationOption[]
    } {
        let sentence = [...question.sentence];
        const originalFixed = new Set(question.fixed);
        const punctuationOptions = question.punctuationOptions || [];

        // 步骤1：倒序插入标点（无需offset）
        const sortedPunctuations = [...punctuationOptions].sort((a, b) => b.index - a.index);
        const insertionMap = new Map<number, number>();

        sortedPunctuations.forEach(p => {
            // 直接使用原始index插入
            const insertPos = p.index + 1;
            sentence.splice(insertPos, 0, p.text);

            // 记录每个原始index的插入次数
            insertionMap.set(p.index, (insertionMap.get(p.index) || 0) + 1);
        });

        // 步骤2：计算新的fixed索引
        const newFixed = [];

        // 处理原始fixed
        question.fixed.forEach(originalIndex => {
            let adjustedIndex = originalIndex;
            // 累加所有在当前位置之前的插入次数
            insertionMap.forEach((count, insertPos) => {
                if (originalIndex > insertPos) {
                    adjustedIndex += count;
                }
            });
            newFixed.push(adjustedIndex);
        });

        // 处理标点本身的fixed
        punctuationOptions.forEach(p => {
            let adjustedPos = p.index + 1; // 原始插入位置
            // 累加在当前位置之前的插入次数
            insertionMap.forEach((count, insertPos) => {
                if (p.index > insertPos) {
                    adjustedPos += count;
                }
            });
            newFixed.push(adjustedPos);
        });

        // 步骤3：调整标点选项的index
        const adjustedPunctuations = punctuationOptions.map(p => {
            let adjustedIndex = p.index + 1; // 原始插入位置
            insertionMap.forEach((count, insertPos) => {
                if (p.index > insertPos) {
                    adjustedIndex += count;
                }
            });
            return {
                ...p,
                index: adjustedIndex
            };
        });

        // 添加索引校验
        const validNewFixed = newFixed.filter(index => {
            const isValid = index >= 0 && index < sentence.length;
            if (!isValid) {
                DebugLog.instance.warn(`无效的fixed索引：${index}，句子长度：${sentence.length}`);
            }
            return isValid;
        });

        return {
            modifiedSentence: sentence,
            newFixed: [...new Set(validNewFixed)].sort((a, b) => a - b),
            adjustedPunctuations
        };
    }
}
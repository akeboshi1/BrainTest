import { assetManager, JsonAsset } from "cc";
import { DebugLog } from "../../scripts/Core/Util/DebugLog";
import { BundleName } from "../../scripts/Core/Manager/Load/BundleName";

export class SentenceMakingQuestion {
    constructor(
        public sentence: string[],
        public fixed: number[]
    ) {}
}

export class SentenceMakingConfig {
    private jsonFilePath: string = "config/sentenceQuestions";
    private levelQuestions: { [key: string]: SentenceMakingQuestion[] } = {};

    async loadConfig() {
        let bundle = assetManager.getBundle(BundleName.SENTENCEMAKING);
        let self = this;
        await new Promise<void>((resolve, reject) => {
            bundle.load(self.jsonFilePath, JsonAsset, (err: Error | null, data: JsonAsset) => {
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
                                const newQuestion = new SentenceMakingQuestion(
                                    question.sentence,
                                    question.fixed
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

    getQuestionByLevelAndIndex(level: number, index: number): SentenceMakingQuestion | null {
        const questions = this.levelQuestions["level_"+level];
        if (questions && index >= 0 && index < questions.length) {
            return questions[index];
        }
        return null;
    }

    getQuestionsByLevel(level: number): SentenceMakingQuestion[] {
        return this.levelQuestions["level_"+level] || [];
    }
}
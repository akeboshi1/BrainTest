import { assetManager, JsonAsset } from "cc";
import { ConfigManager } from "../../scripts/Core/Manager/Config/ConfigManager";
import { DebugLog } from "../../scripts/Core/Util/DebugLog";

export class GuessingQuestion {
    questionNumber: number;
    questionText: string;
    options: {
        a: string;
        b: string;
        c: string;
        d: string;
    };
    answer: string;
    solutionThoughts: string;
    audioSource: string;
}

export class GuessingGameConfig {
    private quessingQuestions: Map<string, GuessingQuestion> = new Map();
    private jsonFilePath: string = "config/guessingGameConfig";
    private bundleName: string = "guessingGame";

    // 解析JSON文件的方法
    async loadConfig() {
        let bundle = assetManager.getBundle(this.bundleName);

        await new Promise((resolve, reject) => {
            bundle.load(this.jsonFilePath, JsonAsset, (err: Error | null, data: JsonAsset) => {
                if (err) {
                    DebugLog.instance.warn("加载配置文件失败:"+err);
                    reject(err);
                } else {
                    let qb = data.json.questionBank;
                    // 设置quessingQuestions
                    for (const question of qb) {
                        this.quessingQuestions.set(question.questionNumber.toString(), question);
                    }
                    DebugLog.instance.log("GuessingGameConfig load success!!! ");
                    resolve(data);
                }
            });
        });
    }

    // 根据题目编号获取指定题目信息
    getQuestionByNumber(questionNumber: number): GuessingQuestion {
        if (!this.quessingQuestions.has(questionNumber.toString())) {
            throw new Error(`未找到题目编号为 ${questionNumber} 的题目信息，请检查配置文件或题目编号是否正确。`);
        }
        return this.quessingQuestions.get(questionNumber.toString())!;
    }

    // 根据题目编号获取题目答案
    getAnswerByNumber(questionNumber: number): string {
        const question = this.getQuestionByNumber(questionNumber);
        return question.answer;
    }

    // 根据题目编号获取解题思路
    getSolutionThoughtsByNumber(questionNumber: number): string {
        const question = this.getQuestionByNumber(questionNumber);
        return question.solutionThoughts;
    }

    // 根据题目编号获取音频资源文件名
    getAudioSourceByNumber(questionNumber: number): string {
        const question = this.getQuestionByNumber(questionNumber);
        return question.audioSource;
    }

    getNextQuestionNumber(questionNumber:number):number{
        const questionNumbers = Array.from(this.quessingQuestions.keys()).map(Number);
        const currentIndex = questionNumbers.indexOf(questionNumber);
        if (currentIndex === -1) {
            throw new Error(`题目编号 ${questionNumber} 不存在，请检查输入的题目编号是否正确。`);
        }
        const nextIndex = currentIndex + 1;
        if (nextIndex >= questionNumbers.length) {
            return questionNumbers[0]; // 如果已经是最后一题，返回第一道题的编号，形成循环
        }
        return questionNumbers[nextIndex];
    }
}
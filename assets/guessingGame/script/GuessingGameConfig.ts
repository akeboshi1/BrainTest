import { assetManager, JsonAsset } from "cc";
import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";

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
    hasAnswer: boolean;
}

export class GuessingGameConfig {
    private quessingQuestions: Map<string, GuessingQuestion> = new Map();
    private jsonFilePath: string = "config/guessingGameConfig";
    private bundleName: string = "guessingGame";
    private questionNums: number[] = [];

    // 解析JSON文件的方法
    async loadConfig() {
        let bundle = assetManager.getBundle(this.bundleName);

        await new Promise((resolve, reject) => {
            bundle.load(this.jsonFilePath, JsonAsset, (err: Error | null, data: JsonAsset) => {
                if (err) {
                    DebugLog.instance.warn("加载配置文件失败:" + err);
                    reject(err);
                } else {
                    let qb = data.json.questionBank;
                    // 设置quessingQuestions
                    for (let question of qb) {
                        question.hasAnswer = false;
                        this.quessingQuestions.set(question.questionNumber.toString(), question);
                        this.questionNums.push(question.questionNumber);
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

    formartQuestionID(v:number):number{
        if(this.questionNums.indexOf(v)>=0){
            return v;
        }else{
            v = v % this.questionNums.length + 1;
            return v;
        }
    }
}
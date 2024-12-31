import { DebugLog } from "../../scripts/Core/Util/DebugLog";
import { SentenceMakingConfig, SentenceMakingQuestion } from "./SentenceMakingConfig";

export class SentenceMakingModel {
    constructor() {
    }

    private binit: boolean = false;

    private config: SentenceMakingConfig = new SentenceMakingConfig();

    private selectedLevel: number = 0;
    private currentQuestionIndex: number = 0;

    async init() {
        if (this.binit) return;
        this.binit = true;

        await this.config.loadConfig();
    }

    setQuestionLevel(level: number) {
        if (this.config.getQuestionsByLevel(this.selectedLevel).length != 0) {
            this.selectedLevel = level;
        } else {
            DebugLog.instance.warn("this question level is not exist in config! level: " + level);
        }
    }

    getCurrentQuestion(): SentenceMakingQuestion {
        return this.config.getQuestionByLevelAndIndex(this.selectedLevel, this.currentQuestionIndex);
    }

    goNextQuestion() {
        this.currentQuestionIndex = (this.currentQuestionIndex + 1) % this.config.getQuestionsByLevel(this.selectedLevel).length;
    }

    getCurrentLevel():number{
        return this.selectedLevel;
    }

    getCurrentQuestionIndex():number{
        return this.currentQuestionIndex;
    }

    dispose() {

    }
}

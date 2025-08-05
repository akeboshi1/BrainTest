export class FishQuestion {
    public question: string;
    public options: string[];
    public correctAnswer: string;

    constructor(value) {
        this.question = value.question;
        this.options = value.options;
        this.correctAnswer = value.correctAnswer;
    }
}

export class CreateQuestion {
    constructor() { }

    public static async create(hard: number): Promise<FishQuestion> {
        return await CreateQuestion.generateMathQuestion(hard);
    }

    private static async generateRandomInt(min: number, max: number): Promise<number> {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private static async generateMathQuestion(difficulty): Promise<FishQuestion> {
        const getRandomInt = async (min: number, max: number) => {
            return await CreateQuestion.generateRandomInt(min, max);
        };

        // 最大重试次数常量
        const MAX_RETRIES = 50;

        let question = '';
        let correctAnswer = 0;

        if (difficulty === 1) {
            // 难度一：加减法
            const operation = await getRandomInt(1, 2); // 1: 加法, 2: 减法

            if (operation === 1) {
                // 加法：1位数+1位数（有进位）或2位数+1位数（不进位）
                const addType = await getRandomInt(1, 2);
                
                if (addType === 1) {
                    // 1位数+1位数（有进位，如5+6）
                    let a, b;
                    let retries = 0;
                    do {
                        a = await getRandomInt(5, 9);
                        b = await getRandomInt(5, 9);
                        retries++;
                        // 保底措施：如果重试次数过多，强制生成有进位的题目
                        if (retries >= MAX_RETRIES) {
                            a = 9;
                            b = 9;
                            break;
                        }
                    } while (a + b < 10); // 确保有进位
                    question = `${a} + ${b}`;
                    correctAnswer = a + b;
                } else {
                    // 2位数+1位数（不进位，如15+4）
                    let a, b;
                    let retries = 0;
                    do {
                        a = await getRandomInt(10, 19);
                        b = await getRandomInt(1, 9);
                        retries++;
                        // 保底措施：如果重试次数过多，强制生成不进位的题目
                        if (retries >= MAX_RETRIES) {
                            a = 10;
                            b = 1;
                            break;
                        }
                    } while ((a % 10) + b >= 10); // 确保不进位
                    question = `${a} + ${b}`;
                    correctAnswer = a + b;
                }

            } else if (operation === 2) {
                // 减法：不能借位（如9-5或19-5）
                const subType = await getRandomInt(1, 2);
                
                if (subType === 1) {
                    // 1位数-1位数（不能借位）
                    let a, b;
                    let retries = 0;
                    do {
                        a = await getRandomInt(5, 9);
                        b = await getRandomInt(1, 4);
                        retries++;
                        // 保底措施：如果重试次数过多，强制生成不借位的题目
                        if (retries >= MAX_RETRIES) {
                            a = 9;
                            b = 5;
                            break;
                        }
                    } while (a <= b); // 确保不能借位且结果不为0
                    question = `${a} - ${b}`;
                    correctAnswer = a - b;
                } else {
                    // 2位数-1位数（不能借位）
                    let a, b;
                    let retries = 0;
                    do {
                        a = await getRandomInt(10, 19);
                        b = await getRandomInt(1, 8);
                        retries++;
                        // 保底措施：如果重试次数过多，强制生成不借位的题目
                        if (retries >= MAX_RETRIES) {
                            a = 19;
                            b = 5;
                            break;
                        }
                    } while ((a % 10) < b || a - b <= 0); // 确保不能借位且结果不为0
                    question = `${a} - ${b}`;
                    correctAnswer = a - b;
                }
            }
        } else if (difficulty === 2) {
            // 难度二：加减法
            const operation = await getRandomInt(1, 2); // 1: 加法, 2: 减法

            if (operation === 1) {
                // 加法：两位数加两位数（不进位）或两位数加一位数（有进位）
                const addType = await getRandomInt(1, 2);
                
                if (addType === 1) {
                    // 两位数加两位数（不进位，如33+12）
                    let a, b;
                    let retries = 0;
                    do {
                        a = await getRandomInt(20, 89);
                        b = await getRandomInt(10, 89);
                        retries++;
                        // 保底措施：如果重试次数过多，强制生成不进位的题目
                        if (retries >= MAX_RETRIES) {
                            a = 20;
                            b = 10;
                            break;
                        }
                    } while ((a % 10) + (b % 10) >= 10 || (Math.floor(a / 10) + Math.floor(b / 10)) >= 9); // 确保不进位
                    question = `${a} + ${b}`;
                    correctAnswer = a + b;
                } else {
                    // 两位数加一位数（有进位，如25+8）
                    let a, b;
                    let retries = 0;
                    do {
                        a = await getRandomInt(20, 89);
                        b = await getRandomInt(1, 9);
                        retries++;
                        // 保底措施：如果重试次数过多，强制生成有进位的题目
                        if (retries >= MAX_RETRIES) {
                            a = 25;
                            b = 8;
                            break;
                        }
                    } while ((a % 10) + b < 10); // 确保有进位
                    question = `${a} + ${b}`;
                    correctAnswer = a + b;
                }

            } else if (operation === 2) {
                // 减法：2位数-1位数（有借位，如23-7）
                let a, b;
                let retries = 0;
                do {
                    a = await getRandomInt(20, 99);
                    b = await getRandomInt(1, 9);
                    retries++;
                    // 保底措施：如果重试次数过多，强制生成有借位的题目
                    if (retries >= MAX_RETRIES) {
                        a = 23;
                        b = 7;
                        break;
                    }
                } while ((a % 10) >= b || a - b <= 0); // 确保有借位且结果不为0
                question = `${a} - ${b}`;
                correctAnswer = a - b;
            }
        } else if (difficulty === 3) {
            // 难度三：连续两次计算，必须有一加一减，两次计算都需要进位或借位
            // 格式：2位数+1位数-1位数，如：25+8-7
            
            // 第一步：2位数+1位数（有进位）
            let a, b;
            let retries = 0;
            do {
                a = await getRandomInt(20, 89);
                b = await getRandomInt(1, 9);
                retries++;
                // 保底措施：如果重试次数过多，强制生成有进位的题目
                if (retries >= MAX_RETRIES) {
                    a = 25;
                    b = 8;
                    break;
                }
            } while ((a % 10) + b < 10); // 确保有进位
            
            let firstResult = a + b;
            
            // 第二步：减去1位数（有借位），且不能与加法中的1位数相同
            let c;
            retries = 0;
            do {
                c = await getRandomInt(1, 9);
                retries++;
                // 保底措施：如果重试次数过多，强制生成有借位的题目
                if (retries >= MAX_RETRIES) {
                    c = 7;
                    break;
                }
            } while ((firstResult % 10) >= c || firstResult - c <= 0 || c === b); // 确保有借位且结果不为0，且c不等于b
            
            question = `${a} + ${b} - ${c}`;
            correctAnswer = firstResult - c;
        }

        // 生成选项
        const options = new Set();
        options.add(correctAnswer.toString());

        // 生成错误选项，确保不等于正确答案
        let optionRetries = 0;
        const MAX_OPTION_RETRIES = 100;
        
        while (options.size < 4 && optionRetries < MAX_OPTION_RETRIES) {
            const wrongAnswer = await getRandomInt(correctAnswer - 10, correctAnswer + 10);
            // 确保错误选项不等于正确答案且为正数
            if (wrongAnswer !== correctAnswer && wrongAnswer > 0) {
                options.add(wrongAnswer.toString());
            }
            optionRetries++;
        }

        // 保底措施：如果无法生成足够的错误选项，手动添加一些
        if (options.size < 4) {
            const fallbackOptions = [
                correctAnswer + 1,
                correctAnswer - 1,
                correctAnswer + 2,
                correctAnswer - 2,
                correctAnswer + 5,
                correctAnswer - 5
            ];
            
            for (let option of fallbackOptions) {
                if (options.size >= 4) break;
                if (option > 0 && option !== correctAnswer) {
                    options.add(option.toString());
                }
            }
        }

        // 将 Set 转换为数组并打乱选项
        const optionsArray = Array.from(options);
        const shuffledOptions = optionsArray.sort(() => Math.random() - 0.5);

        return new FishQuestion({
            question: question,
            options: shuffledOptions,
            correctAnswer: correctAnswer.toString(),
        });
    }


}
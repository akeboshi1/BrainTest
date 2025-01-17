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
        let question = await CreateQuestion.generateMathQuestion(hard);
        return question;
    }

    private static async generateRandomInt(min: number, max: number): Promise<number> {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    private static async generateMathQuestion(difficulty): Promise<FishQuestion> {
        const getRandomInt = async (min: number, max: number) => {
            return await CreateQuestion.generateRandomInt(min, max);
        };

        let question = '';
        let correctAnswer = 0;

        if (difficulty === 1) {
            // 难度一：加减法、除法和乘法
            const operation = await getRandomInt(1, 4); // 1: 加法, 2: 减法, 3: 除法, 4: 乘法

            if (operation === 1) {
                // 加法
                const a = await getRandomInt(1, 20);
                const b = await getRandomInt(1, 9);
                question = `${a} + ${b}`;
                correctAnswer = a + b;
            } else if (operation === 2) {
                // 减法，确保结果不小于0
                let a, b;
                while (true) {
                    a = await getRandomInt(1, 20);
                    b = await getRandomInt(1, 9); // b 小于等于 a
                    if (b <= a) {
                        break;
                    }
                }
                question = `${a} - ${b}`;
                correctAnswer = a - b;
            } else if (operation === 3) {
                // 除法（确保不产生余数）
                let divisor, quotient, a;
                while (true) {
                    divisor = await getRandomInt(2, 9); // 除数从2到9
                    quotient = await getRandomInt(1, 4); // 商从1到4
                    a = divisor * quotient; // 被除数
                    if (a <= 9) {
                        continue;
                    }
                    question = `${a} ÷ ${divisor}`;
                    correctAnswer = quotient; // 商
                    break;
                }
            } else if (operation === 4) {
                let type = await getRandomInt(0, 1);
                let a, b;
                if (type == 1) {
                    // 乘法（两个数小于等于5，且不为1）
                    a = await getRandomInt(2, 5);
                    b = await getRandomInt(2, 5);
                } else {
                    // 乘法（1个数小于等于5，另一个数大于5小于等于10,且不为1）
                    a = await getRandomInt(2, 5);
                    b = await getRandomInt(6, 10);
                }
                question = `${a} x ${b}`;
                correctAnswer = a * b;
            }

        } else if (difficulty === 2) {
            // 难度二：加减法、乘法、除法
            const operation = await getRandomInt(1, 4); // 1: 加法, 2: 减法, 3: 乘法, 4: 除法

            if (operation === 1) {
                let type = await getRandomInt(0, 1);
                let a, b;
                if (type == 1) {
                    // 2位数加法
                    a = await getRandomInt(10, 99);
                    b = await getRandomInt(10, 99);
                } else {
                    // 2位数字（20以上） 加 1位数字
                    a = await getRandomInt(21, 99);
                    b = await getRandomInt(1, 9);
                }
                question = `${a} + ${b}`;
                correctAnswer = a + b;
            } else if (operation === 2) {
                // 2位数减1位数
                let a, b;
                while (true) {
                    a = await getRandomInt(21, 99);
                    b = await getRandomInt(1, 9);
                    if (a - b >= 0) {
                        break;
                    }
                }
                question = `${a} - ${b}`;
                correctAnswer = a - b; // 确保结果不小于0
            } else if (operation === 3) {
                // 乘法
                let a, b;
                if (await getRandomInt(1, 2) === 1) {
                    a = await getRandomInt(6, 10);
                    b = await getRandomInt(6, 10);
                } else {
                    // 被乘数大于10且小于12，乘数小于等于5
                    a = await getRandomInt(11, 12);
                    b = await getRandomInt(2, 5); // 确保乘数不为1
                }
                question = `${a} x ${b}`;
                correctAnswer = a * b;
            } else if (operation === 4) {
                // 除法（确保不产生余数）
                let products = [];
                for (let i = 1; i <= 9; i++) {
                    for (let j = 1; j <= 9; j++) {
                        const product = i * j;
                        if (product >= 10 && product <= 81) {
                            if (CreateQuestion.isInMultiplicationTable(product)) {
                                products.push({ product, num0: i, num1: j });
                            }
                        }
                    }
                }
                let value;
                while (true) {
                    value = products[await getRandomInt(0, products.length - 1)]; // 随机选择一个被除数
                    if (value) {
                        break;
                    }
                }
                const a = value.product;
                const divisor = (await getRandomInt(0, 1) == 0) ? value.num0 : value.num1;

                question = `${a} ÷ ${divisor}`;
                correctAnswer = a / divisor; // 商
            }

        } else if (difficulty === 3) {
            const getRandomOperation = async () => {
                return await getRandomInt(1, 4); // 1: 加法, 2: 减法, 3: 乘法, 4: 除法
            };

            const generateInnerQuestion = async () => {
                const operation = await getRandomOperation();
                let innerQuestion = '';
                let result = 0;

                if (operation === 1) {
                    // 加法
                    let a, b;
                    do {
                        const type = await getRandomInt(0, 1);
                        if (type === 0) {
                            // 2位数加法
                            a = await getRandomInt(10, 50);
                            b = await getRandomInt(10, 50);
                        } else {
                            // 2位数字（20以上） 加 1位数字
                            a = await getRandomInt(21, 90);
                            b = await getRandomInt(1, 9);
                        }
                        result = a + b;
                    } while (result > 100);
                    innerQuestion = `${a} + ${b}`;
                } else if (operation === 2) {
                    // 减法
                    let a, b;
                    while (true) {
                        a = await getRandomInt(21, 99);
                        b = await getRandomInt(1, 9);
                        if (a - b >= 0) {
                            break;
                        }
                    }
                    innerQuestion = `${a} - ${b}`;
                    result = a - b; // 确保结果不小于0
                } else if (operation === 3) {
                    // 乘法
                    const type = await getRandomInt(0, 1);
                    let a, b;
                    if (type === 0) {
                        // 两个数字大于5且小于等于10
                        a = await getRandomInt(6, 10);
                        b = await getRandomInt(6, 10);
                    } else {
                        // 被乘数大于10且小于等于12，乘数小于等于5
                        a = await getRandomInt(11, 12);
                        b = await getRandomInt(2, 5);
                    }
                    innerQuestion = `${a} x ${b}`;
                    result = a * b;
                } else if (operation === 4) {
                    // 除法，确保不产生余数
                    let divisor, quotient, a;
                    while (true) {
                        divisor = await getRandomInt(2, 9); // 除数为1位数
                        quotient = await getRandomInt(2, 9); // 商为整数
                        a = divisor * quotient; // 被除数
                        if (a >= 10) {
                            break;
                        }
                    }
                    innerQuestion = `${a} ÷ ${divisor}`;
                    result = quotient; // 商
                }

                return { innerQuestion, result };
            };

            let innerResult;
            let innerQuestion;
            let outerOperation;
            let outerNumber;

            do {
                const inner = await generateInnerQuestion();
                innerQuestion = inner.innerQuestion;
                innerResult = inner.result;
                outerOperation = await getRandomOperation();

                if (outerOperation === 3 || outerOperation === 4) {
                    // 乘法或除法时，外部数字不能为1
                    outerNumber = await getRandomInt(2, 9);
                } else {
                    // 加法或减法时，外部数字可以为1
                    outerNumber = await getRandomInt(1, 9);
                }

                if (outerOperation === 4) {
                    // 除法，确保结果为整数
                    while (innerResult % outerNumber !== 0 || innerResult < 10) {
                        const res = await generateInnerQuestion();
                        innerQuestion = res.innerQuestion;
                        innerResult = res.result;
                    }
                }
            } while (outerOperation === 4 && (innerResult % outerNumber !== 0 || innerResult < 10));

            // 形成最终问题
            if (outerOperation === 1) {
                question = `(${innerQuestion}) + ${outerNumber}`;
                correctAnswer = innerResult + outerNumber;
            } else if (outerOperation === 2) {
                question = `(${innerQuestion}) - ${outerNumber}`;
                correctAnswer = innerResult - outerNumber; // 确保结果不小于0
                while (correctAnswer < 0) {
                    const res = await generateInnerQuestion();
                    innerQuestion = res.innerQuestion;
                    innerResult = res.result;
                    correctAnswer = innerResult - outerNumber;
                }
            } else if (outerOperation === 3) {
                while (innerResult > 15) {
                    const res = await generateInnerQuestion();
                    innerQuestion = res.innerQuestion;
                    innerResult = res.result;
                }
                question = `(${innerQuestion}) x ${outerNumber}`;
                correctAnswer = innerResult * outerNumber; // 乘法
            } else if (outerOperation === 4) {
                question = `(${innerQuestion}) ÷ ${outerNumber}`;
                correctAnswer = innerResult / outerNumber; // 商
            }
        }

        // 生成选项
        const options = new Set();
        options.add(correctAnswer.toString());

        // 生成错误选项，确保不等于正确答案
        while (options.size < 4) {
            const wrongAnswer = await getRandomInt(correctAnswer - 10, correctAnswer + 10);
            // 确保错误选项不等于正确答案且为非负数
            if (wrongAnswer !== correctAnswer && wrongAnswer >= 0) {
                options.add(wrongAnswer.toString());
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

    static isInMultiplicationTable(n) {
        // 检查范围
        if (n < 1 || n > 81) {
            return false;
        }

        // 检查因数
        for (let a = 1; a <= 9; a++) {
            for (let b = 1; b <= 9; b++) {
                if (a * b === n) {
                    return true; // 找到因数
                }
            }
        }

        return false; // 没有找到因数
    }
}
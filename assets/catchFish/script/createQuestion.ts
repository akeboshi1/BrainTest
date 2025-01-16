export class FishQuestion{
    public question:string;
    public options:string[];
    public correctAnswer:string;
    // public hasChose:boolean = false;


    constructor(value){
        this.question = value.question;
        this.options = value.options;
        this.correctAnswer = value.correctAnswer;
        // CreateQuestion.hasChose = value.hasChose;
    }
}

export class CreateQuestion {
    constructor() {
    }

    public static create(hard:number):FishQuestion {
        let question = CreateQuestion.generateMathQuestion(hard);
        return question;
    }


    private static generateMathQuestion(difficulty) {
        const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

        let question = '';
        let correctAnswer = 0;

        if (difficulty === 1) {
            // 难度一：加减法、除法和乘法
            const operation = getRandomInt(1, 4); // 1: 加法, 2: 减法, 3: 除法, 4: 乘法

            if (operation === 1) {
                // 加法
                const a = getRandomInt(1, 20);
                const b = getRandomInt(1, 9);
                question = `${a} + ${b}`;
                correctAnswer = a + b;
            } else if (operation === 2) {
                // 减法，确保结果不小于0
                const a = getRandomInt(1, 20);
                const b = getRandomInt(1, 9); // b 小于等于 a
                if (b > a) {
                    return CreateQuestion.generateMathQuestion(difficulty);
                }
                question = `${a} - ${b}`;
                correctAnswer = a - b;
            } else if (operation === 3) {
                // 除法（被除数为一位数，除数从2到9）
                const divisor = getRandomInt(2, 9); // 除数从2到9
                const quotient = getRandomInt(2, 9); // 商从2到9
                const a = divisor * quotient; // 被除数
                if (a > 9) {
                    return CreateQuestion.generateMathQuestion(difficulty); // 确保被除数为一位数
                }

                question = `${a} ÷ ${divisor}`;
                correctAnswer = quotient; // 商
            } else if (operation === 4) {
                const type = getRandomInt(0, 1);
                let a, b;
                if (type == 1) {
                    // 乘法（两个数小于等于5，且不为1）
                    a = getRandomInt(2, 5);
                    b = getRandomInt(2, 5);
                } else {
                    // 乘法（1个数小于等于5，另一个数大于5小于等于10,且不为1）
                    a = getRandomInt(2, 5);
                    b = getRandomInt(6, 10);
                }
                question = `${a} x ${b}`;
                correctAnswer = a * b;
            }

        } else if (difficulty === 2) {
            // 难度二：加减法、乘法、除法
            const operation = getRandomInt(1, 4); // 1: 加法, 2: 减法, 3: 乘法, 4: 除法

            if (operation === 1) {
                let type = getRandomInt(0, 1);
                let a, b;
                if (type == 1) {
                    // 2位数加法
                    a = getRandomInt(10, 99);
                    b = getRandomInt(10, 99);
                } else {
                    // 2位数字（20以上） 加 1位数字
                    a = getRandomInt(21, 99);
                    b = getRandomInt(1, 9);
                }
                question = `${a} + ${b}`;
                correctAnswer = a + b;
            } else if (operation === 2) {
                // 2位数减1位数
                const a = getRandomInt(21, 99);
                const b = getRandomInt(1, 9);
                question = `${a} - ${b}`;
                correctAnswer = a - b; // 确保结果不小于0
            } else if (operation === 3) {
                // 乘法（两个数字大于5且小于等于10，且不为1）
                if (getRandomInt(1, 2) === 1) {
                    const a = getRandomInt(6, 10);
                    const b = getRandomInt(6, 10);
                    question = `${a} x ${b}`;
                    correctAnswer = a * b;
                } else {
                    // 被乘数大于10且小于12，乘数小于等于5
                    const a = getRandomInt(11, 12);
                    const b = getRandomInt(2, 5); // 确保乘数不为1
                    question = `${a} x ${b}`;
                    correctAnswer = a * b;
                }
            } else if (operation === 4) {
                // 除法（被除数是99乘法表中的积数，除数不大于9）
                const products = [];
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
                const value = products[getRandomInt(0, products.length - 1)]; // 随机选择一个被除数
                const a = value.product;
                const divisor = getRandomInt(0, 1) == 0 ? value.num0 : value.num1;

                question = `${a} ÷ ${divisor}`;
                correctAnswer = a / divisor; // 商
            }

        } else if (difficulty === 3) {
            let attempts = 0; // 计数器
            const maxAttempts = 10; // 最大重试次数

            while (attempts < maxAttempts) {
                const getRandomOperation = () => {
                    return getRandomInt(1, 4); // 1: 加法, 2: 减法, 3: 乘法, 4: 除法
                };

                const generateInnerQuestion = () => {
                    const operation = getRandomOperation();
                    let innerQuestion = '';
                    let result = 0;

                    if (operation === 1) {
                        // 加法
                        const type = getRandomInt(0, 1);
                        let a, b;
                        if (type === 0) {
                            // 2位数加法
                            a = getRandomInt(10, 99);
                            b = getRandomInt(10, 99);
                        } else {
                            // 2位数字（20以上） 加 1位数字
                            a = getRandomInt(21, 99);
                            b = getRandomInt(1, 9);
                        }
                        innerQuestion = `${a} + ${b}`;
                        result = a + b;
                    } else if (operation === 2) {
                        // 减法
                        const a = getRandomInt(21, 99);
                        const b = getRandomInt(1, 9);
                        innerQuestion = `${a} - ${b}`;
                        result = a - b; // 确保结果不小于0
                    } else if (operation === 3) {
                        // 乘法
                        const type = getRandomInt(0, 1);
                        let a, b;
                        if (type === 0) {
                            // 两个数字大于5且小于等于10
                            a = getRandomInt(6, 10);
                            b = getRandomInt(6, 10);
                        } else {
                            // 被乘数大于10且小于等于12，乘数小于等于5
                            a = getRandomInt(11, 12);
                            b = getRandomInt(2, 5);
                        }
                        innerQuestion = `${a} x ${b}`;
                        result = a * b;
                    } else if (operation === 4) {
                        // 除法
                        const divisor = getRandomInt(1, 9); // 除数为1位数
                        const quotient = getRandomInt(2, 9); // 商为整数
                        const a = divisor * quotient; // 被除数
                        if (a < 10) {
                            return CreateQuestion.generateMathQuestion(difficulty);
                        }
                        innerQuestion = `${a} ÷ ${divisor}`;
                        result = quotient; // 商
                    }

                    return { innerQuestion, result };
                };

                const { innerQuestion, result } = generateInnerQuestion();
                // 外部运算选择
                const outerOperation = getRandomOperation();
                let outerNumber;
                if (outerOperation === 3 || outerOperation === 4) {
                    // 乘法或除法时，外部数字不能为1
                    outerNumber = getRandomInt(2, 9);
                } else {
                    // 加法或减法时，外部数字可以为1
                    outerNumber = getRandomInt(1, 9);
                }

                // 形成最终问题
                if (outerOperation === 1) {
                    question = `(${innerQuestion}) + ${outerNumber}`;
                    correctAnswer = result + outerNumber;
                } else if (outerOperation === 2) {
                    question = `(${innerQuestion}) - ${outerNumber}`;
                    correctAnswer = result - outerNumber; // 确保结果不小于0
                    if (correctAnswer < 0) {
                        attempts++;
                        continue;
                    }
                } else if (outerOperation === 3) {
                    if (result > 15) {
                        attempts++;
                        continue;
                    }
                    question = `(${innerQuestion}) x ${outerNumber}`;
                    correctAnswer = result * outerNumber; // 乘法
                } else if (outerOperation === 4) {
                    // 除法，确保结果为整数
                    question = `(${innerQuestion}) ÷ ${outerNumber}`;

                    // 确保整个表达式不出现小数
                    if (result % outerNumber !== 0 || result < 10) {
                        // 如果除法结果为小数，重新生成外部运算
                        attempts++;
                        continue;
                    }
                    correctAnswer = result / outerNumber; // 商
                }

                // 成功生成有效题目
                break;
            }

            // 如果超过最大尝试次数，返回一个默认题目
            if (attempts === maxAttempts) {
                question = "(15 + 3) * 5";
                correctAnswer = 90;
            }
        }

        // 生成选项
        const options = new Set();
        options.add(correctAnswer.toString());

        // 生成错误选项，确保不等于正确答案
        while (options.size < 4) {
            const wrongAnswer = getRandomInt(correctAnswer - 10, correctAnswer + 10);
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

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

        let question = '';
        let correctAnswer = 0;

        if (difficulty === 1) {
            // 难度一：加减法、除法和乘法
            const operation = await getRandomInt(1, 4); // 1: 加法, 2: 减法, 3: 除法, 4: 乘法

            if (operation === 1) {
                // 加法（20以内数字，加减1位数，不能加减1和0）
                let a, b;
                do {
                    a = await getRandomInt(2, 20);
                    b = await getRandomInt(2, 9);
                } while (a + b > 20); // 确保和不超过20
                question = `${a} + ${b}`;
                correctAnswer = a + b;

            } else if (operation === 2) {
                // 减法（减法结果不能出现负数和0）
                let a, b;
                do {
                    a = await getRandomInt(3, 20);
                    b = await getRandomInt(2, 9); // b 小于等于 a
                } while (b >= a); // 确保 b 小于 a
                question = `${a} - ${b}`;
                correctAnswer = a - b;

            } else if (operation === 3) {
                // 除法（被除数小于10，必须在99乘法表内，且不能产生余数）
                let divisor, a;
                do {
                    divisor = await getRandomInt(2, 9); // 除数不能是1
                    a = await getRandomInt(2, 9) * divisor; // 确保被除数在99乘法表内
                } while (a >= 10 || a % divisor !== 0 || a === divisor);
                question = `${a} ÷ ${divisor}`;
                correctAnswer = a / divisor;

            } else if (operation === 4) {
                // 乘法（两个数都小于等于9）
                let a = await getRandomInt(2, 9);
                let b = await getRandomInt(2, 9);
                question = `${a} x ${b}`;
                correctAnswer = a * b;

            }
        } else if (difficulty === 2) {
            // 难度二：加减法、乘法和除法
            const operation = await getRandomInt(1, 4); // 1: 加法, 2: 减法, 3: 乘法, 4: 除法

            if (operation === 1) {
                // 2位数字加法，且需要有一次进位
                let a, b;
                do {
                    a = await getRandomInt(30, 99);
                    b = await getRandomInt(10, 99);
                } while ((a % 10) + (b % 10) < 10 || a + b >= 100); // 确保有进位且和小于100
                question = `${a} + ${b}`;
                correctAnswer = a + b;

            } else if (operation === 2) {
                // 2位数字（大于20）减1位数字，减法需要有一次借位，答案不允许出现0和1
                let a, b;
                do {
                    a = await getRandomInt(21, 99);
                    b = await getRandomInt(1, 9); // b为1到9的数字
                } while (a - b < 2 || (a % 10) >= b); // 确保结果不为0和1且需要借位
                question = `${a} - ${b}`;
                correctAnswer = a - b;

            } else if (operation === 3) {
                // 乘法（被乘数12、13、14、15，乘数小于等于5）
                let a = await getRandomInt(12, 15);
                let b = await getRandomInt(2, 5);
                question = `${a} x ${b}`;
                correctAnswer = a * b;

            } else if (operation === 4) {
                // 除法（被除数在10到99之间，除数在2到9之间，且结果为整数）
                let divisor, a;
                do {
                    divisor = await getRandomInt(2, 9);
                    a = await getRandomInt(10, 99);
                } while (a % divisor !== 0); // 确保除法结果为整数
                question = `${a} ÷ ${divisor}`;
                correctAnswer = a / divisor;
            }
        } else if (difficulty === 3) {
            // 难度三：复合计算
            let innerQuestion = '';
            let innerResult = 0;

            const innerOperation = await getRandomInt(1, 2); // 1: 乘法, 2: 除法
            let a, b;

            if (innerOperation === 1) {
                // 括号内乘法（被乘数为12、13、14、15，乘数小于等于5）
                a = await getRandomInt(12, 15); // 被乘数
                b = await getRandomInt(2, 5); // 乘数
                innerQuestion = `${a} x ${b}`;
                innerResult = a * b;

            } else if (innerOperation === 2) {
                // 括号内除法（被除数小于10，且不能产生余数）
                let divisor;
                do {
                    divisor = await getRandomInt(2, 9); // 除数不能为1或0
                    innerResult = await getRandomInt(10, 99); // 被除数
                } while (innerResult % divisor !== 0 || innerResult < 10 || innerResult === divisor); // 确保能整除，且被除数不能等于除数
                innerQuestion = `${innerResult} ÷ ${divisor}`;
                innerResult = innerResult / divisor;
            }

            // 括号外的数和操作
            let outerNum;
            let outerOperation;
            do {
                outerNum = await getRandomInt(1, 9); // 括号外的数小于等于10
                outerOperation = await getRandomInt(1, 2); // 1: 加法, 2: 减法

                if (outerOperation === 1) {
                    // 加法
                    question = `(${innerQuestion}) + ${outerNum}`;
                    correctAnswer = innerResult + outerNum;

                } else if (outerOperation === 2) {
                    // 减法，确保结果不小于0
                    if (innerResult >= outerNum) {
                        question = `(${innerQuestion}) - ${outerNum}`;
                        correctAnswer = innerResult - outerNum;
                    }
                }
            } while (outerOperation === 2 && innerResult < outerNum); // 确保减法有效
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
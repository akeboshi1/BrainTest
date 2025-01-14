export class FishQuestion{
    public question:string;
    public options:string[];
    public correctAnswer:string;
    // public hasChose:boolean = false;


    constructor(value){
        this.question = value.question;
        this.options = value.options;
        this.correctAnswer = value.correctAnswer;
        // this.hasChose = value.hasChose;
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
                const a = getRandomInt(0, 20);
                const b = getRandomInt(0, 9);
                question = `${a} + ${b}`;
                correctAnswer = a + b;
            } else if (operation === 2) {
                // 减法，确保结果不小于0
                const a = getRandomInt(0, 20);
                const b = getRandomInt(0, 9); // b 小于等于 a
                if(b > a){
                    return CreateQuestion.generateMathQuestion(difficulty);
                }
                question = `${a} - ${b}`;
                correctAnswer = a - b;
            } else if (operation === 3) {
                // 除法（被除数和除数都小于10，确保能整除）
                const b = getRandomInt(1, 9); // 除数
                const a = b * getRandomInt(1, 9); // 被除数，确保能整除
                if (a >= 10) {
                    return this.generateMathQuestion(difficulty);
                }
                question = `${a} / ${b}`;
                correctAnswer = a / b; // 此时必然为整数
            } else if (operation === 4) {
                // 乘法（两个数小于等于5）
                const a = getRandomInt(1, 5);
                const b = getRandomInt(1, 5);
                question = `${a} x ${b}`;
                correctAnswer = a * b;
            }

        } else if (difficulty === 2) {
            // 难度二：加减法、乘法、除法
            const operation = getRandomInt(1, 4); // 1: 加法, 2: 减法, 3: 乘法, 4: 除法

            if (operation === 1) {
                // 2位数加法
                const a = getRandomInt(10, 99);
                const b = getRandomInt(10, 99);
                question = `${a} + ${b}`;
                correctAnswer = a + b;
            } else if (operation === 2) {
                // 2位数减1位数
                const a = getRandomInt(10, 99);
                const b = getRandomInt(1, 9);
                question = `${a} - ${b}`;
                correctAnswer = a - b; // 确保结果不小于0
            } else if (operation === 3) {
                // 乘法（两个数字大于5且小于等于10）
                if (getRandomInt(1, 2) === 1) {
                    const a = getRandomInt(6, 10);
                    const b = getRandomInt(6, 10);
                    question = `${a} x ${b}`;
                    correctAnswer = a * b;
                } else {
                    // 被乘数大于10且小于12，乘数小于等于5
                    const a = getRandomInt(11, 12);
                    const b = getRandomInt(1, 5);
                    question = `${a} x ${b}`;
                    correctAnswer = a * b;
                }
            } else if (operation === 4) {
                // 除法（被除数是2位数，除数是1位数，能整除）
                const divisor = getRandomInt(1, 9); // 除数
                const product = divisor * getRandomInt(10, 99 / divisor); // 确保能整除且被除数为2位数
                if (product > 99) {
                    return this.generateMathQuestion(difficulty);
                }
                question = `${product} / ${divisor}`;
                correctAnswer = product / divisor; // 此时必然为整数
            }

        } else if (difficulty === 3) {
            // 难度三：复合计算
            const operation = getRandomInt(1, 2); // 1: 加减法与除法, 2: 乘法与减法

            if (operation === 1) {
                // 生成加法与除法，确保能整除
                const a = getRandomInt(1, 20);
                const b = getRandomInt(1, 20);
                const c = getRandomInt(2, 5); // 除数

                // 加法计算
                const addOrSubtract = getRandomInt(1, 2);
                if (addOrSubtract === 1) {
                    // 加法后除法
                    question = `(${a} + ${b}) / ${c}`;
                    correctAnswer = (a + b) / c; // 确保能整除
                    if (correctAnswer % 1 !== 0) {
                        return this.generateMathQuestion(difficulty);
                    }
                } else {
                    // 减法后乘法
                    question = `(${a} - ${b}) x ${c}`;
                    correctAnswer = (a - b) * c; // 确保结果不小于0
                    if (correctAnswer < 0) {
                        return this.generateMathQuestion(difficulty);
                    }
                }
            } else {
                // 生成乘法与减法
                const a = getRandomInt(6, 10);
                const b = getRandomInt(6, 10);
                const c = getRandomInt(1, 9); // 小于10的数

                question = `(${a} x ${b}) - ${c}`;
                correctAnswer = (a * b) - c; // 确保结果不小于0
                if (correctAnswer < 0) {
                    return this.generateMathQuestion(difficulty);
                }
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

}

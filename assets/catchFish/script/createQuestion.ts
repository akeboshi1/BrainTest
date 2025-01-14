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
                if (b > a) {
                    return this.generateMathQuestion(difficulty);
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

                question = `${a} / ${divisor}`;
                correctAnswer = quotient; // 商
            } else if (operation === 4) {
                // 乘法（两个数小于等于5，且不为1）
                const a = getRandomInt(2, 5);
                const b = getRandomInt(2, 5);
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
                const a = getRandomInt(20, 99);
                const b = getRandomInt(1, 9);
                question = `${a} - ${b}`;
                correctAnswer = a - b; // 确保结果不小于0
            } else if (operation === 3) {
                // 乘法（两个数字大于5且小于等于10，且不为1）
                if (getRandomInt(1, 2) === 1) {
                    const a = getRandomInt(2, 10);
                    const b = getRandomInt(2, 10);
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
                            if(CreateQuestion.isInMultiplicationTable(product)){
                                products.push({product,num0:i,num1:j});
                            }
                        }
                    }
                }
                const value = products[getRandomInt(0, products.length - 1)]; // 随机选择一个被除数
                const a = value.product;
                const divisor = getRandomInt(0, 1)==0?value.num0:value.num1;

                question = `${a} / ${divisor}`;
                correctAnswer = a / divisor; // 商
            }

        } else if (difficulty === 3) {
            // 难度三：复合计算
            let validQuestion = false;

            while (!validQuestion) {
                const operation = getRandomInt(1, 2); // 1: 乘法, 2: 除法
                // 生成左侧括号内的加法或减法
                const leftOperation = getRandomInt(1, 2); // 1: 加法, 2: 减法

                if (operation === 1) {
                    // 乘法
                    let leftOperationValid = false;
                    let a, b, c;

                    if (leftOperation === 1) {
                        // 加法
                        a = getRandomInt(10, 99); // 两位数
                        b = getRandomInt(10, 99); // 两位数
                        const sum = a + b;

                        // 确保和在5到10之间或10到12之间
                        if ((sum > 5 && sum <= 10)) {
                            c = getRandomInt(5, 10); // 右侧数字在5到10之间
                            question = `(${a} + ${b}) x ${c}`;
                            correctAnswer = sum * c;
                            leftOperationValid = true;
                        } else if ((sum > 10 && sum < 12)) {
                            c = getRandomInt(1, 5); // 右侧数字小于等于5且大于0
                            question = `(${a} + ${b}) x ${c}`;
                            correctAnswer = sum * c;
                            leftOperationValid = true;
                        }
                    } else {
                        // 减法
                        a = getRandomInt(20, 99); // 被减数大于20
                        b = getRandomInt(1, 9); // 1位数
                        const difference = a - b;

                        // 确保差在5到10之间或10到12之间
                        if ((difference > 5 && difference <= 10)) {
                            c = getRandomInt(1, 5); // 右侧数字小于等于5
                            question = `(${a} - ${b}) x ${c}`;
                            correctAnswer = difference * c;
                            leftOperationValid = true;
                        } else if ((difference > 10 && difference < 12)) {
                            c = getRandomInt(5, 10); // 右侧数字在5到10之间
                            question = `(${a} - ${b}) x ${c}`;
                            correctAnswer = difference * c;
                            leftOperationValid = true;
                        }
                    }

                    if (leftOperationValid) {
                        validQuestion = true;
                    }

                } else {
                    // 除法
                    const products = [];
                    for (let i = 1; i <= 9; i++) {
                        for (let j = 1; j <= 9; j++) {
                            const product = i * j;
                            if (product >= 10 && product <= 81) {
                                products.push({product,num0:i,num1:j}); // 99乘法表中的数字
                            }
                        }
                    }

                    const value = products[getRandomInt(0, products.length - 1)]; // 随机选择一个被除数
                    const a = value.product;
                    const divisor = getRandomInt(0, 1)==0?value.num0:value.num1; // 1位数
                    const b = getRandomInt(0, a - 1);

                    // 加法
                    if(leftOperation == 1){
                        question = `(${a-b} + ${b}) / ${divisor}`;
                    }else{
                        question = `(${a+b} - ${b}) / ${divisor}`;
                    }
                    correctAnswer = a / divisor; // 商
                    validQuestion = true;
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

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
            // 难度一：加减法
            const a = getRandomInt(0, 20);
            const b = getRandomInt(0, 20);

            // 随机选择加法或减法
            if (getRandomInt(1, 2) === 1) {
                question = `${a} + ${b}`;
                correctAnswer = a + b;
            } else {
                if (a < b) {
                    // 确保减法结果不小于0
                    question = `${b} - ${a}`; // 反转顺序
                    correctAnswer = b - a;
                } else {
                    question = `${a} - ${b}`;
                    correctAnswer = a - b;
                }
            }

        } else if (difficulty === 2) {
            // 难度二：加减法、乘法、除法
            const operation = getRandomInt(1, 3); // 1: 加法, 2: 减法, 3: 乘法

            if (operation === 1) {
                const a = getRandomInt(10, 99);
                const b = getRandomInt(1, 20);
                question = `${a} + ${b}`;
                correctAnswer = a + b;
            } else if (operation === 2) {
                const a = getRandomInt(10, 99);
                const b = getRandomInt(1, a); // 确保不出现负数
                question = `${a} - ${b}`;
                correctAnswer = a - b; // 确保结果不小于0
            } else if (operation === 3) {
                const a = getRandomInt(2, 10); // 确保不为1
                const b = getRandomInt(2, 10); // 确保不为1
                question = `${a} x ${b}`;
                correctAnswer = a * b;
            }

        } else if (difficulty === 3) {
            // 难度三：复合计算，包含能整除的除法
            const a = getRandomInt(1, 20);
            const b = getRandomInt(1, 20);
            const c = getRandomInt(2, 5); // 确保不为1

            // 随机选择操作
            const operation = getRandomInt(1, 4); // 1: 加法, 2: 减法, 3: 乘法, 4: 除法

            if (operation === 1) {
                question = `(${a} + ${b}) x ${c}`;
                correctAnswer = (a + b) * c;
            } else if (operation === 2) {
                question = `(${a} + ${b}) - ${c}`;
                correctAnswer = (a + b) - c;
            } else if (operation === 3) {
                question = `(${a} x ${b}) + ${c}`;
                correctAnswer = (a * b) + c;
            } else if (operation === 4) {
                // 生成可整除的除法
                const divisor = getRandomInt(2, 5); // 除数
                const product = getRandomInt(2, 10) * divisor; // 确保结果能整除
                question = `${product} / ${divisor}`;
                correctAnswer = product / divisor; // 此时必然为整数
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


// 示例：生成不同难度的算式
// console.log("Difficulty 1 Problem:", generateMathProblem(1));
// console.log("Difficulty 2 Problem:", generateMathProblem(2));
// console.log("Difficulty 3 Problem:", generateMathProblem(3));
import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 天平题目数据结构
 */
export interface BalanceQuestion {
    difficulty: number;           // 难度等级 1-3
    leftNumbers: number[];       // 左侧数字数组
    rightNumbers: number[];      // 右侧数字数组
    answer: number[];            // 答案数组（所有可用的数字）
    leftSum: number;             // 左侧总和
    rightSum: number;            // 右侧总和
    description: string;         // 题目描述
}

/**
 * 天平题库生成器
 */
@ccclass('BalanceQuestionGenerator')
export class BalanceQuestionGenerator extends Component {

    /**
     * 生成指定难度的天平题目
     * @param difficulty 难度等级 1-3
     * @returns 天平题目
     */
    public static generateQuestion(difficulty: number): BalanceQuestion {
        switch (difficulty) {
            case 1:
                return BalanceQuestionGenerator.generateDifficulty1();
            case 2:
                return BalanceQuestionGenerator.generateDifficulty2();
            case 3:
                return BalanceQuestionGenerator.generateDifficulty3();
            default:
                throw new Error(`不支持的难度等级: ${difficulty}`);
        }
    }

    /**
     * 生成难度1的题目：50以内，两边各2个数字，总共4个数字
     */
    public static generateDifficulty1(): BalanceQuestion {
        // 80%概率使用随机算法，20%概率使用预设题目
        if (Math.random() < 0.8) {
            return this.generateRandomDifficulty1();
        } else {
            return this.generatePresetDifficulty1();
        }
    }

    /**
     * 生成难度2的题目：50以内，两边各3个数字，总共6个数字
     */
    public static generateDifficulty2(): BalanceQuestion {
        // 80%概率使用随机算法，20%概率使用预设题目
        if (Math.random() < 0.8) {
            return this.generateRandomDifficulty2();
        } else {
            return this.generatePresetDifficulty2();
        }
    }

    /**
     * 生成难度3的题目：80以内，两边各4个数字，总共8个数字
     */
    public static generateDifficulty3(): BalanceQuestion {
        // 80%概率使用随机算法，20%概率使用预设题目
        if (Math.random() < 0.8) {
            return this.generateRandomDifficulty3();
        } else {
            return this.generatePresetDifficulty3();
        }
    }

    /**
     * 使用随机算法生成难度1题目
     */
    private static generateRandomDifficulty1(): BalanceQuestion {
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            attempts++;

            // 生成4个不同的随机数字（1-50）
            const allNumbers = this.generateUniqueNumbers(4, 1, 50);
            
            // 尝试不同的分配方案
            const combinations = this.getCombinations(allNumbers, 2);
            
            for (const leftCombo of combinations) {
                const rightCombo = allNumbers.filter(num => !leftCombo.includes(num));
                
                const leftSum = leftCombo.reduce((sum, num) => sum + num, 0);
                const rightSum = rightCombo.reduce((sum, num) => sum + num, 0);
                
                // 检查是否平衡
                if (leftSum === rightSum) {
                    // 验证是否只有一种解
                    if (this.hasUniqueSolution(allNumbers, leftSum)) {
                        return {
                            difficulty: 1,
                            leftNumbers: leftCombo,
                            rightNumbers: rightCombo,
                            answer: allNumbers,
                            leftSum: leftSum,
                            rightSum: rightSum,
                            description: `难度1：将4个数字分配到天平两侧，使天平平衡。左侧：${leftCombo.join(' + ')} = ${leftSum}，右侧：${rightCombo.join(' + ')} = ${rightSum}`
                        };
                    }
                }
            }
        }

        // 如果随机算法失败，回退到预设题目
        return this.generatePresetDifficulty1();
    }

    /**
     * 使用随机算法生成难度2题目
     */
    private static generateRandomDifficulty2(): BalanceQuestion {
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            attempts++;

            // 生成6个不同的随机数字（1-50）
            const allNumbers = this.generateUniqueNumbers(6, 1, 50);
            
            // 尝试不同的分配方案
            const combinations = this.getCombinations(allNumbers, 3);
            
            for (const leftCombo of combinations) {
                const rightCombo = allNumbers.filter(num => !leftCombo.includes(num));
                
                const leftSum = leftCombo.reduce((sum, num) => sum + num, 0);
                const rightSum = rightCombo.reduce((sum, num) => sum + num, 0);
                
                // 检查是否平衡
                if (leftSum === rightSum) {
                    // 验证是否只有一种解
                    if (this.hasUniqueSolution(allNumbers, leftSum)) {
                        return {
                            difficulty: 2,
                            leftNumbers: leftCombo,
                            rightNumbers: rightCombo,
                            answer: allNumbers,
                            leftSum: leftSum,
                            rightSum: rightSum,
                            description: `难度2：将6个数字分配到天平两侧，使天平平衡。左侧：${leftCombo.join(' + ')} = ${leftSum}，右侧：${rightCombo.join(' + ')} = ${rightSum}`
                        };
                    }
                }
            }
        }

        // 如果随机算法失败，回退到预设题目
        return this.generatePresetDifficulty2();
    }

    /**
     * 使用随机算法生成难度3题目
     */
    private static generateRandomDifficulty3(): BalanceQuestion {
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            attempts++;

            // 生成8个不同的随机数字（1-80）
            const allNumbers = this.generateUniqueNumbers(8, 1, 80);
            
            // 尝试不同的分配方案
            const combinations = this.getCombinations(allNumbers, 4);
            
            for (const leftCombo of combinations) {
                const rightCombo = allNumbers.filter(num => !leftCombo.includes(num));
                
                const leftSum = leftCombo.reduce((sum, num) => sum + num, 0);
                const rightSum = rightCombo.reduce((sum, num) => sum + num, 0);
                
                // 检查是否平衡
                if (leftSum === rightSum) {
                    // 验证是否只有一种解
                    if (this.hasUniqueSolution(allNumbers, leftSum)) {
                        return {
                            difficulty: 3,
                            leftNumbers: leftCombo,
                            rightNumbers: rightCombo,
                            answer: allNumbers,
                            leftSum: leftSum,
                            rightSum: rightSum,
                            description: `难度3：将8个数字分配到天平两侧，使天平平衡。左侧：${leftCombo.join(' + ')} = ${leftSum}，右侧：${rightCombo.join(' + ')} = ${rightSum}`
                        };
                    }
                }
            }
        }

        // 如果随机算法失败，回退到预设题目
        return this.generatePresetDifficulty3();
    }

    /**
     * 使用预设题目生成难度1
     */
    private static generatePresetDifficulty1(): BalanceQuestion {
        // 预定义一些平衡的组合，确保能生成题目
        const predefinedCombinations = [
            { left: [5, 15], right: [8, 12], sum: 20 },
            { left: [3, 17], right: [7, 13], sum: 20 },
            { left: [2, 18], right: [6, 14], sum: 20 },
            { left: [4, 16], right: [9, 11], sum: 20 },
            { left: [1, 19], right: [5, 15], sum: 20 }
        ];

        // 随机选择一个预定义的组合
        const randomIndex = Math.floor(Math.random() * predefinedCombinations.length);
        const selected = predefinedCombinations[randomIndex];

        // 随机打乱数字顺序
        const allNumbers = [...selected.left, ...selected.right];
        this.shuffleArray(allNumbers);

        return {
            difficulty: 1,
            leftNumbers: selected.left,
            rightNumbers: selected.right,
            answer: allNumbers,
            leftSum: selected.sum,
            rightSum: selected.sum,
            description: `难度1：将4个数字分配到天平两侧，使天平平衡。左侧：${selected.left.join(' + ')} = ${selected.sum}，右侧：${selected.right.join(' + ')} = ${selected.sum}`
        };
    }

    /**
     * 使用预设题目生成难度2
     */
    private static generatePresetDifficulty2(): BalanceQuestion {
        // 预定义一些平衡的组合，确保能生成题目
        const predefinedCombinations = [
            { left: [3, 7, 20], right: [5, 10, 15], sum: 30 },
            { left: [2, 8, 20], right: [4, 11, 15], sum: 30 },
            { left: [1, 9, 20], right: [6, 9, 15], sum: 30 },
            { left: [4, 6, 20], right: [7, 8, 15], sum: 30 },
            { left: [5, 5, 20], right: [8, 7, 15], sum: 30 }
        ];

        // 随机选择一个预定义的组合
        const randomIndex = Math.floor(Math.random() * predefinedCombinations.length);
        const selected = predefinedCombinations[randomIndex];

        // 随机打乱数字顺序
        const allNumbers = [...selected.left, ...selected.right];
        this.shuffleArray(allNumbers);

        return {
            difficulty: 2,
            leftNumbers: selected.left,
            rightNumbers: selected.right,
            answer: allNumbers,
            leftSum: selected.sum,
            rightSum: selected.sum,
            description: `难度2：将6个数字分配到天平两侧，使天平平衡。左侧：${selected.left.join(' + ')} = ${selected.sum}，右侧：${selected.right.join(' + ')} = ${selected.sum}`
        };
    }

    /**
     * 使用预设题目生成难度3
     */
    private static generatePresetDifficulty3(): BalanceQuestion {
        // 预定义一些平衡的组合，确保能生成题目
        const predefinedCombinations = [
            { left: [2, 8, 25, 35], right: [5, 15, 20, 30], sum: 70 },
            { left: [1, 9, 24, 36], right: [4, 16, 19, 31], sum: 70 },
            { left: [3, 7, 26, 34], right: [6, 14, 21, 29], sum: 70 },
            { left: [4, 6, 27, 33], right: [7, 13, 22, 28], sum: 70 },
            { left: [5, 5, 28, 32], right: [8, 12, 23, 27], sum: 70 }
        ];

        // 随机选择一个预定义的组合
        const randomIndex = Math.floor(Math.random() * predefinedCombinations.length);
        const selected = predefinedCombinations[randomIndex];

        // 随机打乱数字顺序
        const allNumbers = [...selected.left, ...selected.right];
        this.shuffleArray(allNumbers);

        return {
            difficulty: 3,
            leftNumbers: selected.left,
            rightNumbers: selected.right,
            answer: allNumbers,
            leftSum: selected.sum,
            rightSum: selected.sum,
            description: `难度3：将8个数字分配到天平两侧，使天平平衡。左侧：${selected.left.join(' + ')} = ${selected.sum}，右侧：${selected.right.join(' + ')} = ${selected.sum}`
        };
    }

    /**
     * 生成指定数量的唯一随机数字
     * @param count 数字数量
     * @param min 最小值
     * @param max 最大值
     * @returns 唯一数字数组
     */
    public static generateUniqueNumbers(count: number, min: number, max: number): number[] {
        const numbers: number[] = [];
        const used = new Set<number>();

        while (numbers.length < count) {
            const randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
            if (!used.has(randomNum)) {
                used.add(randomNum);
                numbers.push(randomNum);
            }
        }

        return numbers;
    }

    /**
     * 获取数组的所有组合
     * @param arr 数组
     * @param size 组合大小
     * @returns 所有组合
     */
    public static getCombinations(arr: number[], size: number): number[][] {
        if (size === 0) return [[]];
        if (arr.length === 0) return [];

        const [first, ...rest] = arr;
        const combinations: number[][] = [];

        // 包含第一个元素的组合
        const withFirst = BalanceQuestionGenerator.getCombinations(rest, size - 1);
        for (const combo of withFirst) {
            combinations.push([first, ...combo]);
        }

        // 不包含第一个元素的组合
        const withoutFirst = BalanceQuestionGenerator.getCombinations(rest, size);
        combinations.push(...withoutFirst);

        return combinations;
    }

    /**
     * 检查是否只有唯一解
     * @param numbers 所有数字
     * @param targetSum 目标和
     * @returns 是否只有唯一解
     */
    public static hasUniqueSolution(numbers: number[], targetSum: number): boolean {
        const solutions: number[][] = [];
        
        // 检查所有可能的组合
        for (let size = 1; size <= Math.floor(numbers.length / 2); size++) {
            const combinations = BalanceQuestionGenerator.getCombinations(numbers, size);
            
            for (const combo of combinations) {
                const sum = combo.reduce((s, num) => s + num, 0);
                if (sum === targetSum) {
                    solutions.push(combo);
                    
                    // 如果找到超过2个解，说明不是唯一解
                    if (solutions.length > 2) {
                        return false;
                    }
                }
            }
        }
        
        // 只有1个解才是唯一解
        return solutions.length === 1;
    }

    /**
     * 获取默认难度1题目
     */
    public static getDefaultDifficulty1(): BalanceQuestion {
        return {
            difficulty: 1,
            leftNumbers: [5, 15],
            rightNumbers: [8, 12],
            answer: [5, 8, 12, 15],
            leftSum: 20,
            rightSum: 20,
            description: "难度1：将4个数字分配到天平两侧，使天平平衡。左侧：5 + 15 = 20，右侧：8 + 12 = 20"
        };
    }

    /**
     * 获取默认难度2题目
     */
    public static getDefaultDifficulty2(): BalanceQuestion {
        return {
            difficulty: 2,
            leftNumbers: [3, 7, 20],
            rightNumbers: [5, 10, 15],
            answer: [3, 5, 7, 10, 15, 20],
            leftSum: 30,
            rightSum: 30,
            description: "难度2：将6个数字分配到天平两侧，使天平平衡。左侧：3 + 7 + 20 = 30，右侧：5 + 10 + 15 = 30"
        };
    }

    /**
     * 获取默认难度3题目
     */
    public static getDefaultDifficulty3(): BalanceQuestion {
        return {
            difficulty: 3,
            leftNumbers: [2, 8, 25, 35],
            rightNumbers: [5, 15, 20, 30],
            answer: [2, 5, 8, 15, 20, 25, 30, 35],
            leftSum: 70,
            rightSum: 70,
            description: "难度3：将8个数字分配到天平两侧，使天平平衡。左侧：2 + 8 + 25 + 35 = 70，右侧：5 + 15 + 20 + 30 = 70"
        };
    }

    /**
     * 生成多个题目
     * @param difficulty 难度等级
     * @param count 题目数量
     * @returns 题目数组
     */
    public static generateMultipleQuestions(difficulty: number, count: number): BalanceQuestion[] {
        const questions: BalanceQuestion[] = [];
        const usedSums = new Set<number>();

        for (let i = 0; i < count; i++) {
            let question: BalanceQuestion;
            let attempts = 0;
            const maxAttempts = 100;

            do {
                question = BalanceQuestionGenerator.generateQuestion(difficulty);
                attempts++;
            } while (usedSums.has(question.leftSum) && attempts < maxAttempts);

            if (question) {
                questions.push(question);
                usedSums.add(question.leftSum);
            }
        }

        return questions;
    }

    /**
     * 获取题目的答案数组（按升序排列）
     * @param question 题目
     * @returns 排序后的答案数组
     */
    public static getAnswerArray(question: BalanceQuestion): number[] {
        return [...question.answer].sort((a, b) => a - b);
    }

    /**
     * 获取题目的左侧数字数组（按升序排列）
     * @param question 题目
     * @returns 排序后的左侧数字数组
     */
    public static getLeftNumbersArray(question: BalanceQuestion): number[] {
        return [...question.leftNumbers].sort((a, b) => a - b);
    }

    /**
     * 获取题目的右侧数字数组（按升序排列）
     * @param question 题目
     * @returns 排序后的右侧数字数组
     */
    public static getRightNumbersArray(question: BalanceQuestion): number[] {
        return [...question.rightNumbers].sort((a, b) => a - b);
    }

    /**
     * 验证题目答案是否正确
     * @param question 题目
     * @param leftNumbers 玩家选择的左侧数字
     * @param rightNumbers 玩家选择的右侧数字
     * @returns 是否正确
     */
    public static validateAnswer(question: BalanceQuestion, leftNumbers: number[], rightNumbers: number[]): boolean {
        const leftSum = leftNumbers.reduce((sum, num) => sum + num, 0);
        const rightSum = rightNumbers.reduce((sum, num) => sum + num, 0);
        
        return leftSum === rightSum && leftSum === question.leftSum;
    }

    /**
     * 获取题目的提示信息
     * @param question 题目
     * @returns 提示信息
     */
    public static getHint(question: BalanceQuestion): string {
        const totalSum = question.leftSum + question.rightSum;
        const average = totalSum / 2;
        
        return `提示：天平平衡时，两侧的总和相等。当前目标和是 ${question.leftSum}，所有数字的总和是 ${totalSum}，平均每侧应该是 ${average}`;
    }

    /**
     * 打乱数组顺序
     */
    private static shuffleArray(array: number[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
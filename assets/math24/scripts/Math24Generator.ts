/**
 * Math24Generator
 * 24点题库生成器
 */

import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";

export interface Math24Question {
    numbers: number[];  // 四个数字
    solutions: string[];  // 可能的解法
    difficulty: number;  // 难度级别：1-简单，2-中等，3-困难
}

export class Math24Generator {
    private static readonly MAX_NUMBER = 10;  // 牌面最大数字
    private static readonly MIN_NUMBER = 1;   // 牌面最小数字
    private static readonly TARGET = 24;      // 目标数字

    // 所有可能的运算符
    private static readonly OPERATORS = ['+', '-', '*', '/'];

    /**
     * 直接根据指定难度生成一个24点题目
     * @param difficulty 难度级别：1-简单，2-中等，3-困难
     * @returns 24点题目
     */
    public static getQuestion(difficulty: number): Math24Question {
        // 对于简单难度，优先生成有顺序解法的题目
        if (difficulty === 1) {
            let question: Math24Question;
            let attempts = 0;
            const maxAttempts = 50; // 限制尝试次数，避免无限循环
            
            do {
                question = this.generateValidQuestion();
                attempts++;
                
                // 如果是简单难度，优先选择有顺序解法的题目
                if (question.difficulty === 1 && this.hasSequentialSolution(question.numbers)) {
                    return question;
                }
            } while (attempts < maxAttempts && question.difficulty !== difficulty);
            
            // 如果找不到理想的题目，返回最后一个生成的题目
            return question;
        } else {
            // 中等和困难难度，按原逻辑生成
            let question: Math24Question;
            do {
                question = this.generateValidQuestion();
            } while (question.difficulty !== difficulty);
            
            return question;
        }
    }

    /**
     * 生成一个有解的24点题目
     * @returns 24点题目
     */
    public static generateValidQuestion(): Math24Question {
        let numbers: number[];
        let solutions: string[];
        
        // 不断尝试随机生成4个数字，直到找到有解的组合
        do {
            numbers = this.generateRandomNumbers();
            solutions = this.findAllSolutions(numbers);
        } while (solutions.length === 0);
        
        // 根据解法数量和数字特点估计难度
        const difficulty = this.estimateDifficulty(numbers, solutions);
        
        return {
            numbers,
            solutions,
            difficulty
        };
    }

    /**
     * 生成一个简单的24点题目（优先选择有顺序解法的）
     * @returns 简单的24点题目
     */
    public static generateSimpleQuestion(): Math24Question {
        let numbers: number[];
        let solutions: string[];
        let attempts = 0;
        const maxAttempts = 100;
        
        do {
            // 生成相对简单的数字组合（1-9之间，避免过大的数字）
            numbers = this.generateSimpleNumbers();
            solutions = this.findAllSolutions(numbers);
            attempts++;
        } while ((solutions.length === 0 || !this.hasSequentialSolution(numbers)) && attempts < maxAttempts);
        
        // 如果找不到理想的题目，使用普通生成方法
        if (solutions.length === 0) {
            return this.generateValidQuestion();
        }
        
        return {
            numbers,
            solutions,
            difficulty: 1 // 简单题目
        };
    }

    /**
     * 生成简单的数字组合（1-9之间）
     * @returns 简单数字数组
     */
    private static generateSimpleNumbers(): number[] {
        const numbers: number[] = [];
        
        for (let i = 0; i < 4; i++) {
            const num = Math.floor(Math.random() * 9) + 1; // 1-9之间
            numbers.push(num);
        }
        
        return numbers;
    }

    /**
     * 生成4个随机数字
     * @returns 随机数字数组
     */
    private static generateRandomNumbers(): number[] {
        const numbers: number[] = [];
        
        for (let i = 0; i < 4; i++) {
            const num = Math.floor(Math.random() * (this.MAX_NUMBER - this.MIN_NUMBER + 1)) + this.MIN_NUMBER;
            numbers.push(num);
        }
        
        return numbers;
    }

    /**
     * 估计题目难度
     * @param numbers 四个数字
     * @param solutions 解法数组
     * @returns 难度级别：1-简单，2-中等，3-困难
     */
    private static estimateDifficulty(numbers: number[], solutions: string[]): number {
        // 优先考虑顺序计算的解法，降低难度
        const hasSequentialSolution = this.hasSequentialSolution(numbers);
        
        if (hasSequentialSolution) {
            return 1; // 有顺序解法，简单
        } else if (solutions.length <= 3) {
            return 2; // 中等难度
        } else {
            return 3; // 解法复杂，困难
        }
    }

    /**
     * 检查是否有简单的顺序计算解法
     * @param numbers 四个数字
     * @returns 是否有顺序解法
     */
    private static hasSequentialSolution(numbers: number[]): boolean {
        // 检查简单的顺序计算：((a op1 b) op2 c) op3 d
        const a = numbers[0];
        const b = numbers[1];
        const c = numbers[2];
        const d = numbers[3];
        
        for (const op1 of this.OPERATORS) {
            const result1 = this.calculate(a, b, op1);
            if (!isFinite(result1)) continue;
            
            for (const op2 of this.OPERATORS) {
                const result2 = this.calculate(result1, c, op2);
                if (!isFinite(result2)) continue;
                
                for (const op3 of this.OPERATORS) {
                    const result3 = this.calculate(result2, d, op3);
                    if (Math.abs(result3 - this.TARGET) < 1e-6) {
                        return true;
                    }
                }
            }
        }
        
        return false;
    }

    /**
     * 找出所有可能的解法
     * @param numbers 四个数字
     * @returns 所有可能的解法表达式
     */
    public static findAllSolutions(numbers: number[]): string[] {
        if (numbers.length !== 4) {
            return [];
        }
        
        const solutions = new Set<string>();
        
        // 生成所有可能的数字排列
        const permutations = this.generatePermutations(numbers);
        
        // 对每种排列尝试不同的运算符组合
        for (const perm of permutations) {
            this.findSolutionsForPermutation(perm, solutions);
        }
        
        return Array.from(solutions);
    }
    
    /**
     * 为给定的数字排列寻找解法
     * @param numbers 数字排列
     * @param solutions 解法集合
     */
    private static findSolutionsForPermutation(numbers: number[], solutions: Set<string>): void {
        const a = numbers[0];
        const b = numbers[1];
        const c = numbers[2];
        const d = numbers[3];
        
        // 优先尝试简单的顺序计算：((a op1 b) op2 c) op3 d
        for (const op1 of this.OPERATORS) {
            const result1 = this.calculate(a, b, op1);
            if (!isFinite(result1)) continue;
            
            for (const op2 of this.OPERATORS) {
                const result2 = this.calculate(result1, c, op2);
                if (!isFinite(result2)) continue;
                
                for (const op3 of this.OPERATORS) {
                    const result3 = this.calculate(result2, d, op3);
                    if (Math.abs(result3 - this.TARGET) < 1e-6) {
                        solutions.add(`((${a}${op1}${b})${op2}${c})${op3}${d}`);
                    }
                }
            }
        }
        
        // 如果已经有顺序解法，优先返回，减少复杂解法
        if (solutions.size > 0) {
            return;
        }
        
        // (a op1 b) op2 (c op3 d)
        for (const op1 of this.OPERATORS) {
            const result1 = this.calculate(a, b, op1);
            if (!isFinite(result1)) continue;
            
            for (const op3 of this.OPERATORS) {
                const result2 = this.calculate(c, d, op3);
                if (!isFinite(result2)) continue;
                
                for (const op2 of this.OPERATORS) {
                    const result3 = this.calculate(result1, result2, op2);
                    if (Math.abs(result3 - this.TARGET) < 1e-6) {
                        solutions.add(`(${a}${op1}${b})${op2}(${c}${op3}${d})`);
                    }
                }
            }
        }
        
        // (a op1 (b op2 c)) op3 d
        for (const op2 of this.OPERATORS) {
            const result1 = this.calculate(b, c, op2);
            if (!isFinite(result1)) continue;
            
            for (const op1 of this.OPERATORS) {
                const result2 = this.calculate(a, result1, op1);
                if (!isFinite(result2)) continue;
                
                for (const op3 of this.OPERATORS) {
                    const result3 = this.calculate(result2, d, op3);
                    if (Math.abs(result3 - this.TARGET) < 1e-6) {
                        solutions.add(`(${a}${op1}(${b}${op2}${c}))${op3}${d}`);
                    }
                }
            }
        }
        
        // a op1 ((b op2 c) op3 d)
        for (const op2 of this.OPERATORS) {
            const result1 = this.calculate(b, c, op2);
            if (!isFinite(result1)) continue;
            
            for (const op3 of this.OPERATORS) {
                const result2 = this.calculate(result1, d, op3);
                if (!isFinite(result2)) continue;
                
                for (const op1 of this.OPERATORS) {
                    const result3 = this.calculate(a, result2, op1);
                    if (Math.abs(result3 - this.TARGET) < 1e-6) {
                        solutions.add(`${a}${op1}((${b}${op2}${c})${op3}${d})`);
                    }
                }
            }
        }
        
        // a op1 (b op2 (c op3 d))
        for (const op3 of this.OPERATORS) {
            const result1 = this.calculate(c, d, op3);
            if (!isFinite(result1)) continue;
            
            for (const op2 of this.OPERATORS) {
                const result2 = this.calculate(b, result1, op2);
                if (!isFinite(result2)) continue;
                
                for (const op1 of this.OPERATORS) {
                    const result3 = this.calculate(a, result2, op1);
                    if (Math.abs(result3 - this.TARGET) < 1e-6) {
                        solutions.add(`${a}${op1}(${b}${op2}(${c}${op3}${d}))`);
                    }
                }
            }
        }
    }
    
    /**
     * 计算简单的四则运算
     * @param a 第一个操作数
     * @param b 第二个操作数
     * @param operator 运算符
     * @returns 计算结果
     */
    private static calculate(a: number, b: number, operator: string): number {
        switch (operator) {
            case '+': return a + b;
            case '-': return a - b;
            case '*': return a * b;
            case '/': return b !== 0 ? a / b : Infinity;
            default: return NaN;
        }
    }
    
    /**
     * 生成数组的所有排列
     * @param arr 原始数组
     * @returns 所有可能的排列
     */
    private static generatePermutations<T>(arr: T[]): T[][] {
        const result: T[][] = [];
        
        // 基本情况：空数组或单个元素
        if (arr.length <= 1) {
            return [arr];
        }
        
        // 对每个元素作为起始元素生成排列
        for (let i = 0; i < arr.length; i++) {
            // 创建剩余元素的数组
            const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
            
            // 递归生成剩余元素的排列
            const restPermutations = this.generatePermutations(rest);
            
            // 将当前元素与剩余元素的排列组合
            for (const perm of restPermutations) {
                result.push([arr[i], ...perm]);
            }
        }
        
        return result;
    }
    
    /**
     * 检查一组数字是否存在24点解法
     * @param numbers 要检查的数字数组
     * @returns 是否存在解法
     */
    public static hasSolution(numbers: number[]): boolean {
        return this.findAllSolutions(numbers).length > 0;
    }
} 
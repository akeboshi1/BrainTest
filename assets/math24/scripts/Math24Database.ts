import { _decorator } from 'cc';
import { Math24Generator, Math24Question } from './Math24Generator';

const { ccclass, property } = _decorator;

/**
 * Math24Database
 * 24点题目管理器
 */
@ccclass('Math24Database')
export class Math24Database {
    private static instance: Math24Database = null;
    
    /**
     * 获取单例实例
     */
    public static getInstance(): Math24Database {
        if (!this.instance) {
            this.instance = new Math24Database();
        }
        return this.instance;
    }
    
    /**
     * 获取指定难度的题目
     * @param difficulty 难度级别：1-简单，2-中等，3-困难
     * @returns 24点题目
     */
    public getQuestion(difficulty: number = 1): Math24Question {
        return Math24Generator.getQuestion(difficulty);
    }
    
    /**
     * 检查答案是否正确
     * @param numbers 题目数字
     * @param formula 用户输入的公式
     * @returns 是否正确
     */
    public checkAnswer(numbers: number[], formula: string): boolean {
        // 简单实现：计算公式结果是否为24
        try {
            // 注意：eval是不安全的，生产环境应当使用更安全的方式计算
            const result = eval(formula);
            return Math.abs(result - 24) < 1e-6;
        } catch (e) {
            console.error('公式计算错误:', e);
            return false;
        }
    }
} 
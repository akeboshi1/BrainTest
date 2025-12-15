import { SudokuGenerator, SudokuDifficulty, SudokuPuzzle } from './SudukuGenerator';
import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";

/**
 * 数独游戏数据模型
 * 负责题库管理、题目生成、答案验证等逻辑
 */
export class SuduModel {

    private static _instance: SuduModel = null;

    public static getInstance(): SuduModel {
        if (!this._instance) {
            this._instance = new SuduModel();
        }
        return this._instance;
    }

    /** 当前数独题目 */
    private _currentPuzzle: SudokuPuzzle = null;

    /** 玩家当前填写的网格 */
    private _playerGrid: number[][] = [];

    /** 当前难度等级 */
    private _difficulty: SudokuDifficulty = SudokuDifficulty.EASY;

    /** 题库缓存（按难度分类） */
    private _puzzleCache: Map<SudokuDifficulty, SudokuPuzzle[]> = new Map();

    /** 每个难度的题库缓存大小 */
    private readonly CACHE_SIZE = 5;

    constructor() {
        this._puzzleCache.set(SudokuDifficulty.EASY, []);
        this._puzzleCache.set(SudokuDifficulty.MEDIUM, []);
        this._puzzleCache.set(SudokuDifficulty.HARD, []);
    }

    /**
     * 获取题目
     * @param difficulty 难度等级 (1=简单, 2=中等, 3=困难)
     * @returns 数独题目数据
     */
    public getQuestion(difficulty: number = 1): SudokuPuzzle {
        const diff = this.convertDifficulty(difficulty);
        this._difficulty = diff;

        // 尝试从缓存获取
        const cache = this._puzzleCache.get(diff);
        if (cache && cache.length > 0) {
            this._currentPuzzle = cache.pop();
            DebugLog.instance.log(`从缓存获取题目，难度: ${diff}, 剩余缓存: ${cache.length}`);
        } else {
            // 缓存为空，实时生成
            this._currentPuzzle = SudokuGenerator.generate(diff);
            DebugLog.instance.log(`实时生成题目，难度: ${diff}`);
        }

        // 初始化玩家网格
        this._playerGrid = this._currentPuzzle.puzzle.map(row => [...row]);

        // 异步补充缓存
        this.refillCache(diff);

        return this._currentPuzzle;
    }

    /**
     * 批量预生成题目到缓存
     * @param difficulty 难度等级
     * @param count 生成数量
     */
    public preGenerateQuestions(difficulty: number = 1, count: number = 5): void {
        const diff = this.convertDifficulty(difficulty);
        const cache = this._puzzleCache.get(diff);

        for (let i = 0; i < count; i++) {
            if (cache.length < this.CACHE_SIZE * 2) {
                cache.push(SudokuGenerator.generate(diff));
            }
        }

        DebugLog.instance.log(`预生成题目完成，难度: ${diff}, 缓存数量: ${cache.length}`);
    }

    /**
     * 补充题库缓存
     */
    private refillCache(difficulty: SudokuDifficulty): void {
        const cache = this._puzzleCache.get(difficulty);
        if (cache.length < this.CACHE_SIZE) {
            // 补充到缓存大小
            const needCount = this.CACHE_SIZE - cache.length;
            for (let i = 0; i < needCount; i++) {
                cache.push(SudokuGenerator.generate(difficulty));
            }
            DebugLog.instance.log(`补充缓存，难度: ${difficulty}, 补充数量: ${needCount}`);
        }
    }

    /**
     * 转换难度值
     */
    private convertDifficulty(difficulty: number): SudokuDifficulty {
        switch (difficulty) {
            case 1:
                return SudokuDifficulty.EASY;
            case 2:
                return SudokuDifficulty.MEDIUM;
            case 3:
                return SudokuDifficulty.HARD;
            default:
                return SudokuDifficulty.EASY;
        }
    }

    /**
     * 填入数字
     * @param row 行索引
     * @param col 列索引
     * @param num 数字 (1-9)
     * @returns 是否填入成功
     */
    public fillNumber(row: number, col: number, num: number): boolean {
        // 检查是否是固定数字
        if (this._currentPuzzle.puzzle[row][col] !== 0) {
            return false;
        }

        this._playerGrid[row][col] = num;
        return true;
    }

    /**
     * 清除格子
     * @param row 行索引
     * @param col 列索引
     * @returns 是否清除成功
     */
    public clearCell(row: number, col: number): boolean {
        // 检查是否是固定数字
        if (this._currentPuzzle.puzzle[row][col] !== 0) {
            return false;
        }

        this._playerGrid[row][col] = 0;
        return true;
    }

    /**
     * 获取某格的提示
     * @param row 行索引
     * @param col 列索引
     * @returns 正确答案
     */
    public getHint(row: number, col: number): number {
        return SudokuGenerator.getHint(this._currentPuzzle.solution, row, col);
    }

    /**
     * 获取某格的候选数字
     * @param row 行索引
     * @param col 列索引
     * @returns 候选数字数组
     */
    public getCandidates(row: number, col: number): number[] {
        return SudokuGenerator.getCandidates(this._playerGrid, row, col);
    }

    /**
     * 检查是否完成
     * @returns 是否已填满所有格子
     */
    public isComplete(): boolean {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this._playerGrid[row][col] === 0) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * 验证答案是否正确
     * @returns 是否完全正确
     */
    public validateAnswer(): boolean {
        return SudokuGenerator.validateAnswer(this._playerGrid, this._currentPuzzle.solution);
    }

    /**
     * 检查当前状态是否有冲突
     * @returns 是否有效（无冲突）
     */
    public isValidState(): boolean {
        return SudokuGenerator.isValidState(this._playerGrid);
    }

    /**
     * 获取错误的格子位置
     * @returns 错误位置数组 [{row, col}]
     */
    public getErrorCells(): { row: number, col: number }[] {
        const errors: { row: number, col: number }[] = [];

        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                const playerValue = this._playerGrid[row][col];
                const solutionValue = this._currentPuzzle.solution[row][col];

                // 只检查玩家填入的数字（非固定数字）
                if (this._currentPuzzle.puzzle[row][col] === 0 && playerValue !== 0) {
                    if (playerValue !== solutionValue) {
                        errors.push({ row, col });
                    }
                }
            }
        }

        return errors;
    }

    /**
     * 检查某格是否为固定数字
     * @param row 行索引
     * @param col 列索引
     * @returns 是否为固定数字
     */
    public isFixedCell(row: number, col: number): boolean {
        return this._currentPuzzle.puzzle[row][col] !== 0;
    }

    /**
     * 重置当前题目
     */
    public resetCurrentPuzzle(): void {
        this._playerGrid = this._currentPuzzle.puzzle.map(row => [...row]);
    }

    /**
     * 获取当前题目
     */
    public get currentPuzzle(): SudokuPuzzle {
        return this._currentPuzzle;
    }

    /**
     * 获取当前题目的答案
     * @returns 答案网格的深拷贝
     */
    public getSolution(): number[][] {
        if (!this._currentPuzzle) {
            return null;
        }
        return this._currentPuzzle.solution.map(row => [...row]);
    }

    /**
     * 获取指定格子的正确答案
     * @param row 行索引
     * @param col 列索引
     * @returns 该格子的正确答案
     */
    public getSolutionAt(row: number, col: number): number {
        if (!this._currentPuzzle || row < 0 || row >= 9 || col < 0 || col >= 9) {
            return 0;
        }
        return this._currentPuzzle.solution[row][col];
    }

    /**
     * 获取玩家网格
     */
    public get playerGrid(): number[][] {
        return this._playerGrid;
    }

    /**
     * 获取当前难度
     */
    public get difficulty(): SudokuDifficulty {
        return this._difficulty;
    }

    /**
     * 获取空格数量
     */
    public get emptyCount(): number {
        return this._currentPuzzle ? this._currentPuzzle.emptyCount : 0;
    }

    /**
     * 获取剩余空格数量
     */
    public getRemainingEmpty(): number {
        let count = 0;
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (this._playerGrid[row][col] === 0) {
                    count++;
                }
            }
        }
        return count;
    }

    /**
     * 获取完成进度 (0-1)
     */
    public getProgress(): number {
        if (!this._currentPuzzle) return 0;
        const total = this._currentPuzzle.emptyCount;
        const remaining = this.getRemainingEmpty();
        return total > 0 ? (total - remaining) / total : 1;
    }

    /**
     * 打印当前题目（调试用）
     */
    public printPuzzle(): void {
        if (this._currentPuzzle) {
            SudokuGenerator.printGrid(this._currentPuzzle.puzzle);
        }
    }

    /**
     * 打印玩家网格（调试用）
     */
    public printPlayerGrid(): void {
        SudokuGenerator.printGrid(this._playerGrid);
    }

    /**
     * 清理缓存
     */
    public clearCache(): void {
        this._puzzleCache.get(SudokuDifficulty.EASY).length = 0;
        this._puzzleCache.get(SudokuDifficulty.MEDIUM).length = 0;
        this._puzzleCache.get(SudokuDifficulty.HARD).length = 0;
    }

    /**
     * 销毁实例
     */
    public static destroyInstance(): void {
        if (this._instance) {
            this._instance.clearCache();
            this._instance = null;
        }
    }
}

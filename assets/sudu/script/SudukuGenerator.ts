/**
 * 数独难度等级
 */
export enum SudokuDifficulty {
    /** 简单: 20-25个空格 */
    EASY = 1,
    /** 中等: 35-40个空格 */
    MEDIUM = 2,
    /** 困难: 50-55个空格 */
    HARD = 3
}

/**
 * 数独题目数据
 */
export interface SudokuPuzzle {
    /** 题目（0表示空格） */
    puzzle: number[][];
    /** 完整答案 */
    solution: number[][];
    /** 难度等级 */
    difficulty: SudokuDifficulty;
    /** 空格数量 */
    emptyCount: number;
}

/**
 * 数独题库生成器（工具类）
 * 
 * 使用回溯算法生成有效的数独题目
 * 支持三种难度等级
 * 
 * @example
 * // 生成简单难度题目
 * const puzzle = SudokuGenerator.generate(SudokuDifficulty.EASY);
 * 
 * // 验证答案
 * const isCorrect = SudokuGenerator.validateAnswer(playerGrid, puzzle.solution);
 */
export class SudokuGenerator {
    
    private static readonly GRID_SIZE: number = 9;
    private static readonly BOX_SIZE: number = 3;
    private static readonly MAX_GENERATION_ATTEMPTS: number = 100;

    /** 私有构造函数，防止实例化 */
    private constructor() {
        throw new Error('SudokuGenerator 是工具类，不能实例化');
    }
    
    /**
     * 根据难度获取空格数量范围
     */
    private static getEmptyCountRange(difficulty: SudokuDifficulty): { min: number, max: number } {
        switch (difficulty) {
            case SudokuDifficulty.EASY:
                return { min: 20, max: 25 };
            case SudokuDifficulty.MEDIUM:
                return { min: 35, max: 40 };
            case SudokuDifficulty.HARD:
                return { min: 50, max: 55 };
            default:
                return { min: 20, max: 25 };
        }
    }
    
    /**
     * 生成一个数独题目
     * @param difficulty 难度等级
     * @returns 数独题目数据
     */
    public static generate(difficulty: SudokuDifficulty = SudokuDifficulty.EASY): SudokuPuzzle {
        let attempts = 0;
        
        while (attempts < SudokuGenerator.MAX_GENERATION_ATTEMPTS) {
            attempts++;
            
            // 1. 生成完整的数独解答
            const solution = SudokuGenerator.generateSolution();
            
            // 2. 验证解答是否有效
            if (!SudokuGenerator.isCompleteSolution(solution)) {
                console.warn(`生成尝试 ${attempts}: 解答不完整，重新生成`);
                continue;
            }
            
            if (!SudokuGenerator.isValidCompleteSolution(solution)) {
                console.warn(`生成尝试 ${attempts}: 解答无效，重新生成`);
                continue;
            }
            
            // 3. 根据难度移除部分数字生成题目
            const { puzzle, emptyCount } = SudokuGenerator.createPuzzle(solution, difficulty);
            
            return {
                puzzle: puzzle,
                solution: solution,
                difficulty: difficulty,
                emptyCount: emptyCount
            };
        }
        
        // 如果多次尝试都失败，使用备用方法生成
        console.warn('使用备用方法生成数独');
        return SudokuGenerator.generateFallback(difficulty);
    }
    
    /**
     * 备用生成方法：使用预设的有效数独种子
     */
    private static generateFallback(difficulty: SudokuDifficulty): SudokuPuzzle {
        // 使用一个已知有效的数独种子
        const baseSolution: number[][] = [
            [5, 3, 4, 6, 7, 8, 9, 1, 2],
            [6, 7, 2, 1, 9, 5, 3, 4, 8],
            [1, 9, 8, 3, 4, 2, 5, 6, 7],
            [8, 5, 9, 7, 6, 1, 4, 2, 3],
            [4, 2, 6, 8, 5, 3, 7, 9, 1],
            [7, 1, 3, 9, 2, 4, 8, 5, 6],
            [9, 6, 1, 5, 3, 7, 2, 8, 4],
            [2, 8, 7, 4, 1, 9, 6, 3, 5],
            [3, 4, 5, 2, 8, 6, 1, 7, 9]
        ];
        
        // 对种子进行随机变换以产生不同的题目
        const solution = SudokuGenerator.transformSolution(baseSolution);
        const { puzzle, emptyCount } = SudokuGenerator.createPuzzle(solution, difficulty);
        
        return {
            puzzle: puzzle,
            solution: solution,
            difficulty: difficulty,
            emptyCount: emptyCount
        };
    }
    
    /**
     * 对有效解答进行随机变换，生成新的有效解答
     * 变换包括：交换数字、交换行/列（在同一宫格内）、旋转、翻转等
     */
    private static transformSolution(solution: number[][]): number[][] {
        // 深拷贝
        let result: number[][] = solution.map(row => [...row]);
        
        // 1. 随机交换数字 (1-9 的映射)
        const numMapping: number[] = SudokuGenerator.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                result[row][col] = numMapping[solution[row][col] - 1];
            }
        }
        
        // 2. 随机交换行（在同一个3行组内）
        for (let blockRow = 0; blockRow < 3; blockRow++) {
            const rows = [blockRow * 3, blockRow * 3 + 1, blockRow * 3 + 2];
            SudokuGenerator.shuffleArrayInPlace(rows);
            const tempRows = [result[blockRow * 3], result[blockRow * 3 + 1], result[blockRow * 3 + 2]];
            result[rows[0]] = tempRows[0];
            result[rows[1]] = tempRows[1];
            result[rows[2]] = tempRows[2];
        }
        
        // 3. 随机交换列（在同一个3列组内）
        for (let blockCol = 0; blockCol < 3; blockCol++) {
            const cols = [blockCol * 3, blockCol * 3 + 1, blockCol * 3 + 2];
            SudokuGenerator.shuffleArrayInPlace(cols);
            for (let row = 0; row < 9; row++) {
                const temp = [result[row][blockCol * 3], result[row][blockCol * 3 + 1], result[row][blockCol * 3 + 2]];
                result[row][cols[0]] = temp[0];
                result[row][cols[1]] = temp[1];
                result[row][cols[2]] = temp[2];
            }
        }
        
        // 4. 随机交换行组
        const rowBlocks = [0, 1, 2];
        SudokuGenerator.shuffleArrayInPlace(rowBlocks);
        const tempResult: number[][] = [];
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                tempResult.push(result[rowBlocks[i] * 3 + j]);
            }
        }
        result = tempResult;
        
        // 5. 随机交换列组
        const colBlocks = [0, 1, 2];
        SudokuGenerator.shuffleArrayInPlace(colBlocks);
        for (let row = 0; row < 9; row++) {
            const temp = [...result[row]];
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 3; j++) {
                    result[row][i * 3 + j] = temp[colBlocks[i] * 3 + j];
                }
            }
        }
        
        return result;
    }
    
    /**
     * 检查解答是否完整（没有空格）
     */
    private static isCompleteSolution(grid: number[][]): boolean {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0 || grid[row][col] < 1 || grid[row][col] > 9) {
                    return false;
                }
            }
        }
        return true;
    }
    
    /**
     * 验证完整解答是否满足数独规则
     * 每行、每列、每个3x3宫格都必须包含1-9的数字且不重复
     */
    private static isValidCompleteSolution(grid: number[][]): boolean {
        // 检查每一行
        for (let row = 0; row < 9; row++) {
            if (!SudokuGenerator.hasAllNumbers(grid[row])) {
                return false;
            }
        }
        
        // 检查每一列
        for (let col = 0; col < 9; col++) {
            const column: number[] = [];
            for (let row = 0; row < 9; row++) {
                column.push(grid[row][col]);
            }
            if (!SudokuGenerator.hasAllNumbers(column)) {
                return false;
            }
        }
        
        // 检查每个3x3宫格
        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                const box: number[] = [];
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        box.push(grid[boxRow * 3 + r][boxCol * 3 + c]);
                    }
                }
                if (!SudokuGenerator.hasAllNumbers(box)) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * 检查数组是否包含1-9的所有数字且不重复
     */
    private static hasAllNumbers(arr: number[]): boolean {
        if (arr.length !== 9) return false;
        const sorted = [...arr].sort((a, b) => a - b);
        for (let i = 0; i < 9; i++) {
            if (sorted[i] !== i + 1) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * 批量生成数独题目
     * @param count 生成数量
     * @param difficulty 难度等级
     * @returns 数独题目数组
     */
    public static generateBatch(count: number, difficulty: SudokuDifficulty = SudokuDifficulty.EASY): SudokuPuzzle[] {
        const puzzles: SudokuPuzzle[] = [];
        for (let i = 0; i < count; i++) {
            puzzles.push(SudokuGenerator.generate(difficulty));
        }
        return puzzles;
    }
    
    /**
     * 生成完整的数独解答
     * 使用回溯算法填充9x9网格
     */
    private static generateSolution(): number[][] {
        // 创建空网格 - 使用显式循环确保每行都是独立的数组
        const grid: number[][] = [];
        for (let i = 0; i < 9; i++) {
            grid.push([0, 0, 0, 0, 0, 0, 0, 0, 0]);
        }
        
        // 使用回溯算法填充网格
        const success = SudokuGenerator.fillGrid(grid);
        
        if (!success) {
            console.warn('回溯算法填充失败');
        }
        
        return grid;
    }
    
    /**
     * 使用回溯算法填充网格
     * @param grid 数独网格
     * @returns 是否成功填充
     */
    private static fillGrid(grid: number[][]): boolean {
        // 找到下一个空格
        const emptyCell = SudokuGenerator.findEmptyCell(grid);
        if (!emptyCell) {
            // 没有空格了，填充完成
            return true;
        }
        
        const [row, col] = emptyCell;
        
        // 生成1-9的随机排列
        const numbers = SudokuGenerator.shuffleArray([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        
        for (let i = 0; i < numbers.length; i++) {
            const num = numbers[i];
            if (SudokuGenerator.isValidPlacement(grid, row, col, num)) {
                grid[row][col] = num;
                
                if (SudokuGenerator.fillGrid(grid)) {
                    return true;
                }
                
                // 回溯
                grid[row][col] = 0;
            }
        }
        
        return false;
    }
    
    /**
     * 找到网格中的第一个空格
     * @param grid 数独网格
     * @returns 空格位置 [row, col] 或 null
     */
    private static findEmptyCell(grid: number[][]): [number, number] | null {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    return [row, col];
                }
            }
        }
        return null;
    }
    
    /**
     * 检查在指定位置放置数字是否有效
     * @param grid 数独网格
     * @param row 行索引
     * @param col 列索引
     * @param num 要放置的数字
     * @returns 是否有效
     */
    private static isValidPlacement(grid: number[][], row: number, col: number, num: number): boolean {
        // 检查行 - 使用循环而不是 includes
        for (let c = 0; c < 9; c++) {
            if (grid[row][c] === num) {
                return false;
            }
        }
        
        // 检查列
        for (let r = 0; r < 9; r++) {
            if (grid[r][col] === num) {
                return false;
            }
        }
        
        // 检查3x3宫格
        const boxStartRow = Math.floor(row / 3) * 3;
        const boxStartCol = Math.floor(col / 3) * 3;
        
        for (let r = boxStartRow; r < boxStartRow + 3; r++) {
            for (let c = boxStartCol; c < boxStartCol + 3; c++) {
                if (grid[r][c] === num) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * 根据难度从完整解答中移除数字，生成题目
     * @param solution 完整解答
     * @param difficulty 难度等级
     * @returns 题目和空格数量
     */
    private static createPuzzle(solution: number[][], difficulty: SudokuDifficulty): { puzzle: number[][], emptyCount: number } {
        // 深拷贝解答作为题目基础
        const puzzle: number[][] = solution.map(row => [...row]);
        
        // 获取空格数量范围
        const { min, max } = SudokuGenerator.getEmptyCountRange(difficulty);
        const targetEmptyCount = SudokuGenerator.randomInt(min, max);
        
        // 每个3x3宫格至少需要的空格数
        const MIN_EMPTY_PER_BOX = 2;
        
        // 记录每个宫格的空格数量 (3x3 = 9个宫格)
        const boxEmptyCount: number[][] = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ];
        
        // 按宫格分组位置，确保每个宫格至少有2个空格
        const positionsByBox: Map<string, [number, number][]> = new Map();
        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                const key = `${boxRow}_${boxCol}`;
                const positions: [number, number][] = [];
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        positions.push([boxRow * 3 + r, boxCol * 3 + c]);
                    }
                }
                // 打乱每个宫格内的位置
                SudokuGenerator.shuffleArrayInPlace(positions);
                positionsByBox.set(key, positions);
            }
        }
        
        let emptyCount = 0;
        
        // 第一阶段：确保每个宫格至少有 MIN_EMPTY_PER_BOX 个空格
        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                const key = `${boxRow}_${boxCol}`;
                const positions = positionsByBox.get(key);
                
                // 为每个宫格添加至少 MIN_EMPTY_PER_BOX 个空格
                let boxEmpty = 0;
                for (const [row, col] of positions) {
                    if (boxEmpty >= MIN_EMPTY_PER_BOX) break;
                    if (emptyCount >= targetEmptyCount) break;
                    
                    if (puzzle[row][col] !== 0) {
                        puzzle[row][col] = 0;
                        emptyCount++;
                        boxEmpty++;
                        boxEmptyCount[boxRow][boxCol]++;
                    }
                }
            }
        }
        
        // 第二阶段：继续随机移除数字直到达到目标空格数
        // 生成所有位置的随机排列
        const allPositions: [number, number][] = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                allPositions.push([row, col]);
            }
        }
        SudokuGenerator.shuffleArrayInPlace(allPositions);
        
        for (const [row, col] of allPositions) {
            if (emptyCount >= targetEmptyCount) {
                break;
            }
            
            // 跳过已经是空格的位置
            if (puzzle[row][col] === 0) {
                continue;
            }
            
            puzzle[row][col] = 0;
            emptyCount++;
            
            // 更新宫格空格计数
            const boxRow = Math.floor(row / 3);
            const boxCol = Math.floor(col / 3);
            boxEmptyCount[boxRow][boxCol]++;
        }
        
        return { puzzle, emptyCount };
    }
    
    /**
     * 获取每个宫格的空格数量
     * @param puzzle 数独题目
     * @returns 3x3数组，表示每个宫格的空格数
     */
    public static getBoxEmptyCounts(puzzle: number[][]): number[][] {
        const counts: number[][] = [
            [0, 0, 0],
            [0, 0, 0],
            [0, 0, 0]
        ];
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (puzzle[row][col] === 0) {
                    const boxRow = Math.floor(row / 3);
                    const boxCol = Math.floor(col / 3);
                    counts[boxRow][boxCol]++;
                }
            }
        }
        
        return counts;
    }
    
    /**
     * 验证题目是否有唯一解
     * @param puzzle 数独题目
     * @returns 是否有唯一解
     */
    private static hasUniqueSolution(puzzle: number[][]): boolean {
        const copy = puzzle.map(row => [...row]);
        let solutionCount = 0;
        
        const solveForUnique = (grid: number[][]): boolean => {
            const emptyCell = SudokuGenerator.findEmptyCell(grid);
            if (!emptyCell) {
                solutionCount++;
                return solutionCount > 1; // 发现第二个解就停止
            }
            
            const [row, col] = emptyCell;
            
            for (let num = 1; num <= 9; num++) {
                if (SudokuGenerator.isValidPlacement(grid, row, col, num)) {
                    grid[row][col] = num;
                    
                    if (solveForUnique(grid)) {
                        grid[row][col] = 0;
                        return true;
                    }
                    
                    grid[row][col] = 0;
                }
            }
            
            return false;
        };
        
        solveForUnique(copy);
        return solutionCount === 1;
    }
    
    /**
     * 验证玩家的答案是否正确
     * @param playerGrid 玩家填写的网格
     * @param solution 正确答案
     * @returns 是否完全正确
     */
    public static validateAnswer(playerGrid: number[][], solution: number[][]): boolean {
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (playerGrid[row][col] !== solution[row][col]) {
                    return false;
                }
            }
        }
        return true;
    }
    
    /**
     * 检查当前填写状态是否有效（没有冲突）
     * @param grid 当前网格
     * @returns 是否有效
     */
    public static isValidState(grid: number[][]): boolean {
        // 检查每一行
        for (let row = 0; row < 9; row++) {
            if (!SudokuGenerator.isValidGroup(grid[row])) {
                return false;
            }
        }
        
        // 检查每一列
        for (let col = 0; col < 9; col++) {
            const column: number[] = [];
            for (let row = 0; row < 9; row++) {
                column.push(grid[row][col]);
            }
            if (!SudokuGenerator.isValidGroup(column)) {
                return false;
            }
        }
        
        // 检查每个3x3宫格
        for (let boxRow = 0; boxRow < 3; boxRow++) {
            for (let boxCol = 0; boxCol < 3; boxCol++) {
                const box: number[] = [];
                for (let r = 0; r < 3; r++) {
                    for (let c = 0; c < 3; c++) {
                        box.push(grid[boxRow * 3 + r][boxCol * 3 + c]);
                    }
                }
                if (!SudokuGenerator.isValidGroup(box)) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * 检查一组数字是否有效（没有重复的非零数字）
     * @param group 数字数组
     * @returns 是否有效
     */
    private static isValidGroup(group: number[]): boolean {
        const seen = new Set<number>();
        for (const num of group) {
            if (num !== 0) {
                if (seen.has(num)) {
                    return false;
                }
                seen.add(num);
            }
        }
        return true;
    }
    
    /**
     * 获取某个位置的提示（正确答案）
     * @param solution 正确答案
     * @param row 行索引
     * @param col 列索引
     * @returns 该位置的正确数字
     */
    public static getHint(solution: number[][], row: number, col: number): number {
        return solution[row][col];
    }
    
    /**
     * 获取某个位置可以填入的候选数字
     * @param grid 当前网格
     * @param row 行索引
     * @param col 列索引
     * @returns 候选数字数组
     */
    public static getCandidates(grid: number[][], row: number, col: number): number[] {
        if (grid[row][col] !== 0) {
            return [];
        }
        
        const candidates: number[] = [];
        for (let num = 1; num <= 9; num++) {
            if (SudokuGenerator.isValidPlacement(grid, row, col, num)) {
                candidates.push(num);
            }
        }
        return candidates;
    }
    
    /**
     * 将数独网格转换为字符串（用于存储或显示）
     * @param grid 数独网格
     * @returns 字符串表示
     */
    public static gridToString(grid: number[][]): string {
        return grid.map(row => row.join('')).join('');
    }
    
    /**
     * 将字符串转换为数独网格
     * @param str 字符串（81个字符，0表示空格）
     * @returns 数独网格
     */
    public static stringToGrid(str: string): number[][] {
        if (str.length !== 81) {
            throw new Error('Invalid sudoku string length');
        }
        
        const grid: number[][] = [];
        for (let row = 0; row < 9; row++) {
            grid[row] = [];
            for (let col = 0; col < 9; col++) {
                grid[row][col] = parseInt(str[row * 9 + col], 10);
            }
        }
        return grid;
    }
    
    /**
     * 将完整的数独题目序列化为JSON字符串（用于存储）
     * @param puzzleData 数独题目数据
     * @returns JSON字符串
     */
    public static serializePuzzle(puzzleData: SudokuPuzzle): string {
        return JSON.stringify({
            puzzle: SudokuGenerator.gridToString(puzzleData.puzzle),
            solution: SudokuGenerator.gridToString(puzzleData.solution),
            difficulty: puzzleData.difficulty,
            emptyCount: puzzleData.emptyCount
        });
    }
    
    /**
     * 从JSON字符串反序列化为数独题目数据
     * @param jsonStr JSON字符串
     * @returns 数独题目数据
     */
    public static deserializePuzzle(jsonStr: string): SudokuPuzzle {
        const data = JSON.parse(jsonStr);
        return {
            puzzle: SudokuGenerator.stringToGrid(data.puzzle),
            solution: SudokuGenerator.stringToGrid(data.solution),
            difficulty: data.difficulty as SudokuDifficulty,
            emptyCount: data.emptyCount
        };
    }
    
    /**
     * 深拷贝数独题目数据
     * @param puzzleData 原始数独题目数据
     * @returns 拷贝的数独题目数据
     */
    public static clonePuzzle(puzzleData: SudokuPuzzle): SudokuPuzzle {
        return {
            puzzle: puzzleData.puzzle.map(row => [...row]),
            solution: puzzleData.solution.map(row => [...row]),
            difficulty: puzzleData.difficulty,
            emptyCount: puzzleData.emptyCount
        };
    }
    
    /**
     * 获取答案的深拷贝
     * @param puzzleData 数独题目数据
     * @returns 答案的深拷贝
     */
    public static getSolutionCopy(puzzleData: SudokuPuzzle): number[][] {
        return puzzleData.solution.map(row => [...row]);
    }
    
    /**
     * 获取题目的深拷贝
     * @param puzzleData 数独题目数据
     * @returns 题目的深拷贝
     */
    public static getPuzzleCopy(puzzleData: SudokuPuzzle): number[][] {
        return puzzleData.puzzle.map(row => [...row]);
    }
    
    /**
     * 检查玩家当前填写的格子是否与答案一致
     * @param puzzleData 数独题目数据
     * @param row 行索引
     * @param col 列索引
     * @param value 玩家填写的值
     * @returns 是否正确
     */
    public static checkCell(puzzleData: SudokuPuzzle, row: number, col: number, value: number): boolean {
        return puzzleData.solution[row][col] === value;
    }
    
    /**
     * 获取玩家当前填写与答案的差异
     * @param puzzleData 数独题目数据
     * @param playerGrid 玩家填写的网格
     * @returns 错误的格子位置数组
     */
    public static getWrongCells(puzzleData: SudokuPuzzle, playerGrid: number[][]): { row: number, col: number }[] {
        const wrongCells: { row: number, col: number }[] = [];
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                // 只检查玩家填写的格子（非0且非原题数字）
                if (playerGrid[row][col] !== 0 && 
                    puzzleData.puzzle[row][col] === 0 && 
                    playerGrid[row][col] !== puzzleData.solution[row][col]) {
                    wrongCells.push({ row, col });
                }
            }
        }
        return wrongCells;
    }
    
    /**
     * 打印数独网格到控制台（调试用）
     * @param grid 数独网格
     */
    public static printGrid(grid: number[][]): void {
        let output = '\n+-------+-------+-------+\n';
        for (let row = 0; row < 9; row++) {
            output += '| ';
            for (let col = 0; col < 9; col++) {
                output += grid[row][col] === 0 ? '.' : grid[row][col].toString();
                output += ' ';
                if ((col + 1) % 3 === 0) {
                    output += '| ';
                }
            }
            output += '\n';
            if ((row + 1) % 3 === 0) {
                output += '+-------+-------+-------+\n';
            }
        }
        console.log(output);
    }
    
    /**
     * 生成随机整数 [min, max]
     */
    private static randomInt(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    
    /**
     * 打乱数组并返回新数组
     */
    private static shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];
        SudokuGenerator.shuffleArrayInPlace(shuffled);
        return shuffled;
    }
    
    /**
     * 原地打乱数组 (Fisher-Yates 算法)
     */
    private static shuffleArrayInPlace<T>(array: T[]): void {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }
}


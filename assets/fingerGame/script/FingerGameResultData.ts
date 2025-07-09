/**
 * 手指游戏结果数据接口
 */
export interface FingerGameResultData {
    /** 响应状态码 */
    status: number;
    /** 响应数据 */
    data: {
        /** 任务ID（可选） */
        task_id?: number;
        /** 文件名（可选） */
        filename?: string;
        /** 左手平均分 */
        avg_left_score: number;
        /** 右手平均分 */
        avg_right_score: number;
        /** 每组左右手得分数组 */
        groups: FingerGameGroupScore[];
    };
}

/**
 * 每组得分数据接口
 */
export interface FingerGameGroupScore {
    /** 组序号 */
    seq: number;
    /** 左手得分 */
    left_score: number;
    /** 右手得分 */
    right_score: number;
}

/**
 * 手指游戏结果数据类
 */
export class FingerGameResult {
    private _data: FingerGameResultData;

    constructor(data: FingerGameResultData) {
        this._data = data;
    }

    /**
     * 获取任务ID
     */
    get taskId(): number {
        return this._data.data.task_id || 0;
    }

    /**
     * 获取文件名
     */
    get filename(): string {
        return this._data.data.filename || '';
    }

    /**
     * 获取左手平均分
     */
    get avgLeftScore(): number {
        return this._data.data.avg_left_score;
    }

    /**
     * 获取右手平均分
     */
    get avgRightScore(): number {
        return this._data.data.avg_right_score;
    }

    /**
     * 获取所有组得分数据
     */
    get groups(): FingerGameGroupScore[] {
        return this._data.data.groups;
    }

    /**
     * 获取总组数
     */
    get totalGroups(): number {
        return this._data.data.groups.length;
    }

    /**
     * 获取指定组的得分数据
     * @param seq 组序号
     */
    getGroupScore(seq: number): FingerGameGroupScore | null {
        return this._data.data.groups.find(group => group.seq === seq) || null;
    }

    /**
     * 获取最高得分
     */
    get maxScore(): number {
        let maxScore = 0;
        this._data.data.groups.forEach(group => {
            maxScore = Math.max(maxScore, group.left_score, group.right_score);
        });
        return maxScore;
    }

    /**
     * 获取最低得分
     */
    get minScore(): number {
        let minScore = 100;
        this._data.data.groups.forEach(group => {
            minScore = Math.min(minScore, group.left_score, group.right_score);
        });
        return minScore;
    }

    /**
     * 获取原始数据
     */
    get rawData(): FingerGameResultData {
        return this._data;
    }

    /**
     * 检查数据是否有效
     */
    isValid(): boolean {
        return this._data.status === 1;
    }
} 
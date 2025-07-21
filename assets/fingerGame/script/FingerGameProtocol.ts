export interface IFingerActivity {
    id: number;            // 活动id
    seq: number;           // 序号
    name: string;          // 动作名称
    description: string;   // 描述
    is_evaluable: boolean; // 是否要评分
    hand_mode: number;     //// 手模式1分开(分左右手框)2 合并 (用一个大框)
}

export interface IFingerActivityScore {
    task_id: number;         // 任务id
    activity_id: number;     // 活动id
    avg_left_score: number;  // 左手平均分
    avg_right_score: number; // 右手平均分
    groups: {
        seq: number;         // 序号
        left_score: number;  // 左手得分
        right_score: number; // 右手得分
    }[];
}

export interface IFingerActivityResult {
    task_id: number;           // 任务id
    activities: {
        id: number;            // 活动id
        seq: number;           // 序号
        name: string;          // 动作名称
        rating: number;        // 评价：1 优 2 良 3 中
        score: number;         // 分数
        completed_at: string;  // 完成时间
    }[];
}

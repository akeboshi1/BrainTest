export interface IFingerSet {
    id: number;            // 套装id
    name: string;          // 套装名称
    description: string;   // 套装描述
    activities: IFingerActivity[]; // 套装包含的所有节
}
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
    task_id: number;             // 任务id
    left_overall_score: number;  // 左手总评分
    right_overall_score: number; // 右手总评分
    activities: {
        id: number;             // 活动id
        seq: number;            // 序号
        name: string;           // 动作名称
        is_evaluable: boolean;  // 是否评分
        left_score: number;     // 左手分数
        right_score: number;    // 右手分数
        completed_at: string;   //完成时间
    }[];
}

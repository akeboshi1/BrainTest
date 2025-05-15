/**
 * 手指操游戏配置
 */

export interface VideoConfig {
    path: string;    // 视频路径
    duration: number; // 视频时长（秒）
    loopCount: number; // 视频循环次数
}

export interface FingerGameConfig {
    warmUpVideo: VideoConfig;  // 热身视频配置
    fingerVideos: VideoConfig[]; // 手指操视频配置列表
}

export const fingerGameConfig: FingerGameConfig = {
    // 热身视频配置
    warmUpVideo: {
        path: "video/warmup",
        duration: 5,
        loopCount: -1
    },
    
    // 手指操视频配置
    fingerVideos: [
        {
            path: "video/finger_exercise_1",
            duration: 3,
            loopCount: 8
        },
        {
            path: "video/finger_exercise_2",
            duration: 3,
            loopCount: 8
        },
        {
            path: "video/finger_exercise_3",
            duration: 3,
            loopCount: 8
        }
    ]
}; 
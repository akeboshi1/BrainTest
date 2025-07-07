/**
 * 手指操游戏配置
 */

export interface VideoConfig {
    path: string;    // 视频路径
    duration: number; // 视频时长（秒）
}

export interface SectionConfig {
    previewVideo: VideoConfig;  // 预览视频
    demoVideo: VideoConfig;     // 演示视频
    name: string;              // 节的名称
    icon?: string;             // 节的图标（可选）
}

export interface SetConfig {
    name: string;              // 这套手指操的名称
    sections: SectionConfig[]; // 该套手指操包含的所有节
    description?: string;      // 这套手指操的描述（可选）
    icon?: string;             // 这套手指操的图标（可选）
}

export interface FingerGameConfig {
    fingerSets: SetConfig[];    // 所有手指操套装
}

export const fingerGameConfig: FingerGameConfig = {
    // 手指操套装配置
    fingerSets: [
        {
            name: "第一套手指操",
            description: "基础入门手指操",
            icon: "image/setsImage/set_1/spriteFrame",
            sections: [
                {
                    name: "第一节",
                    icon: "image/setsImage/set_1/spriteFrame",
                    previewVideo: {
                        path: "video/set1/1_preview",
                        duration: 35
                    },
                    demoVideo: {
                        path: "video/set1/1_demo",
                        duration: 22
                    }
                },
                {
                    name: "第二节",
                    previewVideo: {
                        path: "video/set1/2_preview",
                        duration: 55
                    },
                    demoVideo: {
                        path: "video/set1/2_demo",
                        duration: 25
                    }
                },
                {
                    name: "第三节",
                    previewVideo: {
                        path: "video/set1/1_preview",
                        duration: 55
                    },
                    demoVideo: {
                        path: "video/set1/1_demo",
                        duration: 25
                    }
                },  
                {
                    name: "第四节",
                    previewVideo: {
                        path: "video/set1/1_preview",
                        duration: 55
                    },
                    demoVideo: {
                        path: "video/set1/1_demo",
                        duration: 25
                    }
                },
                {
                    name: "第五节",
                    previewVideo: {
                        path: "video/set1/1_preview",
                        duration: 55
                    },
                    demoVideo: {
                        path: "video/set1/1_demo",
                        duration: 25
                    }
                },  
                {
                    name: "第六节",
                    previewVideo: {
                        path: "video/set1/1_preview",
                        duration: 55
                    },
                    demoVideo: {
                        path: "video/set1/1_demo",
                        duration: 25
                    }
                }
            ]
        },
        {
            name: "第二套手指操",
            description: "进阶手指操",
            icon: "image/setsImage/set_1/spriteFrame",
            sections: [
                
            ]
        },
        {
            name: "第三套手指操",
            description: "高难度手指操",
            icon: "image/setsImage/set_1/spriteFrame",
            sections: [
                
            ]
        }
    ]
}; 
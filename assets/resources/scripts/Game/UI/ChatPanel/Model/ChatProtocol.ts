/**
 * 聊天角色皮肤接口
 */
export interface ChatSkin {
    /** 皮肤ID */
    id: number;
    /** 皮肤名称 */
    name: string;
    /** 皮肤代码（可选） */
    code?: string;
}

/**
 * 聊天角色接口
 */
export interface ChatCharacter {
    /** 角色ID */
    id: number;
    /** 角色名称 */
    name: string;
    /** 是否为默认角色 */
    is_default: boolean;
    /** 角色描述 */
    description: string | null;
    /** 角色性格 */
    personality: string | null;
    /** 角色皮肤列表 */
    skins: ChatSkin[];
}

/**
 * 聊天角色列表响应接口
 */
export interface ChatCharacterListResponse {
    /** 角色列表 */
    characters: ChatCharacter[];
}

/**
 * 歌单单曲信息
 */
export interface ChatSong {
    /** 歌曲ID */
    id: number;
    /** 歌曲名称 */
    name: string;
    /** 时长（秒） */
    duration: number;
    /** 是否正在播放 */
    isPlaying?: boolean;
}

/**
 * 动画类型
 */
export type AnimationType = "idle" | "talking";

/**
 * 动画时间线节点
 */
export interface AnimationTimelineNode {
    /** 时间点（秒） */
    time: number;
    /** 动画名称 */
    animation: AnimationType;
}

/**
 * 歌曲动画时间线配置
 */
export interface ChatSongAnimationTimeline {
    /** 歌曲ID */
    songId: number;
    /** 时间线节点列表，按时间顺序排列 */
    timeline: AnimationTimelineNode[];
}

/**
 * 聊天角色相关协议
 */
export namespace ChatProtocol {
    /** 获取角色列表 */
    export const GET_CHARACTERS = "chat.get_characters";
    
    /** 选择角色and皮肤 */
    export const CHOOSEN_CHARACTER = "chat.choose_character";
    
    /** 获取已选择的角色和皮肤 */
    export const GET_CHOOSEN_CHARACTER = "chat.get_chosen_character";

    /** 获取歌单 */
    export const GET_CHARACTER_SONGS = 'chat.get_character_songs';

    /** 获取歌曲时间线 */
    export const GET_SONG_TIMELINES = 'chat.get_song_timelines';
}

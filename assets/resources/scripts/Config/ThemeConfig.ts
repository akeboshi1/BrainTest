import { DebugLog } from "../Core/Util/DebugLog";

/**
 * 主题配置接口
 */
export interface ThemeUIConfig {
    bg: string;
    middle: string;
    title: string;
    middle_width?: number;  // middle图标的宽度
    middle_height?: number; // middle图标的高度
    title_width?: number;   // title图标的宽度
    title_height?: number;  // title图标的高度
}

/**
 * 主题任务配置接口
 */
export interface ThemeTaskConfig {
    title: string;
    txt: string;
    bg0_color: string;
    bg1_color: string;
    bg2_color?: string;
    bg3_color?: string;
    icon: string;
    icon_bg: string;
    width: number;
    height: number;
    word_color?: string;
    word_out_color: string;
    click_function_name?: string;
}

/**
 * 主题配置数据接口
 */
export interface ThemeConfigData {
    theme: {
        title: string;
        ui: ThemeUIConfig;
        tasks: ThemeTaskConfig[];
    };
}

export class ThemeConfig {
    private static _instance: ThemeConfig = null;
    
    private _themeData: ThemeConfigData = null;
    private _isInitialized: boolean = false;

    public static getInstance(): ThemeConfig {
        if (!this._instance) {
            this._instance = new ThemeConfig();
        }
        return this._instance;
    }

    /**
     * 初始化主题配置数据
     * @param data 主题配置数据
     */
    init(data: any): void {
        try {
            if (data) {
                this._themeData = data;
                this._isInitialized = true;
                DebugLog.instance.log("主题配置初始化成功:", this._themeData.theme.title);
            } else {
                DebugLog.instance.warn("主题配置数据格式错误或为空");
            }
        } catch (error) {
            DebugLog.instance.error("主题配置初始化失败:", error);
        }
    }

    /**
     * 获取主题配置数据
     * @returns 主题配置数据
     */
    getThemeData(): ThemeConfigData | null {
        return this._themeData;
    }

    /**
     * 获取UI配置
     * @returns UI配置
     */
    getUIConfig(): ThemeUIConfig | null {
        return this._themeData?.theme.ui || null;
    }

    /**
     * 获取任务配置
     * @returns 任务配置数组
     */
    getTasksConfig(): ThemeTaskConfig[] {
        return this._themeData?.theme.tasks || [];
    }

    /**
     * 获取主题标题
     * @returns 主题标题
     */
    getThemeTitle(): string {
        return this._themeData?.theme.title || "normal";
    }

    /**
     * 检查是否已初始化
     * @returns 是否已初始化
     */
    isInitialized(): boolean {
        return this._isInitialized;
    }

    /**
     * 获取配置（兼容IndexPageView的使用方式）
     * @returns 主题配置数据
     */
    getConfig(): ThemeConfigData | null {
        return this.getThemeData();
    }

    /**
     * 重置配置
     */
    reset(): void {
        this._themeData = null;
        this._isInitialized = false;
    }
}
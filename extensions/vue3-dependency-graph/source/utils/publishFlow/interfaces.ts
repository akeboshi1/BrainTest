/**
 * 完成方法枚举
 */
export enum FinishMethod {
    SUCCESS = 'success',
    FAILURE = 'failure'
}

/**
 * 流程状态
 */
export enum FlowStatus {
    IDLE = 'idle',
    RUNNING = 'running',
    SUCCESS = 'success',
    FAILED = 'failed',
    CANCELED = 'canceled'
}

/**
 * 发布流程单元接口
 */
export interface ProcessFlow {
    /**
     * 流程名称
     */
    name: string;
    
    /**
     * 流程描述
     */
    description: string;
    
    /**
     * 启动流程
     * @param params 启动参数
     * @returns Promise
     */
    start(params: any): Promise<void>;
    
    /**
     * 完成回调
     * @param method 完成方法
     * @param message 可选的消息
     */
    onFinished(method: FinishMethod, message?: string): void;
    
    /**
     * 设置进度回调
     * @param callback 进度回调函数
     */
    setProgressCallback(callback: (progress: number, message?: string) => void): void;
    
    /**
     * 取消流程
     */
    cancel(): void;
    
    /**
     * 流程是否正在运行
     */
    isRunning: boolean;
}

/**
 * 发布配置接口
 */
export interface PublishConfig {
    /**
     * 配置ID
     */
    id: string;
    
    /**
     * 配置文件路径
     */
    filePath: string;
    
    /**
     * 配置名称
     */
    name: string;
    
    /**
     * 配置描述
     */
    description?: string;
    
    /**
     * 配置内容
     */
    content: Record<string, any>;
}

/**
 * 发布进度信息
 */
export interface PublishProgress {
    /**
     * 流程名称
     */
    flowName: string;
    
    /**
     * 进度值 (0-100)
     */
    progress: number;
    
    /**
     * 状态
     */
    status: 'idle' | 'running' | 'success' | 'failed' | 'canceled';
    
    /**
     * 进度消息
     */
    message?: string;
} 
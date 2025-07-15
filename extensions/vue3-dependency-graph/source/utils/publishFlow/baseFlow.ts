import { ProcessFlow, FinishMethod } from './interfaces';

/**
 * 发布流程基类
 */
export abstract class BaseProcessFlow implements ProcessFlow {
    /**
     * 流程名称
     */
    readonly name: string;
    
    /**
     * 流程描述
     */
    readonly description: string;
    
    /**
     * 流程是否正在运行
     */
    public isRunning: boolean = false;
    
    /**
     * 进度回调函数
     */
    private progressCallback: ((progress: number, message?: string) => void) | null = null;
    
    /**
     * 完成回调函数
     */
    protected finishCallback: ((method: FinishMethod, message?: string) => void) | null = null;
    
    /**
     * Promise 的 resolve 函数
     */
    protected resolvePromise: ((value: void) => void) | null = null;
    
    /**
     * Promise 的 reject 函数
     */
    protected rejectPromise: ((reason: any) => void) | null = null;
    
    /**
     * 构造函数
     * @param name 流程名称
     * @param description 流程描述
     */
    constructor(name: string, description: string) {
        this.name = name;
        this.description = description;
    }
    
    /**
     * 开始流程，子类必须实现
     * @param params 流程参数
     */
    abstract start(params: any): Promise<void>;
    
    /**
     * 取消流程，子类必须实现
     */
    abstract cancel(): void;
    
    /**
     * 流程完成回调，子类可以覆盖以添加自定义处理
     * @param method 完成方法
     * @param message 可选的消息
     */
    onFinished(method: FinishMethod, message?: string): void {
        // 调用设置的回调
        if (this.finishCallback) {
            this.finishCallback(method, message);
        }
        
        // 解析 Promise
        if (method === FinishMethod.SUCCESS) {
            if (this.resolvePromise) {
                this.resolvePromise();
            }
        } else {
            if (this.rejectPromise) {
                this.rejectPromise(new Error(message || '流程失败'));
            }
        }
        
        // 重置状态和引用
        this.isRunning = false;
        this.resolvePromise = null;
        this.rejectPromise = null;
    }
    
    /**
     * 设置进度回调
     * @param callback 回调函数
     */
    setProgressCallback(callback: (progress: number, message?: string) => void): void {
        this.progressCallback = callback;
    }
    
    /**
     * 设置完成回调
     * @param callback 回调函数
     */
    setFinishedCallback(callback: (method: FinishMethod, message?: string) => void): void {
        this.finishCallback = callback;
    }
    
    /**
     * 创建包装处理 Promise 的函数
     */
    protected createPromiseWrapper(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.resolvePromise = resolve;
            this.rejectPromise = reject;
        });
    }
    
    /**
     * 更新进度
     * @param progress 进度 (0-100)
     * @param message 可选的消息
     */
    protected updateProgress(progress: number, message?: string): void {
        if (this.progressCallback) {
            this.progressCallback(progress, message);
        }
    }
    
    /**
     * 处理流程完成
     * @param method 完成方法
     * @param message 完成消息
     */
    protected handleFinish(method: FinishMethod, message?: string): void {
        this.onFinished(method, message);
    }
} 
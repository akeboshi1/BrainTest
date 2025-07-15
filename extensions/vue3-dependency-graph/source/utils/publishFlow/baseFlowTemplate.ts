import { BaseProcessFlow } from './baseFlow';
import { FinishMethod } from './interfaces';

/**
 * 流程参数示例
 */
export interface TemplateFlowParams {
    /**
     * 参数1
     */
    param1: string;
    
    /**
     * 参数2
     */
    param2: number;
}

/**
 * 标准流程类模板
 * 所有新的流程类都应该遵循此模板来正确处理 Promise
 */
export class TemplateFlow extends BaseProcessFlow {
    private canceled: boolean = false;
    
    constructor() {
        super('模板流程', '这是一个流程类模板');
    }
    
    /**
     * 启动流程
     * @param params 流程参数
     */
    async start(params: TemplateFlowParams): Promise<void> {
        // 已经在运行，拒绝启动
        if (this.isRunning) {
            console.warn('流程已在运行中');
            return Promise.reject(new Error('流程已在运行中'));
        }
        
        // 创建并返回一个Promise，该Promise在流程完成时被解析
        const promise = this.createPromiseWrapper();
        
        // 记录流程开始
        this.isRunning = true;
        this.canceled = false;
        this.updateProgress(0, '流程开始');
        
        try {
            // 执行流程逻辑 - 模拟异步操作
            this.executeProcess(params).catch(error => {
                this.handleFinish(FinishMethod.FAILURE, error instanceof Error ? error.message : String(error));
            });
        } catch (error) {
            // 处理同步错误
            this.handleFinish(FinishMethod.FAILURE, `流程执行失败: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // 返回Promise，它将在流程真正完成时被解析
        return promise;
    }
    
    /**
     * 执行实际流程（这是一个内部方法，包含主要业务逻辑）
     */
    private async executeProcess(params: TemplateFlowParams): Promise<void> {
        // 模拟一个分阶段的异步流程
        
        // 阶段 1
        this.updateProgress(20, '执行第一阶段');
        await this.simulateWork(500);
        
        // 检查取消状态
        if (this.canceled) {
            this.handleFinish(FinishMethod.FAILURE, '操作已取消');
            return;
        }
        
        // 阶段 2
        this.updateProgress(40, '执行第二阶段');
        await this.simulateWork(500);
        
        // 检查取消状态
        if (this.canceled) {
            this.handleFinish(FinishMethod.FAILURE, '操作已取消');
            return;
        }
        
        // 阶段 3
        this.updateProgress(60, '执行第三阶段');
        await this.simulateWork(500);
        
        // 检查取消状态
        if (this.canceled) {
            this.handleFinish(FinishMethod.FAILURE, '操作已取消');
            return;
        }
        
        // 阶段 4
        this.updateProgress(80, '执行第四阶段');
        await this.simulateWork(500);
        
        // 检查取消状态
        if (this.canceled) {
            this.handleFinish(FinishMethod.FAILURE, '操作已取消');
            return;
        }
        
        // 完成流程
        this.updateProgress(100, '流程完成');
        this.handleFinish(FinishMethod.SUCCESS, '流程已成功完成');
    }
    
    /**
     * 模拟异步工作
     */
    private async simulateWork(ms: number): Promise<void> {
        return new Promise<void>(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 取消流程
     */
    cancel(): void {
        if (!this.isRunning) {
            return;
        }
        
        this.canceled = true;
        console.log('正在取消流程...');
    }
} 
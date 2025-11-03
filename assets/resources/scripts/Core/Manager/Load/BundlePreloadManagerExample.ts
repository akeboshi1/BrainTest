import { BundlePreloadEvent, BundlePreloadManager } from './BundlePreloadManager';
import { EventManager } from '../Event/EventManager';
import { DebugLog } from '../../Util/DebugLog';
import { BundleName } from './BundleName';

/**
 * BundlePreloadManager错误处理使用示例
 * 展示如何监听和处理加载错误
 */
export class BundlePreloadManagerExample {

    /**
     * 示例：监听加载错误事件
     */
    public static setupErrorHandling() {
        // 监听加载失败事件
        EventManager.getInstance().on(BundlePreloadEvent.FAILED, (data) => {
            DebugLog.instance.error(`资源包加载失败: ${data.bundleName}`, data);
            
            // 可以在这里添加自定义的错误处理逻辑
            // 比如显示错误提示、记录错误日志等
        }, this);

        // 监听加载错误已处理事件
        EventManager.getInstance().on(BundlePreloadEvent.LOAD_ERROR_HANDLED, (data) => {
            if (data.handledSuccessfully) {
                if (data.fallbackUsed) {
                    DebugLog.instance.log(`加载错误已处理（降级方案）: ${data.bundleName} -> ${data.currentSceneName}`);
                } else {
                    DebugLog.instance.log(`加载错误已处理: ${data.bundleName} -> ${data.currentSceneName}`);
                }
            } else {
                DebugLog.instance.error(`加载错误处理失败: ${data.bundleName}`, data.finalError);
            }
        }, this);
    }

    /**
     * 示例：安全地预加载资源包
     * @param bundleName 资源包名称
     */
    public static async safePreload(bundleName: BundleName): Promise<boolean> {
        try {
            DebugLog.instance.log(`开始安全预加载: ${bundleName}`);
            
            await BundlePreloadManager.getInstance().preload(bundleName);
            
            DebugLog.instance.log(`安全预加载成功: ${bundleName}`);
            return true;
            
        } catch (error) {
            DebugLog.instance.error(`安全预加载失败: ${bundleName}`, error);
            return false;
        }
    }

    /**
     * 示例：带重试机制的预加载
     * @param bundleName 资源包名称
     * @param maxRetries 最大重试次数
     */
    public static async preloadWithRetry(bundleName: BundleName, maxRetries: number = 3): Promise<boolean> {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                DebugLog.instance.log(`预加载尝试 ${attempt}/${maxRetries}: ${bundleName}`);
                
                await BundlePreloadManager.getInstance().preload(bundleName);
                
                DebugLog.instance.log(`预加载成功: ${bundleName} (尝试 ${attempt})`);
                return true;
                
            } catch (error) {
                DebugLog.instance.error(`预加载失败 (尝试 ${attempt}/${maxRetries}): ${bundleName}`, error);
                
                if (attempt === maxRetries) {
                    DebugLog.instance.error(`预加载最终失败: ${bundleName} (已重试 ${maxRetries} 次)`);
                    return false;
                }
                
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
        
        return false;
    }

    /**
     * 示例：批量预加载多个资源包
     * @param bundleNames 资源包名称数组
     */
    public static async batchPreload(bundleNames: BundleName[]): Promise<{ success: BundleName[], failed: BundleName[] }> {
        const success: BundleName[] = [];
        const failed: BundleName[] = [];

        for (const bundleName of bundleNames) {
            try {
                await BundlePreloadManager.getInstance().preload(bundleName);
                success.push(bundleName);
                DebugLog.instance.log(`批量预加载成功: ${bundleName}`);
            } catch (error) {
                failed.push(bundleName);
                DebugLog.instance.error(`批量预加载失败: ${bundleName}`, error);
            }
        }

        DebugLog.instance.log(`批量预加载完成: 成功 ${success.length} 个, 失败 ${failed.length} 个`);
        return { success, failed };
    }

    /**
     * 示例：清理错误处理监听器
     */
    public static cleanupErrorHandling() {
        EventManager.getInstance().off(BundlePreloadEvent.FAILED, this);
        EventManager.getInstance().off(BundlePreloadEvent.LOAD_ERROR_HANDLED, this);
        DebugLog.instance.log('错误处理监听器已清理');
    }
}

/**
 * 使用示例：
 * 
 * // 1. 设置错误处理
 * BundlePreloadManagerExample.setupErrorHandling();
 * 
 * // 2. 安全预加载
 * const success = await BundlePreloadManagerExample.safePreload(BundleName.GUESSINGGAME);
 * if (success) {
 *     console.log('预加载成功，可以进入训练');
 * } else {
 *     console.log('预加载失败，用户已自动回到大厅');
 * }
 * 
 * // 3. 带重试的预加载
 * const retrySuccess = await BundlePreloadManagerExample.preloadWithRetry(BundleName.CATCHFISH, 3);
 * 
 * // 4. 批量预加载
 * const result = await BundlePreloadManagerExample.batchPreload([
 *     BundleName.FINGING,
 *     BundleName.FANPAI,
 *     BundleName.PUZZLE
 * ]);
 * 
 * // 5. 清理监听器
 * BundlePreloadManagerExample.cleanupErrorHandling();
 */ 
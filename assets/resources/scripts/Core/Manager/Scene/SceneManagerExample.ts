import { BundleName } from '../Load/BundleName';
import { SceneManager } from './SceneManager';
import { BundlePreloadEvent, BundlePreloadManager } from '../Load/BundlePreloadManager';
import { EventManager } from '../Event/EventManager';
import { DebugLog } from '../../Util/DebugLog';

/**
 * 场景管理器使用示例
 * 展示如何使用新的基于BundlePreloadEvent的场景切换功能
 */
export class SceneManagerExample {

    /**
     * 示例1: 使用新的changeSceneWithPreload方法
     * 这是推荐的使用方式，会自动处理预加载和场景切换
     */
    public static async example1_ChangeSceneWithPreload() {
        try {
            DebugLog.instance.log('开始示例1: 使用changeSceneWithPreload方法');
            
            // 使用新的方法，会自动处理预加载和场景切换
            const scene = await SceneManager.getInstance().changeSceneWithPreload(
                BundleName.GUESSINGGAME,
                undefined, // 使用配置中的场景名
                (scene) => {
                    // 场景切换完成后的回调
                    DebugLog.instance.log('场景切换完成，可以进行后续操作');
                }
            );
            
            DebugLog.instance.log('场景切换成功:', scene.name);
            
        } catch (error) {
            DebugLog.instance.error('场景切换失败:', error);
        }
    }

    /**
     * 示例2: 手动监听事件进行场景切换
     * 这种方式提供更多的控制权，可以监听所有预加载事件
     */
    public static example2_ManualEventListening() {
        DebugLog.instance.log('开始示例2: 手动监听事件');
        
        // 监听预加载开始事件
        EventManager.getInstance().on(BundlePreloadEvent.START, (data) => {
            DebugLog.instance.log('预加载开始:', data.bundleName);
        }, this);

        // 监听场景资源加载完成事件
        EventManager.getInstance().on(BundlePreloadEvent.SCENE_LOADED, (data) => {
            DebugLog.instance.log('场景资源加载完成:', data.sceneName);
        }, this);

        // 监听预加载完成事件
        EventManager.getInstance().on(BundlePreloadEvent.FINISH, (data) => {
            DebugLog.instance.log('预加载完成，开始切换场景:', data.bundleName);
            
            // 在这里进行场景切换
            SceneManager.getInstance().changeScene("", "guessingGame", data.bundleName).then((scene) => {
                DebugLog.instance.log('场景切换成功:', scene.name);
            }).catch((error) => {
                DebugLog.instance.error('场景切换失败:', error);
            });
        }, this);

        // 监听预加载失败事件
        EventManager.getInstance().on(BundlePreloadEvent.FAILED, (data) => {
            DebugLog.instance.error('预加载失败:', data.bundleName, data.error);
        }, this);

        // 开始预加载
        BundlePreloadManager.getInstance().preload(BundleName.GUESSINGGAME);
    }

    /**
     * 示例3: 检查场景是否已预加载
     */
    public static example3_CheckScenePreloaded() {
        DebugLog.instance.log('开始示例3: 检查场景预加载状态');
        
        const bundleName = BundleName.GUESSINGGAME;
        const isPreloaded = SceneManager.getInstance().isScenePreloaded(bundleName);
        
        if (isPreloaded) {
            DebugLog.instance.log(`场景 ${bundleName} 已预加载，可以直接切换`);
            // 直接切换场景
            SceneManager.getInstance().changeScene("", "guessingGame", bundleName);
        } else {
            DebugLog.instance.log(`场景 ${bundleName} 未预加载，需要先预加载`);
            // 使用预加载方式切换场景
            SceneManager.getInstance().changeSceneWithPreload(bundleName);
        }
    }

    /**
     * 示例4: 只加载场景资源，不切换场景
     */
    public static async example4_LoadSceneResourcesOnly() {
        DebugLog.instance.log('开始示例4: 只加载场景资源');
        
        try {
            // 只加载场景资源到内存中，不切换场景
            await BundlePreloadManager.getInstance().loadSceneResources(BundleName.GUESSINGGAME);
            
            DebugLog.instance.log('场景资源加载完成，可以随时切换场景');
            
            // 检查场景资源是否已加载
            const isLoaded = BundlePreloadManager.getInstance().isSceneLoaded(BundleName.GUESSINGGAME);
            DebugLog.instance.log('场景资源加载状态:', isLoaded);
            
        } catch (error) {
            DebugLog.instance.error('场景资源加载失败:', error);
        }
    }

    /**
     * 示例5: 在训练中心中的使用示例
     */
    public static example5_GameCenterUsage() {
        DebugLog.instance.log('开始示例5: 训练中心使用示例');
        
        // 模拟训练中心点击训练按钮
        const gameId = 5; // 猜谜训练
        let sceneName = "";
        
        switch (gameId) {
            case 1:
                sceneName = BundleName.FINGING;
                break;
            case 2:
                sceneName = BundleName.FANPAI;
                break;
            case 3:
                sceneName = BundleName.PUZZLE;
                break;
            case 4:
                sceneName = BundleName.CATCHFISH;
                break;
            case 5:
                sceneName = BundleName.GUESSINGGAME;
                break;
            case 6:
                sceneName = BundleName.SENTENCEMAKING;
                break;
            case 7:
                sceneName = BundleName.SMALLTHEATER;
                break;
            case 8:
                sceneName = BundleName.MATH24;
                break;
        }
        
        if (sceneName) {
            // 使用新的场景切换方法
            SceneManager.getInstance().changeSceneWithPreload(
                sceneName as BundleName,
                undefined,
                (scene) => {
                    DebugLog.instance.log(`训练 ${sceneName} 启动成功`);
                    // 可以在这里设置训练数据
                    // (scene as any).sceneModel = gameData;
                }
            );
        }
    }

    /**
     * 清理事件监听
     */
    public static cleanup() {
        // 移除所有相关的事件监听
        EventManager.getInstance().off(BundlePreloadEvent.START, this);
        EventManager.getInstance().off(BundlePreloadEvent.SCENE_LOADED, this);
        EventManager.getInstance().off(BundlePreloadEvent.FINISH, this);
        EventManager.getInstance().off(BundlePreloadEvent.FAILED, this);
        
        DebugLog.instance.log('事件监听已清理');
    }
} 
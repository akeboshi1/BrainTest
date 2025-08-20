import { assetManager, director, AssetManager, Scene, find ,EventTarget} from 'cc';
import { BaseManager } from "../BaseManager";
import { DebugLog } from "../../../Core/Util/DebugLog";
import { GameSceneConst } from "../../../Core/Data/GameSceneConst";
import { Global } from "../../../Core/Manager/Config/Global";
import { UIManager } from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import { BundleName } from '../Load/BundleName';
import { BrainTrain } from '../../../Game/UI/BrainTrain/BrainTrain';
import { EventManager } from '../Event/EventManager';
import {
    TaskAndNotificationPanelCtrl
} from "db://assets/resources/scripts/Game/UI/TaskAndNotificationPanel/TaskAndNotificationPanelCtrl";
import { BundlePreloadEvent, BundlePreloadManager } from '../Load/BundlePreloadManager';
import { AlertData, AlertManager } from '../Alert/AlertManager';
import { LoginManager } from '../LoginManager/LoginManager';
import { SocketManager } from '../Net/SocketManager';

export class SceneManager extends BaseManager {

    private static _instance: SceneManager;

    public static getInstance(): SceneManager {
        if (!SceneManager._instance) {
            SceneManager._instance = new SceneManager();
        }
        return SceneManager._instance;
    }

    public static SCENE_CHANGED: string = "SCENEMANAGER.SCENE.CHANGED";

    public static SCENE_ENTER: string = "SCENE_ENTER";

    public eventTarget: EventTarget = new EventTarget();

    private _curSceneName: string = "";

    private _restoreData: any = null;

    init() {

    }

    update() {

    }

    getRestoreData() {
        return this._restoreData;
    }

    /**
     * 切换场景
     * @param url bundle路径
     * @param sceneName scene名字
     */
    async changeScene(sceneName: string, bundleName: string = "", restoreData?: any): Promise<Scene> {
        DebugLog.instance.debug(`${sceneName} 开始切换场景0`);
        this._restoreData = null;
        const preScene = director.getScene();
        EventManager.getInstance().disableContext(preScene);

        return new Promise((resolve, reject) => {
            bundleName = bundleName == "" ? sceneName : bundleName;
            let sceneBundle = assetManager.getBundle(bundleName);
            if (!sceneBundle) {
                DebugLog.instance.debug(`${sceneName} 开始切换场景`);
                DebugLog.instance.warn(`${sceneName} 请使用perloadScene预加载场景`);

                assetManager.loadBundle(bundleName, (err, bundle) => {
                    if (err) {
                        DebugLog.instance.error(err);
                        reject(err);
                        return;
                    }
                    bundle.loadScene(sceneName, (err, scene) => {
                        if (err) {
                            DebugLog.instance.error(err);
                            reject(err);
                            return;
                        }
                        director.loadScene(sceneName, (err, scene) => {
                            // 如果加载失败，打印错误信息
                            if (err) {
                                DebugLog.instance.debug(`${sceneName} 切换场景失败`);
                                DebugLog.instance.error(err);
                                reject(err);
                                return;
                            }
                            const lastSceneName = this._curSceneName;
                            this._curSceneName = sceneName;
                            DebugLog.instance.debug(`${sceneName} 场景切换成功`);
                            this._restoreData = restoreData;
                            // 返回场景
                            resolve(scene);
                            this.emitSceneChangedEvent(sceneName, lastSceneName);
                        });
                    });
                });
            } else {
                DebugLog.instance.debug(`${sceneName} 开始切换场景2`);
                // 已经加载过bundle的情况
                director.loadScene(sceneName, (err, scene) => {
                    if (err) {
                        DebugLog.instance.debug(`${sceneName} 场景切换失败`);
                        DebugLog.instance.error(err);
                        return;
                    }
                    const lastSceneName = this._curSceneName;
                    this._curSceneName = sceneName;
                    DebugLog.instance.debug(`${sceneName} 场景切换成功`);
                    this._restoreData = restoreData;
                    resolve(scene);
                    this.emitSceneChangedEvent(sceneName, lastSceneName);
                    //emit event
                })
            }
        })
    }

    /**
     * 切换custom ab文件内的场景
     * @param sceneName
     * @param bundle
     * @param callback
     */
    async changeBundleScene(sceneName: string, bundle: AssetManager.Bundle, callback?: Function): Promise<void> {
        return new Promise((resolve, reject) => {
            bundle.loadScene(sceneName, function (err, scene) {
                if (err != null) {
                    reject(err);
                    return;
                }
                // todo 常驻node?
                director.runScene(scene);
                resolve();
            });
        });
    }


     /**
     * 显示重连失败弹窗，提供退出和重连选项
     */
     private async showReconnectFailedAlert(): Promise<void> {
        return new Promise<void>((resolve) => {
            const alertData: AlertData = {
                title: "连接失败",
                message: "网络连接失败，请检查网络设置后重试",
                messageFontColor: "#FFFFFF",
                confirmButtonText: "重连",
                cancelButtonText: "退出",
                cancelButtonVisible: false, // 隐藏退出按钮
                guideButtonVisible: false,
                guideButtonText: '玩法介绍',
                x: 0,
                y: 0,
                confirmCb: async () => {
                    // 用户选择重连，继续尝试重连
                    DebugLog.instance.log("用户选择重连，继续尝试重连");
                    resolve();
                    // 重新开始重连流程
                    SocketManager.getInstance().processReconnectFlow();
                },
                cancelCb: () => {
                    // 用户选择退出，跳转到登录界面
                    DebugLog.instance.log("用户选择退出，跳转到登录界面");
                    resolve();
                    LoginManager.getInstance().loginout();
                },
                contentClickCb: null,
                guideCallBack: null
            };
            
            AlertManager.getInstance().showAlert(alertData);
        });
    }

    /**
     * 返回大厅
     */
    async backToHall(isReconnect: boolean = false): Promise<void> {
        let self = this;
        return new Promise((resolve, reject) => {
            SceneManager.getInstance().changeScene("mainV2", BundleName.RESOURCES).then(() => {
                DebugLog.instance.log('返回大厅');
                if(isReconnect){
                   self.showReconnectFailedAlert();
                }
                resolve();
            }).catch(err => {
                reject(err);
            })
        })
    }

    async backToGameCenter(): Promise<void> {
        return new Promise((resolve, reject) => {
            SceneManager.getInstance().changeScene("mainV2", BundleName.RESOURCES).then((scene) => {
                DebugLog.instance.log('返回训练大厅');
                let node = find("Canvas");
                let mainScene = node.getComponent("MainSceneController");
                 mainScene["showGameCenter"]();
                // mainScene['setCurrentIndex'](MainSceneView.GameCenter);
                resolve();
            }).catch(err => {
                reject(err);
            })
        })
    }

    async backToSkewersGameCenter(): Promise<void> {
        return new Promise((resolve, reject) => {
            SceneManager.getInstance().changeScene("mainV2", BundleName.RESOURCES).then((scene) => {
                DebugLog.instance.log('返回串烧训练大厅');
                UIManager.getInstance().registerPanel(BrainTrain.NAME, BundleName.RESOURCES, "/prefab/BrainTrain/BrainTrain", BrainTrain);
                UIManager.getInstance().showPanel(BrainTrain.NAME);
                resolve();
            }).catch(err => {
                reject(err);
            })
        })
    }

    async backToSkewersGameCenterByID(id: number): Promise<void> {
        return new Promise((resolve, reject) => {
            SceneManager.getInstance().changeScene("mainV2", BundleName.RESOURCES).then((scene) => {
                DebugLog.instance.log('返回串烧训练大厅');
                UIManager.getInstance().registerPanel(BrainTrain.NAME, BundleName.RESOURCES, "/prefab/BrainTrain/BrainTrain", BrainTrain);
                UIManager.getInstance().showPanel(BrainTrain.NAME, id);
                resolve();
            }).catch(err => {
                reject(err);
            })
        })
    }

    async backToTaskProgress(): Promise<void> {
        return new Promise((resolve, reject) => {
            SceneManager.getInstance().changeScene("mainV2", BundleName.RESOURCES).then((scene) => {
                DebugLog.instance.log('返回串烧训练界面');
                UIManager.getInstance().registerPanel(TaskAndNotificationPanelCtrl.NAME, BundleName.RESOURCES, "prefab/TaskAndNotification/TaskAndNotificationPanel", TaskAndNotificationPanelCtrl);
                UIManager.getInstance().showPanel(TaskAndNotificationPanelCtrl.NAME);
                resolve();
            }).catch(err => {
                reject(err);
            })
        })
    }

    async showPingcePanel(): Promise<void> {
        return new Promise((resolve, reject) => {
            SceneManager.getInstance().changeScene("mainV2",BundleName.RESOURCES).then((scene) => {
                DebugLog.instance.log('返回串烧训练界面');
                let node = find("Canvas");
                let mainScene = node.getComponent("MainSceneController");
                mainScene["showReport"]();
                resolve();
            }).catch(err => {
                reject(err);
            })
        })
    }

    /**
     * 手动销毁当前scene
     */
    destroyCurScene() {
        const currentScene = director.getScene();
        if (currentScene) {
            currentScene.destroy(); // 销毁当前场景
        }
    }

    /**
     * 预加载场景资源
     * @param sceneName
     * @param callback
     */
    perloadScene(sceneName: string, callback?: Function) {
        if (callback) {
            director.preloadScene(sceneName, callback());
        } else {
            director.preloadScene(sceneName);
        }
    }

    /**
     * 获取当前scene
     */
    getCurrentScene() {
        return director.getScene();
    }

    /**
     * 在当前场景添加UI
     * @param sceneName
     * @param callback
     */
    addUIToContainerByName(node: any, containerName: string) {
        const scene = director.getScene();
        const container = scene.getChildByName("Canvas").getChildByName(containerName);
        if (container) {
            container.removeAllChildren();
        }
        container.addChild(node);
    }

    /**
     * 在当前场景添加UI
     * @param sceneName
     * @param callback
     */
    addUIToContainer(node: any, container: any) {
        const scene = director.getScene();
        if (container) {
            container.removeAllChildren();
        }
        container.addChild(node);
    }

    destroy() {
        this._curSceneName = "";
    }

    emitSceneChangedEvent(sceneName: string, lastSceneName: string) {
        this.eventTarget.emit(SceneManager.SCENE_CHANGED, sceneName, lastSceneName);
    }

    /**
     * 基于BundlePreloadEvent的场景切换
     * 先预加载资源包，然后监听FINISH事件进行场景切换
     * @param bundleName 资源包名称
     * @param sceneName 场景名称（可选，如果不提供则使用配置中的场景名）
     * @param callback 场景切换完成后的回调函数
     */
    public async changeSceneWithPreload(bundleName: BundleName, sceneName?: string, callback?: (scene: Scene) => void): Promise<Scene> {
        return new Promise((resolve, reject) => {
            // 确定要切换的场景名称
            let targetSceneName = sceneName;
            if (!targetSceneName) {
                const bundlePreloadConfig = BundlePreloadManager.getInstance()['config'];
                const isBundleConfigExist = bundlePreloadConfig.getGameModuleNames().indexOf(bundleName) >= 0;
                if (isBundleConfigExist) {
                    targetSceneName = bundlePreloadConfig.getPreloadScene(bundleName);
                } else {
                    targetSceneName = bundleName.valueOf();
                }
            }

            DebugLog.instance.log(`开始预加载场景: ${targetSceneName}`);

            // 监听预加载完成事件
            const onPreloadFinish = (data: any) => {
                if (data.bundleName === bundleName) {
                    DebugLog.instance.log(`预加载完成，开始切换场景: ${targetSceneName}`);
                    
                    // 移除事件监听
                    EventManager.getInstance().off(BundlePreloadEvent.FINISH, this);
                    
                    // 执行场景切换
                    this.changeScene("", targetSceneName, bundleName).then((scene) => {
                        DebugLog.instance.log(`场景切换成功: ${targetSceneName}`);
                        if (callback) {
                            callback(scene);
                        }
                        resolve(scene);
                    }).catch((error) => {
                        DebugLog.instance.error(`场景切换失败: ${targetSceneName}`, error);
                        reject(error);
                    });
                }
            };

            // 监听场景资源加载完成事件（可选）
            const onSceneLoaded = (data: any) => {
                if (data.bundleName === bundleName) {
                    DebugLog.instance.log(`场景资源加载完成: ${data.sceneName}`);
                }
            };

            // 监听预加载失败事件
            const onPreloadFailed = (data: any) => {
                if (data.bundleName === bundleName) {
                    DebugLog.instance.error(`预加载失败: ${bundleName}`, data);
                    
                    // 移除所有事件监听
                    EventManager.getInstance().off(BundlePreloadEvent.FINISH, this);
                    EventManager.getInstance().off(BundlePreloadEvent.SCENE_LOADED, this);
                    EventManager.getInstance().off(BundlePreloadEvent.FAILED, this);
                    
                    reject(new Error(`预加载失败: ${bundleName}`));
                }
            };

            // 注册事件监听
            EventManager.getInstance().on(BundlePreloadEvent.FINISH, onPreloadFinish, this);
            EventManager.getInstance().on(BundlePreloadEvent.SCENE_LOADED, onSceneLoaded, this);
            EventManager.getInstance().on(BundlePreloadEvent.FAILED, onPreloadFailed, this);

            // 开始预加载
            BundlePreloadManager.getInstance().preload(bundleName).catch((error) => {
                DebugLog.instance.error(`预加载启动失败: ${bundleName}`, error);
                reject(error);
            });
        });
    }

    /**
     * 检查场景是否已预加载完成
     * @param bundleName 资源包名称
     * @param sceneName 场景名称（可选）
     * @returns 是否已预加载完成
     */
    public isScenePreloaded(bundleName: BundleName, sceneName?: string): boolean {
        return BundlePreloadManager.getInstance().isSceneLoaded(bundleName, sceneName);
    }
}
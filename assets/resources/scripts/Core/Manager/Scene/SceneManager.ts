import { assetManager, director, AssetManager, Scene, find ,EventTarget} from 'cc';
import { BaseManager } from "../BaseManager";
import { DebugLog } from "../../../Core/Util/DebugLog";
import { GameSceneConst } from "../../../Core/Data/GameSceneConst";
import { Global } from "../../../Core/Manager/Config/Global";
import { MainSceneView } from "db://assets/resources/scripts/Game/Scene/MainScene";
import { UIManager } from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import { BundleName } from '../Load/BundleName';
import { BrainTrain } from '../../../Game/UI/BrainTrain/BrainTrain';
import { GenerateReport } from "db://assets/resources/scripts/Game/UI/PersonalCenter/GenerateReport";
import { EventManager } from '../Event/EventManager';
import {
    TaskAndNotificationPanelCtrl
} from "db://assets/resources/scripts/Game/UI/TaskAndNotificationPanel/TaskAndNotificationPanelCtrl";

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

    init() {

    }

    update() {

    }


    /**
     * 切换场景
     * @param url bundle路径
     * @param sceneName scene名字
     */
    async changeScene(url: string, sceneName: string, bundleName: string = ""): Promise<Scene> {
        DebugLog.instance.log(`${sceneName} 开始切换场景0`);
        const preScene = director.getScene();
        EventManager.getInstance().disableContext(preScene);

        return new Promise((resolve, reject) => {
            bundleName = bundleName == "" ? sceneName : bundleName;
            let sceneBundle = assetManager.getBundle(bundleName);
            if (!sceneBundle) {
                DebugLog.instance.log(`${sceneName} 开始切换场景`);
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
                                DebugLog.instance.log(`${sceneName} 切换场景失败`);
                                DebugLog.instance.error(err);
                                reject(err);
                                return;
                            }
                            const lastSceneName = this._curSceneName;
                            this._curSceneName = sceneName;
                            DebugLog.instance.log(`${sceneName} 场景切换成功`);
                            // 返回场景
                            resolve(scene);
                            this.emitSceneChangedEvent(sceneName, lastSceneName);
                        });
                    });
                });
            } else {
                DebugLog.instance.log(`${sceneName} 开始切换场景2`);
                // 已经加载过bundle的情况
                director.loadScene(sceneName, (err, scene) => {
                    if (err) {
                        DebugLog.instance.log(`${sceneName} 场景切换失败`);
                        DebugLog.instance.error(err);
                        return;
                    }
                    const lastSceneName = this._curSceneName;
                    this._curSceneName = sceneName;
                    DebugLog.instance.log(`${sceneName} 场景切换成功`);
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
     * 返回大厅
     */
    async backToHall(): Promise<void> {
        return new Promise((resolve, reject) => {
            let url = Global.RES_Root + GameSceneConst.Hall;
            SceneManager.getInstance().changeScene(GameSceneConst.Hall, "mainV2", BundleName.RESOURCES).then(() => {
                DebugLog.instance.log('返回大厅');
                resolve();
            }).catch(err => {
                reject(err);
            })
        })
    }

    async backToGameCenter(): Promise<void> {
        return new Promise((resolve, reject) => {
            let url = Global.RES_Root + GameSceneConst.Hall;
            SceneManager.getInstance().changeScene(GameSceneConst.Hall, "mainV2", BundleName.RESOURCES).then((scene) => {
                DebugLog.instance.log('返回游戏大厅');
                let node = find("Canvas");
                let scriptNode = node.getChildByName("scriptNode");
                let mainScene = scriptNode.getComponent("MainSceneController");
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
            let url = Global.RES_Root + GameSceneConst.Hall;
            SceneManager.getInstance().changeScene(GameSceneConst.Hall, "mainV2", BundleName.RESOURCES).then((scene) => {
                DebugLog.instance.log('返回串烧游戏大厅');
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
            let url = Global.RES_Root + GameSceneConst.Hall;
            SceneManager.getInstance().changeScene(GameSceneConst.Hall, "mainV2", BundleName.RESOURCES).then((scene) => {
                DebugLog.instance.log('返回串烧游戏大厅');
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
            let url = Global.RES_Root + GameSceneConst.Hall;
            SceneManager.getInstance().changeScene(GameSceneConst.Hall, "mainV2", BundleName.RESOURCES).then((scene) => {
                DebugLog.instance.log('返回串烧游戏界面');
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
            let url = Global.RES_Root + GameSceneConst.Hall;
            SceneManager.getInstance().changeScene(GameSceneConst.Hall, "mainV2",BundleName.RESOURCES).then((scene) => {
                DebugLog.instance.log('返回串烧游戏界面');
                let node = find("Canvas");
                let scriptNode = node.getChildByName("scriptNode");
                let mainScene = scriptNode.getComponent("MainSceneController");
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
}
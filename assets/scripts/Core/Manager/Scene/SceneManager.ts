import { assetManager, director,AssetManager, Scene,find } from 'cc';
import {BaseManager} from "../BaseManager";
import {LoaderManager} from "../../../Core/Manager/Load/LoaderManager";
import {DebugLog} from "../../../Core/Util/DebugLog";
import {GameSceneConst} from "../../../Core/Data/GameSceneConst";
import {Global} from "../../../Core/Manager/Config/Global";
import {MainScene, MainSceneView} from "db://assets/scripts/Game/Scene/MainScene";

export class SceneManager extends BaseManager{

    private static _instance: SceneManager;


    public static getInstance():SceneManager {
        if(!SceneManager._instance) {
            SceneManager._instance = new SceneManager();
        }
        return SceneManager._instance;
    }

    // 场景字典
    private scenes: {};

    init() {
        this.scenes = {};
    }

    update(){

    }


    /**
     * 切换场景
     * @param url bundle路径
     * @param sceneName scene名字
     */
    async changeScene(url:string,sceneName:string,):Promise<Scene>{
        return new Promise((resolve, reject)=>{
            let sceneBundle = assetManager.getBundle(url);
            if(!sceneBundle){
                LoaderManager.getInstance().assetBundleLoad(url,sceneName).then((bundle:AssetManager.Bundle)=>{
                    bundle.loadScene(sceneName,(err,scene)=>{
                        director.loadScene(sceneName,(err,scene)=>{
                            if(err){
                                DebugLog.instance.error(err);
                                return;
                            }
                            DebugLog.instance.log(`${sceneName} 场景切换成功`);
                            resolve(scene);
                        });
                    });
                }).catch(err=>{
                    reject(err);
                });
            }else{
                // 已经加载过bundle的情况
                 director.loadScene(sceneName,(err,scene)=>{
                    if(err){
                            DebugLog.instance.error(err);
                            return;
                    }
                    DebugLog.instance.log(`${sceneName} 场景切换成功`);
                    resolve(scene);
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
    async changeBundleScene(sceneName:string,bundle:AssetManager.Bundle,callback?:Function):Promise<void> {
       return new Promise((resolve,reject)=>{
           bundle.loadScene(sceneName, function (err, scene) {
               if(err!=null){
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
    async backToHall():Promise<void>{
        return new Promise((resolve,reject)=>{
            let url = Global.RES_Root + GameSceneConst.Hall;
            SceneManager.getInstance().changeScene(GameSceneConst.Hall,"main").then(()=>{
                DebugLog.instance.log('返回大厅');
                resolve();
            }).catch(err=>{
                reject(err);
            })
        })
    }

    async backToGameCenter():Promise<void>{
        return new Promise((resolve,reject)=>{
            let url = Global.RES_Root + GameSceneConst.Hall;
            SceneManager.getInstance().changeScene(GameSceneConst.Hall,"main").then((scene)=>{
                DebugLog.instance.log('返回游戏大厅');
                let node = find("Canvas");
                let scriptNode = node.getChildByName("scriptNode");
                let mainScene = scriptNode.getComponent("MainScene");
                mainScene['setCurrentIndex'](MainSceneView.GameCenter);
                resolve();
            }).catch(err=>{
                reject(err);
            })
        })
    }

    async backToSkewersGameCenter():Promise<void>{
        return new Promise((resolve,reject)=>{
            let url = Global.RES_Root + GameSceneConst.Hall;
            SceneManager.getInstance().changeScene(GameSceneConst.Hall,"main").then((scene)=>{
                DebugLog.instance.log('返回串烧游戏大厅');
                let node = find("Canvas");
                let scriptNode = node.getChildByName("scriptNode");
                let mainScene = scriptNode.getComponent("MainScene");
                mainScene['setCurrentIndex'](MainSceneView.BrainTrainView);
                resolve();
            }).catch(err=>{
                reject(err);
            })
        })
    }

    /**
     * 手动销毁当前scene
     */
    destroyCurScene(){
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
    perloadScene(sceneName:string,callback?:Function) {
        if(callback) {
            director.preloadScene(sceneName,callback());
        } else {
            director.preloadScene(sceneName);
        }
    }

    /**
     * 获取当前scene
     */
    getCurrentScene(){
        return director.getScene();
    }

    /**
     * 在当前场景添加UI
     * @param sceneName
     * @param callback
     */
    addUIToContainerByName(node:any, containerName:string) {
       const scene = director.getScene();
       const container = scene.getChildByName("Canvas").getChildByName(containerName);
       if(container){
           container.removeAllChildren();
       }
       container.addChild(node);
    }

    /**
     * 在当前场景添加UI
     * @param sceneName
     * @param callback
     */
    addUIToContainer(node:any, container:any) {
        const scene = director.getScene();
        if(container){
            container.removeAllChildren();
        }
        container.addChild(node);
    }

    destroy(){
        this.scenes = {};
    }


}
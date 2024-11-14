import { _decorator, director,AssetManager } from 'cc';
import {BaseManager} from "../BaseManager";

export class SceneManager extends BaseManager{

    private static _instance: SceneManager;

    // 场景字典
    private scenes: {};
    public static getInstance():SceneManager {
        if(!SceneManager._instance) {
            SceneManager._instance = new SceneManager();
        }
        return SceneManager._instance;
    }


    init() {
        this.scenes = {};
    }

    update(){

    }

    /**
     * 切换场景
     * @param sceneName
     */
    changeScene(sceneName:string,callback?:Function) {
        if(callback) {
            director.loadScene(sceneName,callback());
        } else {
            director.loadScene(sceneName);
        }
    }

    /**
     * 切换custom ab文件内的场景
     * @param sceneName
     * @param bundle
     * @param callback
     */
    async changeBundleScene(sceneName:string,bundle?:AssetManager.Bundle,callback?:Function):Promise<void> {
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
import { _decorator, director } from 'cc';
import {BaseManager} from "db://assets/scripts/Core/Manager/BaseManager";
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
     * 预先加载场景资源
     * @param sceneName
     */
    preloadScene(sceneName:string,callback?:Function) {
        if(callback) {
            director.preloadScene(sceneName,callback());
        } else {
            director.preloadScene(sceneName);
        }
    }

    /**
     * 切换场景
     * @param sceneName
     */
    changeScene(sceneName:string){
       director.loadScene(sceneName);
    }

    destroy(){
        this.scenes = {};
    }


}
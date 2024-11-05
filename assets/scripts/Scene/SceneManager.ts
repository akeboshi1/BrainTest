import { _decorator, director } from 'cc';
export class SceneManager {

    private static _instance: SceneManager;

    // 场景字典
    private scenes: {};
    public static getInstance():SceneManager {
        if(!SceneManager._instance) {
            SceneManager._instance = new SceneManager();
        }
        return SceneManager._instance;
    }
    constructor() {
        this.scenes = {};
    }

    /**
     * 预先加载场景资源
     * @param sceneName
     */
    preloadScene(sceneName:string,callback?:Function) {
        director.preloadScene(sceneName,callback!=null?callback():null);
    }

    /**
     * 切换场景
     * @param sceneName
     */
    changeScene(sceneName:string){
       director.loadScene(sceneName);
    }


}
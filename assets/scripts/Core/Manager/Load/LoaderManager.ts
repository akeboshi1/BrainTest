import {BaseManager} from "db://assets/scripts/Core/Manager/BaseManager";
import {_decorator,resources,assetManager} from 'cc'
import {DebugLog} from "db://assets/scripts/Core/Util/DebugLog";
export class LoaderManager extends BaseManager {
    private static _instance: LoaderManager;
    public static getInstance() {
        if(!LoaderManager._instance) {
            LoaderManager._instance = new LoaderManager();
        }
        return LoaderManager._instance;
    }

    private _spriteFrames: any = {};

    constructor() {
        super();
    }

    /**
     * 加载resources本地资源
     * @param url
     * @param callback
     */
    resourcesLoad(url:string,callback?:Function) {
        resources.load(url, (err, data) => {
            if(err){
                DebugLog.instance.error(err);
                return;
            }
            if(callback) {
                callback(data);
            }
        });
    }

    /**
     * 加载assetbundle资源
     * @param url
     * @param name
     * @param callback
     */
    assetBundleLoad(url:string,name:string,callback?:Function) {
        let bundle = assetManager.getBundle(name);
        if(!bundle) {
            assetManager.loadBundle(url,(err,_bundle)=>{
                if(err){
                    DebugLog.instance.error(err);
                    return;
                }
                bundle = _bundle;
                if(callback) {
                    callback(bundle)
                }
            })
        }else{
            if(callback) {
                callback(bundle);
            }
        }
    }
}
import {BaseManager} from "db://assets/scripts/Core/Manager/BaseManager";
import {_decorator,resources,assetManager,AssetManager,Prefab,Texture2D} from 'cc'
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
     * 加载resources(默认bundle)资源
     * @param url
     * @param callback
     */
    async resourcesLoad(url:string):Promise<any> {
        return new Promise((resolve, reject) => {
            resources.load(url, (err, data) => {
                if(err){
                    DebugLog.instance.error(err);
                    reject(err);
                    return;
                }
                resolve(data);
            });
        })
    }

    /**
     * 加载assetbundle资源
     * @param url
     * @param name
     * @param callback
     */
    async assetBundleLoad(url:string,name:string):Promise<AssetManager.Bundle> {
        return new Promise<AssetManager.Bundle>((resolve, reject) => {
            let bundle = assetManager.getBundle(name);
            if(!bundle) {
                assetManager.loadBundle(url,(err,_bundle)=>{
                    if(err){
                        DebugLog.instance.error(err);
                        reject(err);
                        return;
                    }
                    bundle = _bundle;
                    resolve(bundle);
                })
            }else{
                resolve(bundle);
            }
        });
    }

    /**
     * 加载其他bundle中资源
     * @param url
     * @param name
     */
    async loadABRes(url:string,name:string):Promise<any> {
        return new Promise<any>((resolve, reject) => {
            let bundle = assetManager.getBundle(name);
            if(!bundle) {
                DebugLog.instance.error(`${name},bundle not exist`);
                return;
            }
            bundle.load(url,Prefab,(err,res)=>{
                if(err){
                    DebugLog.instance.error(err);
                    reject(err);
                    return;
                }
                resolve(res);
            })
        });
    }



    /**
     * 加载其他bundle中预制体
     * @param url
     * @param name
     */
    async loadABPrefab(url:string,name:string):Promise<Prefab> {
        return new Promise<Prefab>((resolve, reject) => {
            let bundle = assetManager.getBundle(name);
            if(!bundle) {
                DebugLog.instance.error(`${name},bundle not exist`);
                return;
            }
            bundle.load(url,Prefab,(err,prefab)=>{
                if(err){
                    DebugLog.instance.error(err);
                    reject(err);
                    return;
                }
                resolve(prefab);
            })
        });
    }

    /**
     * 加载其他bundle中的图片
     * @param url
     * @param name
     */
    async loadABTexture(url:string,name:string):Promise<Texture2D> {
        return new Promise<Texture2D>((resolve, reject) => {
            let bundle = assetManager.getBundle(name);
            if(!bundle) {
                DebugLog.instance.error(`${name},bundle not exist`);
                return;
            }
            bundle.load(url,Texture2D,(err,texture)=>{
                if(err){
                    DebugLog.instance.error(err);
                    reject(err);
                    return;
                }
                resolve(texture);
            })
        });
    }
}
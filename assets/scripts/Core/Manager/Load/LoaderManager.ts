import {ImageAsset,resources,assetManager,AssetManager,Prefab,Texture2D,SpriteFrame} from 'cc'
import {BaseManager} from "../BaseManager";
import { DebugLog } from '../../Util/DebugLog';

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

    //======================  resources load
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
     * 加载resources(默认bundle)prefab资源 （外部环境，不带类型得load得方法会报错）
     * @param url
     */
    async resourcesLoadPrefab(url:string):Promise<Prefab> {
        return new Promise((resolve, reject) => {
            resources.load(url, Prefab,(err, prefab) => {
                if(err){
                    DebugLog.instance.error(err);
                    reject(err);
                    return;
                }
                resolve(prefab);
            });
        })
    }

    /**
     * 加载resources(默认bundle)prefab资源 （外部环境，不带类型得load得方法会报错）
     * @param url
     */
    async resourcesLoadTexture(url:string):Promise<Texture2D> {
        return new Promise((resolve, reject) => {
            resources.load(url, Texture2D,(err, texture) => {
                if(err){
                    DebugLog.instance.error(err);
                    reject(err);
                    return;
                }
                resolve(texture);
            });
        })
    }

    /**
     * 加载resources(默认bundle)prefab资源 （外部环境，不带类型得load得方法会报错）
     * @param url
     */
    async resourcesLoadFrame(url:string):Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            resources.load(url, SpriteFrame,(err, frame) => {
                if(err){
                    DebugLog.instance.error(err);
                    reject(err);
                    return;
                }
                resolve(frame);
            });
        })
    }

    //================ bundle load
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
    async loadABRes(url:string,name:string):Promise<ImageAsset> {
        return new Promise<any>((resolve, reject) => {
            let bundle = assetManager.getBundle(name);
            if(!bundle) {
                DebugLog.instance.error(`${name},bundle not exist`);
                return;
            }
            bundle.load(url,ImageAsset,(err,res)=>{
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

    /**
     * 加载其他bundle中的spriteframe
     * @param url
     * @param name
     */
    async loadABFrame(url:string,name:string):Promise<SpriteFrame> {
        return new Promise<SpriteFrame>((resolve, reject) => {
            let bundle = assetManager.getBundle(name);
            if(!bundle) {
                DebugLog.instance.error(`${name},bundle not exist`);
                return;
            }
            bundle.load(url,SpriteFrame,(err,frame)=>{
                if(err){
                    DebugLog.instance.error(err);
                    reject(err);
                    return;
                }
                resolve(frame);
            })
        });
    }

    /**
     * 释放单个资源
     * @param bundleName
     * @param resName
     * @param type
     */
    releaseBundleResByName(bundleName:string,resName:string,type:any){
        let bundle = assetManager.getBundle(bundleName);
        if(!bundle) {
            DebugLog.instance.error(`${bundleName},bundle not exist`);
            return;
        }
        let typeName;
        // 释放在 Asset Bundle 中的单个资源
        switch(type){
            case SpriteFrame:
                typeName = SpriteFrame;
                break;
            case Prefab:
                typeName = Prefab;
                break;
            case Texture2D:
                typeName = Texture2D;
                break;
            case ImageAsset:
                typeName = ImageAsset;
                break;
        }
        bundle.release(resName, typeName);
        assetManager.removeBundle(bundle);
    }

    /**
     * 传入资源，让cocos.assetManager移除对应资源
     * @param bundleName
     * @param res
     */
    releaseBundleRes(res:any){
        assetManager.releaseAsset(res)
    }

    /**
     * 移除某个bundle
     * @param bundleName
     */
    removeAllBundleRes(bundleName:string){
        let bundle = assetManager.getBundle(bundleName);
        if(!bundle) {
            DebugLog.instance.error(`${bundleName},bundle not exist`);
            return;
        }
        // 释放所有属于 Asset Bundle 的资源
        bundle.releaseAll();
        assetManager.removeBundle(bundle);
    }
}
import Global from "../FindingGlobal";
import GameLog from "./GameLogMgr";
import {Texture2D , AssetManager,assetManager,AudioClip,Sprite,SpriteFrame,Prefab,SpriteAtlas,ParticleAsset} from "cc"
import GameLogMgr from "./GameLogMgr";
import Bundle = AssetManager.Bundle;
import {BundleName} from "db://assets/resources/scripts/Core/Manager/Load/BundleName";
import {TimeUtil} from "db://assets/resources/scripts/Core/Util/TimeUtil";


export default class LoadMgr {

    private static _sprite = {};

    private static alreadyLoadBundle: Map<string, Bundle> = new Map<string, Bundle>()

    public static loadBundle(bundleNames: string[]) {
        return new Promise((resolve, reject) => {
            let functions: any[] = []
            for (let i = 0; i < bundleNames.length; i++) {
                let name = bundleNames[i]
                if (!this.alreadyLoadBundle.has(name)) {
                    functions.push(this.loadBundle_Single(name))
                }
            }
            Promise.all(functions).then((data) => {
                resolve(data)
            }, () => {
                reject(false)
            })
        })
    }

    public static loadBundle_Single(name: string) {
        return new Promise((resolve1, reject1) => {
            assetManager.loadBundle(name, (err, data) => {
                if (err) {
                    GameLogMgr.error("加载分包失败！！！！！！！！！", err, "name :", name)
                    reject1(false)
                    return
                }
                this.alreadyLoadBundle.set(name, data)
                resolve1(data)
            })
        })
    }

    public static judgeBundleLoad(name: string): boolean {
        return this.alreadyLoadBundle.has(name)
    }

    public static getBundle(bundle_name: string): Bundle {
        return this.alreadyLoadBundle.get(bundle_name)
    }

    //提前初始化所有分包
    public static init_bundleMgr() {
        // this.loadBundle_Single("homeView").then()
        // this.loadBundle_Single("gameView").then()
        // this.loadBundle_Single("homeView").then()
        // this.loadBundle_Single("treaView").then()
        // this.loadBundle_Single("oneBox").then()
        // // this.loadBundle_Single("twoBox").then()
        // // this.loadBundle_Single("threeBox").then()
        // // this.loadBundle_Single("fourBox").then()
        // this.loadBundle_Single("sliderBox").then()
    }


    /**
     * 加载图片
     * @param sprite
     * @param _url
     * @param needActive
     */
    public static loadSprite(sprite: Sprite, _url: string, needActive = true) {
        return new Promise((resolve, reject) => {
            if (this._sprite.hasOwnProperty(_url)) {
                sprite.spriteFrame = this._sprite[_url];
                if (needActive) {
                    sprite.node.active = true;
                }
                resolve(this._sprite[_url]);
                return;
            }
            let bundle = assetManager.getBundle(BundleName.FINGING);
            bundle.load( _url+"/spriteFrame", SpriteFrame, (err: Error, spf: SpriteFrame) => {
                if (err) {
                    GameLog.error(_url, ' 图片加载错误 ', err);
                    reject(false);
                    return;
                }


                this._sprite[_url] = spf;
                sprite.spriteFrame = spf;
                if (needActive) {
                    sprite.node.active = true;
                }

                resolve(spf);
            });
        });
    }

    private static _remote_Sprite: Map<string, SpriteFrame> = new Map<string, SpriteFrame>();

    /**
     * 初始化 gameBox 中的远程图片
     */
    public static initGameBox() {
        //更新导出的图片信息
        for (let i = 0; i < Global.exportInfo.length; i++) {
            let url = Global.exportInfo[i].iconImg
            assetManager.loadRemote(url+"/texture", Texture2D, (err, texture: Texture2D) => {
                if (texture.width == 0) {
                    let path = assetManager.cacheManager.getTemp(url);
                    assetManager.loadRemote(path, (err, sp: Texture2D) => {
                        if (err) {
                            GameLog.warn("第二次加载game box 远程图片失败");
                            return;
                        }
                        let sf = new SpriteFrame();
                        sf.texture = sp;
                        this._remote_Sprite.set(url, sf);
                    })
                } else {
                    if (err) {
                        GameLog.warn("加载gameBox 远程图片失败", err);
                        return
                    }
                    let sf = new SpriteFrame();
                    sf.texture = texture;
                    this._remote_Sprite.set(url, sf);
                }
            });
        }
    }

    public static loadRemoteSprite(_url: string, sprite: Sprite = null, needActive: boolean = true) {
        return new Promise((resolve, reject) => {
            if (this._remote_Sprite.get(_url)) {
                if (sprite) {
                    sprite.spriteFrame = this._remote_Sprite.get(_url);
                }
                if (needActive) {
                    if (sprite) {
                        sprite.node.active = true;
                    }
                }
                resolve(this._remote_Sprite.get(_url))
            } else {
                assetManager.loadRemote(_url, Texture2D, (err, texture: Texture2D) => {
                    if (texture.width == 0) {
                        let path = assetManager.cacheManager.getTemp(_url);
                        assetManager.loadRemote(path, (err, sp: Texture2D) => {
                            if (err) {
                                GameLog.warn("第二次加载远程图片失败", err);
                                reject(false);
                                return;
                            }
                            let sf = new SpriteFrame();
                            sf.texture = sp;
                            this._remote_Sprite.set(_url, sf);
                        });
                        if (sprite) {
                            sprite.spriteFrame = this._remote_Sprite.get(_url);
                        }
                        resolve(this._remote_Sprite.get(_url));
                    } else {
                        if (err) {
                            GameLog.warn("加载远程图片失败", err);
                            reject(false);
                            return;
                        }
                        let sf = new SpriteFrame();
                        sf.texture = texture;
                        this._remote_Sprite.set(_url, sf);
                    }
                    if (needActive) {
                        if (sprite) {
                            sprite.node.active = true;
                            sprite.spriteFrame = this._remote_Sprite.get(_url);
                            // sprite.spriteFrame = new SpriteFrame(texture)
                        }
                    }
                    resolve(this._remote_Sprite.get(_url));
                });
            }
        });
    }

    private static _prefabCaches = {};

    /**
     * 加载 预制体
     * @param _url
     */
    public static loadPrefab(_url: string) {
        return new Promise((resolve, reject) => {
            if (this._prefabCaches.hasOwnProperty(_url)) {
                resolve(this._prefabCaches[_url]);
                return;
            }
            let bundle = assetManager.getBundle(BundleName.FINGING);
            bundle.load(_url, Prefab, (err: Error, prefab: Prefab) => {
                if (err) {
                    GameLog.error('setPrefab error', err, _url);
                    reject(false);
                    return;
                }
                this._prefabCaches[_url] = prefab;
                resolve(prefab);
            });
        });
    }

    private static _audio_caches: Map<string, AudioClip> = new Map<string, AudioClip>();

    public static load_AudioClip(_url: string) {
        return new Promise((resolve, reject) => {
            if (this._audio_caches.get(_url)) {
                let audioClip = this._audio_caches.get(_url);
                resolve(audioClip);
            } else {
                let bundle = assetManager.getBundle(BundleName.FINGING);
                bundle.load(_url, AudioClip, (err, audio: AudioClip) => {
                    if (err) {
                        GameLog.error("加载音频失败", err, "url : ", _url);
                        reject(null);
                        return;
                    }
                    this._audio_caches.set(_url, audio);
                    resolve(audio);
                });
            }
        });
    }

    private static _AtlasCaches = {};

    /**
     * 加载 图集文件
     * @private
     */
    public static loadAtlas(_url: string, bundle: Bundle = this.getBundle("sub")) {
        return new Promise((resolve, reject) => {
            if (this._AtlasCaches.hasOwnProperty(_url)) {
                resolve(this._AtlasCaches[_url]);
                return;
            }
            bundle.load("image/" + _url, SpriteAtlas, (err: Error, atlas: SpriteAtlas) => {
                if (err) {
                    GameLog.log('setAtlas error', err, _url);
                    reject(false);
                    return;
                }
                this._AtlasCaches[_url] = atlas;
                resolve(atlas);
            });
        });
    }

    private static _particleCaches = {};

    public static loadParticle(_url: string, bundle: Bundle = this.getBundle("sub")) {
        return new Promise((resolve, reject) => {
            if (this._particleCaches.hasOwnProperty(_url)) {
                resolve(this._particleCaches[_url]);
                return;
            }
            let bundle = assetManager.getBundle(BundleName.FINGING);
            bundle.load(_url, ParticleAsset, (err: Error, particle: ParticleAsset) => {
                if (err) {
                    GameLog.log('setParticle error', err, _url);
                    reject(false);
                    return;
                }
                this._particleCaches[_url] = particle;
                resolve(particle);
            })
        })
    }
}

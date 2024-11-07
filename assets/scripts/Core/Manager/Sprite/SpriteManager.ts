import { DebugLog } from "../../Util/DebugLog";
import {BaseManager} from "../BaseManager";
import {Sprite,isValid,SpriteFrame,assetManager,AssetManager,resources} from 'cc';

export class SpriteManager extends BaseManager{
    private static _instance: SpriteManager = null;
    private _spriteFrames: any = {};

    public static getInstance() {
        if (!this._instance) {
            this._instance = new SpriteManager();
            this._instance._init();
        }
        return this._instance;
    }

    public static destroyInstance() {
        if (this._instance) {
            this._instance._destroy();
            delete this._instance;
            this._instance = null;
        }
    }

    private _init() {

    }

    private _destroy() {

    }

    public async setBundleSpriteFrameByName(sprite: Sprite, spriteFrameName: string) {
        if (!sprite) {
            return;
        }
        if (!Boolean(spriteFrameName)) {
            DebugLog.instance.warn("setSpriteFrameByName spriteFrameName is null");
            return;
        }
        let frame = await this.getBundleSpriteFrame(spriteFrameName);
        if (sprite && isValid(sprite) && isValid(sprite.node)) {
            if (frame) {
                sprite.spriteFrame = frame;
            }
        }
    }

    private async getBundleSpriteFrame(spriteFrameName: string) {
        let sp = this._spriteFrames[spriteFrameName]
        if (sp) {
            return sp
        }
        return await this.loadBundleSpriteFrame(spriteFrameName);
    }

    private async loadBundleSpriteFrame(path: string): Promise<SpriteFrame> {
        return new Promise<SpriteFrame>((resolve, reject) => {
            if (this._spriteFrames[path]) {
                resolve(this._spriteFrames[path]);
                return;
            }
            let bundle = assetManager.getBundle("fenbao");
            if (!bundle) {
                DebugLog.instance.warn("fenbao分包还没加载,图片路径", path);
                resolve(null);
                return;
            }
            bundle.load(path, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    DebugLog.instance.warn("loadSpriteFrame err", path, err);
                    resolve(null);
                    return;
                }
                this._spriteFrames[path] = spriteFrame;
                spriteFrame.addRef()
                resolve(spriteFrame as SpriteFrame);
            });
        });
    }

    public async setSpriteFrameByName(sprite: Sprite, spriteFrameName: string) {
        if (!sprite) {
            return;
        }
        if (!Boolean(spriteFrameName)) {
            DebugLog.instance.warn("setSpriteFrameByName spriteFrameName is null");
            return;
        }
        let frame = await this.getSpriteFrame(spriteFrameName);
        if (sprite && isValid(sprite) && isValid(sprite.node)) {
            if (frame) {
                sprite.spriteFrame = frame;
            }
        }

    }

    private async getSpriteFrame(spriteFrameName: string) {
        let sp = this._spriteFrames[spriteFrameName]
        if (sp) {
            return sp
        }
        return await this.loadSpriteFrame(spriteFrameName);
    }

    private async loadSpriteFrame(path: string): Promise<SpriteFrame> {
        return new Promise<SpriteFrame>((resolve, reject) => {
            if (this._spriteFrames[path]) {
                resolve(this._spriteFrames[path]);
                return;
            }
            resources.load(path, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    DebugLog.instance.warn("loadSpriteFrame err", path, err);
                    resolve(null);
                    return;
                }
                this._spriteFrames[path] = spriteFrame;
                spriteFrame.addRef()
                resolve(spriteFrame as SpriteFrame);
            });
        });
    }
}
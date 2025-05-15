import { assetManager, VideoClip } from "cc";
import { BundleName } from "../../resources/scripts/Core/Manager/Load/BundleName";
import { DebugLog } from "../../resources/scripts/Core/Util/DebugLog";


export class FingerGameModel {
    private _videoClipCache:Map<string,VideoClip> = new Map();

    public dispose(){
        this._videoClipCache.clear();
    }

    public getVideoClip(path:string):VideoClip | null{
        if(this._videoClipCache.has(path)){
            return this._videoClipCache.get(path);
        }
        return null;
    }

    public loadVideoClip(path:string):Promise<VideoClip>{
        const bundle = assetManager.getBundle(BundleName.FINGERGAME);
        return new Promise((resolve,reject)=>{
            bundle.load(path,VideoClip,(err,clip)=>{
                if(err){
                    DebugLog.instance.error(`loadVideoClip error:${err},path:${path}`);
                    reject(err);
                }else{
                    this._videoClipCache.set(path,clip);
                    resolve(clip);
                }
            });
        });
    }

    public loadVideoClips(paths:string[]):Promise<VideoClip[]>{
        return Promise.all(paths.map(path=>this.loadVideoClip(path)));
    }
}



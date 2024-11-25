import {sp} from 'cc';
export class SpineManager {
    private static _instance: SpineManager;

    public static getInstance():SpineManager {
        if(!SpineManager._instance) {
            SpineManager._instance = new SpineManager();
        }
        return SpineManager._instance;
    }

    private sp:sp.Skeleton;

    public init(sp:sp.Skeleton):void {
        this.sp = sp;
    }

    public setSpeakAction(sp:sp.Skeleton = null){
        this.changeSpineAction(sp||this.sp,"speak");
    }

    public setIdleAction(sp:sp.Skeleton = null){
        this.changeSpineAction(sp||this.sp,"idle");
    }

    private changeSpineAction(sp:sp.Skeleton = null,actionName:string = null) {
        let tmpSp = sp == null?this.sp:sp;
        tmpSp.setAnimation(0,actionName,true);
    }
}
import {BaseGuide} from "db://assets/resources/scripts/Core/Manager/Guide/BaseGuide";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";
import {GuideManager} from "db://assets/resources/scripts/Core/Manager/Guide/GuideManager";
import {Node,Vec3} from 'cc';
import {EventManager} from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
export class CatchFishGuide extends BaseGuide{
    public static NAME: string = "CatchFishGuide";
    public static GUIDECLICK:string= "GUIDECLICK";
    private _root:Node = null;
    private _wangPos:Vec3;
    private _wangNode:Node;
    private _fishNode:Node;
    constructor() {
        super();
        this.name = CatchFishGuide.NAME;
    }

    public start(data:any = null,name:string = null){
        super.start(data,name);

        this._root= data.root;
        this._root.addChild(GuideManager.getInstance().handNode);
        GuideManager.getInstance().handNode.active = true;
        GuideManager.getInstance().handNode.once(Node.EventType.TOUCH_START,this.step1.bind(this),this);

        this._fishNode = data.fish.getFishNode();
        GuideManager.getInstance().guideHand.string = "请看公式";
        const pos = this._fishNode.getPosition();
        GuideManager.getInstance().guideHand.start(new Vec3(pos.x+100,pos.y,pos.z));

        this._wangNode = data.wang[data.fish.currentIndex].parent;
        this._wangPos = this._wangNode.getPosition();

    }

    private step1(event){
        EventManager.getInstance().emit(CatchFishGuide.GUIDECLICK,1);
        GuideManager.getInstance().handNode.once(Node.EventType.TOUCH_START,this.end.bind(this),this);
        GuideManager.getInstance().guideHand.string = "点击答案";
        GuideManager.getInstance().guideHand.move(this._wangPos)
    }

    /**
     * 结束引导
     * @param event
     */
    public end(event):void{
        EventManager.getInstance().emit(CatchFishGuide.GUIDECLICK,2);
        GuideManager.getInstance().handNode.active = false;
        GuideManager.getInstance().end(CatchFishGuide.NAME);
        super.end(event);
        DebugLog.instance.log(`${this.name}引导结束`);
    }
}
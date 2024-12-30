import {Node,EventTouch,UITransform,Rect,Size} from "cc";
import {BaseGuide} from "db://assets/scripts/Core/Manager/Guide/BaseGuide";
import {GuideManager} from "db://assets/scripts/Core/Manager/Guide/GuideManager";
import {EventManager} from "db://assets/scripts/Core/Manager/Event/EventManager";
import {DebugLog} from "db://assets/scripts/Core/Util/DebugLog";

export class FindingGuide extends BaseGuide{
    public static NAME:string= "FindingGuide";
    private _data = null;
    private _root:Node = null;
    public static GUIDE_FIND_EMIT:string ="GUIDE_FIND_EMIT";
    public static GUIDE_FIND_END:string ="GUIDE_FIND_END";
    constructor() {
        super();
        this.name = FindingGuide.NAME;
    }

    public start(data:any = null,name:string = null):void{
        super.start(data,name);
        DebugLog.instance.log(`${name}引导开始`);
        this._data = data;
        this._root= data.root;
        this._root.addChild(GuideManager.getInstance().handNode);
        GuideManager.getInstance().handNode.active = true;
        GuideManager.getInstance().handNode.once(Node.EventType.TOUCH_START,this.step1.bind(this),this);
        this.dealPostiont(this._data.data,0);
    }

    private step1(event):void{
        GuideManager.getInstance().handNode.once(Node.EventType.TOUCH_START,this.step2.bind(this),this);
        EventManager.getInstance().emit(FindingGuide.GUIDE_FIND_EMIT,{pos:event.getUILocation(),i:0});
        this.dealPostiont(this._data.data,1);
    }

    private step2(event):void{
        GuideManager.getInstance().handNode.once(Node.EventType.TOUCH_START,this.end.bind(this),this);
        EventManager.getInstance().emit(FindingGuide.GUIDE_FIND_EMIT,{pos:event.getUILocation(),i:1});
        this.dealPostiont(this._data.data,2);
    }

    public end(event):void{
        EventManager.getInstance().emit(FindingGuide.GUIDE_FIND_END,{pos:event.getUILocation(),i:2});
        GuideManager.getInstance().handNode.active = false;
        GuideManager.getInstance().end(FindingGuide.NAME);
        super.end(event);
        DebugLog.instance.log(`${this.name}引导结束`);
    }

    private dealPostiont(boundLists:Rect[],index:number){
        let diffX = boundLists[index].width / 2;
        let diffY = boundLists[index].height / 2;
        GuideManager.getInstance().handNode.setPosition(boundLists[index].x + diffX, boundLists[index].y + diffY)
    }




}
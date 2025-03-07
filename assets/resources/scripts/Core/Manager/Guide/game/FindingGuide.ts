import {Node,EventTouch,UITransform,Rect,Vec3} from "cc";
import {BaseGuide} from "db://assets/resources/scripts/Core/Manager/Guide/BaseGuide";
import {GuideManager} from "db://assets/resources/scripts/Core/Manager/Guide/GuideManager";
import {EventManager} from "db://assets/resources/scripts/Core/Manager/Event/EventManager";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";

export class FindingGuide extends BaseGuide{
    public static NAME:string= "FindingGuide";
    private _data = null;
    private _root:Node = null;
    private _guideCount:number = 0;
    public static GUIDE_FIND_EMIT:string ="GUIDE_FIND_EMIT";
    public static GUIDE_FIND_END:string ="GUIDE_FIND_END";
    constructor() {
        super();
        this.name = FindingGuide.NAME;
    }

    /**
     * 开始引导
     * @param data
     * @param name
     */
    public start(data:any = null,name:string = null):void{
        super.start(data,name);


        this._data = data;
        this._root= data.root;
        this._root.addChild(GuideManager.getInstance().handNode);
        GuideManager.getInstance().handNode.active = true;
        GuideManager.getInstance().handNode.once(Node.EventType.TOUCH_START,this.step1.bind(this),this);

        this._guideCount = this._data.count;
        let rects = this._data.data;
        let diffX = rects[0].width / 2;
        let diffY = rects[0].height / 2;
        GuideManager.getInstance().guideHand.string = "请点击";
        GuideManager.getInstance().guideHand.start(new Vec3(rects[0].x + diffX, rects[0].y + diffY,0));
    }

    /**
     * 引导第一步
     * @param event
     * @private
     */
    private step1(event):void{
        GuideManager.getInstance().handNode.once(Node.EventType.TOUCH_START,this._guideCount>1?this.step2.bind(this):this.end.bind(this),this);
        EventManager.getInstance().emit(FindingGuide.GUIDE_FIND_EMIT,{pos:event.getUILocation(),i:0});
        this.dealPostiont(this._data.data,1);
    }

    /**
     * 引导第二步
     * @param event
     * @private
     */
    private step2(event):void{
        GuideManager.getInstance().handNode.once(Node.EventType.TOUCH_START,this._guideCount>2?this.step3.bind(this):this.end.bind(this),this);
        EventManager.getInstance().emit(FindingGuide.GUIDE_FIND_EMIT,{pos:event.getUILocation(),i:1});
        this.dealPostiont(this._data.data,2);
    }

    private step3(event):void{
        GuideManager.getInstance().handNode.once(Node.EventType.TOUCH_START,this._guideCount>3?this.step4.bind(this):this.end.bind(this),this);
        EventManager.getInstance().emit(FindingGuide.GUIDE_FIND_EMIT,{pos:event.getUILocation(),i:2});
        this.dealPostiont(this._data.data,3);
    }

    private step4(event):void{
        GuideManager.getInstance().handNode.once(Node.EventType.TOUCH_START,this.end.bind(this),this);
        EventManager.getInstance().emit(FindingGuide.GUIDE_FIND_EMIT,{pos:event.getUILocation(),i:3});
        this.dealPostiont(this._data.data,4);
    }

    /**
     * 结束引导
     * @param event
     */
    public end(event):void{
        EventManager.getInstance().emit(FindingGuide.GUIDE_FIND_END,{pos:event.getUILocation(),i:this._guideCount});
        GuideManager.getInstance().handNode.active = false;
        GuideManager.getInstance().end(FindingGuide.NAME);
        super.end(event);
        DebugLog.instance.log(`${this.name}引导结束`);
    }

    private dealPostiont(boundLists:Rect[],index:number){
        let diffX = boundLists[index].width / 2;
        let diffY = boundLists[index].height / 2;
        GuideManager.getInstance().guideHand.move(new Vec3(boundLists[index].x + diffX, boundLists[index].y + diffY,0))
    }




}
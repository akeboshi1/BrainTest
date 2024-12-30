import {Node,EventTouch,find} from "cc";
import {BaseGuide} from "db://assets/scripts/Core/Manager/Guide/BaseGuide";
import {GuideManager} from "db://assets/scripts/Core/Manager/Guide/GuideManager";

export class GuideFindingGuide extends BaseGuide{
    public static NAME:string= "GuideFindingGuide";
    private _data = null;
    private _root:Node = null;
    constructor() {
        super();
    }

    public start(data:any = null):void{
        super.start(data);
        this._data = data;
        let canvas = find('Canvas');
        let root:Node= canvas.getChildByName('guideLayer');
        root.addChild(GuideManager.getInstance().handNode);
        GuideManager.getInstance().handNode.active = true;
        GuideManager.getInstance().handNode.once(Node.EventType.TOUCH_START,this.step1,this);
        GuideManager.getInstance().handNode.setPosition(this._data[0]);
    }

    private step1(event:EventTouch):void{
        GuideManager.getInstance().handNode.once(Node.EventType.TOUCH_START,this.step2,this);
        GuideManager.getInstance().handNode.setPosition(this._data[1]);
    }

    private step2(event:EventTouch):void{
        GuideManager.getInstance().handNode.once(Node.EventType.TOUCH_START,this.step3,this);
        GuideManager.getInstance().handNode.setPosition(this._data[2]);
    }

    private step3(event:EventTouch):void{
        GuideManager.getInstance().handNode.once(Node.EventType.TOUCH_START,this.end,this);
        GuideManager.getInstance().handNode.setPosition(this._data[3]);
    }

    public end():void{
        super.end();
        GuideManager.getInstance().handNode.active = false;
    }




}
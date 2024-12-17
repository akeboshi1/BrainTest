import {Component,_decorator,Node,Label,Button,ProgressBar,UITransform,SpriteFrame,Sprite} from "cc";
import {EventManager} from "db://assets/scripts/Core/Manager/Event/EventManager";
import {LoaderManager} from "db://assets/scripts/Core/Manager/Load/LoaderManager";
import {DebugLog} from "db://assets/scripts/Core/Util/DebugLog";
const { ccclass, property } = _decorator;
interface CallBackFunction {
    boundCallback?: Function;
}

export enum AlertType {
    Normal,
    Sucess_Small,
    Sucess_Big,
    Failed,
    Game_Center,
    Init
}

/**
 * 通用型alert
 */
@ccclass('GameAlert')
export class GameAlert extends Component{

    @property(Node)
    alert:Node = null;

    @property(Label)
    titleLabel:Label = null;

    @property(Label)
    decLabel:Label = null;

    @property(Button)
    exitBtn:Button = null;

    @property(Button)
    startBtn:Button = null;

    @property(Node)
    icon:Node = null;

    @property(ProgressBar)
    progressBar:ProgressBar = null;

    @property(Label)
    progressLabel:Label = null;

    @property(Node)
    completeIcon:Node = null;

    @property(Node)
    iconConNode:Node = null;

    public static ALERT_GOON:string ="ALERT_GOON";

    public static ALERT_EXIT:string = "ALERT_EXIT";

    public goonCallBack:Function = null;

    public exitCallBack:Function = null;

    /**
     * 回调函数上下文
     */
    public context:any = null;

    showView(type:AlertType) {
        let startBtnUITransform = this.startBtn.node.getComponent(UITransform);
        switch (type) {
            case AlertType.Normal:
                this.exitBtn.node.active = true;
                this.startBtn.node.active = true;
                this.progressBar.node.active = true;
                this.titleLabel.node.active = true;
                this.iconConNode.active = false;
                this.decLabel.node.active = false;
                startBtnUITransform.width = 250;

                break;
            case AlertType.Sucess_Small:
                this.exitBtn.node.active = true;
                this.startBtn.node.active = true;
                this.titleLabel.node.active = true;
                this.iconConNode.active = true;
                this.decLabel.node.active = true;
                this.progressBar.node.active = false;

                startBtnUITransform.width = 250;
                break;
            case AlertType.Sucess_Big:
                this.startBtn.node.active = true;
                this.decLabel.node.active = true;
                this.titleLabel.node.active = true;
                this.progressBar.node.active = false;
                this.iconConNode.active = false;
                this.exitBtn.node.active = false;

                startBtnUITransform.width = 500;
                break;
            case AlertType.Failed:
                // todo
                break;
            case AlertType.Init:
                this.startBtn.node.active = true;
                this.decLabel.node.active = false;
                this.titleLabel.node.active = true;
                this.progressBar.node.active = false;
                this.iconConNode.active = false;
                this.exitBtn.node.active = false;

                startBtnUITransform.width = 500;
                break;
            case AlertType.Game_Center:
                this.startBtn.node.active = true;
                this.decLabel.node.active = false;
                this.titleLabel.node.active = true;
                this.progressBar.node.active = false;
                this.iconConNode.active = false;
                this.exitBtn.node.active = true;
                startBtnUITransform.width = 250;
                break;
        }
    }

    setProgress(curcount:number,maxcount:number) {
        let curProgress = "";
        if(maxcount == 0){
            this.progressBar.progress = 1;
            curProgress = "1/1"
        }else{
            curcount = curcount<0 ? 0 : curcount;
            this.progressBar.progress = curcount/maxcount;
            curProgress= `${curcount} / ${maxcount}`;
        }
        this.progressLabel.string = `当前游戏进度:${curProgress}`;
    }

    setTitle(str:string){
        this.titleLabel.string = str;
    }

    setDec(str:string){
        this.decLabel.string = str;
    }

    setIcon(iconUrl:string){
        LoaderManager.getInstance().resourcesLoadFrame(iconUrl).then((spriteframe)=>{
            if(this.icon){
                let sprite = this.icon.getComponent(Sprite);
                sprite.spriteFrame = spriteframe;
            }
        }).catch((error)=>{
            DebugLog.instance.error(error);
        })
    }

    start(){

    }

    exitHandler(){
        // SceneManager.getInstance().backToHall();
        EventManager.getInstance().emit(GameAlert.ALERT_EXIT);
        if(this.exitCallBack){
            this.exitCallBack(this.context);
        }
        this.node.removeFromParent();
    }

    /**
     * 继续
     */
    goHandler(){
        EventManager.getInstance().emit(GameAlert.ALERT_GOON);
        if(this.goonCallBack){
            this.goonCallBack(this.context);
        }
        this.node.removeFromParent();
    }

    /**
     * 外部绑定alert交互事件
     * @param goonCallBack
     * @param exitCallBack
     * @param context
     */
    bindCallBack(goonCallBack:Function,exitCallBack:Function,context:any){
        this.context = context;
       if(goonCallBack){
           this.goonCallBack = goonCallBack;
           goonCallBack.bind(context);
       }
       if(exitCallBack){
           this.exitCallBack = exitCallBack;
           exitCallBack.bind(context);
       }
    }



}
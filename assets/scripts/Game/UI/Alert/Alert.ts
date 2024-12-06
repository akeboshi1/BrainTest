import {Component,_decorator,Node,Label,Button,ProgressBar,UITransform} from "cc";
import {SceneManager} from "../../../Core/Manager/Scene/SceneManager";
import {SkewersManager} from "db://assets/scripts/Game/Task/Skewers/SkewersManager";
const { ccclass, property } = _decorator;
interface CallBackFunction {
    boundCallback?: Function;
}

export enum AlertType {
    Normal,
    Sucess_Small,
    Sucess_Big,
    Failed
}
@ccclass('Alert')
export class Alert extends Component{


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

    private callBackFuction:CallBackFunction;
   
    showView(type:AlertType) {
        let startBtnUITransform = this.startBtn.node.getComponent(UITransform);
        switch (type) {
            case AlertType.Normal:
                this.exitBtn.node.active = true;
                this.startBtn.node.active = true;
                this.progressBar.node.active = true;
                this.titleLabel.node.active = true;
                this.icon.active = false;
                this.decLabel.node.active = false;

                startBtnUITransform.width = 250;
               let curcount =  SkewersManager.getInstance().getCurGameIndex();
               let maxcount = SkewersManager.getInstance().getGameCount();
               let curProgress = "";
               if(maxcount == 0){
                   this.progressBar.progress = 1;
                   curProgress = "1/1"
               }else{
                   this.progressBar.progress = curcount/maxcount;
                   curProgress= `${curcount} / ${maxcount}`;
               }
               this.progressLabel.string = `当前游戏进度:${curProgress}`;
                break;
            case AlertType.Sucess_Small:
                this.exitBtn.node.active = true;
                this.startBtn.node.active = true;
                this.titleLabel.node.active = true;
                this.icon.active = true;
                this.decLabel.node.active = true;
                this.progressBar.node.active = false;
                startBtnUITransform.width = 250;
                break;
            case AlertType.Sucess_Big:
                this.startBtn.node.active = true;
                this.decLabel.node.active = true;
                this.titleLabel.node.active = true;
                this.progressBar.node.active = false;
                this.icon.active = false;
                this.exitBtn.node.active = false;

                startBtnUITransform.width = 500;
                break;
            case AlertType.Failed:
                // todo
                break;
        }
    }

    setTitle(str:string){
        this.titleLabel.string = str;
    }

    start(){

    }

    backToHall(){
        this.backHandler();
        SceneManager.getInstance().backToHall();
    }

    backHandler(){
        this.node.removeFromParent();
        this.callBackFuction.boundCallback;
    }

    setCallBack(callBack:Function,context:any){
        if (!this.callBackFuction) {
            this.callBackFuction = {};
        }
        this.callBackFuction = {
            boundCallback:callBack.bind(context)
        }
        // this.callBackFuction = boundCallback;
    }

}
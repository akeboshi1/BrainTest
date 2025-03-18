import { _decorator, Button, Label, Node, Sprite, SpriteFrame, Texture2D,Vec3,tween } from 'cc';
import {BaseScene} from "db://assets/resources/scripts/Core/Scene/BaseScene";
import {GameType, IBaseGameChild} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import {TimerCommonComponent} from "db://assets/resources/scripts/Game/UI/Common/TimerCommonComponent";
import {BundleName} from "db://assets/resources/scripts/Core/Manager/Load/BundleName";
const { ccclass, property } = _decorator;
@ccclass('Main')
export class Main extends BaseScene<IBaseGameChild> {

    @property(Node)
    viewNode: Node;

    @property(Node)
    successView: Node;

    @property(Node)
    failView: Node;

    @property(Node)
    bigWin: Node;

    @property(TimerCommonComponent)
    timerComponent: TimerCommonComponent = null;
    // ============== viewNode
    @property(Label)
    label:Label = null;

    @property([Node])
    cards: Node[] = [];

    // ============== successView
    @property(Node)
    topTitle1:Node = null;

    @property(Node)
    topTitle2:Node = null;

    @property(Node)
    topTxt1:Node = null;

    @property(Node)
    topTxt2:Node = null;

    @property([Node])
    lights: Node[] = [];

    private hards: number[] = [1, 2, 3];

    private level:number = 0;
    private  hardIndex:number = 0;

    protected bundleName: string = BundleName.MATH24;

    onLoad(): void {
        this.loadAudio().then();
    }

    start() {
        super.start();
        this.successView.active = false;
        this.failView.active = false;
        this.bigWin.active = false;
        this.dataInit();
        this.sceneInit();
    }

    dataInit(){
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.hardIndex = (this.sceneModel as any).difficulty - 1;
            this.level = (this.sceneModel as any).level;
        }else{

            this.level = (this.sceneModel as any).level;
            this.hardIndex = 0;//((this.level % 3) == 0?3:(this.level % 3))-1;
        }
    }

    sceneInit(){
        super.sceneInit();
        this.refreshView();

    }

    clickCard(event:Event,customEventData:string){
        this.playAudio("click");
        let index = Number(customEventData);
        this.label.string = this.label.string + this.hards[index];
    }

    refreshView(){
        this.viewNode.active = true;
        this.label.string = "";
        if (this.sceneModel.gameType == GameType.SKEWERS) {
            this.successView.active = false;
            this.showStartAlert({ parentNode: this.viewNode, start: this.startGameByAlert, context: this });
        } else {
            this.successView.active = true;
            this.updatePopupTitle();
        }
    }

    startGameByAlert(){
        this.successView.active = false;
        this.failView.active = false;
        this.viewNode.active = true;
        this.timerComponent.startTimer();
    }

    startGameCenterGame(){

    }

    startGameCenterNextGame(){

    }

    retryGameCenterGame(){

    }

    addFunc(){

    }

    minusFunc(){

    }

    multiplyFunc(){

    }

    divideFunc(){

    }

    clearFunc(){
        this.label.string = "";
    }

    checkFunc(){
        if (this.label.string == "24"){
            this.onSuccess();
        }else{
            this.onFail();
        }
    }

    refreshFunc(){

    }

    quitGame(){
        super.quitGame({parentNode:this.viewNode,context:this})
    }

    onSuccess(){
        this.viewNode.active = false;
        this.failView.active = false;
        this.successView.active = true;
        this.playAudio("success");
    }

    onFail(){
        this.successView.active = false;
        this.failView.active = true;
        this.playAudio("fail");
    }

    private updatePopupTitle() {
        let title = this.successView.getChildByName("title").getComponent(Label);
        title.string = "第" + (this.level + 1) + "关";
    }
}
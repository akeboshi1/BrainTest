import { _decorator, Button, Label, Node, Sprite, SpriteFrame, Texture2D,Vec3,tween } from 'cc';
import {BaseScene} from "db://assets/resources/scripts/Core/Scene/BaseScene";
import {GameType, IBaseGameChild} from "db://assets/resources/scripts/Core/Scene/SceneModel/BaseGameModel";
import {TimerCommonComponent} from "db://assets/resources/scripts/Game/UI/Common/TimerCommonComponent";
import {BundleName} from "db://assets/resources/scripts/Core/Manager/Load/BundleName";
import {Math24CardData, SymbolsType} from "db://assets/math24/scripts/Math24CardData";
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

    @property(SpriteFrame)
    frontFrame:SpriteFrame = null;
    @property(SpriteFrame)
    backFrame:SpriteFrame = null;

    private flipDuration = 0.25;
    private isFront = false;
    private time:number = 30;

    private cardValues: number[] = [1,1,3,8];
    private _curCardData:Math24CardData;


    onLoad(): void {
        this.loadAudio().then();
    }

    start() {
        super.start();
        this.successView.active = false;
        this.failView.active = false;
        this.bigWin.active = false;
        // this.dataInit();
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

    // ========== 开始倒计时 ==========
    public startTime(time: number) {
        if (this.timerComponent) this.timerComponent.startTimer(time);
    }

    sceneInit(){
        super.sceneInit();
        this.refreshView();

    }

    clickCard(event:Event,customEventData:string){
        this.playAudio("click");
        let index = Number(customEventData);
        let cardValue = this.cardValues[index];
        if(!this._curCardData){
            this._curCardData = new Math24CardData();
        }
        this._curCardData.value = cardValue;
        this.label.string += cardValue;
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

    flipCard(){
        this.cards.forEach((card:Node)=>{
            let sprite = card.getChildByName("sprite").getComponent(Sprite);
            // 动画半程时长
            const halfDuration = this.flipDuration / 2;
            // 初始确保 scale 为 (1, 1, 1)
            card.setScale(new Vec3(1, 1, 1));
            let self = this;
            tween(card)
                // 第一阶段：X轴从 1 缩放到 0
                .to(halfDuration, { scale: new Vec3(0, 1, 1) })
                .call(() => {
                    // 当 scale 到达0时切换图片
                    sprite.spriteFrame = self.isFront ? self.backFrame! : self.frontFrame!;
                })
                // 第二阶段：X轴从 0 缩放回 1
                .to(halfDuration, { scale: new Vec3(1, 1, 1) })
                .call(() => {
                    // 更新状态
                    self.isFront = !self.isFront;
                    if(!self.timerComponent.isRun()){
                        self.startTime(self.time);
                    }
                })
                .start();
        })
    }

    startGameByAlert(){
        this.successView.active = false;
        this.failView.active = false;
        // 串烧游戏时间配置
        this.startTime(this.time);
    }

    startGameCenterGame(){
        this.successView.active = false;
        this.failView.active = false;
        this.flipCard();
    }

    startGameCenterNextGame(){

    }

    retryGameCenterGame(){

    }

    addFunc(){
       if(!this._curCardData)return;
       this._curCardData.symbols = SymbolsType.ADD;
    }

    subtractFunc(){
        if(!this._curCardData)return;
        this._curCardData.symbols = SymbolsType.SUBTRACT;
    }

    multiplyFunc(){
        if(!this._curCardData)return;
        this._curCardData.symbols = SymbolsType.MULTIPLY;
    }

    divideFunc(){
        if(!this._curCardData)return;
        this._curCardData.symbols = SymbolsType.DIVIDE;
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

    onTimerEnd() {
        super.onTimerEnd();
        if (this.sceneModel.gameType == GameType.SKEWERS) {
                //上报数据
            this._requestSkewersGameComplete();
        } else {
            this._requestGameCenterComplete();
            this.failView.active = true;
        }

    }

    private _requestSkewersGameComplete() {

    }

    private _requestGameCenterComplete() {

    }

    private updatePopupTitle() {
        let titleNode = this.successView.getChildByName("top_Title1");
        titleNode.active = true;
        let title = titleNode.getComponent(Label);
        title.string =this.level + 1 + "";
    }
}
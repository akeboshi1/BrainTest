import { _decorator, Component, EventTouch, Label, Node } from 'cc';
import { GuessingGameEvent, GuessingGameModel } from './GuessingGameModel';
import { GuessingGameTimerComponent } from './GuessingGameTimerComponent';
import { FrameComponent } from '../../scripts/Core/Component/FrameComponent';
import { EventManager } from '../../scripts/Core/Manager/Event/EventManager';
import { GuessingQuestion } from './GuessingGameConfig';
import { RollingSubtitleComponent } from './RollingSubtitleComponent';
import AlertManager, { AlertData } from '../../scripts/Core/Manager/Alert/AlertManager';
import { SceneManager } from '../../scripts/Core/Manager/Scene/SceneManager';
const { ccclass, property } = _decorator;

@ccclass('GuessingGameScene')
export class GuessingGameScene extends Component {

    @property(GuessingGameTimerComponent)
    private timerRT: GuessingGameTimerComponent = null;

    @property(GuessingGameTimerComponent)
    private timerStartGame: GuessingGameTimerComponent = null;

    @property(Node)
    private questionNode: Node = null;

    @property(Label)
    private questionLabel: Label = null;

    @property(RollingSubtitleComponent)
    private rollingSubtitleCom: RollingSubtitleComponent = null;

    @property(Node)
    private optionsNode: Node = null;

    @property(Node)
    private replayNode: Node = null;

    @property(FrameComponent)
    private frameComponent: FrameComponent = null;

    @property(Node)
    private resultPanel: Node = null;

    @property(Node)
    private successTextNode: Node = null;

    @property(Node)
    private failedTextNode: Node = null;

    private options: string[] = ['a', 'b', 'c', 'd'];

    private guessingGameModel: GuessingGameModel = new GuessingGameModel();
    private bInit: boolean = false;

    private currentQuestion:GuessingQuestion = null;

    start() {
        if (!this.bInit) {
            this.guessingGameModel.init();
            this.bInit = true;
        }
        this.resetPanel();
    }

    protected onEnable(): void {
        EventManager.getInstance().on(GuessingGameEvent.INIT_COMPLETE, this.onModelInitComplete, this);
        EventManager.getInstance().on(GuessingGameEvent.SHOW_QUESTION, this.onShowQuestion, this);
        EventManager.getInstance().on(GuessingGameEvent.AUDIO_STARTED, this.onAudioStart, this);
        EventManager.getInstance().on(GuessingGameEvent.AUDIO_FINISHED, this.onAudioFinish, this);

        this.timerStartGame.on('timer-end',this.startAnswer,this);
        this.timerRT.on('timer-end',this.answerOutOfTime,this);
    }

    protected onDisable(): void {
        EventManager.getInstance().off(GuessingGameEvent.INIT_COMPLETE, this);
        EventManager.getInstance().off(GuessingGameEvent.SHOW_QUESTION, this);
        EventManager.getInstance().off(GuessingGameEvent.AUDIO_STARTED, this);
        EventManager.getInstance().off(GuessingGameEvent.AUDIO_FINISHED, this);

        this.timerStartGame.off('timer-end',this.startAnswer,this);
        this.timerRT.off('timer-end',this.answerOutOfTime,this);
    }

    update(deltaTime: number) {

    }

    protected onDestroy(): void {
        if (this.guessingGameModel) {
            this.guessingGameModel.dispose();
            this.guessingGameModel = null;
        }
    }

    private onModelInitComplete() {
        //打开介绍界面；
        let alertData:AlertData = new AlertData();
        alertData.title = "提示";
        alertData.message = "请认真聆听“可乐派”给出的题目，然后在选项中选出正确答案！";
        alertData.confirmButtonText = "开始游戏";
        alertData.cancelButtonVisible = false;
        alertData.confirmCb = this.startGameFlow.bind(this);

        AlertManager.getInstance().showAlert(alertData);
    }

    private startGameFlow(){
        this.guessingGameModel.startQuestionFlow();
    }

    private onShowQuestion(data: any) {
        this.questionNode.active = true;
        const question: GuessingQuestion = data.question;
        this.currentQuestion = question;
        this.questionLabel.string = question.questionText;

        for (var i = 0; i < this.options.length; i++) {
            let op: string = this.options[i];
            let opnode: Node = this.optionsNode.getChildByName("choosen_" + op);
            if (opnode) {
                opnode.getChildByName("label").getComponent(Label).string = question.options[op];
            }
        }

        this.timerStartGame.node.active = false;
    }

    private onAudioStart() {
        this.frameComponent.playAnimation("speak", 24, true, true);
    }

    private onAudioFinish() {
        this.frameComponent.playAnimation("idle", 16, true, true);

        this.timerStartGame.node.active = true;;
        this.timerStartGame.startTimer(5);

    }

    private startAnswer(){
        this.questionNode.active = false;
        this.optionsNode.active = true;

        this.timerRT.node.active = true;
        this.timerRT.startTimer(120);

        this.replayNode.active = true;

        this.rollingSubtitleCom.resetString(this.currentQuestion.questionText);
    }

    private answerOutOfTime(){
        this.processAnswer();
    }

    private processAnswer(ans:string = null){
        this.timerRT.resumeTimer();

        const result:boolean = ans && this.currentQuestion.answer == ans;
        this.resultPanel.active = true;
        this.successTextNode.active = result;
        this.failedTextNode.active = !result;
    }

    onClickReplay(){
        this.guessingGameModel.replayQuestionAudio();
    }

    onChooseOption(event:EventTouch, p:string){
        this.processAnswer(p);
    }

    onClickContinueGame(){
        this.resetPanel();
        this.guessingGameModel.goNextQuestion();

        this.resultPanel.active = false;
    }

    onClickBack(){
        this.guessingGameModel.stopAudio();
        SceneManager.getInstance().backToHall();
    }

    resetPanel() {
        this.guessingGameModel.stopAudio();

        this.timerRT.resetTimer();
        this.timerStartGame.resetTimer();
        this.timerRT.node.active = false;
        this.timerStartGame.node.active = false;

        this.resultPanel.active = false;

        this.replayNode.active = false;
        this.optionsNode.active = this.questionNode.active = false;

        this.frameComponent.playAnimation("idle", 16, true, true);
    }
}

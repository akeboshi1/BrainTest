import { _decorator, Component, Button, Node,Label } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('catchfish')
export class catchfish extends Component {
    @property(Node)
    gameFailView:Node;

    @property(Node)
    gameSuccessView:Node;

    @property(Node)
    gameBeforeView:Node;

    @property(Node)
    gameStartView:Node;

    @property(Label)
    Timer:Label;

    // @property(Button)
    // startBtn:Button;

    // @property(Button)
    // failBtn:Button;


    start() {
        this.gameBeforeView.active = true;
    }

    startGame(){
        this.gameBeforeView.active = false;
        this.gameStartView.active = true;
        this.timeInit();
        this.timeStart();
    }

    failGame(){
        
    }
    update(deltaTime: number) {
        
    }
    timerId: any;
    timer:number=120
    timeInit(){
        this.timer=120;
        this.Timer.string = "2:00";

    }
    timeStart(){
        this.timerId=setInterval(() => {
            this.timer -= 1;
            if(this.timer<0){
                clearInterval(this.timerId);
            }
            this.calculateTime();
        }, 1000);
    }
    calculateTime(){
        const fenzhong=Math.floor(this.timer/60) ;
        const miao=this.timer%60 ;
        const second = miao > 9 ? miao  : `0${miao}`
        this.Timer.string = `${fenzhong}:${second}`;
       
    }
}



import { _decorator, Component, Sprite, Node,Label, Prefab,SpriteFrame,tween,Vec3,instantiate } from 'cc';
import { SceneManager } from '../../scripts/Core/Manager/Scene/SceneManager';
import { ColorUtil } from '../../scripts/Core/Util/ColorUtil';
import { Fish } from './Fish';
import {EventManager} from "db://assets/scripts/Core/Manager/Event/EventManager";
const { ccclass, property } = _decorator;


const questions = [
    {
        "question": "5 + 3 = ?",
        "options": ["8", "9", "7", "6"],
        "correctAnswer": "8"
    },
    {
        "question": "7 - 2 = ?",
        "options": ["5", "4", "6", "3"],
        "correctAnswer": "5"
    },
    {
        "question": "9 + 1 = ?",
        "options": ["10", "11", "9", "8"],
        "correctAnswer": "10"
    },
    {
        "question": "4 - 1 = ?",
        "options": ["3", "2", "5", "4"],
        "correctAnswer": "3"
    }
];

const SHOOT_INTERVAL = 5;

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

    @property([Node])
    wangs:Node[]= [];

    @property([SpriteFrame])
    spriteFrames:SpriteFrame[]=[];

    @property(Label)
    catchLabel:Label;

    @property(Node)
    fishParentNode:Node;

    @property(Prefab)
    fishPrefab:Prefab;

    @property(Prefab)
    wangPrefab:Prefab;

    // @property(Button)
    // startBtn:Button;

    // @property(Button)
    // failBtn:Button;


    private selectColor = ColorUtil.hexToColor("#3AEB0E");
    private unSelectColor = ColorUtil.hexToColor("#FFFFFF");

    private fishs:Fish[];
    private _curFish:Fish;
    private wangMaxCount:number=4;
    private wangCount:number=0;

    start() {
        this.gameBeforeView.active = true;
        this.fishs = [];
    }

    startGame(){
        this.gameBeforeView.active = false;
        this.gameStartView.active = true;
        this.timeInit();
        this.timeStart();
        this.createFish();
    }

    private createFish(count:number=4){
        if(this.fishParentNode && this.fishPrefab){
            let len = count;

            for(let i = 0; i < len; i++){
                let fish = new Fish(this.fishPrefab);
                fish.setParent(this.fishParentNode);
                this.randomFish(fish);
                this.fishs.push(fish);
                this.moveFishes(fish,i*SHOOT_INTERVAL);
            }
        }
    }

    private randomFish(fish:Fish){

        let x = 1000;

        let y = Math.random() * 700-200;
  
        let spriteFramelen = this.spriteFrames.length;

        let index = Math.floor(Math.random()*(spriteFramelen-1));
  
        let spriteFrame = this.spriteFrames[index];

        fish.setPosition(x,y);

        fish.setSpriteFrame(spriteFrame);
 
        const question = questions[Math.floor(Math.random() * questions.length)];
  
        fish.setQuestion(question);
        EventManager.getInstance().off(Fish.FishClick,this);
        EventManager.getInstance().on(Fish.FishClick,this.selectFish,this);
    }

    private selectFish(fish,context){
        // console.log('fish',fish)
        // console.log('catchfish ',context)
         if(context._curFish){
             context._curFish.setSelect(context.unSelectColor,1);
         }

         context._curFish = fish;

         let data = fish.getData();
 
         let options = data.options;
 
         let len = options.length;

         for(let i = 0; i < len; i++){
  
             let answer = options[i];
      
             let wangNode = context.wangs[i];
 
             let label = wangNode.getChildByName('Label').getComponent(Label);

             label.string = answer;
         }
        context._curFish.setSelect(context.selectColor,2);
    }

    moveFishes(fish:Fish,delay:number = 0) {
        if(fish.curTween)fish.curTween.stop();
        // 使用 tween 创建运动效果
        fish.curTween = tween(fish) // 对当前鱼对象进行 tween 动画
            .delay(delay) // 每个对象延迟3秒开始
            .to(15, { position: new Vec3(fish.position.x - 1600, fish.position.y, fish.position.z) })
            .call(() => {
                this.randomFish(fish);
                this.moveFishes(fish);
            })
            .start(); // 启动动画

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
            if(this.timer<=0){
                // console.log("时间到");
                this.Timer.string = "0:00";
                if(this.wangCount!==this.wangMaxCount){
                    this.gameFailView.active=true;
                }
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

    wangClick(event,data){
        if(!this._curFish){
            return;
        }
        let index = data;
        let len = this.wangs.length;
        for(let i = 0; i < len; i++){
            if(i == index){
                this.selectWang(i);
            }else{
                this.unSelectWang(i);
            }
        }

        if(index == this._curFish.currentIndex){
            let wangPrefab = instantiate(this.wangPrefab);
            wangPrefab.setWorldScale(new Vec3(3,3,3));
            let wang = this.wangs[index];
            // 将wangPrefab添加到wang的子节点中
            wang.addChild(wangPrefab);

            // 启动动画
            tween(wangPrefab).to(1, { position: new Vec3(this._curFish.worldPosition.x-100, this._curFish.worldPosition.y-100, this._curFish.worldPosition.z) })
                .call(() => {
                    wang.removeChild(wangPrefab);
                    this.wangCount++;
                    this.catchLabel.getComponent(Label).string = `0${this.wangCount}/4`;
                    if(this.wangCount==this.wangMaxCount){
                        this.gameSuccessView.active=true;
                    }
                 
                    this._curFish.setSelect(this.unSelectColor,1)
                 
                    this.randomFish(this._curFish);
                
                    this.moveFishes(this._curFish);
                })
                .start(); // 启动动画

            for(let i = 0; i < len; i++){
              
                this.unSelectWang(i);
            }
        }

    }

    private selectWang(index:number){
        let wang = this.wangs[index];
        wang.getComponent(Sprite).color = this.selectColor;
    }

    private unSelectWang(index:number){
        let wang = this.wangs[index];
        wang.getComponent(Sprite).color = this.unSelectColor;
    }

    /**
     * 返回应用大厅
     */
    quitGame(){
        console.log("返回大厅")
        if(this.timerId !=null){
            clearInterval(this.timerId);
        }
        SceneManager.getInstance().backToHall();
    }
}



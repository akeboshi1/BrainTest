import {
    _decorator,
    assetManager,
    AudioClip,
    Canvas,
    Component,
    director,
    instantiate,
    Label,
    Node,
    Prefab,
    Sprite,
    SpriteFrame,
    tween,
    Tween,
    UITransform,
    v3,
    Vec3,
    Texture2D
} from 'cc';
import {ColorUtil} from '../../scripts/Core/Util/ColorUtil';
import {Fish} from './Fish';
import {EventManager} from "db://assets/scripts/Core/Manager/Event/EventManager";
import {DebugLog} from "db://assets/scripts/Core/Util/DebugLog";
import {GameCenterManager} from "db://assets/scripts/Game/GameCenter/GameCenterManager";
import {questions0, questions1, questions2} from './questionsDate'
import {Global} from "db://assets/scripts/Core/Manager/Config/Global";
import {SkewersManager} from "db://assets/scripts/Game/Task/Skewers/SkewersManager";
import {AlertType} from "db://assets/scripts/Game/UI/Alert/GameAlert";
import {TimeUtil} from "db://assets/scripts/Core/Util/TimeUtil";
import {AudioManager} from "db://assets/scripts/Core/Manager/Audio/AudioManager";
import {GuideManager} from "db://assets/scripts/Core/Manager/Guide/GuideManager";
import {CatchFishGuide} from "db://assets/scripts/Core/Manager/Guide/game/CatchFishGuide";
import {TaskManager} from "db://assets/scripts/Game/Task/TaskManager";
import {TaskType} from "db://assets/scripts/Game/Task/TaskData";
import {LoaderManager} from "db://assets/scripts/Core/Manager/Load/LoaderManager";
import {UIManager} from "db://assets/scripts/Core/Manager/UI/UIManager";
import {GenerateReport} from "db://assets/scripts/Game/UI/PersonalCenter/GenerateReport";
import {CreateQuestion} from "db://assets/catchFish/script/createQuestion";

const { ccclass, property } = _decorator;


const SHOOT_INTERVAL = 0.65;
// let questions = [questions0, questions1, questions2];
@ccclass('catchfish')
export class catchfish extends Component {
    @property(Node)
    gameFailView: Node;

    @property(Node)
    gameSuccessView: Node;

    @property(Node)
    gameBeforeView: Node;

    @property(Node)
    gameStartView: Node;

    @property(Label)
    Timer: Label;

    @property([Node])
    wangs: Node[] = [];

    @property([SpriteFrame])
    spriteFrames: SpriteFrame[] = [];

    @property([Node])
    stars: Node[] = [];

    @property(Label)
    catchLabel: Label;

    @property(Node)
    fishParentNode: Node;

    @property(Prefab)
    fishPrefab: Prefab;

    @property(Prefab)
    wangPrefab: Prefab;

    @property(Node)
    mask: Node = null;

    @property(Node)
    logoNode:Node = null;

    @property(Node)
    private viewNode:Node = null;

    private selectColor = ColorUtil.hexToColor("#3AEB0E");
    private unSelectColor = ColorUtil.hexToColor("#FFFFFF");
    private ErrorColor = ColorUtil.hexToColor("#FC0505");

    private fishs: Fish[];
    private _curFish: Fish;
    private wangMaxCount: number = 4;
    private wangCount: number = 0;

    private curHard: number = 0;
    private hards: number[] = [1, 2, 3];
    private hardIndex: number = 0;
    private customsSendDataState: boolean;

    private hasWangClick: boolean = false;

    private audioUrls=["music/fishCatch","music/win"];
    private audioMap:Map<string,AudioClip> = new Map();
    private bundleName: string = 'catchFish';
    private _leftSceneX:number = -1;

    private isGuide:boolean = false;

    private _wangPosList= [{x:127,y:154},{x:402,y:154},{x:677,y:154},{x:952,y:154}];
    onLoad(){
        this.mask.scale = v3(0,1,1);
        tween(this.mask)
            .to(0.4, {scale: v3(1,1,1)}, {easing: 'quadOut'})
            .call(() => {
            })
            .start();
        this.loadAudio().then();
        let logoSprite = this.logoNode.getComponent(Sprite);
        if(Global.isSkewersGame){
            LoaderManager.getInstance().resourcesLoadFrame("texture/game/logo/judgment").then((spiteFrame)=>{
                logoSprite.spriteFrame = spiteFrame;
            });
        }else{
            LoaderManager.getInstance().loadABRes("texture/page1_start/logo",this.bundleName).then((res)=>{
                const texture = new Texture2D();
                texture.image = res;
                const spriteFrame = new SpriteFrame();
                spriteFrame.texture = texture;
                logoSprite.spriteFrame = spriteFrame;
            });
        }
        const scene = director.getScene();
        const canvas = scene.getComponentInChildren(Canvas);
        const uitransform = canvas.getComponent(UITransform);
        this._leftSceneX = -uitransform.width/2-80;
    }

    private async loadAudio() {
        const bundle = assetManager.getBundle(this.bundleName);
        if(!bundle){
            DebugLog.instance.error("bundle is not exist! ---- bundle name:"+ this.bundleName);
            return;
        }
        let self = this;
        let len = this.audioUrls.length;
        for(let i:number = 0;i<len;i++){
            let audioUrl = this.audioUrls[i];
            const audioRes:AudioClip = await new Promise<AudioClip>((resolve,reject)=>{
                bundle.load(audioUrl,AudioClip,(err,data:AudioClip)=>{
                    if(err){
                        DebugLog.instance.error("AudioClip Load Failed ! url : " + audioUrl);
                        reject(err);
                    }else{
                        resolve(data);
                    }
                })
            });
            this.audioMap.set(audioUrl,audioRes);
        }
    }

    start() {
        this.fishs = []
        if(Global.isSkewersGame){
            this.gameBeforeView.active = false;
            this.startGame();
        }else{
            this.gameBeforeView.active = true;
        }
    }

    startGame(win:number = 1) {
        this.customsSendDataState=false;
        this._clearBoo = false;
        this._startTime = TimeUtil.getNow();
        this.gameBeforeView.active = false;
        this.gameStartView.active = true;
        this.wangCount = 0;
        if(Global.isSkewersGame){
            this.curHard = Global.userData.curSkewerGameData.difficulty;
            this.hardIndex = this.hards.indexOf(this.curHard);
        }else{
            if(win){
                this.curHard = this.hards[this.hardIndex];
            }else{
                if (this.hardIndex == this.hards.length - 1) {
                    this.hardIndex = 0;
                } else {
                    this.hardIndex++;
                }
                this.curHard = this.hards[this.hardIndex];
            }
        }
        this.catchLabel.getComponent(Label).string = `${this.wangCount}/${this.wangMaxCount}`;
        this.timeInit();
        this.timeStart();
        this.createFish();
    }

    onDisable(){
        EventManager.getInstance().disableContext(this);
    }

    // startGameByAlert(context){
    //     context.curHard = Global.userData.curSkewerGameData.difficulty;
    //     context.wangCount = 0;
    //     context.catchLabel.getComponent(Label).string = `${context.wangCount}/${context.wangMaxCount}`;
    //     context.timeInit();
    //     context.timeStart();
    //     context.createFish();
    // }

    private createFish(count: number = 4) {
        if (this.fishParentNode && this.fishPrefab) {
            if(!this.hasGuide){
                if((GameCenterManager.getInstance().currentGame&&GameCenterManager.getInstance().currentGame.level == 1)){
                    count = 1;
                }
            }
            let len = count;
            this._guideIndex = 0;
            let datas = [];
            for (let i = 0; i < len; i++) {
                let fish = new Fish(this.fishPrefab);
                fish.positionYIndex = len==1?1:i;
                fish.setParent(this.fishParentNode);
                this.randomFish(fish);
                this.fishs.push(fish);
                this.moveFishes(fish, i * SHOOT_INTERVAL);
                if(i == 0||i == 2){
                    datas.push({root:this.node,fish:fish,wang:this._wangPosList[fish.currentIndex]});
                }
            }
        }
    }

    private fishYs:number[]=[-450,-150,150,450];
    public hasGuide:boolean = false;
    private randomFish(fish: Fish) {
        if(this._clearBoo){
            return;
        }
        let x = 800;
        let y = this.fishYs[fish.positionYIndex];

        if((GameCenterManager.getInstance().currentGame && GameCenterManager.getInstance().currentGame.level == 1)){
            if(!this.hasGuide){
                x = (this._leftSceneX + 540)/2;
            }
        }
        let spriteFramelen = this.spriteFrames.length;

        let index = Math.floor(Math.random() * (spriteFramelen - 1));

        this._guideIndex = 1;

        let spriteFrame = this.spriteFrames[index];

        fish.setPosition(x, y);
        fish.setScale(1);
        DebugLog.instance.log(`create ---- ${fish.position}`)

        fish.setSpriteFrame(spriteFrame);

        fish.pause = false;

        // 从可用问题中随机选择一个
        let self = this;
        CreateQuestion.create(this.curHard).then((question)=>{
            fish.setQuestion(question);

            EventManager.getInstance().off(Fish.FishClick, self);
            EventManager.getInstance().on(Fish.FishClick, self.selectFish, self);
        });//availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        // question.hasChose = true;


        // const currentQuestions = questions[this.hardIndex];
        //
        // // 筛选出未选择的问题
        // const availableQuestions = currentQuestions.filter(question => !question.hasChose);
        //
        // if (availableQuestions.length > 0) {
        //     // 从可用问题中随机选择一个
        //     let question = CreateQuestion.create(this.curHard);//availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        //     question.hasChose = true;
        //     fish.setQuestion(question);
        //
        //     EventManager.getInstance().off(Fish.FishClick, this);
        //     EventManager.getInstance().on(Fish.FishClick, this.selectFish, this);
        // } else {
        //     DebugLog.instance.log("No available questions found");
        //     // 这里可以添加一些降级处理，例如设置默认问题或重置状态等
        // }
    }

    private selectFish(fish, context) {
        if (context.hasWangClick) {
            // DebugLog.instance.log("已经有网飞出来")
            return;
        }
        if (context._curFish) {
            context._curFish.setSelect(context.unSelectColor, 1);
        }

        context._curFish = fish;
        // DebugLog.instance.log("选中鱼currentIndex",fish.currentIndex);
        let data = fish.getData();

        let options = data.options;

        let len = options.length;

        for (let i = 0; i < len; i++) {

            let answer = options[i];

            let wangNode = context.wangs[i];

            let label = wangNode.getChildByName('Label').getComponent(Label);

            label.string = answer;
        }
        context._curFish.setSelect(context.selectColor, 1.3);
        for (let i = 0; i < len; i++) {
            this.unSelectWang(i);
        }
    }

    moveFishes(fish: Fish, delay: number = 0) {
        if (fish.curTween) {
            fish.curTween.stop();
            fish.curTween = null;
        }

        let self = this;
        const upDistance = 8; // 上下浮动的距离+
        const duration = (20 * (1600- Math.abs(800-fish.position.x)))/1600; // 每次往返的时间(根据鱼的当前点x坐标动态计算时间)
        DebugLog.instance.log("pause duration:"+duration);
        // 定义上下移动的幅度（即上下移动的范围大小），可根据实际需求调整
        const floatAmplitude = 0.08;
        const phase = 0; // The initial phase of the wave
        let pause = false;
        // 使用 tween 创建运动效果
        if((GameCenterManager.getInstance().currentGame && GameCenterManager.getInstance().currentGame.level == 1)){
            if(!this.hasGuide){
                // 串烧引导流程
                fish.curTween = tween(fish)
                    // 对当前鱼对象进行 tween 动画
                    .delay(delay)// 每个对象延迟4秒开始
                    .to(duration, { position: new Vec3(-800, fish.position.y, fish.position.z) },
                        {
                            onUpdate: () => {
                                if(fish.pause){
                                    fish.curTween.stop();
                                    return;
                                }
                                if(self._clearBoo)return;
                                if(!Global.isSkewersGame){
                                    if (self.gameSuccessView.active || self.gameFailView.active) {
                                        return;
                                    }
                                }
                                const y = upDistance * Math.sin(floatAmplitude * fish.position.x + phase);
                                const newPosition = new Vec3(fish.position.x, fish.position.y + y, fish.position.z);
                                fish.setPosition(newPosition.x,newPosition.y);
                                if(self.hasGuide){
                                    return;
                                }
                                // 脑力保健才有引导
                                // ||(Global.isSkewersGame && Global.userData.curSkewerGameData && Global.userData.curSkewerGameData.getCurTrainData()&&Global.userData.curSkewerGameData.getCurTrainData().hasGuide == true)
                                if((GameCenterManager.getInstance().currentGame && GameCenterManager.getInstance().currentGame.level == 1 && !Global.isSkewersGame)){
                                    if(fish.position.x<=(self._leftSceneX + 540)/2 && fish.positionYIndex == self._guideIndex){
                                        self.hasGuide = true;
                                        EventManager.getInstance().on(CatchFishGuide.GUIDECLICK,self.guideClick.bind(self),self);
                                        fish.pause = true;
                                        self.isGuide = true;
                                        self._curFish = fish;
                                        GuideManager.getInstance().start(CatchFishGuide.NAME,{root:this.node,fish:fish,wang:self.wangs});
                                        // 这里暂停tween
                                    }
                                }
                            }
                        }
                    )
                    .call(() => {
                        fish.pause = false;
                        if(!Global.isSkewersGame){
                            if (self.gameSuccessView.active || self.gameFailView.active) {
                                return;
                            }
                        }
                        if(self._clearBoo)return;
                        if(fish == self._curFish){
                            self.clearWangNubmer();
                            self._curFish = null;
                        }
                        self.randomFish(fish);
                        self.moveFishes(fish, SHOOT_INTERVAL);
                    })
                    .start(); // 启动动画
            }else{
                // 串烧正常流程
                if(this._pause && fish.position.x<this._leftSceneX+1080) {
                    fish.curTween = tween(fish).to(duration, {position: new Vec3(-800, this.fishYs[fish.positionYIndex], fish.position.z)},
                        {
                            onUpdate: () => {
                                if (self._pause) {
                                    DebugLog.instance.log("pause update")
                                    return;
                                }
                                if (fish.pause) {
                                    fish.curTween.stop();
                                    return;
                                }
                                if (self._clearBoo) return;
                                if (!Global.isSkewersGame) {
                                    if (self.gameSuccessView.active || self.gameFailView.active) {
                                        return;
                                    }
                                }
                                const y = upDistance * Math.sin(floatAmplitude * fish.position.x + phase);
                                const newPosition = new Vec3(fish.position.x, fish.position.y + y, fish.position.z);
                                fish.setPosition(newPosition.x, newPosition.y);
                                if (self.hasGuide) {
                                    return;
                                }

                                // 开启引导
                                if (GameCenterManager.getInstance().currentGame && GameCenterManager.getInstance().currentGame.level == 1 && !Global.isSkewersGame) {
                                    if (fish.position.x <= (self._leftSceneX + 540) / 2 && fish.positionYIndex == self._guideIndex) {
                                        self.hasGuide = true;
                                        EventManager.getInstance().on(CatchFishGuide.GUIDECLICK, self.guideClick.bind(self), self);
                                        fish.pause = true;
                                        self.isGuide = true;
                                        self._curFish = fish;
                                        GuideManager.getInstance().start(CatchFishGuide.NAME, {
                                            root: this.node,
                                            fish: fish,
                                            wang: self.wangs
                                        });
                                        // 这里暂停tween
                                    }
                                }
                            }
                        }
                    )
                        .call(() => {
                            self._pause = false;
                            fish.pause = false;
                            if (!Global.isSkewersGame) {
                                if (self.gameSuccessView.active || self.gameFailView.active) {
                                    return;
                                }
                            }
                            if (self._clearBoo) return;
                            if (fish == self._curFish) {
                                self.clearWangNubmer();
                                self._curFish = null;
                            }
                            self.randomFish(fish);
                            self.moveFishes(fish, fish.positionYIndex * SHOOT_INTERVAL);
                        })
                        .start();
                }else{
                    fish.curTween = tween(fish)
                        // 对当前鱼对象进行 tween 动画
                        .delay(delay)// 每个对象延迟n秒开始
                        .to(0.5,{position:new Vec3(self._leftSceneX+1080,fish.position.y,fish.position.z)},{easing:'cubicIn'})
                        .call(()=>{
                            fish.curTween = tween(fish).to(duration, { position: new Vec3(fish.position.x - 1600, fish.position.y, fish.position.z) },
                                {
                                    onUpdate: () => {
                                        if(fish.pause){
                                            fish.curTween.stop();
                                            return;
                                        }
                                        if(self._clearBoo)return;
                                        if(!Global.isSkewersGame){
                                            if (self.gameSuccessView.active || self.gameFailView.active) {
                                                return;
                                            }
                                        }
                                        const y = upDistance * Math.sin(floatAmplitude * fish.position.x + phase);
                                        const newPosition = new Vec3(fish.position.x, fish.position.y + y, fish.position.z);
                                        fish.setPosition(newPosition.x,newPosition.y);
                                        if(self.hasGuide){
                                            return;
                                        }
                                        if((GameCenterManager.getInstance().currentGame && GameCenterManager.getInstance().currentGame.level == 1 && !Global.isSkewersGame)){
                                            if(fish.position.x<=(self._leftSceneX + 540)/2 && fish.positionYIndex == self._guideIndex){
                                                self.hasGuide = true;
                                                EventManager.getInstance().on(CatchFishGuide.GUIDECLICK,self.guideClick.bind(self),self);
                                                fish.pause = true;
                                                self.isGuide = true;
                                                self._curFish = fish;
                                                GuideManager.getInstance().start(CatchFishGuide.NAME,{root:this.node,fish:fish,wang:self.wangs});
                                                // 这里暂停tween
                                            }
                                        }
                                    }
                                }
                            )
                                .call(() => {
                                    fish.pause = false;
                                    if(!Global.isSkewersGame){
                                        if (self.gameSuccessView.active || self.gameFailView.active) {
                                            return;
                                        }
                                    }
                                    if(self._clearBoo)return;
                                    if(fish == self._curFish){
                                        self.clearWangNubmer();
                                        self._curFish = null;
                                    }
                                    self.randomFish(fish);
                                    self.moveFishes(fish, SHOOT_INTERVAL);
                                })
                                .start();
                        })
                        .start(); // 启动动画
                }
            }
        }
        else {
            if(this._pause && fish.position.x<this._leftSceneX+1080){
                fish.curTween = tween(fish).to(duration, { position: new Vec3(-800, this.fishYs[fish.positionYIndex], fish.position.z) },
                    {
                        onUpdate: () => {
                            if(self._pause){
                                DebugLog.instance.log("pause update")
                                return;
                            }
                            if(fish.pause){
                                fish.curTween.stop();
                                return;
                            }
                            if(self._clearBoo)return;
                            if(!Global.isSkewersGame){
                                if (self.gameSuccessView.active || self.gameFailView.active) {
                                    return;
                                }
                            }
                            const y = upDistance * Math.sin(floatAmplitude * fish.position.x + phase);
                            const newPosition = new Vec3(fish.position.x, fish.position.y + y, fish.position.z);
                            fish.setPosition(newPosition.x,newPosition.y);
                            if(self.hasGuide){
                                return;
                            }

                            // 开启引导
                            if((GameCenterManager.getInstance().currentGame && GameCenterManager.getInstance().currentGame.level == 1 && !Global.isSkewersGame)){
                                if(fish.position.x<=(self._leftSceneX + 540)/2 && fish.positionYIndex == self._guideIndex){
                                    self.hasGuide = true;
                                    EventManager.getInstance().on(CatchFishGuide.GUIDECLICK,self.guideClick.bind(self),self);
                                    fish.pause = true;
                                    self.isGuide = true;
                                    self._curFish = fish;
                                    GuideManager.getInstance().start(CatchFishGuide.NAME,{root:this.node,fish:fish,wang:self.wangs});
                                    // 这里暂停tween
                                }
                            }
                        }
                    }
                )
                    .call(() => {
                        self._pause =false;
                        fish.pause = false;
                        if(!Global.isSkewersGame){
                            if (self.gameSuccessView.active || self.gameFailView.active) {
                                return;
                            }
                        }
                        if(self._clearBoo)return;
                        if(fish == self._curFish){
                            self.clearWangNubmer();
                            self._curFish = null;
                        }
                        self.randomFish(fish);
                        self.moveFishes(fish, fish.positionYIndex * SHOOT_INTERVAL);
                    })
                    .start();
            }else{
                fish.curTween = tween(fish)
                    // 对当前鱼对象进行 tween 动画
                    .delay(delay)// 每个对象延迟n秒开始
                    .to(0.2,{position:new Vec3(self._leftSceneX+1080,fish.position.y,fish.position.z)},{easing:'cubicIn'})
                    .call(()=>{
                        fish.curTween = tween(fish).to(duration, { position: new Vec3(-800, fish.position.y, fish.position.z) },
                            {
                                onUpdate: () => {
                                    if(fish.pause){
                                        fish.curTween.stop();
                                        return;
                                    }
                                    if(self._clearBoo)return;
                                    if(!Global.isSkewersGame){
                                        if (self.gameSuccessView.active || self.gameFailView.active) {
                                            return;
                                        }
                                    }
                                    const y = upDistance * Math.sin(floatAmplitude * fish.position.x + phase);
                                    const newPosition = new Vec3(fish.position.x, fish.position.y + y, fish.position.z);
                                    fish.setPosition(newPosition.x,newPosition.y);
                                    if(self.hasGuide){
                                        return;
                                    }
                                    if((GameCenterManager.getInstance().currentGame && GameCenterManager.getInstance().currentGame.level == 1 && !Global.isSkewersGame)){
                                        if(fish.position.x<=(self._leftSceneX + 540)/2 && fish.positionYIndex == self._guideIndex){
                                            self.hasGuide = true;
                                            EventManager.getInstance().on(CatchFishGuide.GUIDECLICK,self.guideClick.bind(self),self);
                                            fish.pause = true;
                                            self.isGuide = true;
                                            self._curFish = fish;
                                            GuideManager.getInstance().start(CatchFishGuide.NAME,{root:this.node,fish:fish,wang:self.wangs});
                                            // 这里暂停tween
                                        }
                                    }
                                }
                            }
                        )
                            .call(() => {
                                fish.pause = false;
                                if(!Global.isSkewersGame){
                                    if (self.gameSuccessView.active || self.gameFailView.active) {
                                        return;
                                    }
                                }
                                if(self._clearBoo)return;
                                if(fish == self._curFish){
                                    self.clearWangNubmer();
                                    self._curFish = null;
                                }
                                self.randomFish(fish);
                                self.moveFishes(fish, SHOOT_INTERVAL);
                            })
                            .start();
                    })
                    .start(); // 启动动画
            }
        }
    }

    private guideClick(step:number) {
        switch(step) {
            case 1:
                EventManager.getInstance().emit(Fish.FishClick,this._curFish);
                break;
            case 2:
                this.isGuide = false;
                this._wangClick(this._curFish.currentIndex);
                EventManager.getInstance().off(CatchFishGuide.GUIDECLICK,this);
                break;
        }

    }

    update(deltaTime: number) {

    }
    timerId: any;
    timer: number;
    INIT_TIME = 120;
    timeInit() {
        if(Global.isSkewersGame){
            this.timer = Global.userData.curSkewerGameData.timeLimit;
        }else{
            this.timer = this.INIT_TIME;
        }
        this.Timer.string =  TimeUtil.formatTime(this.timer);
    }
    timeStart() {
        this.timerId = setInterval(() => {
            this.timer -= 1;
            if (this.timer <= 0) {
                // console.log("时间到");
                this.Timer.string = "0:00";
                if (this.wangCount !== this.wangMaxCount) {
                    if(Global.isSkewersGame) {
                        //上报数据
                        EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE,this.failRequestSkewersGameComplete,this);
                        this.requestGameResult();
                    }else{
                        if(!this.customsSendDataState){ //未发送数据的状态
                            const curGame = GameCenterManager.getInstance().currentGame;
                            let level = curGame.level+1;
                            GameCenterManager.getInstance().gamePassLevel(curGame.sessionid, this.wangCount, level,
                                this.wangCount/this.wangMaxCount, this.INIT_TIME - this.timer, this.INIT_TIME, this.hards[this.hardIndex], () => { });
                            this.customsSendDataState= true;
                        }
                        this.gameFailView.active = true;
                        this.updateSuccessPopupStar(this.curHard);
                    }
                }
                clearInterval(this.timerId);

            }
            this.calculateTime();
        }, 1000);
    }

    private failRequestSkewersGameComplete(data){
        EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE,this)
        let trainData = SkewersManager.getInstance().getTrainData(data);//SkewersManager.getInstance().getUnCompleteGameData();
        let maxCount = trainData.length;
        let curCount = trainData.seq<0?0:trainData.seq;
        if(curCount == maxCount){
            SkewersManager.getInstance().showGameAlert(this.viewNode,AlertType.Normal,SkewersManager.getInstance().failCompleteStr,"",curCount,maxCount,this.failCompleteHandler,this.exitCallBack,this);
        }else{
            SkewersManager.getInstance().showGameAlert(this.viewNode,AlertType.Normal,SkewersManager.getInstance().failCompleteStr,"",curCount,maxCount,this.alertGoonHandler,this.exitCallBack,this);
        }
    }

    private failCompleteHandler(context){
        clearInterval(context.timerId);
        if (!SkewersManager.getInstance().isRunOver()) {
            SkewersManager.getInstance().showGameAlert(context.node,AlertType.Sucess_Small, SkewersManager.getInstance().currentSkewersCompleteGameStr, SkewersManager.getInstance().singleCompleteStr,0,0,context.nextAlertHandler,context.exitCallBack,context);
        }else{
            SkewersManager.getInstance().showGameAlert(context.node,AlertType.Sucess_Big,SkewersManager.getInstance().totalCompleteStr,SkewersManager.getInstance().totalBrainScore,0,0,context.totalCompete,context.remoteClick,context);
        }
    }

    calculateTime() {
        const fenzhong = Math.floor(this.timer / 60);
        const miao = this.timer % 60;
        const second = miao > 9 ? miao : `0${miao}`
        this.Timer.string = `${fenzhong}:${second}`;

    }

    restoreTimer() {
        this._clearBoo = false;
        this.calculateTime();
        this.timeStart();
        // this.createFish();
    }

    rePlayGame() {
        this.customsSendDataState=true;
        this.clearGameView();
        this._clearBoo = false;
        this._startTime = TimeUtil.getNow();
        this.gameFailView.active = false;
        this.wangCount = 0;
        this.catchLabel.getComponent(Label).string = `${this.wangCount}/${this.wangMaxCount}`;
        this.timeInit();
        this.timeStart();
        this.createFish();
    }

    private _wangTween;
    wangClick(event, data) {
        // 如果当前鱼不存在|已经点击过了|处于引导状态 则返回
        if (!this._curFish||this.hasWangClick||this.isGuide) {
            return;
        }
        this._wangClick(data);
    }

    private _guideIndex = -1;
    private _wangClick(data){
        this.hasWangClick = true;
        // 遍历wangs数组
        let index =Number(data) ;
        let len = this.wangs.length;

        if (index !== this._curFish.currentIndex) {
            for (let i = 0; i < len; i++) {
                // 如果当前索引等于传入的索引，则调用selectWang方法
                if (i == index) {
                    // console.log("点击了第" + i + "个网");
                    // this._curFish.setSelect(this.unSelectColor, 1);
                    this.errorClick(i);
                    return;
                } else {
                    // 否则调用unSelectWang方法
                    this.unSelectWang(i);
                }
            }
            this.hasWangClick = false;
            return;
        }
        for (let i = 0; i < len; i++) {
            this.unSelectWang(i);
        }

        this.clearWangNubmer();
        if(this._curFish.position.x<this._leftSceneX){
            this.hasWangClick = false;
            return;
        }
        this._curFish.curTween.stop();
        let wangPrefab = instantiate(this.wangPrefab);
        wangPrefab.setWorldScale(new Vec3(0.5, 0.5, 0.5));
        // 获取当前索引对应的wang
        let wang = this.wangs[index];
        // 将wangPrefab添加到wang的子节点中
        wang.addChild(wangPrefab);
        wangPrefab.setPosition(new Vec3(0, 0, 0));
        wang.setPosition(new Vec3(0,0,0));
        if(Global.isSkewersGame){

        }else{
            if(!this.customsSendDataState){
                GameCenterManager.getInstance().gameMatch(GameCenterManager.getInstance().currentGame.sessionid, () => { });
            }
        }


        let self = this;// -600.-520.-440.-360
        let offsetX = this._curFish.currentIndex * 10 + 550;
        let offsetTime = this._curFish.positionYIndex * 0.01;
        let fishWorldPos = self._curFish.getFishNode().parent.getComponent(UITransform).convertToWorldSpaceAR(this._curFish.position);
        let wangWorldPos = wang.getComponent(UITransform).convertToWorldSpaceAR(wangPrefab.position);
        let question = this._curFish.getData();
        question.hasChose = false;
        if(this._wangTween)this._wangTween.stop();
        // 启动动画
        this._wangTween = tween(wangPrefab).parallel(
            tween().to(0.4 - offsetTime, { scale: new Vec3(3, 3, 3) }, { easing: 'bounceIn' }),
            tween().to(0.25 - offsetTime, { position: new Vec3(fishWorldPos.x - wangWorldPos.x,fishWorldPos.y - 100,fishWorldPos.z)}))
            .call(() => {
                self._curFish.curTween.stop();
                const scaleUp = 1.3; // 放大到2倍
                const scaleDown = 1.0; // 恢复到原始大小
                const duration = 0.06; // 每次放大和缩小的时长
                self.playAudio("music/fishCatch",true);
                tween(self._curFish.getFishNode())
                    .to(duration, { scale: new Vec3(scaleUp, scaleUp, scaleUp) }, { easing: 'bounceOut' }) // 放大
                    .delay(0.1)
                    .to(duration, { scale: new Vec3(scaleDown, scaleDown, scaleDown) }, { easing: 'bounceOut' }) // 缩小
                    .delay(0.1)
                    .to(duration, { scale: new Vec3(scaleUp, scaleUp, scaleUp) }, { easing: 'bounceOut' }) // 再次放大
                    .delay(0.1)
                    .to(duration, { scale: new Vec3(scaleDown, scaleDown, scaleDown) }, { easing: 'bounceOut' }) // 再次缩小
                    .call(() => {
                        self._wangTween.stop();
                        self._wangTween = null;
                        self.hasWangClick = false;
                        // 移除wangPrefab
                        wang.removeChild(wangPrefab);
                        if(self._clearBoo)return;
                        self.wangCount++;
                        self.catchLabel.getComponent(Label).string = `${self.wangCount}/${self.wangMaxCount}`;
                        if (self.wangCount == self.wangMaxCount) {
                            self.endCurHardGame();
                        }
                        if(self.hasGuide&&self.fishs.length<=1){
                            if(this._wangTween){
                                this._wangTween.stop();
                                this._wangTween = null;
                            }
                            Tween.stopAll();
                            EventManager.getInstance().off(Fish.FishClick, this);

                            if (this.fishs) {
                                let len = this.fishs.length;
                                for (let i: number = 0; i < len; i++) {
                                    let fish = this.fishs[i];
                                    if (fish) {
                                        if (fish.curTween) {
                                            fish.curTween.stop();
                                            fish.curTween = null;
                                        }
                                        this.fishParentNode.removeChild(fish.getFishNode());
                                        fish = null;
                                    }
                                }
                                this.fishs = [];
                            }
                            self._curFish=null;
                            if(!self._clearBoo)self.createFish();
                        }else{
                            // 设置当前鱼为选中状态
                            self._curFish.setSelect(self.unSelectColor, 1);
                            // 随机生成鱼
                            self.randomFish(self._curFish);
                            // 移动鱼
                            if(!self._pause)self.moveFishes(self._curFish, SHOOT_INTERVAL);

                            self._curFish=null;
                        }


                    })
                    .start();
            })
            .start(); // 启动动画


    }
    clearWangNubmer() {
        for (let i = 0; i < this.wangMaxCount; i++) {

            let wangNode = this.wangs[i];

            let label = wangNode.getChildByName('Label').getComponent(Label);

            label.string = '?';
        }
    }

    updateSuccessPopupStar(num) {
        this.stars.forEach((star, index) => {
            star.active = index < num;
        });
    }
    private endCurHardGame() {
        if(Global.isSkewersGame){
            this.clearGameView();
            this.requestGameResult();
            this.playAudio("music/win");
            // 串烧游戏逻辑
            if(SkewersManager.getInstance().isRunOver()){
                SkewersManager.getInstance().showGameAlert(this.node,AlertType.Sucess_Big,SkewersManager.getInstance().totalCompleteStr,SkewersManager.getInstance().totalBrainScore,0,0,this.totalCompete,this.remoteClick,this);
                return;
            }
            this.hardIndex = this.hards.indexOf(this.curHard);
            //上报数据
            EventManager.getInstance().on(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE,this.requestSkewersGameComplete,this);
        } else {
            if(!this.customsSendDataState){
                const curGame = GameCenterManager.getInstance().currentGame;
                let level = curGame.level+1;
                GameCenterManager.getInstance().gamePassLevel(curGame.sessionid, this.wangCount, level,
                    1, this.INIT_TIME - this.timer, this.INIT_TIME, this.hards[this.hardIndex], () => { });
            }
            this.gameSuccessView.active = true;
            this.clearGameView();
            this.playAudio("music/win");
            this.updateSuccessPopupStar(this.curHard);
            this.stars[this.hardIndex].scale = new Vec3(2, 2, 2);
            if (this.hardIndex == this.hards.length - 1) {
                this.hardIndex = 0;
            } else {
                this.hardIndex++;
            }
            this.curHard = this.hards[this.hardIndex];
        }
    }

    private requestSkewersGameComplete(data){
        let trainid = data;
        let trainData = SkewersManager.getInstance().getTrainData(trainid);
        EventManager.getInstance().off(SkewersManager.REQUEST_SKEWERSGAME_COMPLETE,this);
        let maxCount = trainData.parentSkewersGameData.trains.length;
        let curCount = trainData.seq;

        // 游戏内界面提示
        if(maxCount != curCount){
            SkewersManager.getInstance().showGameAlert(this.node,AlertType.Normal,SkewersManager.getInstance().singleCompleteStr,"",curCount,maxCount,this.alertGoonHandler,this.exitCallBack,this);
        }else{
            if (!SkewersManager.getInstance().isRunOver()) {
                SkewersManager.getInstance().showGameAlert(this.node,AlertType.Sucess_Small,SkewersManager.getInstance().currentSkewersCompleteGameStr,SkewersManager.getInstance().singleBrainScore,0,0,this.nextAlertHandler,this.exitCallBack,this);
            }else{
                SkewersManager.getInstance().showGameAlert(this.node,AlertType.Sucess_Big,SkewersManager.getInstance().totalCompleteStr,SkewersManager.getInstance().totalBrainScore,0,0,this.totalCompete,this.remoteClick,this);
            }
        }
    }

    private totalCompete(context){
        context.clearGameView();
        SkewersManager.getInstance().exitCallBack();
    }

    private remoteClick(){
        this.exitCallBack(this);
        UIManager.getInstance().showPanel(GenerateReport.NAME);
    }

    private alertGoonHandler(context){
        context.clearGameView();
        if (!SkewersManager.getInstance().isRunOver()) {
            context.node.active = false;
            SkewersManager.getInstance().runNextGame();
            // let boo = true;
            // Global.userData.curSkewerGameData.trains.forEach((train)=>{
            //     if(train.status != 1){
            //         boo = false;
            //     }
            // })
            // if(boo){
            //     context.node.active = false;
            //     SkewersManager.getInstance().runNextGame();
            // }else{
            //     SkewersManager.getInstance().runNextGame(false);
            //     context.start();
            // }
        }else{
            SkewersManager.getInstance().exitCallBack();
        }
    }

    private nextAlertHandler(context){
        clearInterval(context.timerId);
        SkewersManager.getInstance().showGameAlert(context.viewNode,AlertType.Next,SkewersManager.getInstance().nextSkewersGameStr,'',0,0,context.alertGoonHandler,context.exitCallBack,context);
    }


    private _startTime:number=0
    private _endTime: number = 0;
    private requestGameResult(){
        // 上报数据
        this._endTime = TimeUtil.getNow();
        let complete =this.wangCount/this.wangMaxCount;
        let duration= (this._endTime - this._startTime)/1000;
        SkewersManager.getInstance().requestGameComplete(complete,duration);
    }

    // private resetQuestions(){
    //     let len = questions.length;
    //     for(let i:number=0;i<len;i++){
    //        let _questions = questions[i];
    //        if(_questions){
    //            let _len = _questions.length;
    //            for(let j:number=0;j<_len;j++){
    //                let question = _questions[j];
    //                if(question)question.hasChose = false;
    //            }
    //        }
    //     }
    // }

    private _clearBoo = false;
    private clearGameView() {
        this._clearBoo = true;
        if (this.timerId != null) {
            clearInterval(this.timerId);
        }
        if(this._wangTween){
            this._wangTween.stop();
            this._wangTween = null;
        }
        AudioManager.getInstance().stop();
        Tween.stopAll();
        EventManager.getInstance().off(Fish.FishClick, this);

        // this.resetQuestions();
        if (this.fishs) {
            let len = this.fishs.length;
            for (let i: number = 0; i < len; i++) {
                let fish = this.fishs[i];
                if (fish) {
                    if (fish.curTween) {
                        fish.curTween.stop();
                        fish.curTween = null;
                    }
                    this.fishParentNode.removeChild(fish.getFishNode());
                    fish = null;
                }
            }
            this.fishs = [];
        }
    }
    private nextGame(event,data) {
        this.gameSuccessView.active = false;
        this.gameFailView.active = false;
        let state = Number(data);
        if(!state){
            this.clearGameView();
        }
        this.startGame(state); // 开始下一关
    }

    private playAudio(url:string,isShot:boolean = false,isLoop:boolean = false){
        let audioRes = this.audioMap.get(url);
        if(audioRes != null){
            if(isShot){
                AudioManager.getInstance().playOneShot(audioRes);
            }else{
                AudioManager.getInstance().play(audioRes,isLoop);
            }
        }
    }

    private selectWang(index: number) {
        let wang = this.wangs[index];
        wang.getComponent(Sprite).color = this.selectColor;
    }

    private unSelectWang(index: number) {
        let wang = this.wangs[index];
        wang.getComponent(Sprite).color = this.unSelectColor;
    }

    private errorClick(i: number){
        let self = this;
        let wang = this.wangs[i];
        wang.getComponent(Sprite).color = this.ErrorColor;
        if(this._curFish.curTween){
            this._curFish.curTween.stop();
            this._curFish.curTween = null;
        }
        this._curFish.curTween = tween(this._curFish)
            .to(0.8, { position: new Vec3( self._leftSceneX - 300, self._curFish.position.y, self._curFish.position.z) },{easing:"sineOut"})
            .call(() => {
                self.hasWangClick = false;
                self.unSelectWang(i);
                self._curFish.pause = false;
                if(!Global.isSkewersGame){
                    if (self.gameSuccessView.active || self.gameFailView.active) {
                        return;
                    }
                }
                if(self._clearBoo)return;
                self.clearWangNubmer();
                self._curFish.curTween.stop();
                self._curFish.curTween = null;
                self.randomFish(self._curFish);
                self.moveFishes(self._curFish, SHOOT_INTERVAL);
            })
            .start(); // 启动动画

    }


    private _pause = false;
    /**
     * 返回应用大厅
     */
    private quitGame() {
        // console.log("返回大厅")
        this._pause = true;
        clearInterval(this.timerId);
        this.fishs.forEach(fish =>{
            fish.curTween.stop();
            fish.curTween = null;
        });
        // this.clearGameView();
        if(Global.isSkewersGame){
            let trainData = SkewersManager.getInstance().getUnCompleteGameData();
            let maxCount = SkewersManager.getInstance().getGameCount();
            let curCount = trainData.seq - 1<0?0:trainData.seq -1;
            SkewersManager.getInstance().quitGame(this.viewNode,curCount,maxCount,this.goonCallBack,this.exitCallBack,this);
        }else{
            GameCenterManager.getInstance().quitGame(this.viewNode,this.goonCallBack,this.exitCallBack,this);
        }
    }

    private goonCallBack(context){
        let self = this;
        this.fishs.forEach(fish =>{
            self.moveFishes(fish);
        });
        this._pause = false;
        if(Global.isSkewersGame) {
            if(!SkewersManager.getInstance().isRunOver()){
                context.restoreTimer();
            }
        }else{
            context.restoreTimer();
        }
    }

    private exitCallBack(context){
        context.clearGameView();
        if(Global.isSkewersGame){
            SkewersManager.getInstance().exitCallBack();
        }else{
            GameCenterManager.getInstance().exitCallBack();
        }
    }

}



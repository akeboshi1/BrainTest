import { _decorator, Component, Sprite, Node, Label, Prefab, SpriteFrame, tween, Vec3, instantiate } from 'cc';
import { SceneManager } from '../../scripts/Core/Manager/Scene/SceneManager';
import { ColorUtil } from '../../scripts/Core/Util/ColorUtil';
import { Fish } from './Fish';
import { EventManager } from "db://assets/scripts/Core/Manager/Event/EventManager";
import { DebugLog } from "db://assets/scripts/Core/Util/DebugLog";
import { GameCenterManager } from "db://assets/scripts/Game/GameCenter/GameCenterManager";
const { ccclass, property } = _decorator;
import { questions0, questions1, questions2 } from './questionsDate'


const SHOOT_INTERVAL = 8;
let questions = [questions0, questions1, questions2];
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

    // @property(Button)
    // startBtn:Button;

    // @property(Button)
    // failBtn:Button;

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

    private hasWangClick: boolean = false;

    start() {
        this.gameBeforeView.active = true;
        this.fishs = []
    }

    startGame() {
        this.curHard = this.hards[this.hardIndex];
        this.gameBeforeView.active = false;
        this.gameStartView.active = true;
        this.wangCount = 0;
        this.catchLabel.getComponent(Label).string = `${this.wangCount}/4`;
        this.timeInit();
        this.timeStart();
        this.createFish();
    }

    private createFish(count: number = 4) {
        if (this.fishParentNode && this.fishPrefab) {
            let len = count;

            for (let i = 0; i < len; i++) {
                let fish = new Fish(this.fishPrefab);
                fish.positionYIndex = i;
                fish.setParent(this.fishParentNode);
                this.randomFish(fish);
                this.fishs.push(fish);
                this.moveFishes(fish, i * SHOOT_INTERVAL);
            }
        }
    }

    private fishYs:number[]=[-300,-100,100,300];

    private randomFish(fish: Fish) {

        let x = 800;
        let y = this.fishYs[fish.positionYIndex];

        let spriteFramelen = this.spriteFrames.length;

        let index = Math.floor(Math.random() * (spriteFramelen - 1));

        let spriteFrame = this.spriteFrames[index];

        fish.setPosition(x, y);
        DebugLog.instance.log(`create ---- ${fish.position}`)

        fish.setSpriteFrame(spriteFrame);

        const currentQuestions = questions[this.hardIndex];

        const question = currentQuestions[Math.floor(Math.random() * currentQuestions.length)];

        fish.setQuestion(question);
        EventManager.getInstance().off(Fish.FishClick, this);
        EventManager.getInstance().on(Fish.FishClick, this.selectFish, this);
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

        const upDistance = 10; // 上下浮动的距离
        const duration = 10; // 每次往返的时间
        // 定义上下移动的幅度（即上下移动的范围大小），可根据实际需求调整
        const floatAmplitude = 0.08;
        const phase = 0; // The initial phase of the wave
        // 使用 tween 创建运动效果
        fish.curTween = tween(fish)
            // 对当前鱼对象进行 tween 动画
            .delay(delay)// 每个对象延迟3秒开始
            .by(duration, { position: new Vec3(fish.position.x - 2200, fish.position.y, fish.position.z) },
                {
                    onUpdate: () => {
                        if (this.gameSuccessView.active || this.gameFailView.active) {
                            return;
                        }
                        const y = upDistance * Math.sin(floatAmplitude * fish.position.x + phase);
                        const newPosition = new Vec3(fish.position.x, fish.position.y + y, fish.position.z);
                        fish.position = newPosition;
                    }
                }
            )
            .call(() => {
                if (this.gameSuccessView.active || this.gameFailView.active) {
                    return;
                }
                this.randomFish(fish);
                this.moveFishes(fish, SHOOT_INTERVAL);
            })
            .start(); // 启动动画
    }

    update(deltaTime: number) {

    }
    timerId: any;
    timer: number;
    INIT_TIME = 120;
    timeInit() {
        this.timer = this.INIT_TIME;
        this.Timer.string = "2:00";


    }
    timeStart() {
        this.timerId = setInterval(() => {
            this.timer -= 1;
            if (this.timer <= 0) {
                // console.log("时间到");
                this.Timer.string = "0:00";
                if (this.wangCount !== this.wangMaxCount) {
                    this.gameFailView.active = true;
                    this.updateSuccessPopupStar(this.curHard)
                }
                clearInterval(this.timerId);

            }
            this.calculateTime();
        }, 1000);
    }

    calculateTime() {
        const fenzhong = Math.floor(this.timer / 60);
        const miao = this.timer % 60;
        const second = miao > 9 ? miao : `0${miao}`
        this.Timer.string = `${fenzhong}:${second}`;

    }

    rePlayGame() {
        this.gameFailView.active = false;
        this.wangCount = 0;
        this.catchLabel.getComponent(Label).string = `${this.wangCount}/4`;
        this.clearGameView();
        this.timeInit();
        this.timeStart();
        this.createFish();
    }

    private _wangTween;
    wangClick(event, data) {
        // 如果当前鱼不存在，则返回
        if (!this._curFish||this.hasWangClick) {
            return;
        }
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
                } else {
                    // 否则调用unSelectWang方法
                    this.unSelectWang(i);
                }
            }
            this.hasWangClick = false;
            return;
        }

        this._curFish.curTween.stop();
        DebugLog.instance.log(`click ---- ${this._curFish.position}`)
        this.clearWangNubmer();
        let wangPrefab = instantiate(this.wangPrefab);
        wangPrefab.setWorldScale(new Vec3(0.5, 0.5, 0.5));
        // 获取当前索引对应的wang
        let wang = this.wangs[index];
        // 将wangPrefab添加到wang的子节点中
        wang.addChild(wangPrefab);
        GameCenterManager.getInstance().gameMatch(GameCenterManager.getInstance().currentGame.sessionid, () => { })

        let self = this;// -600.-520.-440.-360
        let offsetX = this._curFish.positionYIndex * 38 + 600;
        let offsetTime = this._curFish.positionYIndex * 0.01;
        if(this._wangTween)this._wangTween.stop();
        // 启动动画
        this._wangTween = tween(wangPrefab).parallel(
            tween().to(1.1-offsetTime, { scale: new Vec3(3, 3, 3) }, { easing: 'bounceIn' }),
            tween().to(0.5-offsetTime, { position: new Vec3(this._curFish.worldPosition.x - offsetX, this._curFish.worldPosition.y - 150, this._curFish.worldPosition.z) })).call(() => {
            self._curFish.curTween.stop();
            const scaleUp = 1.3; // 放大到2倍
            const scaleDown = 1.0; // 恢复到原始大小
            const duration = 0.2; // 每次放大和缩小的时长
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
                    self.wangCount++;
                    self.catchLabel.getComponent(Label).string = `${self.wangCount}/4`;
                    if (self.wangCount == self.wangMaxCount) {
                        self.endCurHardGame();

                    }
                    // 设置当前鱼为选中状态
                    self._curFish.setSelect(self.unSelectColor, 1)
                    // 随机生成鱼
                    self.randomFish(self._curFish);
                    // 移动鱼
                    self.moveFishes(self._curFish, SHOOT_INTERVAL);

                    self._curFish=null;
                })
                .start();
        })
            .start(); // 启动动画

       
    }
    clearWangNubmer() {
        for (let i = 0; i < 4; i++) {

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
        const curGame = GameCenterManager.getInstance().currentGame;
        GameCenterManager.getInstance().gamePassLevel(curGame.sessionid, 4, this.hards[this.hardIndex],
            this.hards[this.hardIndex] / this.hards.length, this.INIT_TIME - this.timer, this.INIT_TIME, this.hards[this.hardIndex], () => { });
        this.gameSuccessView.active = true;
        this.clearGameView();
        this.updateSuccessPopupStar(this.curHard);

        this.stars[this.hardIndex].scale = new Vec3(2, 2, 2);
        if (this.hardIndex == this.hards.length - 1) {
            this.hardIndex = 0;
        } else {
            this.hardIndex++;
        }
        this.curHard = this.hards[this.hardIndex];
    }

    private clearGameView() {
        if (this.timerId != null) {
            clearInterval(this.timerId);
        }

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
    private nextGame() {
        this.gameSuccessView.active = false;
        this.startGame(); // 开始下一关
    }

    private selectWang(index: number) {
        let wang = this.wangs[index];
        wang.getComponent(Sprite).color = this.selectColor;
    }

    private unSelectWang(index: number) {
        let wang = this.wangs[index];
        wang.getComponent(Sprite).color = this.unSelectColor;
    }

    private errorClick(i: number) {
        let wang = this.wangs[i];
        wang.getComponent(Sprite).color = this.ErrorColor;
    }

    /**
     * 返回应用大厅
     */
    private quitGame() {
        // console.log("返回大厅")
        this.clearGameView();

        SceneManager.getInstance().backToHall();
    }

}



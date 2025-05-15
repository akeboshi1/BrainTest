import { _decorator, Component, Label, Node, UITransform, VideoPlayer, ProgressBar, tween, Vec3, UIOpacity } from 'cc';
import { FingerGameModel } from './FingerGameModel';
import { fingerGameConfig } from '../config/fingerGameConfig';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
const { ccclass, property } = _decorator;

@ccclass('FingerGameScene')
export class FingerGameScene extends Component {
    @property(VideoPlayer)
    private videoPlayer: VideoPlayer = null;

    @property(Node)
    private warmUpNode: Node = null;

    @property(Node)
    private fingerGameNode: Node = null;

    @property(Node)
    private gameFinishNode: Node = null;

    @property(Label)
    private titleLabel: Label = null;

    @property(ProgressBar)
    private progressBar: ProgressBar = null;

    @property(Label)
    private progressLabel: Label = null;

    @property(Label)
    private pauseButtonLabel: Label = null;

    @property(Label)
    private countNumLabel: Label = null;

    @property(Node)
    private maskNode: Node = null;

    @property(UIOpacity)
    private countNumOpacity: UIOpacity = null;

    @property(Label)
    private gameFinishLabel: Label = null;
    
    private _model:FingerGameModel = null;
    private _curIndex:number = 0;
    private _timer: ReturnType<typeof setInterval> = null;
    private _loopCount: number = 0;
    private _currentLoop: number = 0;
    private _isPaused: boolean = false;
    private _countDownTimer: ReturnType<typeof setInterval> = null;
    private _startTime: number = 0;

    start() {
        this._model = new FingerGameModel();

        this.warmUpNode.active = true;
        this.gameFinishNode.active = false;
        this.fingerGameNode.active = false;
        this.maskNode.active = false;
        this.countNumLabel.node.active = false;

        this.titleLabel.string = "手指操";
        this.videoPlayer.loop = true;
        this.progressBar.progress = 0;

        this._model.loadVideoClip(fingerGameConfig.warmUpVideo.path).then((videoClip) => {
            this.videoPlayer.clip = videoClip;
            this.videoPlayer.play();
        });
    }

    update(deltaTime: number) {
        
    }

    onClickStart(){
        this.warmUpNode.active = false;
        this.fingerGameNode.active = true;
        this._curIndex = 0;
        this._currentLoop = 0;
        this._startTime = Date.now();
        this.startVideoLoop();
    }

    onClickPause() {
        if (this._isPaused) {
            this.videoPlayer.play();
            this._isPaused = false;
            this.pauseButtonLabel.string = "暂停";
        } else {
            this.videoPlayer.pause();
            this._isPaused = true;
            this.pauseButtonLabel.string = "继续";
        }
    }

    onClickPrev() {
        if (this._curIndex <= 0) {
            return;
        }
        
        this._curIndex--;
        this._currentLoop = 0;
        this.startVideoLoop();
    }

    onClickNext() {
        if (this._curIndex >= fingerGameConfig.fingerVideos.length - 1) {
            return;
        }
        
        this._curIndex++;
        this._currentLoop = 0;
        this.startVideoLoop();
    }

    private showGameFinish() {
        this.fingerGameNode.active = false;
        this.gameFinishNode.active = true;
        this.titleLabel.string = "完成练习！";
        this.videoPlayer.pause();
        this.videoPlayer.node.active = false;

        const totalTime = Math.floor((Date.now() - this._startTime) / 1000);
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;
        const timeStr = `${minutes}分${seconds}秒`;

        this.gameFinishLabel.string = `恭喜你完成了所有练习！\n总用时：${timeStr}`;
    }

    private startCountDown() {
        if (this._curIndex >= fingerGameConfig.fingerVideos.length - 1) {
            this.showGameFinish();
            return;
        }

        this.maskNode.active = true;
        this.countNumLabel.node.active = true;
        let count = 3;

        const showNumber = (num: number) => {
            this.countNumLabel.string = num.toString();
            this.countNumLabel.node.setScale(Vec3.ZERO);
            this.countNumOpacity.opacity = 0;

            tween(this.countNumLabel.node)
                .to(0.3, { scale: new Vec3(1, 1, 1) })
                .start();

            tween(this.countNumOpacity)
                .to(0.3, { opacity: 255 })
                .delay(0.4)
                .to(0.3, { opacity: 0 })
                .start();
        };

        showNumber(count);
        this._countDownTimer = setInterval(() => {
            count--;
            if (count > 0) {
                showNumber(count);
            } else {
                clearInterval(this._countDownTimer);
                this._countDownTimer = null;
                this.countNumLabel.node.active = false;
                this.maskNode.active = false;
                this._curIndex++;
                this._currentLoop = 0;
                this.startVideoLoop();
            }
        }, 1000);
    }

    private startVideoLoop() {
        if (this._timer) {
            clearInterval(this._timer);
        }

        this.titleLabel.string = "手指操第" + (this._curIndex + 1) + "节";
        this.pauseButtonLabel.string = "暂停";
        this._isPaused = false;
        this.maskNode.active = false;
        this.countNumLabel.node.active = false;

        this._model.loadVideoClip(fingerGameConfig.fingerVideos[this._curIndex].path).then((videoClip) => {
            this.videoPlayer.clip = videoClip;
            this.videoPlayer.play();
            
            const config = fingerGameConfig.fingerVideos[this._curIndex];
            this._loopCount = config.loopCount;
            this._currentLoop = 0;
            this.updateProgress();

            this._timer = setInterval(() => {
                if (this._isPaused) {
                    return;
                }
                this.videoPlayer.currentTime = 0;
                this.videoPlayer.play();
                this._currentLoop++;
                this.updateProgress();

                if (this._currentLoop >= this._loopCount) {
                    this.videoPlayer.pause();
                    clearInterval(this._timer);
                    this._timer = null;
                    this.startCountDown();
                }
            }, config.duration * 1000);
        });
    }

    private updateProgress() {
        this.progressBar.progress = this._currentLoop / this._loopCount;
        this.progressLabel.string = this._currentLoop + "/" + this._loopCount;
    }

    public onClickExit(){
        SceneManager.getInstance().backToHall();
    }

    onDestroy() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
        if (this._countDownTimer) {
            clearInterval(this._countDownTimer);
            this._countDownTimer = null;
        }
    }
}



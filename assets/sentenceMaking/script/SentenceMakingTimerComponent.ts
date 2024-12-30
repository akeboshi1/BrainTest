import { _decorator, Component, Node, Label, EventTarget } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('SentenceMakingTimerComponent')
export class SentenceMakingTimerComponent extends Component {
    @property(Label)
    timeLabel: Label;

    private startTime: number;
    private duration: number = 10;
    private isRunning: boolean = false;
    private eventTarget: EventTarget = new EventTarget(); // 创建事件目标对象，用于发送事件

    start() {
    }

    update(deltaTime: number) {
        if (this.isRunning) {
            const elapsedTime = (Date.now() - this.startTime) / 1000;
            if (elapsedTime < this.duration) {
                const remainingTime = this.duration - elapsedTime;
                const minutes = Math.floor(remainingTime / 60);
                const seconds = Math.floor(remainingTime % 60);
                const minutesStr = this.padStart(minutes.toString(), 2, '0');
                const secondsStr = this.padStart(seconds.toString(), 2, '0');
                const timeStr = `${minutesStr}:${secondsStr}`;
                if (this.timeLabel) {
                    this.timeLabel.string = timeStr;
                }
            } else {
                this.isRunning = false;
                this.eventTarget.emit('timer-end'); // 计时结束时发送'timer-end'自定义事件
            }
        }
    }

    // 开始计时的方法，可传入计时总时长
    public startTimer(duration: number = this.duration) {
        this.duration = duration;
        this.startTime = Date.now();
        this.isRunning = true;
    }

    // 暂停计时的方法
    public pauseTimer() {
        this.isRunning = false;
    }

    // 继续计时的方法
    public resumeTimer() {
        if (!this.isRunning) {
            this.startTime = Date.now() - ((Date.now() - this.startTime) % 1000);
            this.isRunning = true;
        }
    }

    // 重置计时器的方法
    public resetTimer() {
        this.isRunning = false;
        this.startTime = 0;
        if (this.timeLabel) {
            this.timeLabel.string = '00:00';
        }
    }

    // 用于其他组件监听'timer-end'事件的方法
    public on(event: string, callback: (...any: any[]) => any, target: any) {
        if(this.eventTarget)this.eventTarget.on(event, callback, target);
    }

    // 用于其他组件取消监听'timer-end'事件的方法
    public off(event: string, callback: (...any: any[]) => any, target: any) {
        if(this.eventTarget)this.eventTarget.off(event, callback, target);
    }

    private padStart(str: string, targetLength: number, padString: string = "0") {
        while (str.length < targetLength) {
            str = padString + str;
        }
        return str;
    }
}
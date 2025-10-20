import {DebugLog} from "../../Core/Util/DebugLog";
import { Button, Label } from 'cc';

export class TimeUtil {
    public static getNowStr(): string {
        // 获取当前时间
        let now = new Date();

        // 获取年、月、日
        let year = now.getFullYear();
        let month = now.getMonth() + 1; // 月份从0开始，需要加1
        let day = now.getDate();

        // 获取时、分、秒
        let hours = now.getHours();
        let minutes = now.getMinutes();
        let seconds = now.getSeconds();

        // 补零操作
        let monthStr = month < 10 ? '0' + month : String(month);
        let dayStr = day < 10 ? '0' + day : String(day);
        let hoursStr = hours < 10 ? '0' + hours : String(hours);
        let minutesStr = minutes < 10 ? '0' + minutes : String(minutes);
        let secondsStr = seconds < 10 ? '0' + seconds : String(seconds);

        // 拼接成 YYYY-MM-DD HH:MM:SS 格式的字符串
        let formattedDateTime = `${year}-${monthStr}-${dayStr} ${hoursStr}:${minutesStr}:${secondsStr}`;

        // 输出类似于 "2024-11-19 15:30:45"
        DebugLog.instance.log(formattedDateTime);

        return formattedDateTime;
    }

    /**
     * 获取当前时间
     */
    public static getNow():number{
        let now = new Date();
        return now.getTime();
    }

    /**
     * 是否已经跨天了
     * @param loginTime
     */
    public static isCrossDay(loginTime:string){
        // 解析上次登录时间和当前时间
        let currentDate = new Date();
        let loginData = new Date(loginTime);

        // 判断日期是否相同
        return loginData.getDate() !== currentDate.getDate();
    }

    calculateSecondsBetweenTimestamps(currentTimeStamp, endTimeStamp) {
        if (typeof currentTimeStamp !== 'number' || typeof endTimeStamp !== 'number') {
            throw new Error('Time stamps must be numbers');
        }
        const differenceInSeconds = (endTimeStamp - currentTimeStamp) / 1000;
        return Math.abs(differenceInSeconds);
    }
    /**
     * 格式化时间
     * @param seconds
     */
    public static formatTime(seconds:number):string{
        // 计算小时、分钟和秒数
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        // 格式化为两位数
        const formattedHours = (hours < 10 ? '0' : '') + hours;
        const formattedMinutes = (minutes < 10 ? '0' : '') + minutes;
        const formattedSeconds = (secs < 10 ? '0' : '') + secs;

        // 合并为 "HH:mm:ss" 格式
        return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;

    }

    /**
     * 将当前时间转换成00:00:00格式的时间字符串
     * @param num
     */
    static padZero(num: number): string {
        return num < 10 ? `0${num}` : `${num}`;
    }

    /**
     * 获取当前时间(年月日星期)
     */
    static getCurrentDate(){
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1; // 月份从0开始，需要加1
        const day = now.getDate();
        const dayOfWeek = now.getDay(); // 星期几，0表示星期日，1表示星期一，依此类推
        const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
        const weekDayStr = weekDays[dayOfWeek]; // 获取星期几的中文表示
        return `${year}年${month}月${day}日 星期${weekDayStr}`;
    }

    /**
     * 获取当前时间段
     */
    static getTimePeriod() {
        const now = new Date();
        const timestamp = Math.floor(now.getTime() / 1000); // 转换为秒级时间戳
        return TimeUtil.getTimePeriodFromTimestamp(timestamp);
    }



    /**
     * 通过时间戳来判断当前是什么时间段
     * @param timestamp 毫秒级别
     */
    static getTimePeriodFromTimestamp(timestamp) {// 将时间戳转换为毫秒
        const currentHour = timestamp;

        if (currentHour >= 0 && currentHour < 12) {
            return "早上";
        } else if (currentHour >= 12 && currentHour < 14) {
            return "中午";
        } else if (currentHour >= 14 && currentHour < 18) {
            return "下午";
        } else {
            return "晚上"; // 超过24点按晚上处理
        }
    }

    /**
     * 将固定格式的字符串转换成Date
     * @param timeStr 年份-月份-日期
     * @returns 
     */
    static changeStrToTime(timeStr:string):Date{
        return new Date(timeStr);
    }


    /**
     * 自定义延迟方法
     * @param ms
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 通用按钮倒计时池
    private static _buttonCountdownMap: WeakMap<Button, { timer: any; remaining: number; baseText: string; label: Label; wasInteractable: boolean }> = new WeakMap();

    /**
     * 为任意按钮开启倒计时（公用方法）
     * - 会临时禁用按钮交互，结束后恢复
     * - 实时更新按钮上的 Label 文案（优先使用传入的 targetLabel，否则查找子节点 "Label"）
     * @param button 目标按钮
     * @param duration 倒计时秒数
     * @param baseText 基础文案（默认"确定"）
     * @param targetLabel 可选，若指定则直接使用这个 Label
     * @param onComplete 结束回调
     */
    public static startButtonCountdown(button: Button, duration: number, baseText: string = "确定", targetLabel?: Label, onComplete?: () => void): void {
        if (!button || !button.node) return;

        // 如果已有倒计时，先停止
        TimeUtil.stopButtonCountdown(button, baseText);

        let label: Label = targetLabel as Label;
        if (!label) {
            const labelNode = button.node.getChildByName("Label");
            label = labelNode ? labelNode.getComponent(Label) : null;
        }

        const state = {
            timer: null as any,
            remaining: Math.max(0, Math.floor(duration)),
            baseText,
            label,
            wasInteractable: button.interactable
        };
        TimeUtil._buttonCountdownMap.set(button, state);

        // 禁用按钮交互
        button.interactable = false;

        const tick = () => {
            if (state.label) {
                state.label.string = state.remaining > 0 ? `${baseText} (${state.remaining})` : baseText;
            }
            if (state.remaining <= 0) {
                TimeUtil.stopButtonCountdown(button, baseText);
                if (onComplete) onComplete();
                return;
            }
            state.remaining--;
        };

        // 立即刷新一次
        tick();
        state.timer = setInterval(tick, 1000);
    }

    /**
     * 停止按钮倒计时（公用方法）
     * @param button 目标按钮
     * @param resetText 可选，停止后文案（默认基础文案）
     */
    public static stopButtonCountdown(button: Button, resetText?: string): void {
        const state = TimeUtil._buttonCountdownMap.get(button);
        if (!state) return;

        if (state.timer) {
            clearInterval(state.timer);
        }
        TimeUtil._buttonCountdownMap.delete(button);

        // 恢复按钮交互
        button.interactable = state.wasInteractable;

        // 恢复文案
        if (state.label) {
            state.label.string = resetText ?? state.baseText;
        }
    }
}
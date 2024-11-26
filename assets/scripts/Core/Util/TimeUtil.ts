import {DebugLog} from "../../Core/Util/DebugLog";

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
     * 获取当前时间戳
     */
    public static getNow():number{
        let now = new Date();
        return now.getTime();
    }

    /**
     * 是否已经跨天了
     * @param loginTime
     * @param currentTime
     */
    public static isCrossDay(loginTime:string){
        // 解析上次登录时间和当前时间
        let currentDate = new Date();
        let loginData = new Date(loginTime);

        // 判断日期是否相同
        return loginData.getDate() !== currentDate.getDate();
    }

    /**
     * 格式化时间
     * @param time
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
}
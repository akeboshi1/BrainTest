export class TimeUtil {
    public static getNowStr():string{
        // 获取当前时间
        let now = new Date();

        // 获取年、月、日
        let year = now.getFullYear();
        let month = now.getMonth() + 1; // 月份从0开始，需要加1
        let day = now.getDate();

        // 补零操
        let monthStr = month < 10 ? '0' + month : month;
        let dayStr = day < 10 ? '0' + day : day;

        // 拼接成 YYYY-MM-DD 格式的字符串
        let formattedDate = `${year}-${monthStr}-${dayStr}`;

        console.log(formattedDate); // 输出类似于 "2024-11-19"
        // 格式化为 YYYY-MM-DD
        return formattedDate;
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
}
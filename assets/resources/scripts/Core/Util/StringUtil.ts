export class StringUtil {

    /**
     * 切割字符串
     * @param str
     * @param filter
     */
    static spliceStr(str: string, filter: string): string[] {
        return str.split(filter);
    }

    /**
 * 格式化日期为 "YYYY-MM-DD" 格式
 */
    static formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }



}
export class StringUtil {

    /**
     * 切割字符串
     * @param str
     * @param filter
     */
    static spliceStr(str:string,filter:string):string[]{
           return str.split(filter);
    }



}
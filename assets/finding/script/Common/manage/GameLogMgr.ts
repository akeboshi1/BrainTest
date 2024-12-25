import Global from "../Global";
import {log,warn,error} from 'cc'
export default class GameLogMgr {

    public static log(...args: any[]): void {
        if (Global.IS_LOG) {
            console.log.apply(log, args);
        }
    }

    public static warn(...args: any[]): void {
        if (Global.IS_LOG) {
            console.warn.apply(warn, args);
        }
    }

    public static error(...args: any[]): void {
        if (Global.IS_LOG) {
            console.error.apply(error, args);
        }
    }
}

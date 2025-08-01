
export class DebugLog {

    private static _instance: DebugLog;

    public static get instance() {
        if (!DebugLog._instance) {
            DebugLog._instance = new DebugLog();
        }
        return this._instance;
    }

    /**
     * debug开关
     */
    public debugBoo:boolean = false;
    public constructor() {

    }

    /**
     * 调试日志
     * @param data 日志内容
     */
    public debug(...data: any[]){
        console.log(...data);
    }

    public info(...data: any[]){
        console.info(...data);
    }

    public log(...data: any[]){
        if(this.debugBoo)console.log(...data);
    }

    public warn(...data: any[]){
        if(this.debugBoo)console.warn(...data);
    }
    public error(...data: any[]){
        console.error(...data);
    }
}
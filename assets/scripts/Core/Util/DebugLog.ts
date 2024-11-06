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
    public debugBoo:boolean = true;
    public constructor() {

    }

    public log(...data: any[]){
        if(this.debugBoo)console.log(data);
    }

    public warn(...data: any[]){
        if(this.debugBoo)console.warn(data);
    }

    public error(...data: any[]){
        if(this.debugBoo)console.error(data);
    }
}
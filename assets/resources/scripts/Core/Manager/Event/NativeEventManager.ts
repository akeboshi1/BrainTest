import { native, sys } from "cc";
import { BaseManager } from "../BaseManager";
import { NativeEvent } from "./NativeEvent";
import { DebugLog } from "../../Util/DebugLog";
import { EventManager } from "./EventManager";

export class NativeEventManager extends BaseManager {

    private static _instance: NativeEventManager;

    public static getInstance(): NativeEventManager {
        if (!NativeEventManager._instance) {
            NativeEventManager._instance = new NativeEventManager();
        }
        return NativeEventManager._instance;
    }

    private events;

    private initFlag = false;
    
    private _deviceID:string = "";
    get deviceID():string{
        return this._deviceID;
    }

    constructor() {
        super();
    }

    init() {
        if (!this.initFlag && sys.platform === sys.Platform.ANDROID) {
            if (!this.events) this.events = {};
            native.bridge.onNative = this.nativeEventHandle.bind(this);
            this.initFlag = true;

            console.log(`初始化NativeEventManager`);
            // this.on(NativeEvent.DEVICEInfo, (data:any) => {
            //     this._deviceID = data.deviceId;
            //     console.log(`获取设备信息: ${this._deviceID}`);
            // },this);
            this.on(NativeEvent.QRCODEResult, (data:any) => {
               EventManager.getInstance().emit(NativeEvent.QRCODEResult,data);
               console.log(`获取二维码信息: ${data}`);
            },this);
        }
    }

    private nativeEventHandle(arg0: string, arg1: string) {
        DebugLog.instance.error("Get Native Message ------- arg0 = " + arg0 + " , arg1 = " + arg1);

        const event: NativeEvent = this.stringToEnum(arg0);
        if (event) {
            let data = {};
            if (arg1) {
                let msg = JSON.parse(arg1);
                if (msg) {
                    data = msg;
                }
            }
            this.emit(event, data);
        }
    }

    public on(eventName: NativeEvent, callback: (data: any) => void, context: any) {
        DebugLog.instance.error("ON",eventName);
        const eventInfo = Object.keys(this.events).map(key => `${key}:${this.events[key].length}`);
        DebugLog.instance.error("ON", "{" + eventInfo.join(",") + "}");
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push({
            callback: callback.bind(context),
            context
        });
    }

    public off(eventName: NativeEvent, context: any) {
        if (this.events[eventName]) {
            this.events[eventName] = this.events[eventName].filter(item => {
                return item.context !== context;
            });
        }
    }

    private emit(eventName, data = null) {
        DebugLog.instance.error("Emit Native Message ------- eventName = " + eventName + " , data = " + data);
        const eventInfo = Object.keys(this.events).map(key => `${key}:${this.events[key].length}`);
        DebugLog.instance.error("ON", "{" + eventInfo.join(",") + "}");
        if (this.events[eventName]) {
            this.events[eventName].forEach(item => {
                item.callback(data);
            });
        }
    }

    destory() {
        this.events = {};
    }


    private stringToEnum(str: string): NativeEvent | undefined {
        for (const key in NativeEvent) {
            if (NativeEvent[key as keyof typeof NativeEvent] === str) {
                return NativeEvent[key as keyof typeof NativeEvent];
            }
        }
        return undefined;
    }
}
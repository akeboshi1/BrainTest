import {BaseManager} from "../BaseManager";

export class EventManager extends BaseManager{

    private static _instance: EventManager;

    public static getInstance():EventManager {
        if(!EventManager._instance) {
            EventManager._instance = new EventManager();
        }
        return EventManager._instance;
    }
    private events:Map<string,{callback,context,isOnce:boolean}[]> = null;

    constructor() {
        super();
    }

    init() {
        if(!this.events) this.events = new Map();
    }


    // 添加监听
    on(eventName, callback, context, isOnce:boolean = false) {
        this.init();
        if(!this.events[eventName]) {
            this.events[eventName] = [];
        }
        const boundCallback = callback.bind(context);
        this.events[eventName].push({
            callback: boundCallback,
            context,
            isOnce
        });
    }

    // 移除监听
    off(eventName,  context) {
        this.init();
        if(this.events[eventName]) {
            this.events[eventName] = this.events[eventName].filter(item => {
                return item.context !== context;
            });
        }
    }

    // 触发事件
    emit(eventName, data=null) {
        let onceEvent:{eventName,context}[] = [];
        if(this.events[eventName]) {
            this.events[eventName].forEach(item => {
                item.callback(data,item.context);
                if(item.isOnce){
                    onceEvent.push({eventName,context:item.context});
                }
            });
        }

        for (const key in onceEvent) {
            const element = onceEvent[key];
            this.off(element.eventName,element.context);
        }
    }

    /**
     * 遍历移除对象中的监听
     * @param context
     */
    disableContext(context){
        this.events.forEach(((items,key)=>{
            let len = items.length;
            for(let i:number = 0;i<len;i++){
                let item = items[i];
                if(item.context == context){
                    this.off(key,context);
                }
            }
        }));
    }

    update(){

    }

    destory(){
        this.events.clear();
    }

}
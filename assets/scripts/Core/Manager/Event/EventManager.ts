import {BaseManager} from "db://assets/scripts/Core/Manager/BaseManager";

export class EventManager extends BaseManager{

    private static _instance: EventManager;

    public static getInstance():EventManager {
        if(!EventManager._instance) {
            EventManager._instance = new EventManager();
        }
        return EventManager._instance;
    }
    private events;

    constructor() {
        super();
    }

    init() {
        this.events = {};
    }


    // 添加监听
    on(eventName, callback, context) {
        if(!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push({
            callback,
            context
        });
    }

    // 移除监听
    off(eventName,  context) {
        if(this.events[eventName]) {
            this.events[eventName] = this.events[eventName].filter(item => {
                return item.context !== context;
            });
        }
    }

    // 触发事件
    emit(eventName, data=null) {
        if(this.events[eventName]) {
            this.events[eventName].forEach(item => {
                item.callback(data);
            });
        }
    }

    update(){

    }

    destory(){
        this.events = {};
    }

}
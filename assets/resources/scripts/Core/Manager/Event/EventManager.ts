import {BaseManager} from "../BaseManager";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";

interface EventHandler {
    callback: Function;
    context: any;
    isOnce: boolean;
}

export class EventManager extends BaseManager {
    private static _instance: EventManager;
    private events: Map<string, EventHandler[]>;

    public static getInstance(): EventManager {
        if (!EventManager._instance) {
            EventManager._instance = new EventManager();
        }
        return EventManager._instance;
    }

    constructor() {
        super();
        this.events = new Map<string, EventHandler[]>();
    }

    init() {
        // 已在构造函数中初始化，此方法保留为空以兼容旧代码
    }

    /**
     * 添加事件监听
     * @param eventName 事件名称
     * @param callback 回调函数
     * @param context 上下文对象
     * @param isOnce 是否只触发一次
     */
    on(eventName: string, callback: Function, context: any, isOnce: boolean = false) {
        if (!eventName) {
            DebugLog.instance.error("EventManager: 事件名称不能为空");
            return;
        }

        if (!callback) {
            DebugLog.instance.error("EventManager: 回调函数不能为空");
            return;
        }

        // 确保绑定了context的回调函数
        const boundCallback = context ? callback.bind(context) : callback;
        
        // 获取或创建该事件的处理器数组
        let handlers = this.events.get(eventName);
        if (!handlers) {
            handlers = [];
            this.events.set(eventName, handlers);
        }

        // 添加新的处理器
        handlers.push({
            callback: boundCallback,
            context: context,
            isOnce: isOnce
        });
    }

    /**
     * 添加只触发一次的事件监听
     * @param eventName 事件名称
     * @param callback 回调函数
     * @param context 上下文对象
     */
    once(eventName: string, callback: Function, context: any) {
        this.on(eventName, callback, context, true);
    }

    /**
     * 移除事件监听
     * @param eventName 事件名称
     * @param context 上下文对象
     */
    off(eventName: string, context: any) {
        if (!eventName) {
            DebugLog.instance.error("EventManager: 事件名称不能为空");
            return;
        }

        if (!this.events.has(eventName)) {
            return;
        }

        // 如果提供了context，则仅移除该context相关的监听器
        if (context) {
            const handlers = this.events.get(eventName);
            const filteredHandlers = handlers.filter(handler => handler.context !== context);
            
            if (filteredHandlers.length === 0) {
                // 如果没有处理器，则删除整个事件
                this.events.delete(eventName);
            } else {
                // 否则更新处理器列表
                this.events.set(eventName, filteredHandlers);
            }
        } else {
            // 如果没有提供context，则移除所有该事件的监听器
            this.events.delete(eventName);
        }
    }

    /**
     * 触发事件
     * @param eventName 事件名称
     * @param data 事件数据
     */
    emit(eventName: string, data: any = null) {
        if (!eventName) {
            DebugLog.instance.error("EventManager: 事件名称不能为空");
            return;
        }

        if (!this.events.has(eventName)) {
            return;
        }

        const handlers = this.events.get(eventName);
        // 存储需要在所有回调执行后移除的一次性监听器
        const handlersToRemove: EventHandler[] = [];

        // 执行所有回调
        for (const handler of handlers) {
            try {
                handler.callback(data, handler.context);
                
                // 如果是一次性监听器，则标记为待移除
                if (handler.isOnce) {
                    handlersToRemove.push(handler);
                }
            } catch (error) {
                DebugLog.instance.error(`EventManager: 事件 ${eventName} 处理出错:`, error);
            }
        }

        // 移除所有一次性监听器
        if (handlersToRemove.length > 0) {
            const remainingHandlers = handlers.filter(handler => !handlersToRemove.includes(handler));
            
            if (remainingHandlers.length === 0) {
                this.events.delete(eventName);
            } else {
                this.events.set(eventName, remainingHandlers);
            }
        }
    }

    /**
     * 移除指定上下文的所有事件监听
     * @param context 上下文对象
     */
    disableContext(context: any) {
        if (!context) {
            DebugLog.instance.error("EventManager: 上下文对象不能为空");
            return;
        }

        // 遍历所有事件，移除指定上下文的监听器
        for (const [eventName, handlers] of this.events.entries()) {
            const filteredHandlers = handlers.filter(handler => handler.context !== context);
            
            if (filteredHandlers.length === 0) {
                this.events.delete(eventName);
                console.log("移除监听:"+`${eventName}`,`${context}`);
            } else {
                this.events.set(eventName, filteredHandlers);
            }
        }
    }

    /**
     * 清除所有事件监听
     */
    clear() {
        this.events = new Map();
    }

    getListenerByContext(eventName: string, context: any): boolean {
        // 如果事件名不存在或者在events中找不到该事件，返回false
        if (!eventName || !this.events.has(eventName)) {
            return false;
        }
        
        // 获取该事件的所有处理器
        const handlers = this.events.get(eventName);
        
        // 检查是否存在与指定context匹配的处理器
        return handlers.some(handler => handler.context === context);
    }

    /**
     * 获取指定事件的监听器数量
     * @param eventName 事件名称
     */
    getListenerCount(eventName: string): number {
        if (!eventName || !this.events.has(eventName)) {
            return 0;
        }
        return this.events.get(eventName).length;
    }

    /**
     * 判断是否存在指定事件的监听器
     * @param eventName 事件名称
     */
    hasListener(eventName: string): boolean {
        return this.events.has(eventName) && this.events.get(eventName).length > 0;
    }

    update() {
        // 保留空实现以符合BaseManager接口
    }

    destory() {
        this.clear();
    }
}
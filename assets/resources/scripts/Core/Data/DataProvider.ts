
/**
 * 数据变化事件回调函数类型
 */
export type DataChangeCallback<T> = (data: T) => void;

/**
 * 监听器信息接口
 */
interface ListenerInfo<T> {
    id: string;
    callback: DataChangeCallback<T>;
}

/**
 * 泛型数据提供者类
 * 支持数据的获取、设置和监听数据变化事件
 */
export class DataProvider<T> {
    private _data: T | null = null;
    private _isDataSet: boolean = false;
    private _listeners: Map<string, ListenerInfo<T>> = new Map();

    /**
     * 获取当前数据
     * @returns 当前数据，如果未设置则返回null
     */
    public get data(): T | null {
        return this._data;
    }

    /**
     * 设置数据并触发所有监听回调
     * @param newData 新数据
     */
    public set data(newData: T) {
        this._data = newData;
        this._isDataSet = true;
        this._triggerCallbacks();
    }

    public triggerCallback(): void {
        this._triggerCallbacks();
    }

    /**
     * 检查数据是否已被设置过
     * @returns 如果数据已被设置过返回true，否则返回false
     */
    public get isDataSet(): boolean {
        return this._isDataSet;
    }

    /**
     * 添加数据变化监听器
     * 如果数据已经被设置过，会立即触发回调
     * @param callback 数据变化时的回调函数
     * @returns 监听器ID，用于移除监听器
     */
    public addListener(callback: DataChangeCallback<T>): string {
        const listenerId = this._generateListenerId();
        const listenerInfo: ListenerInfo<T> = {
            id: listenerId,
            callback: callback
        };
        
        this._listeners.set(listenerId, listenerInfo);

        // 如果数据已经被设置过，立即触发回调
        if (this._isDataSet && this._data !== null) {
            try {
                callback(this._data);
            } catch (error) {
                console.error('DataProvider initial callback error:', error);
            }
        }

        return listenerId;
    }

    /**
     * 通过ID移除数据变化监听器
     * @param listenerId 监听器ID
     * @returns 是否成功移除
     */
    public removeListenerById(listenerId: string): boolean {
        const removed = this._listeners.delete(listenerId);
        if (!removed) {
            console.warn(`DataProvider: 未找到ID为 ${listenerId} 的监听器`);
        }
        return removed;
    }

    /**
     * 移除所有监听器
     */
    public removeAllListeners(): void {
        this._listeners.clear();
    }

    /**
     * 获取当前监听器数量
     * @returns 监听器数量
     */
    public get listenerCount(): number {
        return this._listeners.size;
    }

    /**
     * 检查指定ID的监听器是否存在
     * @param listenerId 监听器ID
     * @returns 是否存在
     */
    public hasListener(listenerId: string): boolean {
        return this._listeners.has(listenerId);
    }

    /**
     * 获取所有监听器ID
     * @returns 监听器ID数组
     */
    public getListenerIds(): string[] {
        return Array.from(this._listeners.keys());
    }

    /**
     * 清空数据
     * 注意：清空数据不会触发回调
     */
    public clear(): void {
        this._data = null;
        this._isDataSet = false;
    }

    /**
     * 重置数据提供者
     * 清空数据并移除所有监听器
     */
    public reset(): void {
        this.clear();
        this.removeAllListeners();
    }

    /**
     * 触发所有监听回调
     */
    private _triggerCallbacks(): void {
        if (this._data !== null) {
            this._listeners.forEach((listenerInfo) => {
                try {
                    listenerInfo.callback(this._data!);
                } catch (error) {
                    console.error(`DataProvider callback error for listener ${listenerInfo.id}:`, error);
                }
            });
        }
    }

    /**
     * 生成唯一的监听器ID
     * @returns 监听器ID
     */
    private _generateListenerId(): string {
        return `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

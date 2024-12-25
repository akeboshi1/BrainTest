import GameLog from "./GameLogMgr";
import LoadMgr from "./LoadMgr";
import {NodePool,Node,instantiate,Prefab} from "cc";

export default class PondMgr {

    private static caches: { [key: string]: any } = {};

    private static gamePool: { [key: string]: NodePool } = {};   //对象池？

    /**
     * 新增对象池
     * @param url 名称
     * @param prefab 预制体
     * @param cnt 个数
     */
    public static addToCaches(url: string, prefab: any, cnt: number = 1) {
        if (url && prefab) {   //判断url 和预制体 是否为空
            if (this.caches[url]) {
                return false
            }
            this.caches[url] = prefab;
            this.createToPool(url, cnt);
            return true;
        }
    }

    private static createToPool(url: string, cnt: number = 1) {
        //判断 url是否为空，或者 内存中已经存在
        if (!url || !this.caches[url]) {
            return;
        }

        //如果 gamePool 中没有存在 的话 ， 那么就创建一个 Node
        if (this.gamePool[url] == null) {
            this.gamePool[url] = new NodePool();
        }

        cnt -= this.gamePool[url].size();
        for (let i = 0; i < cnt; i++) {
            let item = instantiate(this.caches[url]);
            this.gamePool[url].put(item);
        }
    }

    /**
     * 放回对象池
     */
    public static putNodeToPool(url: string, item: Node) {
        if (item == null || url == "" || url == null) {
            GameLog.warn('putNodeToPool fail', url, item);
            return;
        }

        //该对象池不存在，重新创建
        if (this.gamePool[url] == null) {
            this.gamePool[url] = new NodePool();
        }
        //清空父节点
        item.parent = null;
        this.gamePool[url].put(item);
    }

    /**
     * 从对象池中获取一个节点
     */
    public static getNodeFromPool(url: string): Node {
        let item = null;
        //如果对象池为空，则需要重新创建一下
        if (this.gamePool[url] == null) {
            this.gamePool[url] = new NodePool();
        }
        if (this.gamePool[url].size() > 0) {
            item = this.gamePool[url].get(); // 对象池 中如果已经存在这个节点了，直接去除就行
        } else if (this.caches[url]) {
            //没有存在这个节点的话 ，需要根据 caches 创建
            item = instantiate(this.caches[url]);
        }
        return item;
    }

    /**
     * 异步获取节点
     * @param url  节点路径
     * @param callFun   获取到之后的回调函数
     */
    public static getAsyncNodeToPool(url: string, callFun: any) {
        if (!url) {
            GameLog.warn("getAsyncNodeToPool", "url为空");
            return;
        }
        let item = this.getNodeFromPool(url);  // 先获取节点
        if (item) {  //节点存在，调用回调
            if (callFun) {
                callFun(item);
            }
        } else {
            //节点不存在，只能去加载咯 ，芜湖
            LoadMgr.loadPrefab(url).then((prefab: Prefab) => {
                this.addToCaches(url, prefab);
                item = this.getNodeFromPool(url);
                if (callFun) {
                    callFun(item);
                }
            })
        }
    }
}

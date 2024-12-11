import {NodePool,Prefab,instantiate,Node} from 'cc';
import {BaseManager} from "../BaseManager";
import { DebugLog } from '../../Util/DebugLog';

export class PoolManager extends BaseManager{

    private static _instance: PoolManager = null;
    public static getInstance(): PoolManager {
        if (PoolManager._instance == null)
            PoolManager._instance = new PoolManager()
        return PoolManager._instance;
    }


    private prefabs: any = {};
    private pools:any = {};


    initPool(key: any, prefab: Prefab, count: number = 1) {
        this.prefabs[key] = prefab;
        this.pools[key] = new NodePool();
        for (var i = 0; i < count; ++i) {
            this.pools[key].put(instantiate(prefab));
        }
    }

    get(key: any): Node {
        if (this.pools[key] == null) {
            DebugLog.instance.error(`没有${key}`);
            return null;
        }
        if (this.pools[key].size() > 0) {
            var node = this.pools[key].get();
            return node;
        }
        else
            return instantiate(this.prefabs[key]);
    }

    put(key: any, node: Node) {
        this.pools[key].put(node);
    }


}
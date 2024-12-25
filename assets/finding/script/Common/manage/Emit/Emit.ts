/**
 * 事件管理器
 */
import EmitBase from "./EmitBase";

export default class Emit extends EmitBase {

    protected static _instance: EmitBase = new EmitBase();

    public static instance(): EmitBase {
        return this._instance;
    }

    constructor() {
        super();
        if (Emit._instance) {
            return;
        }
        Emit._instance = this;
    }

}

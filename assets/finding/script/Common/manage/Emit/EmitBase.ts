//事件派发
import GameLog from "../GameLogMgr";
import {EventTarget} from "cc";

export default class EmitBase extends EventTarget {
    /**
     *
     * @param type
     * @param handler
     * @param target
     * @param useCapture
     */
    public on<T extends Function>(type: string | number, handler: any, target: any, useCapture?: boolean): T {
        if ((!type && type != 0) || !target) {
            GameLog.error("事件对象|类型为空===> type = ", type, "target =", target);
            return;
        }
        if (typeof type == "string") {
            return super.on(type, handler, target, useCapture);
        } else {
            return super.on(type.toString(), handler, target, useCapture);
        }
    }

    /**
     * @param type
     * @param handler
     * @param target
     */
    public once(type: string | number, handler: any, target?: any) {
        if (!type || !target) {
            GameLog.error("事件对象|类型为空===> type = ", type, "target =", target);
            return;
        }

        if (typeof type == "string") {
            return super.once(type, handler, target);
        } else {
            return super.once(type.toString(), handler, target);
        }

    }


    /**
     *
     * @param type
     * @param handler
     * @param target
     */
    public off(type: string | number, handler: any, target: any): void {
        if (!type || !target) {
            GameLog.error("事件对象|类型为空===> type = ", type, "target =", target);
            return;
        }

        if (typeof type == "string") {
            return super.off(type, handler, target);
        } else {
            return super.off(type.toString(), handler, target);
        }
    }

    /**
     *
     * @param target
     */
    public targetOff(target: any) {
        if (!target) {
            GameLog.error("事件对象===>  target =", target);
            return;
        }
        return super.targetOff(target);
    }

    /**
     * 派发事件
     * @param type  事件类型
     * @param arg1
     * @param arg2
     * @param arg3
     * @param arg4
     * @param arg5
     */
    public emit(type: string | number, arg1?: any, arg2?: any, arg3?: any, arg4?: any, arg5?: any): void {
        if (typeof type == "string") {
            return super.emit(type, arg1, arg2, arg3, arg4, arg5)
        } else {
            return super.emit(type.toString(), arg1, arg2, arg3, arg4, arg5)
        }
    }
}

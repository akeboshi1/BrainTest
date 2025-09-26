import { sys } from "cc";
import { DebugLog } from "../../Util/DebugLog";

export class SocketUtil {
    private static _instance: SocketUtil = null;

    public static getInstance(): SocketUtil {
        if (SocketUtil._instance == null) {
            SocketUtil._instance = new SocketUtil();
        }
        return SocketUtil._instance;
    }


    get socketType():string{
        // 获取当前网络类型
        let networkType = sys.getNetworkType();

        let str = "none";
        // 打印结果
        switch (networkType) {
            case sys.NetworkType.LAN:
                str = "Wi-Fi或以太网";
                DebugLog.instance.error("网络类型：Wi-Fi或以太网");
                break;
            case sys.NetworkType.WWAN:
                str = "移动网络";
                DebugLog.instance.error("网络类型：移动网络（2G/3G/4G/5G）");
                break;
            case sys.NetworkType.NONE:
                str = "无网络连接";
                DebugLog.instance.error("网络类型：无网络连接");
                break;
            default:
                str = "未知";
                DebugLog.instance.error("网络类型：未知");
                break;
        }
        return str;
    }
}
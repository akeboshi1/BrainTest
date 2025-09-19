
import { BaseManager } from '../Core/Manager/BaseManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { SocketData } from '../Core/Manager/Net/SocketData';
import { SocketManager } from '../Core/Manager/Net/SocketManager';
import { ThemeConfig } from './ThemeConfig';

export class GlobalConfigManager extends BaseManager {
    private static _instance: GlobalConfigManager = null;

    public static getInstance(): GlobalConfigManager {
        if (!this._instance) {
            this._instance = new GlobalConfigManager();
        }
        return this._instance;
    }

    private static GETGLOBALCONFIG:string = "global.config";

    private asr_audios_url:string;

    async init(): Promise<void> {
        return new Promise<void>((resolve,reject)=>{
            EventManager.getInstance().on(GlobalConfigManager.GETGLOBALCONFIG,(data)=>{
                if(data.status == 1 && data.data){
                    this.asr_audios_url = data.data.asr_audios_url;
                    // 初始化主题配置
                    if(data.data.theme)ThemeConfig.getInstance().init(data.data.theme);
                    resolve();
                }else{
                    reject();
                }
            },this,true);

            let socketdata = new SocketData({action:GlobalConfigManager.GETGLOBALCONFIG});
            SocketManager.getInstance().send(socketdata);
        });
    }

    get asrAudiosUrl():string{
        return this.asr_audios_url;
    }
}
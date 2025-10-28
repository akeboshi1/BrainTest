
import { BaseManager } from '../Core/Manager/BaseManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { SocketData } from '../Core/Manager/Net/SocketData';
import { SocketManager } from '../Core/Manager/Net/SocketManager';
import { ThemeConfig } from './ThemeConfig';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { IndexPageConfig } from '../indexPageV2/IndexPageConfig';
import { TaskContainerConfig } from '../indexPageV2/TaskContainerConfig';
import { DebugLog } from '../Core/Util/DebugLog';
import { SpriteFrame, Sprite, UITransform, Node } from 'cc';
import { ImageLoaderUtil } from '../Core/Util/ImageLoaderUtil';

export class GlobalConfigManager extends BaseManager {
    private static _instance: GlobalConfigManager = null;

    public static getInstance(): GlobalConfigManager {
        if (!this._instance) {
            this._instance = new GlobalConfigManager();
        }
        return this._instance;
    }

    private static GETGLOBALCONFIG:string = "global.config";
    private static GETGLOBALCONFIGTHEME:string = "global.config.theme";

    private asr_audios_url:string;
    private indexPageConfig: IndexPageConfig = new IndexPageConfig();
    private taskConfig: TaskContainerConfig = new TaskContainerConfig();

    async init(): Promise<void> {
        return new Promise<void>((resolve,reject)=>{
            EventManager.getInstance().on(GlobalConfigManager.GETGLOBALCONFIG,(data)=>{
                if(data.status == 1 && data.data){
                    this.asr_audios_url = data.data.asr_audios_url;
                    // // 初始化主题配置
                    // if(data.data.theme)ThemeConfig.getInstance().init(data.data.theme);
                    resolve();
                }else{
                    reject();
                }
            },this,true);

            // 监听主题配置更新
            EventManager.getInstance().on(GlobalConfigManager.GETGLOBALCONFIGTHEME,(data)=>{
                if(data.status == 1 && data.data){
                    // 更新主题配置
                    ThemeConfig.getInstance().init(data.data);
                }
            },this,true);

            let socketdata = new SocketData({action:GlobalConfigManager.GETGLOBALCONFIG});
            SocketManager.getInstance().send(socketdata);

            // 发送主题配置请求
            let themeSocketData = new SocketData({action:GlobalConfigManager.GETGLOBALCONFIGTHEME});
            SocketManager.getInstance().send(themeSocketData);
        });
    }

    get asrAudiosUrl():string{
        return this.asr_audios_url;
    }

    /**
     * 获取当前应该使用的配置类型
     * @returns 配置类型：'normal' 或节日名称
     */
    getCurrentConfigType(): string {
        let currentFestival = ThemeConfig.getInstance().getThemeTitle();
        if (currentFestival == "" || currentFestival == null) {
            currentFestival = "normal";
        }
        return currentFestival;
    }

    /**
     * 应用首页配置到UI
     * @param titleBg 标题背景节点
     * @param titleIcon 标题图标节点
     * @param titleText 标题文本节点
     */
    async applyIndexPageConfig(
        titleBg: Node, 
        titleIcon: Node, 
        titleText: Node
    ): Promise<void> {
        DebugLog.instance.log("GlobalConfigManager开始应用首页配置");
        const userData = PersonalCenterManager.getInstance().userInfoData;
        let config = null;

        // 优先从用户信息缓存中获取配置
        if (userData) {
            const cachedConfig = userData.getIndexPageConfigCache();
            if (cachedConfig) {
                DebugLog.instance.log("使用缓存的首页配置");
                config = cachedConfig;
            }
        }

        // 如果缓存中没有配置，则重新加载
        if (!config) {
            DebugLog.instance.log("缓存中没有配置，重新加载首页配置");
            await this.indexPageConfig.loadConfig();
            let type = this.getCurrentConfigType(); // 动态获取配置类型

            // if (type === "normal") {
            //     config = this.indexPageConfig.normalConfig;
            // } else {
            config = ThemeConfig.getInstance().getConfig();
            // }

            // 将配置存储到用户信息缓存中
            if (userData && config) {
                // 确保缓存包含任务配置
                const cacheData = {
                    ...config,
                    tasks: config.theme && config.theme.tasks || ThemeConfig.getInstance().getTasksConfig()
                };
                userData.setIndexPageConfigCache(cacheData);
                DebugLog.instance.log("首页配置已缓存到用户信息中");
            }
        }

        if (config &&  config.theme && config.theme.ui) {
            // 应用UI配置
            if (config.theme.ui.bg) {
                // 设置标题背景 - 统一使用远程加载
                const titleSprite = await ImageLoaderUtil.getInstance().loadRemoteSprite(config.theme.ui.bg);

                if (titleBg && titleSprite) {
                    titleBg.getComponent(Sprite).spriteFrame = titleSprite;
                }
                DebugLog.instance.log("应用标题配置:", config.theme.ui.bg);
            }
            if (config.theme.ui.middle) {
                // 设置图标0 - 统一使用远程加载
                const icon0Sprite = await ImageLoaderUtil.getInstance().loadRemoteSprite(config.theme.ui.middle);

                if (titleIcon && icon0Sprite) {
                    const transform = titleIcon.getComponent(Sprite).node.getComponent(UITransform);
                    // 调整尺寸
                    transform.width = icon0Sprite.width;
                    transform.height = icon0Sprite.height;
                    // 调整位置 - 保持图片中心位置不变
                    const currentPos = titleIcon.position;
                    titleIcon.setPosition(
                        currentPos.x + 40,
                        currentPos.y + 260,
                        currentPos.z
                    );
                    titleIcon.getComponent(Sprite).spriteFrame = icon0Sprite;
                }
            }
            if (config.theme.ui.title) {
                // 设置图标1 - 统一使用远程加载
                const icon1Sprite = await ImageLoaderUtil.getInstance().loadRemoteSprite(config.theme.ui.title);

                if (titleText && icon1Sprite) {
                    titleText.getComponent(Sprite).spriteFrame = icon1Sprite;
                }
                DebugLog.instance.log("应用图标1配置:", config.theme.ui.title);
            }
        }

        DebugLog.instance.log("GlobalConfigManager配置应用完成");
    }

    /**
     * 获取任务配置
     * @returns 任务配置数据
     */
    async getTaskConfig(): Promise<any> {
        const userData = PersonalCenterManager.getInstance().userInfoData;
        let taskdata = null;

        // 优先从用户信息缓存中获取任务配置
        if (userData) {
            const cachedConfig = userData.getIndexPageConfigCache();
            if (cachedConfig && cachedConfig.tasks) {
                DebugLog.instance.log("使用缓存的任务配置");
                taskdata = cachedConfig.tasks;
            }
        }

        // 如果缓存中没有任务配置，则重新加载
        if (!taskdata) {
            DebugLog.instance.log("缓存中没有任务配置，重新加载");
            await this.taskConfig.loadConfig();
            let type = this.getCurrentConfigType(); // 使用相同的动态类型判断

            // if (type == "normal") {
            //     taskdata = this.taskConfig.normalTaskData;
            // } else {
                taskdata = ThemeConfig.getInstance().getTasksConfig();
            // }
        }

        return taskdata;
    }

    /**
     * 强制刷新首页配置
     * 清除缓存并重新加载配置
     */
    async refreshIndexPageConfig(): Promise<void> {
        const userData = PersonalCenterManager.getInstance().userInfoData;
        if (userData) {
            userData.clearIndexPageConfigCache();
            DebugLog.instance.log("已清除首页配置缓存，将重新加载");
        }
    }
}
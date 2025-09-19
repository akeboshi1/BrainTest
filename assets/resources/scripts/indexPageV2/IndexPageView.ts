import { _decorator, Component, Node, Prefab, instantiate, Label, resources, SpriteFrame, Sprite, Button, UITransform, Texture2D, assetManager, ImageAsset, Rect, view } from 'cc';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { DebugLog } from '../Core/Util/DebugLog';

import { ReportData, ReportManager } from '../ManagerV2/ReportManager';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { BundleName } from '../Core/Manager/Load/BundleName';
import { VipPanel } from "db://assets/resources/scripts/Game/UI/Vip/VipPanel";

import { RadiaGraph } from './RadiaGraph';
import { TaskItemController } from './TaskItemController';
import { TaskContainerConfig } from './TaskContainerConfig';
import { IndexPageConfig } from './IndexPageConfig';
import { TaskManager } from '../Game/Task/TaskManager';
import { TaskAndNotificationPanelCtrl } from '../Game/UI/TaskAndNotificationPanel/TaskAndNotificationPanelCtrl';
import { SceneManager } from '../Core/Manager/Scene/SceneManager';
import { AlertData, AlertManager } from '../Core/Manager/Alert/AlertManager';
import { Global } from '../Core/Manager/Config/Global';
import { BundlePreloadEvent, BundlePreloadManager } from '../Core/Manager/Load/BundlePreloadManager';
import { AdaptComponent } from "db://assets/resources/scripts/mainV2/AdaptComponent";
import { VipAlert } from '../Game/UI/Vip/VipAlert';
import { GameType } from '../Core/Scene/SceneModel/BaseGameModel';
import { ThemeConfig } from '../Config/ThemeConfig';
import { ScreenAdapter } from '../Adapter/ScreenAdapter';
import { ScreenSizeUtil } from '../Adapter/ScreenSizeUtil';


const { ccclass, property } = _decorator;


@ccclass('IndexPageView')
export class IndexPageView extends AdaptComponent {
    @property(Prefab)
    private taskPrefab: Prefab = null;

    @property(Node)
    private taskContainer: Node = null;

    @property(Label)
    private userName: Label = null;

    @property(Sprite)
    private userIcon: Sprite = null;

    @property(Label)
    private dayLabel: Label = null;

    @property(Node)
    private radarMap: Node = null;

    @property(Prefab)
    private initDataPrefab: Prefab = null;

    @property(Node)
    private initDataParent: Node = null;

    @property(Node)
    private trendEntery: Node = null;

    @property(Node)
    private vipIcon: Node = null;

    @property(Node)
    private vipBg: Node = null;

    @property(Node)
    private vipNoBg: Node = null;

    @property(Node)
    private titleBg: Node = null;

    @property(Node)
    private titleIcon: Node = null;

    @property(Node)
    private titleText: Node = null;

    private taskConfig: TaskContainerConfig = new TaskContainerConfig();
    private indexPageConfig: IndexPageConfig = new IndexPageConfig();

    @property(Node)
    vipNode: Node = null;

    private _listenerId: string = null;
    private _dataLoadPromise: Promise<void> = null;
    private _dataLoadResolve: Function = null;

    async start() {
        super.start();
        UIManager.getInstance().registerPanel(VipPanel.NAME, BundleName.RESOURCES, '/prefab/VipPanel/VipPanel', VipPanel);
        UIManager.getInstance().registerPanel(VipAlert.NAME, BundleName.RESOURCES, "/prefab/VipPanel/VipAlert", VipAlert);
        
        // 创建数据加载Promise
        this._dataLoadPromise = new Promise<void>((resolve) => {
            this._dataLoadResolve = resolve;
        });
        
        // 加载首页配置
        await this.indexPageConfig.loadConfig();
        
        // 使用缓存机制请求用户信息
        PersonalCenterManager.getInstance().requestUserInfo().then(() => {
            this.getUserInfoCallBack();
        }).catch((error) => {
            DebugLog.instance.error("加载用户信息失败:", error);
        });
    }

    onEnable() {
        EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, this.getUserInfoCallBack, this);

        this._listenerId = ReportManager.getInstance().reportDataList.addListener(this.onReportDataListChange.bind(this));
    }

    onDisable() {
        EventManager.getInstance().off(BundlePreloadEvent.FINISH, this);
        EventManager.getInstance().off(PersonalCenterManager.getUserInfoCallBack, this);

        ReportManager.getInstance().reportDataList.removeListenerById(this._listenerId);
    }

    onReportDataListChange(data:ReportData[]) {
        const values = data.map(item => item.tier);
        this.radarMap.getComponent(RadiaGraph).setValues(values);
        this.radarMap.getComponent(RadiaGraph).updateView(data);
    }

    async getUserInfoCallBack() {
        const userData = PersonalCenterManager.getInstance().userInfoData;
        if (!userData) { return; }
        this.vipBg.active = userData.is_member;
        this.vipNoBg.active = !userData.is_member;
        if (userData.gender == 1) {
            const spriteFrame = await this.loadTaskSprite('textureV2/indexPage/male/spriteFrame');
            this.userIcon.spriteFrame = spriteFrame;
        } else {
            const spriteFrame = await this.loadTaskSprite('textureV2/indexPage/female/spriteFrame');
            this.userIcon.spriteFrame = spriteFrame;
        }
        if (userData.full_name) {
            this.setUserName(userData.nickname);
        } else {
            this.setUserName("未设置昵称");
        }

        this.setDayLabel(userData.trained_days);

         // 当会员时间还剩余1天，显示续费入口
         if (userData.getMemberRemainingDays() == 1) {
            this.vipNode.active = true;
        } else {
            this.vipNode.active = false;
        }
        if (!userData.has_initial_tier) {
            this.initDataParent.active = true;
            TaskManager.getInstance().start();
            let initDataPanel = instantiate(this.initDataPrefab);
            initDataPanel.parent = this.initDataParent;
            initDataPanel.setPosition(0, 0);
        } else {
            this.trendEntery.active = true;
            await this.generateTask();
        }

        // 应用首页配置
        await this.applyIndexPageConfig();

        // 数据加载完成，通知PageController
        if (this._dataLoadResolve) {
            this._dataLoadResolve();
            this._dataLoadResolve = null;
        }
    }

    async loadTaskSprite(path: string): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            resources.load(path, SpriteFrame, (err, spriteFrame) => {
                if (err) {
                    DebugLog.instance.error(`Failed to load sprite: ${path}`, err);
                    reject(err);
                    return;
                }

                if (!spriteFrame) {
                    DebugLog.instance.error(`Loaded sprite frame is null: ${path}`);
                    reject(new Error('Loaded sprite frame is null'));
                    return;
                }
                resolve(spriteFrame);
            });
        })
    }

    /**
     * 从远程URL加载图片并转换为SpriteFrame
     * @param url 远程图片URL
     * @returns Promise<SpriteFrame>
     */
    async loadRemoteSprite(url: string): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            this.wwwLoadSpriteFrame(url,(spriteFrame: SpriteFrame) => {
                if (spriteFrame) {
                    resolve(spriteFrame);
                } else {
                    reject(new Error(`远程图片加载失败: ${url}`));
                }
            });
        });
    }

    /**
     * 使用assetManager加载远程图片
     * @param path 远程图片路径
     * @param completeHD 完成回调函数
     */
    public wwwLoadSpriteFrame(path: string,completeHD?: Function) {
        assetManager.loadRemote<ImageAsset>(path,
            {
                xhrResponseType: "blob",
                xhrHeader: { 'Content-Type': 'application/octet-stream' }
            },
            (err, imageAsset: ImageAsset) => {
                if (err) {
                    DebugLog.instance.error("load error  ");
                    DebugLog.instance.log(err);
                    completeHD(null);
                    return;
                }
                const spriteFrame = new SpriteFrame();
                const texture = new Texture2D();
                texture.image = imageAsset;
                spriteFrame.texture = texture;
                
                completeHD(spriteFrame);
            }
        );
    }

    buyHandler() {
        UIManager.getInstance().showPanel(VipPanel.NAME);
    }

    setUserName(name) {
        if (name.length > 5) {
            name = name.substring(0, 6) + '...';
        }
        this.userName.string = name;
    }

    setDayLabel(day: number) {
        this.dayLabel.string = `${day}天`;
    }
    
    renewalHandler() {
        UIManager.getInstance().showPanel(VipPanel.NAME);
    }

    /**
     * 获取当前应该使用的配置类型
     * @returns 配置类型：'normal' 或节日名称
     */
    getCurrentConfigType(): string {
        // 可以根据实际需求来判断，比如：
        // 1. 根据当前日期判断节日
        // 2. 根据用户设置
        // 3. 根据服务器配置等
        
        let currentFestival = ThemeConfig.getInstance().getThemeTitle();
        if(currentFestival == "" || currentFestival == null){
            currentFestival = "normal";
        }
        return currentFestival;
    }

    /**
     * 应用首页配置到UI
     */
    async applyIndexPageConfig() {
        await this.indexPageConfig.loadConfig();
        let type = this.getCurrentConfigType(); // 动态获取配置类型
        let config;
        
        if (type === "normal") {
            config = this.indexPageConfig.normalConfig;
        } else {
            config = ThemeConfig.getInstance().getConfig();
        }
        if (config && config.ui) {
            // 应用UI配置
            if (config.ui.bg) {
                // 设置标题背景 - 统一使用远程加载
                const titleSprite = await this.loadRemoteSprite(config.ui.bg);
                
                if (this.titleBg && titleSprite) {
                    this.titleBg.getComponent(Sprite).spriteFrame = titleSprite;
                }
                DebugLog.instance.log("应用标题配置:", config.ui.bg);
            }
            if (config.ui.middle) {
                    // 设置图标0 - 统一使用远程加载`
                const icon0Sprite = await this.loadRemoteSprite(config.ui.middle);

                if (this.titleIcon && icon0Sprite) {
                    const transform = this.titleIcon.getComponent(Sprite).node.getComponent(UITransform);
                    // 调整尺寸
                    transform.width = icon0Sprite.width;
                    transform.height = icon0Sprite.height;
                    // 调整位置 - 保持图片中心位置不变
                    const currentPos = this.titleIcon.position;
                    this.titleIcon.setPosition(
                        currentPos.x + 40 ,
                        currentPos.y + 260,
                        currentPos.z
                    );
                    this.titleIcon.getComponent(Sprite).spriteFrame = icon0Sprite;
                }
            }
            if (config.ui.title) {
                // 设置图标1 - 统一使用远程加载
                const icon1Sprite = await this.loadRemoteSprite(config.ui.title);
                
                if (this.titleText && icon1Sprite) {
                    this.titleText.getComponent(Sprite).spriteFrame = icon1Sprite;
                }
                DebugLog.instance.log("应用图标1配置:", config.ui.title);
            }
        }
    }

    async generateTask() {
        await this.taskConfig.loadConfig();
        let type = this.getCurrentConfigType(); // 使用相同的动态类型判断
        let taskdata;
        if(type == "normal"){
            taskdata = this.taskConfig.normalTaskData;
        } else {
            taskdata = ThemeConfig.getInstance().getTasksConfig();
        }
        
        
        for (let i = 0; i < taskdata.length; i++) {
            let taskItem = instantiate(this.taskPrefab);
            let taskController = taskItem.getComponent(TaskItemController);
            taskController.setTaskIndex(i);
            taskController.setTaskTitle(taskdata[i].title);
            taskController.setTaskContent(taskdata[i].txt);
            await taskController.setTaskBg(taskdata[i].icon_bg, taskdata[i].width, taskdata[i].height);
            await taskController.setbgColor(taskdata[i].bg0_color,taskdata[i].bg1_color,taskdata[i].bg2_color,taskdata[i].bg3_color);

            //设置文本颜色
            if(taskdata[i].word_color){
                taskController.setTaskWordColor(taskdata[i].word_color);
            }
            
            // 设置文本外发光效果
            if (taskdata[i].word_out_color) {
                taskController.setTaskWordOutline(taskdata[i].word_out_color);
            }
            
            // taskController.setIsComplete(taskdata[i].is_complete);
            taskController.setClickCallback(this[taskdata[i].click_function_name].bind(this))
            taskController.node.parent = this.taskContainer;
        }
    }

    showBrainTrainingPanel() {
        let is_member = PersonalCenterManager.getInstance().userInfoData.is_member;
        if (is_member) {
            UIManager.getInstance().registerPanel(TaskAndNotificationPanelCtrl.NAME, BundleName.RESOURCES, "prefab/TaskAndNotification/TaskAndNotificationPanel", TaskAndNotificationPanelCtrl);
            UIManager.getInstance().showPanel(TaskAndNotificationPanelCtrl.NAME);
        } else {
            const alertData: AlertData = new AlertData();
            alertData.title = "去解锁会员,畅玩更多功能";
            alertData.cancelButtonVisible = true;
            alertData.confirmCb = function () {
                this.cofirmGoToVip();
            }.bind(this);
            AlertManager.getInstance().showAlert(alertData);
        }
    }

    navigatetoFingerGame() {
        let is_member = PersonalCenterManager.getInstance().userInfoData.is_member;
        if (is_member) {
            this.goToFingerCame();
        } else {
            const alertData: AlertData = new AlertData();
            alertData.title = "去解锁会员,畅玩更多功能";
            alertData.cancelButtonVisible = true;
            alertData.confirmCb = function () {
                this.cofirmGoToVip();
            }.bind(this);
            AlertManager.getInstance().showAlert(alertData);
        }
    }

    private _clickBoo = false;
    goToFingerCame() {
        if (this._clickBoo) {
            return;
        }
        this._clickBoo = true;
        let url = Global.RES_Root + BundleName.FINGERGAME;
        EventManager.getInstance().on(BundlePreloadEvent.FINISH, this.onPreloadFinish.bind(this, url, BundleName.FINGERGAME), this, true);
        BundlePreloadManager.getInstance().preload(BundleName.FINGERGAME);
    }

    private onPreloadFinish(url: string, sceneName: string, data: any) {
        let self = this;
        SceneManager.getInstance().changeScene(sceneName, "", { gametype: GameType.SKEWERS }).then((scene) => {
            self._clickBoo = false;
            DebugLog.instance.log(`${sceneName} 场景切换成功`);
        });
    }

    cofirmGoToVip() {
        UIManager.getInstance().showPanel(VipPanel.NAME);
    }

    showUserInfo() {
        PersonalCenterManager.getInstance().requestUserInfo();
    }

    clickNavBar(event, data) {
        const userData = PersonalCenterManager.getInstance().userInfoData;
        if (!userData.has_initial_tier) {
            return;
        }
        EventManager.getInstance().emit('onShowReport', data);
    }


    /**
     * 等待数据加载完成
     * 供PageController调用，用于延迟显示页面
     */
    async waitForDataLoad(): Promise<void> {
        if (this._dataLoadPromise) {
            await this._dataLoadPromise;
        }
    }
}



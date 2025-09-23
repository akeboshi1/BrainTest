import {_decorator, Button, instantiate, Label, Node, Prefab, ProgressBar, ScrollView, Sprite, UITransform, Texture2D, assetManager, ImageAsset, SpriteFrame} from 'cc';

import {TaskManager} from '../../Task/TaskManager';
import {EventManager} from '../../../Core/Manager/Event/EventManager';
import {TaskData, TaskStatus, TaskType} from '../../Task/TaskData';
import {StringUtil} from '../../../Core/Util/StringUtil';
import {DebugLog} from '../../../Core/Util/DebugLog';
import {BasePanel} from '../../../Core/UI/BasePanel';
import {UIManager} from '../../../Core/Manager/UI/UIManager';
import  {AlertManager,AlertData} from '../../../Core/Manager/Alert/AlertManager';
import {BrainTrain} from '../BrainTrain/BrainTrain';
import {BundleName} from '../../../Core/Manager/Load/BundleName';
import {Global} from '../../../Core/Manager/Config/Global';
import { PersonalCenterManager } from '../../PersonalCenterManager/PersonalCenterManager';
import { IndexPageConfig } from '../../../indexPageV2/IndexPageConfig';
import { ThemeConfig } from '../../../Config/ThemeConfig';

const { ccclass, property } = _decorator;

@ccclass('TaskAndNotificationPanelCtrl')
export class TaskAndNotificationPanelCtrl extends BasePanel {

    public static NAME: string = "TaskAndNotificationPanelCtrl";
    /**
     * 任务详细界面
     */
    @property({ type: Node })
    taskProgressNode: Node = null;

    @property(ProgressBar)
    progressBar: ProgressBar = null;

    @property(Label)
    progressLabel: Label = null;

    // @property(Button)
    // taskTab: Button = null;

    // @property(Button)
    // infoTab: Button = null;

    @property(Node)
    progressContent: Node = null;

    @property(Node)
    progressTaskNode: Node = null;

    // @property(Node)
    // progressInfoNode: Node = null;

    @property({ type: [Node] })
    taskList: Node[] = [];


    @property(Node)
    private titleBg: Node = null;

    @property(Node)
    private titleIcon: Node = null;

    @property(Node)
    private titleText: Node = null;

    // ======================

    // @property(Node)
    // notifictionListNode: Node = null;

    // @property(Prefab)
    // notificationItemPrefab: Prefab;

    // @property(Node)
    // redDotNode: Node = null;

    // @property(ScrollView)
    // scrollViewNode: ScrollView = null;

    private completeColor = "#2DABFF";
    private unCompleteColor = "#FF2D55";
    private expireColor = "#686E72";
    private processingColor = "#FF2D55";

    private notificationList: any[] = [];

    // 首页配置相关属性
    private indexPageConfig: IndexPageConfig = new IndexPageConfig();

    public static TaskAndNotificationHide:string = "TaskAndNotificationHide";

    start() {

    }

    onEnable(): void {
        // this.tabClick(null, 0);
        EventManager.getInstance().on(TaskManager.TaskListRequestCallBack, this.taskListRequestCallBack, this,true);
        TaskManager.getInstance().requestTaskList();

        // 应用首页配置
        this.applyIndexPageConfig();

        // EventManager.getInstance().on(TaskManager.NotificationListRequestCallBack, this.notificationRequestCallBack, this);
        // TaskManager.getInstance().requestStartInform();
        // this.scrollViewNode.node.on("scroll-to-bottom", this.scrollViewEvent, this);
    }

    onDisable(): void {
        EventManager.getInstance().off(TaskManager.NotificationListRequestCallBack, this);
    }

    // ======= 任务中心
    private taskListRequestCallBack(data, context) {
        // EventManager.getInstance().off(TaskManager.TaskListRequestCallBack, context);
        let taskDatas = TaskManager.getInstance().taskList;
        let index = 0;
        let count = 0;
        let self = context;
        taskDatas.forEach((task: TaskData) => {
            let taskItem = self.taskList[index];
            index++;
            if (taskItem == null) return;
            let label = taskItem.getChildByName("Label").getComponent(Label);
            let timeLabel = taskItem.getChildByName("time1").getComponent(Label);
            let complete = taskItem.getChildByName("complete");
            // let arrow = taskItem.getChildByName("arror_right");
            let btnBG = taskItem.getChildByName("btn").getComponent(Sprite);
            let btn = taskItem.getChildByName("btn").getComponent(Button);
            let btnLabel = taskItem.getChildByName("btn").getChildByName("label").getComponent(Label);
            // let cornorNode = taskItem.getChildByName("cornorNode");
            // cornorNode.active = task.type == TaskType.Review|| task.type ==TaskType.Revise || task.status == TaskStatus.Processing;
            // let cornorLabel = cornorNode.getChildByName("cornorLabel").getComponent(Label);
            if (task.type == TaskType.Review) {
                btnLabel.string = "去完成";
                //cornorLabel.string = "评测";
            } else if (task.status == TaskStatus.Processing) {
                btnLabel.string = "正在做";
                // cornorLabel.string = "正在做";
            }else if (task.type == TaskType.Revise) {
                btnLabel.string = "去完成";
                //cornorLabel.string = "订正";
            }
            (label as Label).string = task.name;
            let startTime = StringUtil.spliceStr(task.startTime + "", " ")[1];
            let endTime = StringUtil.spliceStr(task.endTime + "", " ")[1];
            let startTimes = StringUtil.spliceStr(startTime, ":");
            let endTimes = StringUtil.spliceStr(endTime, ":");
            startTime = startTimes[0] + ":" + startTimes[1];
            endTime = endTimes[0] + ":" + endTimes[1];
            (timeLabel as Label).string = startTime + "-" + endTime;
            taskItem.active = true;
            if (task.status == TaskStatus.Completed) {
                complete.active = true;
                btn.node.active = false;
                //arrow.active = false;
                //(btnBG as Sprite).color = ColorUtil.hexToColor(context.completeColor);
                count++;
            } else {
                btn.node.active = true;
                // if (task.status == TaskStatus.Expired) {
                //     (btnBG as Sprite).color = ColorUtil.hexToColor(context.expireColor);
                // }
                // else if (task.status == TaskStatus.Processing) {
                //     (btnBG as Sprite).color = ColorUtil.hexToColor(context.processingColor);
                // }
                // else {
                //     (btnBG as Sprite).color = ColorUtil.hexToColor(context.unCompleteColor);
                // }
                complete.active = false;
                //arrow.active = true;
            }
        });
        context.progressLabel.string = `${count} / ${taskDatas.length}`;
        context.progressBar.progress = count / taskDatas.length;

    }

    private _curTaskData: TaskData;
    taskItemClick(event, data) {
        let taskList = TaskManager.getInstance().taskList;
        this._curTaskData = taskList[Number(data)];
        if (!this._curTaskData) {
            return;
        }
        TaskManager.getInstance().setCurTaskId(this._curTaskData.id);
        if (this._curTaskData.status == TaskStatus.Completed) {
            DebugLog.instance.log("当前任务已经完成");
            const ad: AlertData = new AlertData();
            ad.title = "提示";
            ad.message = "当前任务已经完成";
            AlertManager.getInstance().showAlert(ad);
            ad.cancelButtonVisible = false;
            return;
        }
        if (this._curTaskData.status == TaskStatus.Expired) {
            const ad: AlertData = new AlertData();
            ad.title = "提示";
            ad.message = "当前任务已经过期";
            AlertManager.getInstance().showAlert(ad);
            ad.cancelButtonVisible = false;
            return;
        }
        this.openBrainTrain();
    }
    openBrainTrain() {
        UIManager.getInstance().registerPanel(BrainTrain.NAME, BundleName.RESOURCES, "/prefab/BrainTrain/BrainTrain", BrainTrain);
        UIManager.getInstance().showPanel(BrainTrain.NAME).then(() => {
            const brainTrain = UIManager.getInstance().getActivePanel(BrainTrain.NAME);
            Global.prePanel = BrainTrain.NAME;
        });
    }

    // tabClick(event, index: number) {
    //     switch (Number(index)) {
    //         case 0:
    //             this.taskTab.normalColor = ColorUtil.getCCColor(18, 197, 241);
    //             this.infoTab.normalColor = ColorUtil.getCCColor(255, 255, 255);
    //             break;
    //         case 1:
    //             this.infoTab.normalColor = ColorUtil.getCCColor(18, 197, 241);
    //             this.taskTab.normalColor = ColorUtil.getCCColor(255, 255, 255);
    //             this.clickNotificationBtn();
    //             break;
    //     }

    //     this.progressTaskNode.active = !Number(index);
    //     this.progressInfoNode.active = Boolean(Number(index));
    // }

    // public clickNotificationBtn() {
    //     this.progressTaskNode.active = false;
    //     this.progressInfoNode.active = true;
    // }
    // scrollViewEvent(event, index: number) {
    //     // console.log("scrollview", event, index);
    //     this.hideRedDot();

    //     const subIds: number[] = this.notificationList.map(item => (item as any).id);
    //     if (subIds.length !== 0) {
    //         TaskManager.getInstance().isReadNotification(subIds);
    //     }
    //     this.notificationList = [];
    //     this.scrollViewNode.node.off("scroll-to-bottom", this.scrollViewEvent, this);
    // }
    // private notificationRequestCallBack() {
    //     this.notificationList = TaskManager.getInstance().notificationList;
    //     if (this.notificationList && this.notificationList.length > 0) {
    //         this.showRedDot()
    //     } else {
    //         this.hideRedDot()
    //     }

    //     this.updateList(this.notificationList);
    // }

    // hideRedDot() {
    //     if (this.redDotNode) this.redDotNode.active = false;
    // }

    // showRedDot() {
    //     if (this.redDotNode) this.redDotNode.active = true;
    // }

    // clearList() {
    //     this.notifictionListNode.removeAllChildren();
    // }

    // updateList(notificationArr: any[] = []) {
    //     this.clearList();
    //     for (let index = 0; index < notificationArr.length; index++) {
    //         let notificationPrefab = instantiate(this.notificationItemPrefab);
    //         this.notifictionListNode.addChild(notificationPrefab);
    //         notificationPrefab.getChildByName("timeLabel").getComponent(Label).string = notificationArr[index].start_at;
    //         notificationPrefab.getChildByName("decsLabel").getComponent(Label).string = notificationArr[index].content;
    //     }
    // }

    /**
     * 获取当前应该使用的配置类型
     * @returns 配置类型：'normal' 或节日名称
     */
    getCurrentConfigType(): string {
        let currentFestival = ThemeConfig.getInstance().getThemeTitle();
        if(currentFestival == "" || currentFestival == null){
            currentFestival = "normal";
        }
        return currentFestival;
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

    /**
     * 应用首页配置到UI
     */
    async applyIndexPageConfig() {
        DebugLog.instance.log("TaskAndNotificationPanel开始应用首页配置");
        const userData = PersonalCenterManager.getInstance().userInfoData;
        let config = null;
        
        // 优先从用户信息缓存中获取配置
        if (userData) {
            DebugLog.instance.log("TaskAndNotificationPanel用户数据存在，检查缓存");
            const cachedConfig = userData.getIndexPageConfigCache();
            if (cachedConfig) {
                DebugLog.instance.log("TaskAndNotificationPanel使用缓存的首页配置");
                config = cachedConfig;
            } else {
                DebugLog.instance.log("TaskAndNotificationPanel缓存中没有配置");
            }
        } else {
            DebugLog.instance.log("TaskAndNotificationPanel用户数据不存在");
        }
        
        // 如果缓存中没有配置，则重新加载
        if (!config) {
            DebugLog.instance.log("TaskAndNotificationPanel缓存中没有配置，重新加载首页配置");
            await this.indexPageConfig.loadConfig();
            let type = this.getCurrentConfigType(); // 动态获取配置类型
            
            if (type === "normal") {
                config = this.indexPageConfig.normalConfig;
            } else {
                config = ThemeConfig.getInstance().getConfig();
            }
            
            // 将配置存储到用户信息缓存中
            if (userData && config) {
                userData.setIndexPageConfigCache(config);
                DebugLog.instance.log("TaskAndNotificationPanel首页配置已缓存到用户信息中");
            }
        }
        
        if (config && config.ui) {
            DebugLog.instance.log("TaskAndNotificationPanel配置存在，开始应用UI配置");
            // 应用UI配置
            if (config.ui.bg) {
                DebugLog.instance.log("TaskAndNotificationPanel开始加载背景图片:", config.ui.bg);
                // 设置标题背景 - 统一使用远程加载
                const titleSprite = await this.loadRemoteSprite(config.ui.bg);
                
                if (this.titleBg && titleSprite) {
                    this.titleBg.getComponent(Sprite).spriteFrame = titleSprite;
                    DebugLog.instance.log("TaskAndNotificationPanel成功应用标题背景配置");
                } else {
                    DebugLog.instance.log("TaskAndNotificationPanel标题背景节点或图片不存在", this.titleBg, titleSprite);
                }
                DebugLog.instance.log("TaskAndNotificationPanel应用标题配置:", config.ui.bg);
            } else {
                DebugLog.instance.log("TaskAndNotificationPanel配置中没有背景图片");
            }
            if (config.ui.middle) {
                // 设置图标0 - 统一使用远程加载
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
                // const icon1Sprite = await this.loadRemoteSprite(config.ui.title);
                
                // if (this.titleText && icon1Sprite) {
                //     this.titleText.getComponent(Sprite).spriteFrame = icon1Sprite;
                // }
                // DebugLog.instance.log("TaskAndNotificationPanel应用图标1配置:", config.ui.title);
            }
        }
    }

    /**
     * 强制刷新首页配置
     * 清除缓存并重新加载配置
     */
    async refreshIndexPageConfig(): Promise<void> {
        const userData = PersonalCenterManager.getInstance().userInfoData;
        if (userData) {
            userData.clearIndexPageConfigCache();
            DebugLog.instance.log("TaskAndNotificationPanel已清除首页配置缓存，将重新加载");
        }
        
        // 重新应用配置
        await this.applyIndexPageConfig();
    }

    backToParent() {
        UIManager.getInstance().hidePanel(TaskAndNotificationPanelCtrl.NAME);
        EventManager.getInstance().emit(TaskAndNotificationPanelCtrl.TaskAndNotificationHide,this);
        
        // 返回首页
        this.loadIndexPage();
    }

    /**
     * 加载首页
     */
    private loadIndexPage() {
        DebugLog.instance.log("返回首页");
        try {
            // 通过事件系统触发首页加载
            EventManager.getInstance().emit('loadIndexPage');
        } catch (error) {
            DebugLog.instance.error("返回首页失败:", error);
        }
    }
}



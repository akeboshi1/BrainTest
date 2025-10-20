import { _decorator, Component, Node, Sprite, UITransform, Texture2D, assetManager, ImageAsset, SpriteFrame } from 'cc';
import { TopNavBarController } from './TopNavBarController';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { ReportManager } from '../ManagerV2/ReportManager';
import { UIManager } from '../Core/Manager/UI/UIManager';
import { VipAlert } from '../Game/UI/Vip/VipAlert';
import { IndexPageConfig } from '../indexPageV2/IndexPageConfig';
import { ThemeConfig } from '../Config/ThemeConfig';
import { DebugLog } from '../Core/Util/DebugLog';
import { GlobalConfigManager } from '../Config/GlobalConfigManager';
const { ccclass, property } = _decorator;

@ccclass('ReportPageController')
export class ReportPageController extends Component {
    @property(TopNavBarController)
    topNavBarController: TopNavBarController = null;

    @property(Node)
    private titleBg: Node = null;

    @property(Node)
    private titleIcon: Node = null;

    @property(Node)
    private titleText: Node = null;

    private callbackPromises: { [key: string]: Promise<any> } = {};
    private pageParams: any = null;

    // 首页配置相关属性
    private _configApplied: boolean = false; // 防止重复应用配置

    // 数据加载完成通知相关属性
    private _dataLoadPromise: Promise<void> = null;
    private _dataLoadResolve: Function = null;

    public initWithParams(params: any) {
        this.pageParams = params;
    }

    onEnable() {
        // 事件监听在具体的数据加载方法中处理
    }

    onDisable() {
        EventManager.getInstance().off(PersonalCenterManager.getUserInfoCallBack, this);
        EventManager.getInstance().off(ReportManager.getUserSumReportCallback, this);
    }

    async start() {
        // 创建数据加载Promise
        this._dataLoadPromise = new Promise<void>((resolve) => {
            this._dataLoadResolve = resolve;
        });

        try {
            // 并行加载用户信息和报告数据
            const [userInfoPromise, sumReportPromise] = await Promise.all([
                this.loadUserInfoData(),
                this.loadSumReportData()
            ]);

            // 应用首页配置
            await this.applyIndexPageConfig();

            // 检查用户是否是会员
            const userData = PersonalCenterManager.getInstance().userInfoData;
            if (userData && !userData.is_member) {
                // 如果不是会员，同时打开vipAlert
                UIManager.getInstance().showPanel(VipAlert.NAME, null, false, null, false);
            }
            
            if (this.pageParams) {
                EventManager.getInstance().emit('onTopNavBarClick', this.pageParams);
            } else {  
                this.topNavBarController.loadSumReport();
            }

            // 数据加载完成，通知PageController
            if (this._dataLoadResolve) {
                this._dataLoadResolve();
                this._dataLoadResolve = null;
            }
        } catch (error) {
            console.error("报告页面数据加载失败:", error);
            // 即使出错也要通知PageController显示页面
            if (this._dataLoadResolve) {
                this._dataLoadResolve();
                this._dataLoadResolve = null;
            }
        }
    }

    /**
     * 加载用户信息数据
     */
    private async loadUserInfoData(): Promise<void> {
        return new Promise<void>((resolve) => {
            // 如果用户数据已存在，直接返回
            const userData = PersonalCenterManager.getInstance().userInfoData;
            if (userData) {
                resolve();
                return;
            }

            // 监听用户信息回调
            const callback = () => {
                EventManager.getInstance().off(PersonalCenterManager.getUserInfoCallBack, callback);
                resolve();
            };
            EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, callback, this, true);
            
            // 请求用户信息
            PersonalCenterManager.getInstance().requestUserInfo();
        });
    }

    /**
     * 加载报告数据
     */
    private async loadSumReportData(): Promise<void> {
        return new Promise<void>((resolve) => {
            // 监听报告数据回调
            const callback = () => {
                EventManager.getInstance().off(ReportManager.getUserSumReportCallback, callback);
                resolve();
            };
            EventManager.getInstance().on(ReportManager.getUserSumReportCallback, callback, this, true);
            
            // 请求报告数据
            ReportManager.getInstance().getUserSumReport();
        });
    }


    update(deltaTime: number) {

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
        // 防止重复调用
        if (this._configApplied) {
            DebugLog.instance.log("ReportPage配置已经应用过，跳过重复调用");
            return;
        }

        // 使用GlobalConfigManager的公共方法
        await GlobalConfigManager.getInstance().applyIndexPageConfig(
            this.titleBg,
            this.titleIcon,
            this.titleText,
            this.loadRemoteSprite.bind(this)
        );

        // 标记配置已应用
        this._configApplied = true;
        DebugLog.instance.log("ReportPage配置应用完成");
    }

    /**
     * 强制刷新首页配置
     * 清除缓存并重新加载配置
     */
    async refreshIndexPageConfig(): Promise<void> {
        // 使用GlobalConfigManager清除缓存
        await GlobalConfigManager.getInstance().refreshIndexPageConfig();
        
        // 重置配置应用标志
        this._configApplied = false;
        
        // 重新应用配置
        await this.applyIndexPageConfig();
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


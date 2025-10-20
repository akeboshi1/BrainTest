import { _decorator, Component, Node, Label, Sprite, UITransform, Texture2D, assetManager, ImageAsset, SpriteFrame } from 'cc';
import { Global } from '../Core/Manager/Config/Global';
import { BundleName } from '../Core/Manager/Load/BundleName';
import { SceneManager } from '../Core/Manager/Scene/SceneManager';
import { EventManager } from '../Core/Manager/Event/EventManager';
import { DebugLog } from '../Core/Util/DebugLog';
import { GameCenterManager } from '../Game/GameCenter/GameCenterManager';
import { BundlePreloadEvent } from '../Core/Manager/Load/BundlePreloadManager';
import { UIManager } from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import { GuidePanel } from "db://assets/resources/scripts/Game/UI/Alert/GuidePanel";
import { PersonalCenterManager } from '../Game/PersonalCenterManager/PersonalCenterManager';
import { IndexPageConfig } from '../indexPageV2/IndexPageConfig';
import { ThemeConfig } from '../Config/ThemeConfig';
import { ChatPanel } from '../Game/UI/ChatPanel/ChatPanel';
const { ccclass, property } = _decorator;

@ccclass('GameCenterPageView')
export class GameCenterPageView extends Component {

    // ====================== 训练大厅
    public static NAME: string = "GameCenter";

    @property({ type: [Node] })
    gameList: Node[] = [];

    @property(Node)
    private titleBg: Node = null;

    @property(Node)
    private titleIcon: Node = null;

    @property(Node)
    private titleText: Node = null;

    private tmpGameNames: string[] = ["找茬", '翻牌', '拼图', '捕鱼', '猜谜', '麻将组句',"手指操"];

    // 首页配置相关属性
    private indexPageConfig: IndexPageConfig = new IndexPageConfig();

    // 数据加载完成通知相关属性
    private _dataLoadPromise: Promise<void> = null;
    private _dataLoadResolve: Function = null;

    onLoad(){
        UIManager.getInstance().registerPanel(GuidePanel.NAME, BundleName.RESOURCES, "prefab/GuidePanel/GuidePanel", GuidePanel);
        
        // 创建数据加载Promise
        this._dataLoadPromise = new Promise<void>((resolve) => {
            this._dataLoadResolve = resolve;
        });
    }

    async start() {
        await this.gameCenterInit();
    }

    async gameCenterInit() {
        let len = this.gameList.length;
        for (let i = 0; i < len; i++) {
            let gameItem = this.gameList[i];
            if (this.tmpGameNames[i] == null) {
                gameItem.active = false;
                continue;
            }
            gameItem.active = true;
        }
        this.node.active = true;

        // 等待用户信息加载完成后再应用首页配置
        await this.waitForUserInfoAndApplyConfig();

        // 数据加载完成，通知PageController
        if (this._dataLoadResolve) {
            this._dataLoadResolve();
            this._dataLoadResolve = null;
        }
    }
    private _clickBoo = false;
    gameItemClick(event, data) {
        // 防止点击两次
        if (this._clickBoo) {
            return;
        }
        this._clickBoo = true;
        let index = Number(data);
        if(index== 6){
            let url = Global.RES_Root + BundleName.FINGERGAME;
            DebugLog.instance.log(`${BundleName.FINGERGAME} click perload`);
            
            // 为手指操游戏创建GuidePanel数据
            let guidePanelData = {
                name: BundleName.FINGERGAME, 
                callback: () => {
                    DebugLog.instance.log(`${BundleName.FINGERGAME} click perload`);
                    EventManager.getInstance().on(SceneManager.SCENE_ENTER, this.onSceneEnter.bind(this), this, true);
                    GameCenterManager.getInstance().perload(url, BundleName.FINGERGAME);
                },
                exitCallback: () => {
                    this._clickBoo = false;
                }
            };
            
            // 保存GuidePanel数据到GameCenterManager，用于退出时返回到GuidePanel
            GameCenterManager.getInstance().saveGuidePanelData(guidePanelData);
            
            EventManager.getInstance().on(SceneManager.SCENE_ENTER, this.onSceneEnter.bind(this), this, true);
            GameCenterManager.getInstance().perload(url,BundleName.FINGERGAME);
            return;
        }
        // if(index== 7){
        //     let url = Global.RES_Root + BundleName.BALANCE;
        //     DebugLog.instance.log(`${BundleName.BALANCE} click perload`);
        //     EventManager.getInstance().on(SceneManager.SCENE_ENTER, this.onSceneEnter.bind(this), this, true);
        //     GameCenterManager.getInstance().perload(url,BundleName.BALANCE);
        //     return;
        // }
        // if(index== 8){
        //     let url = Global.RES_Root + BundleName.MATH24;
        //     DebugLog.instance.log(`${BundleName.MATH24} click perload`);
        //     EventManager.getInstance().on(SceneManager.SCENE_ENTER, this.onSceneEnter.bind(this), this, true);
        //     GameCenterManager.getInstance().perload(url,BundleName.MATH24);
        //     return;
        // }
        GameCenterManager.getInstance().startGame(index + 1, (data) => {
            if (data.status == 0) {
                this._clickBoo = false;
                DebugLog.instance.error(data.message);
                return;
            }
            GameCenterManager.getInstance().enterGameCenter();
            DebugLog.instance.log(data);
            let gameid = data.data.game_id;
            let sceneName = "";
            switch (gameid) {
                case 1:
                    sceneName = BundleName.FINGING;
                    break;
                case 2:
                    sceneName = BundleName.FANPAI;
                    break;
                case 3:
                    sceneName = BundleName.PUZZLE;
                    break;
                case 4:
                    sceneName = BundleName.CATCHFISH;
                    break;
                case 5:
                    sceneName = BundleName.GUESSINGGAME;
                    break;
                case 6:
                    sceneName = BundleName.SENTENCEMAKING;
                    break;
                case 7:
                    sceneName = BundleName.SMALLTHEATER;
                    break;
                case 8:
                    sceneName = BundleName.MATH24;
                    break;
            }
            let url = Global.RES_Root + sceneName;
            let self = this;
            let guidePanelData = {
                name: sceneName, callback: () => {
                    DebugLog.instance.log(`${sceneName} click perload`);
                    EventManager.getInstance().on(SceneManager.SCENE_ENTER, self.onSceneEnter.bind(self), self, true);
                    GameCenterManager.getInstance().perload(url, sceneName);
                },exitCallback:()=>{
                    self._clickBoo = false;
                }
            };
            
            // 保存GuidePanel数据到GameCenterManager，用于退出时返回到GuidePanel
            GameCenterManager.getInstance().saveGuidePanelData(guidePanelData);
            
            UIManager.getInstance().showPanel(GuidePanel.NAME, guidePanelData);

            // BundlePreloadManager.getInstance().preload(sceneName as BundleName);

        })
    }


    private onSceneEnter() {
        DebugLog.instance.log(`onSceneEnter`);
        this._clickBoo = false;
    }



    backToCenteter() {
        SceneManager.getInstance().backToHall();
    }
    onDisable(): void {
        EventManager.getInstance().off(BundlePreloadEvent.FINISH, this);
        EventManager.getInstance().off(PersonalCenterManager.getUserInfoCallBack, this);
    }

    update(deltaTime: number) {

    }

    /**
     * 等待用户信息加载完成并应用配置
     */
    async waitForUserInfoAndApplyConfig(): Promise<void> {
        return new Promise<void>((resolve) => {
            // 如果用户数据已存在，直接应用配置
            const userData = PersonalCenterManager.getInstance().userInfoData;
            if (userData) {
                this.applyIndexPageConfig().then(() => {
                    resolve();
                });
                return;
            }

            // 监听用户信息回调
            const callback = () => {
                EventManager.getInstance().off(PersonalCenterManager.getUserInfoCallBack, callback);
                this.applyIndexPageConfig().then(() => {
                    resolve();
                });
            };
            EventManager.getInstance().on(PersonalCenterManager.getUserInfoCallBack, callback, this, true);
            
            // 请求用户信息
            PersonalCenterManager.getInstance().requestUserInfo();
        });
    }

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
        DebugLog.instance.log("GameCenter开始应用首页配置");
        const userData = PersonalCenterManager.getInstance().userInfoData;
        let config = null;
        
        // 优先从用户信息缓存中获取配置
        if (userData) {
            DebugLog.instance.log("GameCenter用户数据存在，检查缓存");
            const cachedConfig = userData.getIndexPageConfigCache();
            if (cachedConfig) {
                DebugLog.instance.log("GameCenter使用缓存的首页配置");
                config = cachedConfig;
            } else {
                DebugLog.instance.log("GameCenter缓存中没有配置");
            }
        } else {
            DebugLog.instance.log("GameCenter用户数据不存在");
        }
        
        // 如果缓存中没有配置，则重新加载
        if (!config) {
            DebugLog.instance.log("GameCenter缓存中没有配置，重新加载首页配置");
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
                DebugLog.instance.log("GameCenter首页配置已缓存到用户信息中");
            }
        }
        
        if (config && config.ui) {
            DebugLog.instance.log("GameCenter配置存在，开始应用UI配置");
            // 应用UI配置
            if (config.ui.bg) {
                DebugLog.instance.log("GameCenter开始加载背景图片:", config.ui.bg);
                // 设置标题背景 - 统一使用远程加载
                const titleSprite = await this.loadRemoteSprite(config.ui.bg);
                
                if (this.titleBg && titleSprite) {
                    this.titleBg.getComponent(Sprite).spriteFrame = titleSprite;
                    DebugLog.instance.log("GameCenter成功应用标题背景配置");
                } else {
                    DebugLog.instance.log("GameCenter标题背景节点或图片不存在", this.titleBg, titleSprite);
                }
                DebugLog.instance.log("GameCenter应用标题配置:", config.ui.bg);
            } else {
                DebugLog.instance.log("GameCenter配置中没有背景图片");
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
                // DebugLog.instance.log("GameCenter应用图标1配置:", config.ui.title);
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
            DebugLog.instance.log("GameCenter已清除首页配置缓存，将重新加载");
        }
        
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

    onClickStartChatBtn(){
        UIManager.getInstance().registerPanel(ChatPanel.NAME,BundleName.RESOURCES,"prefab/ChatPanel/ChatPanel2",ChatPanel);
        UIManager.getInstance().showPanel(ChatPanel.NAME);
    }
}



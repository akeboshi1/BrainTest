import { _decorator, Component, Node, Label, Sprite, UITransform, Texture2D, assetManager, ImageAsset, SpriteFrame, view, Widget } from 'cc';
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
import { GlobalConfigManager } from '../Config/GlobalConfigManager';
import { ChatPanel } from '../Game/UI/ChatPanel/ChatPanel';
import { AdaptComponent } from "db://assets/resources/scripts/mainV2/AdaptComponent";
import { ScreenSizeUtil } from '../Adapter/ScreenSizeUtil';

const { ccclass, property } = _decorator;

@ccclass('GameCenterPageView')
export class GameCenterPageView extends Component {

    // ====================== 训练大厅
    public static NAME: string = "GameCenter";

    @property({ type: [Node] })
    gameList: Node[] = [];

    @property(Node)
    private bg: Node = null;

    @property(Node)
    private titleBg: Node = null;

    @property(Node)
    private titleIcon: Node = null;

    @property(Node)
    private titleText: Node = null;

    private tmpGameNames: string[] = ["找茬", '翻牌', '拼图', '捕鱼', '猜谜', '麻将组句', "手指操", "找一找", "24点"];


    // 数据加载完成通知相关属性
    private _dataLoadPromise: Promise<void> = null;
    private _dataLoadResolve: Function = null;

    onLoad() {
        UIManager.getInstance().registerPanel(GuidePanel.NAME, BundleName.RESOURCES, "prefab/GuidePanel/GuidePanel", GuidePanel);

        // 创建数据加载Promise
        this._dataLoadPromise = new Promise<void>((resolve) => {
            this._dataLoadResolve = resolve;
        });
    }

    async start() {
        // 适配背景尺寸到屏幕尺寸
        this.adaptBackgroundToScreen();
        await this.gameCenterInit();
    }

    /**
     * 适配背景到屏幕尺寸，使用Widget组件实现全屏拉伸
     */
    private adaptBackgroundToScreen() {
        if (!this.node) {
            DebugLog.instance.warn('GameCenterPageView: bg节点未设置');
            return;
        }

        try {
            // 获取屏幕尺寸
            const screenSize = ScreenSizeUtil.getUISize();
            const screenWidth = screenSize.width;
            const screenHeight = screenSize.height;
            this.node.getComponent(UITransform).setContentSize(screenWidth, screenHeight);

            // 获取或添加Widget组件
            let widget = this.bg.getComponent(Widget);
            if (widget) {
                // 启用Widget
                widget.enabled = true;
                widget.updateAlignment();
            }



            // 获取UITransform组件并设置尺寸
            const bgTransform = this.bg.getComponent(UITransform);
            if (bgTransform) {
                bgTransform.setContentSize(screenWidth, screenHeight);
            }

            // 设置背景位置为屏幕中心
            this.bg.setPosition(0, 0);

            DebugLog.instance.log(`GameCenterPageView: 背景全屏适配完成 - 屏幕尺寸: ${screenWidth}x${screenHeight}`);
        } catch (error) {
            DebugLog.instance.error(`GameCenterPageView: 背景适配失败: ${error}`);
        }
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

    /**
     * 独立游戏入口配置
     * key: 游戏索引
     * value: { bundleName: 包名, showGuide: 是否显示引导面板, directLoad: 是否直接加载(不保存GuidePanel数据) }
     */
    private readonly STANDALONE_GAMES: Map<number, { bundleName: string, showGuide: boolean, directLoad?: boolean }> = new Map([
        [6, { bundleName: BundleName.FINGERGAME, showGuide: false }],
        [7, { bundleName: BundleName.FINDYOURSISTER, showGuide: true }],
        [8, { bundleName: BundleName.MATH24, showGuide: false, directLoad: true }],
        [10, { bundleName: BundleName.LISTENINGMASTER, showGuide: true }],
        [11, { bundleName: BundleName.SUDU, showGuide: true }],
    ]);

    /**
     * 加载独立游戏的通用方法
     * @param bundleName 游戏包名
     * @param showGuide 是否显示引导面板
     * @param directLoad 是否直接加载（不保存GuidePanel数据）
     */
    private loadStandaloneGame(bundleName: string, showGuide: boolean, directLoad: boolean = false): void {
        const url = Global.RES_Root + bundleName;
        DebugLog.instance.log(`${bundleName} click perload`);

        if (directLoad) {
            // 直接加载，不保存GuidePanel数据
            EventManager.getInstance().on(SceneManager.SCENE_ENTER, this.onSceneEnter.bind(this), this, true);
            GameCenterManager.getInstance().clearGuidePanelData();
            GameCenterManager.getInstance().perload(url, bundleName);
            return;
        }

        // 创建GuidePanel数据
        const guidePanelData = {
            name: bundleName,
            callback: () => {
                DebugLog.instance.log(`${bundleName} click perload`);
                EventManager.getInstance().on(SceneManager.SCENE_ENTER, this.onSceneEnter.bind(this), this, true);
                GameCenterManager.getInstance().perload(url, bundleName);
            },
            exitCallback: () => {
                this._clickBoo = false;
            }
        };

        // 保存GuidePanel数据
        GameCenterManager.getInstance().saveGuidePanelData(guidePanelData);

        if (showGuide) {
            // 显示引导面板
            UIManager.getInstance().showPanel(GuidePanel.NAME, guidePanelData);
        } else {
            // 直接加载游戏
            EventManager.getInstance().on(SceneManager.SCENE_ENTER, this.onSceneEnter.bind(this), this, true);
            GameCenterManager.getInstance().perload(url, bundleName);
        }
    }

    gameItemClick(event, data) {
        // 防止点击两次
        if (this._clickBoo) {
            return;
        }
        this._clickBoo = true;
        let index = Number(data);

        // 检查是否是独立游戏入口
        const standaloneGame = this.STANDALONE_GAMES.get(index);
        if (standaloneGame) {
            this.loadStandaloneGame(
                standaloneGame.bundleName,
                standaloneGame.showGuide,
                standaloneGame.directLoad
            );
            return;
        }
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
                    sceneName = BundleName.FINDYOURSISTER;
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
                }, exitCallback: () => {
                    self._clickBoo = false;
                }
            }

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
     * 应用首页配置到UI
     */
    async applyIndexPageConfig() {
        DebugLog.instance.log("GameCenter开始应用首页配置");

        // 使用GlobalConfigManager的公共方法
        await GlobalConfigManager.getInstance().applyIndexPageConfig(
            this.titleBg,
            this.titleIcon,
            this.titleText
        );

        DebugLog.instance.log("GameCenter配置应用完成");
    }

    /**
     * 强制刷新首页配置
     * 清除缓存并重新加载配置
     */
    async refreshIndexPageConfig(): Promise<void> {
        // 使用GlobalConfigManager清除缓存
        await GlobalConfigManager.getInstance().refreshIndexPageConfig();

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

    // onClickStartChatBtn(){
    //     UIManager.getInstance().registerPanel(ChatPanel.NAME,BundleName.RESOURCES,"prefab/ChatPanel/ChatPanel2",ChatPanel);
    //     UIManager.getInstance().showPanel(ChatPanel.NAME);
    // }
}



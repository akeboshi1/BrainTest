import { _decorator, Component, v2, Node, NodeEventType, Sprite, UITransform, Texture2D, assetManager, ImageAsset, SpriteFrame } from 'cc';
import { BasePanel } from '../../resources/scripts/Core/UI/BasePanel';
import { fingerGameConfig, SectionConfig, SetIndexConfig } from '../config/fingerGameConfig';
import { SectionSelectItem } from './SectionSelectItem';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { FingerGameModel, FingerGameModelEvent } from './FingerGameModel';
import { GameType } from '../../resources/scripts/Core/Scene/SceneModel/BaseGameModel';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
import { PersonalCenterManager } from '../../resources/scripts/Game/PersonalCenterManager/PersonalCenterManager';
import { IndexPageConfig } from '../../resources/scripts/indexPageV2/IndexPageConfig';
import { ThemeConfig } from '../../resources/scripts/Config/ThemeConfig';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
import { IFingerSet } from './FingerGameProtocol';
import { IVListItemInfo, VList } from '../../resources/scripts/Core/Component/VList';
import { FingerGameSectionSelectGroupItem } from './FingerGameSectionSelectGroupItem';
import { ScreenAdapter } from '../../resources/scripts/Adapter/ScreenAdapter';
const { ccclass, property } = _decorator;

@ccclass('FingerGameSectionsSelectPanel')
export class FingerGameSectionsSelectPanel extends BasePanel {
    public static NAME = 'FingerGameSectionsSelectPanel';

    @property(VList)
    private itemContainer: VList = null;


    @property(Node)
    private titleBg: Node = null;

    @property(Node)
    private titleIcon: Node = null;

    @property(Node)
    private titleText: Node = null;

    private _isVListInited: boolean = false;

    private _model: FingerGameModel = null;
    private _sectionDatasMap: Map<number, SectionConfig[]> = new Map();

    // 首页配置相关属性
    private indexPageConfig: IndexPageConfig = new IndexPageConfig();
    private _configApplied: boolean = false; // 防止重复应用配置

    start() {
        super.start();
    }

    restore(data: { fingerSets: IFingerSet[], model: FingerGameModel }) {
        this._model = data.model;

        let setIndex = 0;
        let fingerSetIndexList = [];
        let _data;
        data.fingerSets.forEach(sets => {
            let setData = fingerGameConfig.fingerSets[setIndex];
            _data = {index:setIndex,config:setData};
            sets.activities.forEach(section => {
                // 依据 activity id 映射到配置中的对应 SectionConfig
                const secIdxById = Math.max(0, (section.id || 1) - 1);
                const sectionData = setData.sections[secIdxById];
                if (sectionData) {
                    // 将 is_evaluable 写回到配置对象，便于后续使用
                    (sectionData as any).is_evaluable = section.is_evaluable;
                }

                if (sectionData) {
                    if (!this._sectionDatasMap.has(setIndex)) {
                        this._sectionDatasMap.set(setIndex, []);
                    }
                    this._sectionDatasMap.get(setIndex).push(sectionData);
                }
            });
            fingerSetIndexList.push({index:setIndex,config:setData});
            setIndex++;
        });

        let self = this;
        if(!this._isVListInited){
            this.itemContainer.init({
                onData: (info: IVListItemInfo<SetIndexConfig>) => {
                    info.node.getComponent(FingerGameSectionSelectGroupItem).setData(info.data, self.onSelectSection.bind(self));
                }
            });
            this.node.on(NodeEventType.SIZE_CHANGED, this.updateView, this);
            this._isVListInited = true;
        }

        this.itemContainer.setData(fingerSetIndexList);

        this.itemContainer.updateItemSizes();

        this.itemContainer.setAllItemsOffset(v2(0, 230));
    }

    private updateView(){

    }

    //todo 修改成按照套平铺的结构
    createSectionItem(setIndex: number, sectionIndex: number, sectionData: SectionConfig) {
        // const item = instantiate(this.itemPrefab);
        // item.setParent(this.itemContainer);//todo 修改成按照套平铺的结构
        // item.getComponent(SectionSelectItem).setData(sectionData, setIndex, sectionIndex, this.onSelectSection.bind(this, setIndex, sectionIndex));
    }

    //选择某一界开始的入口
    onSelectSection(setIndex: number, sectionIndex: number) {
        const sectionData = this._sectionDatasMap.get(setIndex)[sectionIndex];
        this._model.emit(FingerGameModelEvent.SELECT_EXPERIENCE_SECTION, sectionData);
        UIManager.getInstance().hidePanel(FingerGameSectionsSelectPanel.NAME);
    }

    onClickBack() {
        UIManager.getInstance().hidePanel(FingerGameSectionsSelectPanel.NAME);

        let restoreData = SceneManager.getInstance().getRestoreData();
        if (restoreData && restoreData.gametype === GameType.GAME_CENTER) {
            SceneManager.getInstance().backToGameCenter();
        } else {
            SceneManager.getInstance().backToHall();
        }
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
     * 从远程URL加载图片并转换为SpriteFrame
     * @param url 远程图片URL
     * @returns Promise<SpriteFrame>
     */
    async loadRemoteSprite(url: string): Promise<SpriteFrame> {
        return new Promise((resolve, reject) => {
            this.wwwLoadSpriteFrame(url, (spriteFrame: SpriteFrame) => {
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
    public wwwLoadSpriteFrame(path: string, completeHD?: Function) {
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
            DebugLog.instance.log("FingerGameSectionsSelectPanel配置已经应用过，跳过重复调用");
            return;
        }

        DebugLog.instance.log("FingerGameSectionsSelectPanel开始应用首页配置");
        const userData = PersonalCenterManager.getInstance().userInfoData;
        let config = null;

        // 优先从用户信息缓存中获取配置
        if (userData) {
            DebugLog.instance.log("FingerGameSectionsSelectPanel用户数据存在，检查缓存");
            const cachedConfig = userData.getIndexPageConfigCache();
            if (cachedConfig) {
                DebugLog.instance.log("FingerGameSectionsSelectPanel使用缓存的首页配置");
                config = cachedConfig;
            } else {
                DebugLog.instance.log("FingerGameSectionsSelectPanel缓存中没有配置");
            }
        } else {
            DebugLog.instance.log("FingerGameSectionsSelectPanel用户数据不存在");
        }

        // 如果缓存中没有配置，则重新加载
        if (!config) {
            DebugLog.instance.log("FingerGameSectionsSelectPanel缓存中没有配置，重新加载首页配置");
            await this.indexPageConfig.loadConfig();
            let type = this.getCurrentConfigType(); // 动态获取配置类型

            // if (type === "normal") {
            //     config = this.indexPageConfig.normalConfig;
            // } else {
            config = ThemeConfig.getInstance().getConfig();
            // }

            // 将配置存储到用户信息缓存中
            if (userData && config) {
                userData.setIndexPageConfigCache(config);
                DebugLog.instance.log("FingerGameSectionsSelectPanel首页配置已缓存到用户信息中");
            }
        }

        if (config && config.ui) {
            DebugLog.instance.log("FingerGameSectionsSelectPanel配置存在，开始应用UI配置");
            // 应用UI配置
            if (config.ui.bg) {
                DebugLog.instance.log("FingerGameSectionsSelectPanel开始加载背景图片:", config.ui.bg);
                // 设置标题背景 - 统一使用远程加载
                const titleSprite = await this.loadRemoteSprite(config.ui.bg);

                if (this.titleBg && titleSprite) {
                    this.titleBg.getComponent(Sprite).spriteFrame = titleSprite;
                    DebugLog.instance.log("FingerGameSectionsSelectPanel成功应用标题背景配置");
                } else {
                    DebugLog.instance.log("FingerGameSectionsSelectPanel标题背景节点或图片不存在", this.titleBg, titleSprite);
                }
                DebugLog.instance.log("FingerGameSectionsSelectPanel应用标题配置:", config.ui.bg);
            } else {
                DebugLog.instance.log("FingerGameSectionsSelectPanel配置中没有背景图片");
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
                        currentPos.x + 40,
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
                DebugLog.instance.log("FingerGameSectionsSelectPanel应用图标1配置:", config.ui.title);
            }
        }

        // 标记配置已应用
        this._configApplied = true;
        DebugLog.instance.log("FingerGameSectionsSelectPanel配置应用完成");
    }

    /**
     * 强制刷新首页配置
     * 清除缓存并重新加载配置
     */
    async refreshIndexPageConfig(): Promise<void> {
        const userData = PersonalCenterManager.getInstance().userInfoData;
        if (userData) {
            userData.clearIndexPageConfigCache();
            DebugLog.instance.log("FingerGameSectionsSelectPanel已清除首页配置缓存，将重新加载");
        }

        // 重置配置应用标志
        this._configApplied = false;

        // 重新应用配置
        await this.applyIndexPageConfig();
    }
}



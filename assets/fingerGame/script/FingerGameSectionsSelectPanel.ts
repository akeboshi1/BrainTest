import { _decorator, Component, v2, Node, NodeEventType, Sprite, UITransform, Texture2D, assetManager, ImageAsset, SpriteFrame } from 'cc';
import { BasePanel } from '../../resources/scripts/Core/UI/BasePanel';
import { fingerGameConfig, SectionConfig, SetIndexConfig } from '../config/fingerGameConfig';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { FingerGameModel, FingerGameModelEvent } from './FingerGameModel';
import { GameType } from '../../resources/scripts/Core/Scene/SceneModel/BaseGameModel';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
import { PersonalCenterManager } from '../../resources/scripts/Game/PersonalCenterManager/PersonalCenterManager';
import { IndexPageConfig } from '../../resources/scripts/indexPageV2/IndexPageConfig';
import { ThemeConfig } from '../../resources/scripts/Config/ThemeConfig';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
import { IFingerSet } from './FingerGameProtocol';
import { VList } from '../../resources/scripts/Core/Component/VList';
import { FingerGameSectionSelectGroupItem } from './FingerGameSectionSelectGroupItem';
import { DynamicList } from "db://assets/resources/scripts/Core/Component/DynamicList";
const { ccclass, property } = _decorator;

@ccclass('FingerGameSectionsSelectPanel')
export class FingerGameSectionsSelectPanel extends BasePanel {
    public static NAME = 'FingerGameSectionsSelectPanel';

    @property(DynamicList)
    private itemContainer: DynamicList = null;


    @property(Node)
    private titleBg: Node = null;

    @property(Node)
    private titleIcon: Node = null;

    @property(Node)
    private titleText: Node = null;

    private _model: FingerGameModel = null;
    private _sectionDatasMap: Map<number, SectionConfig[]> = new Map();

    // 首页配置相关属性
    private indexPageConfig: IndexPageConfig = new IndexPageConfig();
    private _configApplied: boolean = false; // 防止重复应用配置

    // private _isVListInited: boolean = false;

    start() {
        super.start();
    }

    restore(data: { fingerSets: IFingerSet[], model: FingerGameModel }) {
        this._model = data.model;

        let setIndex = 0;
        // let fingerSetIndexList = [];
        let _data;
        const bashHei: number = 84;
        const activityHei: number = 190;
        const itemSpace: number = 30;

        let dataList = [];
        // if (data.fingerSets.length === 1) {
        //     // 仅有一套时，模拟两套：一套展示3节，一套展示2节
        //     const baseSet = fingerGameConfig.fingerSets[0];

        //     const buildSetIndexConfig = (indexNum: number, showCount: number): SetIndexConfig => {
        //         const clonedSections = baseSet.sections.map((sec, i) => {
        //             const cloned = { ...sec } as any;
        //             cloned.is_evaluable = i < showCount;
        //             return cloned;
        //         });
        //         const config = { ...baseSet, sections: clonedSections };
        //         return { index: indexNum, config } as SetIndexConfig;
        //     };

        //     const set0 = buildSetIndexConfig(0, Math.min(3, fingerGameConfig.fingerSets[0].sections.length));

        //     // 第二套：强制显示7个节，不足时用最后一个节补齐
        //     const requiredCount = 7;
        //     const actualSectionCount = baseSet.sections.length;
        //     const clonedSectionsForSet1 = [];

        //     // 先复制实际存在的节
        //     for (let i = 0; i < Math.min(requiredCount, actualSectionCount); i++) {
        //         const cloned = { ...baseSet.sections[i] } as any;
        //         cloned.is_evaluable = true;
        //         clonedSectionsForSet1.push(cloned);
        //     }

        //     // 如果不足7个，用最后一个节补齐
        //     if (actualSectionCount < requiredCount && actualSectionCount > 0) {
        //         for (let i = actualSectionCount; i < requiredCount; i++) {
        //             const lastSection = baseSet.sections[actualSectionCount - 1];
        //             const cloned = { ...lastSection } as any;
        //             cloned.is_evaluable = true;
        //             clonedSectionsForSet1.push(cloned);
        //         }
        //     }

        //     const set1 = { 
        //         index: 1, 
        //         config: { ...baseSet, sections: clonedSectionsForSet1 } 
        //     } as SetIndexConfig;

        //     const set2 = buildSetIndexConfig(2, Math.min(2, fingerGameConfig.fingerSets[0].sections.length));

        //     this._sectionDatasMap.set(0, set0.config.sections.filter((s: any) => s.is_evaluable));
        //     this._sectionDatasMap.set(1, set1.config.sections.filter((s: any) => s.is_evaluable));
        //     this._sectionDatasMap.set(2, set2.config.sections.filter((s: any) => s.is_evaluable));

        //     const height0 = Math.ceil(this._sectionDatasMap.get(0).length / 2) * (activityHei + itemSpace)+84;
        //     const height1 = Math.ceil(this._sectionDatasMap.get(1).length / 2) * (activityHei + itemSpace)+84;
        //     const height2 = Math.ceil(this._sectionDatasMap.get(2).length / 2) * (activityHei + itemSpace)+84;

        //     dataList.push({ data: set0, height: height0 });
        //     dataList.push({ data: set1, height: height1 });
        //     dataList.push({ data: set2, height: height2 });
        // } else {
        // 多套按原逻辑处理
        data.fingerSets.forEach(sets => {
            let setData = fingerGameConfig.fingerSets[setIndex];
            _data = { index: setIndex, config: setData };
            sets.activities.forEach(section => {
                // 依据 activity id 映射到配置中的对应 SectionConfig
                const secIdxById = Math.max(0, (section.seq || 1) - 1);
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
            // 使用和模拟数据一样的算法：按行数计算（每行2个）
            const evaluableCount = this._sectionDatasMap.get(setIndex).filter((s: any) => s.is_evaluable).length;
            const totalHei = Math.ceil(evaluableCount / 2) * (activityHei + itemSpace) + bashHei;
            dataList.push({ data: { index: setIndex, config: setData }, height: totalHei });
            setIndex++;
        });
        // }
        let self = this;
        this.itemContainer.setData({
            dataList,
            itemRenderer: (node, data: any) => {
                let item = node.getComponent(FingerGameSectionSelectGroupItem);
                // data: { data: SetIndexConfig, height: number }
                item.setData(data.config, data.index, self.onSelectSection.bind(self));
            },
            onInstantiate: (node) => node.getComponentInChildren(VList<SetIndexConfig>).init({
                onData(info) {
                    // 占位：如需子列表嵌套可在此实现
                }
            })
        });
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



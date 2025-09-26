import { _decorator, Component, instantiate, Node, Prefab, Sprite, UITransform, Texture2D, assetManager, ImageAsset, SpriteFrame } from 'cc';
import { BasePanel } from '../../resources/scripts/Core/UI/BasePanel';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { SectionConfig } from '../config/fingerGameConfig';
import { SectionItem } from './SectionItem';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
import { GameType } from '../../resources/scripts/Core/Scene/SceneModel/BaseGameModel';
import { PersonalCenterManager } from '../../resources/scripts/Game/PersonalCenterManager/PersonalCenterManager';
import { IndexPageConfig } from '../../resources/scripts/indexPageV2/IndexPageConfig';
import { ThemeConfig } from '../../resources/scripts/Config/ThemeConfig';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
import { FingerGameModel, FingerGameModelEvent } from './FingerGameModel';
const { ccclass, property } = _decorator;

@ccclass('FingerGameSectionsPanel')
export class FingerGameSectionsPanel extends BasePanel {

    public static NAME = 'FingerGameSectionsPanel';

    @property(Node)
    private itemContainer: Node = null;

    @property(Prefab)
    private itemPrefab: Prefab = null;

    @property(Node)
    private titleBg: Node = null;

    @property(Node)
    private titleIcon: Node = null;

    @property(Node)
    private titleText: Node = null;

    private _model: FingerGameModel = null;

    // 首页配置相关属性
    private indexPageConfig: IndexPageConfig = new IndexPageConfig();
    private _configApplied: boolean = false; // 防止重复应用配置

    start() {

    }


    restore(data: { sectionDatas: SectionConfig[], model: FingerGameModel }) {
        this._model = data.model;
        for (let i = 0; i < data.sectionDatas.length; i++) {
            const item = instantiate(this.itemPrefab);
            item.setParent(this.itemContainer);
            item.getComponent(SectionItem).setData(data.sectionDatas[i]);
        }
        
        // 应用首页配置
        // this.applyIndexPageConfig();
    }



    onClickGoNext() {
        this._model.emit(FingerGameModelEvent.SKEWERSGAME_NEXT);
        UIManager.getInstance().hidePanel(FingerGameSectionsPanel.NAME);
    }

    onClickBack() {
        UIManager.getInstance().hidePanel(FingerGameSectionsPanel.NAME);

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
        // 防止重复调用
        if (this._configApplied) {
            DebugLog.instance.log("FingerGameSectionsPanel配置已经应用过，跳过重复调用");
            return;
        }
        
        DebugLog.instance.log("FingerGameSectionsPanel开始应用首页配置");
        const userData = PersonalCenterManager.getInstance().userInfoData;
        let config = null;
        
        // 优先从用户信息缓存中获取配置
        if (userData) {
            DebugLog.instance.log("FingerGameSectionsPanel用户数据存在，检查缓存");
            const cachedConfig = userData.getIndexPageConfigCache();
            if (cachedConfig) {
                DebugLog.instance.log("FingerGameSectionsPanel使用缓存的首页配置");
                config = cachedConfig;
            } else {
                DebugLog.instance.log("FingerGameSectionsPanel缓存中没有配置");
            }
        } else {
            DebugLog.instance.log("FingerGameSectionsPanel用户数据不存在");
        }
        
        // 如果缓存中没有配置，则重新加载
        if (!config) {
            DebugLog.instance.log("FingerGameSectionsPanel缓存中没有配置，重新加载首页配置");
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
                DebugLog.instance.log("FingerGameSectionsPanel首页配置已缓存到用户信息中");
            }
        }
        
        if (config && config.ui) {
            DebugLog.instance.log("FingerGameSectionsPanel配置存在，开始应用UI配置");
            // 应用UI配置
            if (config.ui.bg) {
                DebugLog.instance.log("FingerGameSectionsPanel开始加载背景图片:", config.ui.bg);
                // 设置标题背景 - 统一使用远程加载
                const titleSprite = await this.loadRemoteSprite(config.ui.bg);
                
                if (this.titleBg && titleSprite) {
                    this.titleBg.getComponent(Sprite).spriteFrame = titleSprite;
                    DebugLog.instance.log("FingerGameSectionsPanel成功应用标题背景配置");
                } else {
                    DebugLog.instance.log("FingerGameSectionsPanel标题背景节点或图片不存在", this.titleBg, titleSprite);
                }
                DebugLog.instance.log("FingerGameSectionsPanel应用标题配置:", config.ui.bg);
            } else {
                DebugLog.instance.log("FingerGameSectionsPanel配置中没有背景图片");
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
                const icon1Sprite = await this.loadRemoteSprite(config.ui.title);
                
                if (this.titleText && icon1Sprite) {
                    this.titleText.getComponent(Sprite).spriteFrame = icon1Sprite;
                }
                DebugLog.instance.log("FingerGameSectionsPanel应用图标1配置:", config.ui.title);
            }
        }
        
        // 标记配置已应用
        this._configApplied = true;
        DebugLog.instance.log("FingerGameSectionsPanel配置应用完成");
    }

    /**
     * 强制刷新首页配置
     * 清除缓存并重新加载配置
     */
    async refreshIndexPageConfig(): Promise<void> {
        const userData = PersonalCenterManager.getInstance().userInfoData;
        if (userData) {
            userData.clearIndexPageConfigCache();
            DebugLog.instance.log("FingerGameSectionsPanel已清除首页配置缓存，将重新加载");
        }
        
        // 重置配置应用标志
        this._configApplied = false;
        
        // 重新应用配置
        await this.applyIndexPageConfig();
    }
}



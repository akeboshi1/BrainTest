import { _decorator, Color, Component, instantiate, Label, Node, Prefab, ProgressBar, Sprite, tween, macro, UITransform, Texture2D, assetManager, ImageAsset, SpriteFrame } from 'cc';
import { BasePanel } from '../../resources/scripts/Core/UI/BasePanel';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
import { DataProvider } from '../../resources/scripts/Core/Data/DataProvider';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { IFingerActivityResult } from './FingerGameProtocol';
import { FingerGameCompleteDetail } from './FingerGameCompleteDetail';
import { PersonalCenterManager } from '../../resources/scripts/Game/PersonalCenterManager/PersonalCenterManager';
import { IndexPageConfig } from '../../resources/scripts/indexPageV2/IndexPageConfig';
import { ThemeConfig } from '../../resources/scripts/Config/ThemeConfig';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
const { ccclass, property } = _decorator;

export interface IFingerGameCompletePanelData {
    showStatue: Boolean;
    goonHandler: () => void;
    data: IFingerActivityResult | null;
}

@ccclass('FingerGameCompletePanel')
export class FingerGameCompletePanel extends BasePanel {
    public static NAME = 'FingerGameCompletePanel';

    @property(Prefab)
    private detailPrefab: Prefab = null;

    @property(Node)
    private detailContainer: Node = null;

    @property(Label)
    private totalLeftScoreLabel: Label = null;
    @property(Label)
    private totalRightScoreLabel: Label = null;

    @property(Sprite)
    private totalLeftScoreIcon: Sprite = null;
    @property(Sprite)
    private totalRightScoreIcon: Sprite = null;

    @property(ProgressBar)
    private progressBar: ProgressBar = null;

    @property(Node)
    private progressNode: Node = null;

    @property(Label)
    private progressLabel: Label = null;

    @property(Node)
    private totalResultNode: Node = null;

    @property(Node)
    private finishButton: Node = null;

    @property(Node)
    private titleBg: Node = null;

    @property(Node)
    private titleIcon: Node = null;

    @property(Node)
    private titleText: Node = null;

    private _data: DataProvider<IFingerGameCompletePanelData> = null;

    private _goonHandler: () => void = null;

    private _scoreColor: Color[] = [
        new Color(95, 177, 92, 255),   // 绿色 - 优 5FB15C
        new Color(0, 143, 255, 255),   // 蓝色 - 良 008FFF
        new Color(243, 170, 60, 255),  // 浅黄色 - 中 F3AA3C
        new Color(215, 111, 255, 255)  // 浅粉色 - 继续努力 D76FFF
    ];

    private _fakeProgressStages = [
        { text: "派派正在加紧给你评分中", percent: 0.10, duration: 2 }, // 0-2秒
        { text: "派派正在加紧给你评分中", percent: 0.40, duration: 2 }, // 2-4秒
        { text: "派派正在加紧给你评分中", percent: 0.70, duration: 2 }, // 4-6秒
        { text: "派派正在加紧给你评分中", percent: 0.90, duration: 3 }, // 6-9秒
        { text: "派派正在加紧给你评分中", percent: 0.98, duration: 1 }  // 9-10秒
    ];

    private _fakeProgressIndex = 0;

    private _dotCountForAnim: number = 1;
    private _dotAnimStarted: boolean = false;
    private _dotAnimStageText: string = "";

    // 首页配置相关属性
    private indexPageConfig: IndexPageConfig = new IndexPageConfig();
    private _configApplied: boolean = false; // 防止重复应用配置

    start() {

    }

    restore(data: DataProvider<IFingerGameCompletePanelData>): void {
        this.totalResultNode.active = false;
        this.finishButton.active = false;
        this._data = data;
        data.addListener(this.onDataChange.bind(this));
        
        // 应用首页配置
        this.applyIndexPageConfig();
    }

    private onDataChange(data: IFingerGameCompletePanelData) {
        this._goonHandler = data.goonHandler;
        if (!data.showStatue) {
            this.startWaittingAnim();
            this.finishButton.active = false;
            return;
        }

        this.finishButton.active = true;
        this.stopFakeProgressAnim();
        this.totalLeftScoreLabel.string = this._getScoreString(data.data.left_overall_score);
        this.totalRightScoreLabel.string = this._getScoreString(data.data.right_overall_score);
        this.totalLeftScoreIcon.color = this._getScoreColor(data.data.left_overall_score);
        this.totalRightScoreIcon.color = this._getScoreColor(data.data.right_overall_score);

        this.totalLeftScoreIcon.node.getComponent(UITransform).width = this.totalLeftScoreLabel.string.length > 1 ? 180 : 80;
        this.totalRightScoreIcon.node.getComponent(UITransform).width = this.totalRightScoreLabel.string.length > 1 ? 180 : 80;

        this.progressNode.active = false;
        this.totalResultNode.active = true;
        // 根据 activities 数量创建 detailPrefab，并添加到 detailContainer
        this.detailContainer.removeAllChildren();
        if (data.data && Array.isArray(data.data.activities)) {
            for (let i = 0; i < data.data.activities.length; i++) {
                const activity = data.data.activities[i];
                if (!activity.is_evaluable) continue;
                // 实例化 detailPrefab
                const detailNode = instantiate(this.detailPrefab);
                // 可根据需要将 activity 数据传递给 detailNode 的组件
                if (detailNode.getComponent(FingerGameCompleteDetail)) {
                    detailNode.getComponent(FingerGameCompleteDetail).restore({
                        name: activity.name,
                        left_score: activity.left_score,
                        right_score: activity.right_score,
                        left_color: this._getScoreColor(activity.left_score),
                        right_color: this._getScoreColor(activity.right_score)
                    });
                }
                this.detailContainer.addChild(detailNode);
            }
        }

    }


    onDisable() {
        this.unscheduleAllCallbacks();
        this._dotAnimStarted = false;
        if (this._data) {
            this._data.removeAllListeners();
            this._data = null;
        }
    }

    private startWaittingAnim() {
        this._fakeProgressIndex = 0;
        this.progressNode.active = true;
        this.progressBar.progress = 0;
        this.unscheduleAllCallbacks();
        this._dotAnimStarted = false;
        this._startDotAnimation(this._fakeProgressStages[0].text);
        this._runFakeProgressStage();
    }

    private _runFakeProgressStage() {
        if (this._fakeProgressIndex >= this._fakeProgressStages.length) return;
        const stage = this._fakeProgressStages[this._fakeProgressIndex];
        const startPercent = this.progressBar.progress;
        const endPercent = stage.percent;
        const duration = stage.duration;
        // 切换文本
        this._dotAnimStageText = stage.text;

        tween(this.progressBar)
            .to(duration, { progress: endPercent }, {
                easing: 'quartOut',
                onUpdate: (target, ratio) => {
                    const currentPercent = startPercent + (endPercent - startPercent) * ratio;
                    this._updateWaittingLabel(this._dotAnimStageText, currentPercent, this._dotCountForAnim);
                }
            })
            .call(() => {
                this.progressBar.progress = endPercent;
                this._updateWaittingLabel(this._dotAnimStageText, endPercent, this._dotCountForAnim);
                this._fakeProgressIndex++;
                this._runFakeProgressStage();
            })
            .start();
    }

    private _startDotAnimation(stageText: string) {
        this._dotAnimStageText = stageText;
        if (!this._dotAnimStarted) {
            this._dotAnimStarted = true;
            this._dotCountForAnim = 1;
            this.schedule(() => {
                this._dotCountForAnim = (this._dotCountForAnim % 3) + 1;
                const currentPercent = this.progressBar.progress;
                this._updateWaittingLabel(this._dotAnimStageText, currentPercent, this._dotCountForAnim);
            }, 0.5, macro.REPEAT_FOREVER);
        }
    }

    private _updateWaittingLabel(text: string, percent: number, dotCount: number) {
        const dots = '.'.repeat(dotCount);
        const percentNum = Math.floor(percent * 100);
        this.progressLabel.string = `${text}${dots}  ${percentNum}%`;
    }

    public stopFakeProgressAnim() {
        // 停止进度条tween
        tween(this.progressBar).stop();
        // 停止...动画schedule
        this.unscheduleAllCallbacks();
        this._dotAnimStarted = false;
    }

    /**
     * 根据分数获取对应的颜色
     * @param score 分数
     * @returns 对应的颜色
     */
    private _getScoreColor(score: number): Color {
        if (score >= 85) {
            return this._scoreColor[0]; // 绿色 - 优
        } else if (score >= 75) {
            return this._scoreColor[1]; // 蓝色 - 良
        } else if (score >= 60) {
            return this._scoreColor[2]; // 浅黄色 - 中
        } else {
            return this._scoreColor[3]; // 浅粉色 - 继续努力
        }
    }

    private _getScoreString(score: number): string {
        if (score >= 85) {
            return '优';
        } else if (score >= 75) {
            return '良';
        } else if (score >= 60) {
            return '中';
        } else {
            return '继续努力';
        }
    }

    onClickFinish() {
        UIManager.getInstance().hidePanel(FingerGameCompletePanel.NAME);
        if (this._goonHandler) {
            this._goonHandler();
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
            DebugLog.instance.log("FingerGameCompletePanel配置已经应用过，跳过重复调用");
            return;
        }
        
        DebugLog.instance.log("FingerGameCompletePanel开始应用首页配置");
        const userData = PersonalCenterManager.getInstance().userInfoData;
        let config = null;
        
        // 优先从用户信息缓存中获取配置
        if (userData) {
            DebugLog.instance.log("FingerGameCompletePanel用户数据存在，检查缓存");
            const cachedConfig = userData.getIndexPageConfigCache();
            if (cachedConfig) {
                DebugLog.instance.log("FingerGameCompletePanel使用缓存的首页配置");
                config = cachedConfig;
            } else {
                DebugLog.instance.log("FingerGameCompletePanel缓存中没有配置");
            }
        } else {
            DebugLog.instance.log("FingerGameCompletePanel用户数据不存在");
        }
        
        // 如果缓存中没有配置，则重新加载
        if (!config) {
            DebugLog.instance.log("FingerGameCompletePanel缓存中没有配置，重新加载首页配置");
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
                DebugLog.instance.log("FingerGameCompletePanel首页配置已缓存到用户信息中");
            }
        }
        
        if (config && config.ui) {
            DebugLog.instance.log("FingerGameCompletePanel配置存在，开始应用UI配置");
            // 应用UI配置
            if (config.ui.bg) {
                DebugLog.instance.log("FingerGameCompletePanel开始加载背景图片:", config.ui.bg);
                // 设置标题背景 - 统一使用远程加载
                const titleSprite = await this.loadRemoteSprite(config.ui.bg);
                
                if (this.titleBg && titleSprite) {
                    this.titleBg.getComponent(Sprite).spriteFrame = titleSprite;
                    DebugLog.instance.log("FingerGameCompletePanel成功应用标题背景配置");
                } else {
                    DebugLog.instance.log("FingerGameCompletePanel标题背景节点或图片不存在", this.titleBg, titleSprite);
                }
                DebugLog.instance.log("FingerGameCompletePanel应用标题配置:", config.ui.bg);
            } else {
                DebugLog.instance.log("FingerGameCompletePanel配置中没有背景图片");
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
                // DebugLog.instance.log("FingerGameCompletePanel应用图标1配置:", config.ui.title);
            }
        }
        
        // 标记配置已应用
        this._configApplied = true;
        DebugLog.instance.log("FingerGameCompletePanel配置应用完成");
    }

    /**
     * 强制刷新首页配置
     * 清除缓存并重新加载配置
     */
    async refreshIndexPageConfig(): Promise<void> {
        const userData = PersonalCenterManager.getInstance().userInfoData;
        if (userData) {
            userData.clearIndexPageConfigCache();
            DebugLog.instance.log("FingerGameCompletePanel已清除首页配置缓存，将重新加载");
        }
        
        // 重置配置应用标志
        this._configApplied = false;
        
        // 重新应用配置
        await this.applyIndexPageConfig();
    }
}



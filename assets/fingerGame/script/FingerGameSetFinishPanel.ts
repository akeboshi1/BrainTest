import { _decorator, Component, Node, Label, Sprite, assetManager, SpriteFrame, Button, ProgressBar, tween, macro, UITransform, Texture2D, ImageAsset } from 'cc';
import { BasePanel } from '../../resources/scripts/Core/UI/BasePanel';
import { FingerGameResult } from './FingerGameResultData';
import { SetSummaryComponent } from './SetSummaryComponent';
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { DataProvider } from '../../resources/scripts/Core/Data/DataProvider';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
import { PersonalCenterManager } from '../../resources/scripts/Game/PersonalCenterManager/PersonalCenterManager';
import { IndexPageConfig } from '../../resources/scripts/indexPageV2/IndexPageConfig';
import { ThemeConfig } from '../../resources/scripts/Config/ThemeConfig';
const { ccclass, property } = _decorator;

export interface IFingerGameSetFinishPanelData {
    showResult: boolean;
    result: FingerGameResult | null;
    nextSectionName: string | null;
    nextSectionIconUrl: string | null;
    back: () => void;
    goNext: () => void;
    reStart: () => void;
}

@ccclass('FingerGameSetFinishPanel')
export class FingerGameSetFinishPanel extends BasePanel {
    public static NAME = 'FingerGameSetFinishPanel';

    @property(SetSummaryComponent)
    private setSummaryComponent: SetSummaryComponent = null;

    @property(Label)
    private nextSectionName: Label = null;

    @property(Sprite)
    private nextSectionIcon: Sprite = null;

    @property(Node)
    private nextSectionNode: Node = null;

    @property(Node)
    private finishNode: Node = null;

    @property(Label)
    private waittingLabel: Label = null;

    @property(Node)
    private waittingNode: Node = null;

    @property(Label)
    private nextBtnLabel: Label = null;

    @property(Button)
    private nextBtn: Button = null;

    @property(ProgressBar)
    private progressBar: ProgressBar = null;

    //新增确认等待评分节点
    @property(Node)
    private confirmWaitScoreNode: Node = null;

    @property(Label)
    private confirmWaitScoreLabel: Label = null;

    @property(Node)
    private progressNode: Node = null;

    @property(Node)
    private titleBg: Node = null;

    @property(Node)
    private titleIcon: Node = null;

    @property(Node)
    private titleText: Node = null;


    private _finishPanelData: DataProvider<IFingerGameSetFinishPanelData> = null;

    private _backHandler: () => void = null;
    private _nextHandler: () => void = null;
    private _reStartHandler: () => void = null;

    private _showScoreFlag: boolean = false;
    private _scoreDataCache: FingerGameResult = null;

    private _fakeProgressStages = [
        { text: "上传手指操视频中", percent: 0.10, duration: 2 }, // 0-2秒
        { text: "获取评分模型中", percent: 0.40, duration: 2 }, // 2-4秒
        { text: "获取评分模型中", percent: 0.70, duration: 2 }, // 4-6秒
        { text: "分析手型中", percent: 0.90, duration: 3 },       // 6-9秒
        { text: "总体评分中", percent: 0.98, duration: 1 }         // 9-10秒
    ];
    private _fakeProgressIndex = 0;

    private _clickedBool: boolean = false;

    // 首页配置相关属性
    private indexPageConfig: IndexPageConfig = new IndexPageConfig();
    private _configApplied: boolean = false; // 防止重复应用配置

    start() {

    }

    restore(data: DataProvider<IFingerGameSetFinishPanelData> | null) {
        this._finishPanelData = data;
        this.setSummaryComponent.node.active = false;
        this.finishNode.active = false;
        this.startGoonTimer();
        this.waittingNode.active = false;

        if (data) {
            DebugLog.instance.log('Binding DataProvider FingerGameSetFinishPanel =============');
            data.addListener(this.onDataChange.bind(this));
        } else {
            this.setSummaryComponent.node.active = false;
            this.finishNode.active = true;
        }
        
        // 应用首页配置
        this.applyIndexPageConfig();
    }

    private onDataChange(data: IFingerGameSetFinishPanelData) {
        DebugLog.instance.log('onDataChange FingerGameSetFinishPanel ============');
        if (data.showResult) {
            this.waittingNode.active = false;
            this.stopFakeProgressAnim();
            if (data.result) {
                this._scoreDataCache = data.result;
                if (this._showScoreFlag) {
                    this.setSummaryComponent.restoreComponent(this._scoreDataCache);
                    this.setSummaryComponent.node.active = true;
                    this.finishNode.active = false;
                }
            } else {
                this.setSummaryComponent.node.active = false;
                this.finishNode.active = true;
            }
        }

        if (data.nextSectionName) {
            this.nextSectionNode.active = true;
            this.nextSectionName.string = "下一节：" + data.nextSectionName;
            if (data.nextSectionIconUrl) {
                let bundle = assetManager.getBundle(BundleName.FINGERGAME);
                bundle.load(data.nextSectionIconUrl, SpriteFrame, (err, spriteFrame) => {
                    if (err) {
                        console.error('加载图标失败', err);
                    } else {
                        this.nextSectionIcon.spriteFrame = spriteFrame as SpriteFrame;
                    }
                });
            }

            this.setSummaryComponent.setClickShowScoreHandler(this.onShowScoreHandler.bind(this));
        } else {
            this.nextSectionNode.active = false;
            this.nextBtnLabel.string = "继续";
        }

        if (data.back) {
            this._backHandler = data.back;
        }

        if (data.goNext) {
            this._nextHandler = data.goNext;
        }

        if (data.reStart) {
            this._reStartHandler = data.reStart;
        }
    }

    private onShowScoreHandler() {
        this.unscheduleAllCallbacks();
        this.nextBtnLabel.string = "下一节";
    }

    private startWaittingAnim() {
        this._fakeProgressIndex = 0;
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

    private _dotCountForAnim: number = 1;
    private _dotAnimStarted: boolean = false;
    private _dotAnimStageText: string = "";
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
        this.waittingLabel.string = `${text}${dots}  ${percentNum}%`;
    }

    private startGoonTimer() {
        let count = 6;
        this.nextBtnLabel.string = `下一节（${count}）`;

        this.schedule(() => {
            count--;
            this.nextBtnLabel.string = `下一节（${count}）`;
            if (count <= 0) {
                this.onClickNext();
            }
        }, 1);
    }

    public stopFakeProgressAnim() {
        // 停止进度条tween
        tween(this.progressBar).stop();
        // 停止...动画schedule
        this.unscheduleAllCallbacks();
        this._dotAnimStarted = false;
    }

    public onClickBack() {
        if (this._clickedBool) {
            return;
        }
        this._clickedBool = true;
        this.unscheduleAllCallbacks();
        UIManager.getInstance().hidePanel(FingerGameSetFinishPanel.NAME);
        if (this._backHandler) {
            this._backHandler();
        }
    }

    public onClickNext() {
        if (this._clickedBool) {
            return;
        }
        this._clickedBool = true;
        this.unscheduleAllCallbacks();
        UIManager.getInstance().hidePanel(FingerGameSetFinishPanel.NAME);
        if (this._nextHandler) {
            this._nextHandler();
        }
    }

    public onClickReStart() {
        if (this._clickedBool) {
            return;
        }
        this._clickedBool = true;
        this.unscheduleAllCallbacks();
        UIManager.getInstance().hidePanel(FingerGameSetFinishPanel.NAME);
        if (this._reStartHandler) {
            this._reStartHandler();
        }
    }

    public onClickConfirmWaitScore() {
        if (this._scoreDataCache) {
            this.setSummaryComponent.restoreComponent(this._scoreDataCache);
            this.setSummaryComponent.node.active = true;
            this.finishNode.active = false;
            return;
        }

        this.confirmWaitScoreNode.active = false;
        this.progressNode.active = true;
        this.unscheduleAllCallbacks();
        this.startWaittingAnim();
        this._showScoreFlag = true;
    }

    onDestroy() {
        this.unscheduleAllCallbacks();
        this._dotAnimStarted = false;
        if (this._finishPanelData) {
            this._finishPanelData.removeAllListeners();
            this._finishPanelData = null;
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
            DebugLog.instance.log("FingerGameSetFinishPanel配置已经应用过，跳过重复调用");
            return;
        }
        
        DebugLog.instance.log("FingerGameSetFinishPanel开始应用首页配置");
        const userData = PersonalCenterManager.getInstance().userInfoData;
        let config = null;
        
        // 优先从用户信息缓存中获取配置
        if (userData) {
            DebugLog.instance.log("FingerGameSetFinishPanel用户数据存在，检查缓存");
            const cachedConfig = userData.getIndexPageConfigCache();
            if (cachedConfig) {
                DebugLog.instance.log("FingerGameSetFinishPanel使用缓存的首页配置");
                config = cachedConfig;
            } else {
                DebugLog.instance.log("FingerGameSetFinishPanel缓存中没有配置");
            }
        } else {
            DebugLog.instance.log("FingerGameSetFinishPanel用户数据不存在");
        }
        
        // 如果缓存中没有配置，则重新加载
        if (!config) {
            DebugLog.instance.log("FingerGameSetFinishPanel缓存中没有配置，重新加载首页配置");
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
                DebugLog.instance.log("FingerGameSetFinishPanel首页配置已缓存到用户信息中");
            }
        }
        
        if (config && config.ui) {
            DebugLog.instance.log("FingerGameSetFinishPanel配置存在，开始应用UI配置");
            // 应用UI配置
            if (config.ui.bg) {
                DebugLog.instance.log("FingerGameSetFinishPanel开始加载背景图片:", config.ui.bg);
                // 设置标题背景 - 统一使用远程加载
                const titleSprite = await this.loadRemoteSprite(config.ui.bg);
                
                if (this.titleBg && titleSprite) {
                    this.titleBg.getComponent(Sprite).spriteFrame = titleSprite;
                    DebugLog.instance.log("FingerGameSetFinishPanel成功应用标题背景配置");
                } else {
                    DebugLog.instance.log("FingerGameSetFinishPanel标题背景节点或图片不存在", this.titleBg, titleSprite);
                }
                DebugLog.instance.log("FingerGameSetFinishPanel应用标题配置:", config.ui.bg);
            } else {
                DebugLog.instance.log("FingerGameSetFinishPanel配置中没有背景图片");
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
                // DebugLog.instance.log("FingerGameSetFinishPanel应用图标1配置:", config.ui.title);
            }
        }
        
        // 标记配置已应用
        this._configApplied = true;
        DebugLog.instance.log("FingerGameSetFinishPanel配置应用完成");
    }

    /**
     * 强制刷新首页配置
     * 清除缓存并重新加载配置
     */
    async refreshIndexPageConfig(): Promise<void> {
        const userData = PersonalCenterManager.getInstance().userInfoData;
        if (userData) {
            userData.clearIndexPageConfigCache();
            DebugLog.instance.log("FingerGameSetFinishPanel已清除首页配置缓存，将重新加载");
        }
        
        // 重置配置应用标志
        this._configApplied = false;
        
        // 重新应用配置
        await this.applyIndexPageConfig();
    }
}



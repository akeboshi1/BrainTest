import { _decorator, Color, Component, instantiate, Label, Node, Prefab, ProgressBar, Sprite, tween, macro, UITransform } from 'cc';
import { BasePanel } from '../../resources/scripts/Core/UI/BasePanel';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
import { DataProvider } from '../../resources/scripts/Core/Data/DataProvider';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { IFingerActivityResult } from './FingerGameProtocol';
import { FingerGameCompleteDetail } from './FingerGameCompleteDetail';
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

    start() {

    }

    restore(data: DataProvider<IFingerGameCompletePanelData>): void {
        this.totalResultNode.active = false;
        this.finishButton.active = false;
        this._data = data;
        data.addListener(this.onDataChange.bind(this));
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
}



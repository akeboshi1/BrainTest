import { _decorator, Component, Node, Label, Sprite, assetManager, SpriteFrame, Button, ProgressBar, tween, macro } from 'cc';
import { BasePanel } from '../../resources/scripts/Core/UI/BasePanel';
import { FingerGameResult } from './FingerGameResultData';
import { SetSummaryComponent } from './SetSummaryComponent';
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { DataProvider } from '../../resources/scripts/Core/Data/DataProvider';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
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

    @property(Node)
    private nextBtnMaskNode: Node = null;

    @property(Button)
    private nextBtn: Button = null;

    @property(ProgressBar)
    private progressBar: ProgressBar = null;

    private _finishPanelData: DataProvider<IFingerGameSetFinishPanelData> = null;

    private _backHandler: () => void = null;
    private _nextHandler: () => void = null;
    private _reStartHandler: () => void = null;

    private _fakeProgressStages = [
        { text: "上传手指操视频中", percent: 0.10, duration: 2 }, // 0-2秒
        { text: "获取评分模型中", percent: 0.40, duration: 2 }, // 2-4秒
        { text: "获取评分模型中", percent: 0.70, duration: 2 }, // 4-6秒
        { text: "分析手型中", percent: 0.90, duration: 3 },       // 6-9秒
        { text: "总体评分中", percent: 0.98, duration: 1 }         // 9-10秒
    ];
    private _fakeProgressIndex = 0;

    private _clickedBool: boolean = false;

    start() {

    }

    restore(data: DataProvider<IFingerGameSetFinishPanelData> | null) {
        this._finishPanelData = data;
        this.nextSectionNode.active = false;
        this.setSummaryComponent.node.active = false;
        this.finishNode.active = false;
        this.startWaittingAnim();
        this.nextBtnMaskNode.active = true;
        this.nextBtn.interactable = false;

        if (data) {
            DebugLog.instance.log('Binding DataProvider FingerGameSetFinishPanel =============');
            data.addListener(this.onDataChange.bind(this));
        } else {
            this.waittingNode.active = false;
            this.setSummaryComponent.node.active = false;
            this.finishNode.active = true;
        }
    }

    private onDataChange(data: IFingerGameSetFinishPanelData) {
        DebugLog.instance.log('onDataChange FingerGameSetFinishPanel ============');
        if (data.showResult) {
            this.waittingNode.active = false;
            this.stopFakeProgressAnim();
            this.setTouchableDelay();
            if (data.result) {
                this.setSummaryComponent.restoreComponent(data.result);
                this.setSummaryComponent.node.active = true;
                this.finishNode.active = false;
            } else {
                this.setSummaryComponent.node.active = false;
                this.finishNode.active = true;
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
                this.startGoonTimer();

                this.setSummaryComponent.setClickShowScoreHandler(this.onShowScoreHandler.bind(this));
            } else {
                this.nextSectionNode.active = false;
                this.nextBtnLabel.string = "继续";
            }
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

    private setTouchableDelay() {
        this.scheduleOnce(() => {
            this.nextBtnMaskNode.active = false;
            this.nextBtn.interactable = true;
        }, 0.5);
    }

    private onShowScoreHandler() {
        this.unscheduleAllCallbacks();
        this.nextBtnLabel.string = "下一节";
    }

    private startWaittingAnim() {
        this.waittingNode.active = true;
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
        let count = 15;
        this.nextBtnLabel.string = `下一节(${count})`;

        this.schedule(() => {
            count--;
            this.nextBtnLabel.string = `下一节(${count})`;
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

    onDestroy() {
        this.unscheduleAllCallbacks();
        this._dotAnimStarted = false;
        if (this._finishPanelData) {
            this._finishPanelData.removeAllListeners();
            this._finishPanelData = null;
        }
    }
}



import { _decorator, Label, ProgressBar, tween, UITransform, Vec3 } from 'cc';
import { BasePanel, PanelState } from '../../../Core/UI/BasePanel';
import { LayerUtil } from '../../../Core/Util/LayerUtil';
import { UIManager } from '../../../Core/Manager/UI/UIManager';
const { ccclass, property } = _decorator;

@ccclass('BrainTrainTipPanel')
export class BrainTrainTipPanel extends BasePanel {
    static NAME: string = "BrainTrainTipPanel";

    @property(Label)
    progressLabel: Label = null;

    @property(Label)
    titleLabel: Label = null;

    @property(ProgressBar)
    progressBar: ProgressBar = null;

    private _timeID = null;

    restore(data: any): void {
        if (data) {
            this.setTitle(data.title);
            this.setProgress(data.curCount, data.maxCount);
        }

        if(this._timeID){
            clearInterval(this._timeID);
        }
        let self = this;
        this._timeID = setTimeout(() => {
            if(self._timeID){
                clearInterval(self._timeID);
            }
            UIManager.getInstance().hidePanel(BrainTrainTipPanel.NAME);
        }, 2000);
    }

    setTitle(str: string) {
        this.titleLabel.string = str;
    }

    setProgress(curcount: number, maxcount: number) {
        let curProgress = "";
        if (maxcount == 0) {
            this.progressBar.progress = 1;
            curProgress = "1/1"
        } else {
            curcount = curcount < 0 ? 0 : curcount;
            this.progressBar.progress = curcount / maxcount;
            curProgress = `${curcount} / ${maxcount}`;
        }
        this.progressLabel.string = `当前游戏进度:${curProgress}`;
    }

    async showPanel(): Promise<void> {
        await new Promise<void>((resolve, reject) => {
            const sch = LayerUtil.getPanelLayer().getComponent(UITransform).height;
            const startPos = new Vec3(0, sch, 0);
            this.node.setPosition(startPos);
            tween(this.node)
                .to(0.3, { position: new Vec3(0, 0, 0) }, { easing: 'quartOut' })
                .call(() => {
                    this.state = PanelState.SHOW;
                    resolve();
                })
                .start();
        });
    }

    async hidePanel(): Promise<void> {
        if(this._timeID){
            clearInterval(this._timeID);
        }
        await new Promise<void>((resolve, reject) => {
            const sch = LayerUtil.getPanelLayer().getComponent(UITransform).height;
            tween(this.node)
                .to(0.3, { position: new Vec3(0, sch, 0) }, { easing: 'quartIn' })
                .call(() => {
                    this.state = PanelState.HIDE;
                    resolve();
                })
                .start();
        });
    }
}



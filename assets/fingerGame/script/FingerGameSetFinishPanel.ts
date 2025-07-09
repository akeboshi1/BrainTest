import { _decorator, Component, Node, Label, Sprite, assetManager, SpriteFrame } from 'cc';
import { BasePanel } from '../../resources/scripts/Core/UI/BasePanel';
import { FingerGameResult } from './FingerGameResultData';
import { SetSummaryComponent } from './SetSummaryComponent';
import { BundleName } from '../../resources/scripts/Core/Manager/Load/BundleName';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
import { DataProvider } from '../../resources/scripts/Core/Data/DataProvider';
import { DebugLog } from '../../resources/scripts/Core/Util/DebugLog';
const { ccclass, property } = _decorator;

export interface IFingerGameSetFinishPanelData {
    result: FingerGameResult | null;
    nextSectionName: string | null;
    nextSectionIconUrl: string | null;
    back: () => void;
    goNext: () => void;
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

    private _finishPanelData: DataProvider<IFingerGameSetFinishPanelData> = null;

    private _backHandler: () => void = null;
    private _nextHandler: () => void = null;

    start() {

    }

    restore(data: DataProvider<IFingerGameSetFinishPanelData> | null) {
        this._finishPanelData = data;
        this.nextSectionNode.active = false;
        this.setSummaryComponent.node.active = false;
        this.finishNode.active = false;
        this.startWaittingAnim();

        if(data){
            DebugLog.instance.log('Binding DataProvider FingerGameSetFinishPanel =============');
            data.addListener(this.onDataChange.bind(this));
        }else{
            this.waittingNode.active = false;
            this.setSummaryComponent.node.active = false;
            this.finishNode.active = true;
        }
    }

    onDestroy(){
        if(this._finishPanelData){
            this._finishPanelData.removeAllListeners();
            this._finishPanelData = null;
        }
    }

    private onDataChange(data: IFingerGameSetFinishPanelData) {
        DebugLog.instance.log('onDataChange FingerGameSetFinishPanel ============');
        this.waittingNode.active = false;
        this.unscheduleAllCallbacks();
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
        } else {
            this.nextSectionNode.active = false;
        }

        if(data.back){
            this._backHandler = data.back;
        }
        
        if(data.goNext){
            this._nextHandler = data.goNext;
        }
    }

    private startWaittingAnim(){
        this.waittingNode.active = true;
        this.waittingLabel.string = "正在打分中...";
        let count = 1;
        this.unscheduleAllCallbacks();
        this.schedule(() => {
            let dots = '.'.repeat(count);
            this.waittingLabel.string = "正在打分中" + dots;
            count = (count % 3) + 1;
        }, 0.5);
    }

    public onClickBack() {
        UIManager.getInstance().hidePanel(FingerGameSetFinishPanel.NAME);
        if (this._backHandler) {
            this._backHandler();
        }
    }

    public onClickNext() {
        UIManager.getInstance().hidePanel(FingerGameSetFinishPanel.NAME);
        if (this._nextHandler) {
            this._nextHandler();
        }
    }
}



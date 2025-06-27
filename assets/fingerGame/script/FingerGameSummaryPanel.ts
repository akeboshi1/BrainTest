import { _decorator, Component, Label, Node, Prefab, instantiate, Button } from 'cc';
import { BasePanel } from '../../resources/scripts/Core/UI/BasePanel';
import { FingerGameGroupScore, FingerGameResult } from './FingerGameResultData';
import { FingerGameScoreDetail } from './FingerGameScoreDetail';
import { UIManager } from '../../resources/scripts/Core/Manager/UI/UIManager';
const { ccclass, property } = _decorator;

@ccclass('FingerGameSummaryPanel')
export class FingerGameSummaryPanel extends BasePanel {
    public static NAME = 'FingerGameSummaryPanel';

    @property(Prefab)
    private detailScorePrefab: Prefab = null;

    @property(Node)
    private scoreDetailContainer: Node = null;

    @property(Label)
    private leftScore: Label = null;

    @property(Label)
    private rightScore: Label = null;

    private _back:()=>void = null;
    private _goNext:()=>void = null;


    start() {

    }

    override restore(data: {result:FingerGameResult,back:()=>void,goNext:()=>void}) {
        this.leftScore.string = data.result.avgLeftScore.toString();
        this.rightScore.string = data.result.avgRightScore.toString();
        let groupScoreDetail: FingerGameGroupScore[] = data.result.groups;
        //根据groupScoreDetail数量创建detailScorePrefab，父节点是scoreDetailContainer
        for (let i = 0; i < groupScoreDetail.length; i++) {
            const detailNode = instantiate(this.detailScorePrefab);
            detailNode.setParent(this.scoreDetailContainer);

            const detailComponent = detailNode.getComponent(FingerGameScoreDetail)
            if (detailComponent) {
                detailComponent.setScore(groupScoreDetail[i].left_score, groupScoreDetail[i].right_score);
                detailComponent.setTitle(groupScoreDetail[i].seq);
            }
        }
        this._back = data.back;
        this._goNext = data.goNext;
    }

    onClickBack() {
        UIManager.getInstance().hidePanel(FingerGameSummaryPanel.NAME);
        if (this._back) {
            this._back();
        }
    }

    onClickGoNextSection() {
        UIManager.getInstance().hidePanel(FingerGameSummaryPanel.NAME);
        if (this._goNext) {
            this._goNext();
        }
    }
}



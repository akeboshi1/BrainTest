import { _decorator, Color, Component, Label, Node, UITransform } from 'cc';
import { IFingerActivityResult } from './FingerGameProtocol';
const { ccclass, property } = _decorator;

export interface IFingerActivityCompleteDetail {
    name: string;
    left_score: number;
    right_score: number;
    left_color: Color;
    right_color: Color;
}

@ccclass('FingerGameCompleteDetail')
export class FingerGameCompleteDetail extends Component {

    @property(Label)
    private nameLabel: Label = null;

    @property(Label)
    private leftScoreLabel: Label = null;

    @property(Label)
    private rightScoreLabel: Label = null;

    start() {

    }

    restore(data: IFingerActivityCompleteDetail) {
        this.nameLabel.string = data.name;
        this.leftScoreLabel.string = data.left_score < 60 ? "继续努力！" : data.left_score.toString();
        this.rightScoreLabel.string = data.right_score < 60 ? "继续努力！" : data.right_score.toString();
        this.leftScoreLabel.color = data.left_color;
        this.rightScoreLabel.color = data.right_color;
    }

}



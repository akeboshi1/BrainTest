import { _decorator, Component, Label, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('FingerGameScoreDetail')
export class FingerGameScoreDetail extends Component {
    @property(Label)
    private title: Label = null;
    @property(Label)
    private leftScore: Label = null;
    @property(Label)
    private rightScpre: Label = null;

    start() {

    }

    update(deltaTime: number) {

    }

    setScore(leftScore: number, rightScore: number) {
        this.leftScore.string = leftScore.toString();
        this.rightScpre.string = rightScore.toString();
    }

    setTitle(index: number) {
        this.title.string = "第" + index + "组";
    }
}



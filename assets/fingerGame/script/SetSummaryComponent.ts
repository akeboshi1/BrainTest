import { _decorator, Button, Component, instantiate, Label, Node, Prefab, tween, UIOpacity, UITransform } from 'cc';
import { FingerGameResult } from './FingerGameResultData';
import { FingerGameScoreDetail } from './FingerGameScoreDetail';
const { ccclass, property } = _decorator;

@ccclass('SetSummaryComponent')
export class SetSummaryComponent extends Component {
    @property(Label)
    private leftScore: Label = null;

    @property(Label)
    private rightScore: Label = null;

    @property(Node)
    private btnArrow: Node = null;

    @property(Node)
    private scoreDetailContainer: Node = null;

    @property(Prefab)
    private scoreDetailPrefab: Prefab = null;

    @property(Button)
    private ctrlBtn: Button = null;

    private original_height: number = 400;

    private _isExpanded: boolean = false;

    private _itemHeight: number = 112;
    private _paddingY: number = 10;
    private _animDuration: number = 0.5;

    start() {

    }

    restoreComponent(data: FingerGameResult) {
        this.original_height = this.getComponent(UITransform).height;

        this.leftScore.string = data.avgLeftScore.toString();
        this.rightScore.string = data.avgRightScore.toString();

        // 创建每组得分详情
        const groups = data.groups;
        for (let i = 0; i < groups.length; i++) {
            const detailNode = instantiate(this.scoreDetailPrefab);
            detailNode.setParent(this.scoreDetailContainer);

            const detailComp = detailNode.getComponent(FingerGameScoreDetail);
            if (detailComp) {
                detailComp.setScore(groups[i].left_score, groups[i].right_score);
                detailComp.setTitle(groups[i].seq);
            }
        }

        this.scoreDetailContainer.active = false;
    }

    onClickControllBtn() {
        if (this._isExpanded) {
            this.hideScoreDetail();
        } else {
            this.showScoreDetail();
        }
    }

    protected onDestroy(): void {
        
    }

    showScoreDetail() {
        let expendHeight = (this._itemHeight + this._paddingY) * this.scoreDetailContainer.children.length + 100;

        // 禁用按钮点击
        this.ctrlBtn.interactable = false;

        // 显示容器并设置初始透明度
        this.scoreDetailContainer.active = true;
        const opacity = this.scoreDetailContainer.getComponent(UIOpacity);
        opacity.opacity = 0;

        // 获取当前组件的UITransform
        const transform = this.getComponent(UITransform);

        // 创建并行动作
        const fadeIn = tween(opacity).to(this._animDuration, { opacity: 255 });
        const heightChange = tween(transform).to(this._animDuration, { height: this.original_height + expendHeight });
        fadeIn.start();

        // 执行并行动作
        heightChange.call(() => {
            // 动画完成后启用按钮
            this.ctrlBtn.interactable = true;
            this._isExpanded = true;

            let oldScale = this.btnArrow.getScale();
            let newScale = oldScale.clone();
            newScale.x = newScale.x * -1;
            this.btnArrow.setScale(newScale);
        }).start();


    }

    hideScoreDetail() {
        // 禁用按钮点击
        this.ctrlBtn.interactable = false;

        // 获取当前组件的UITransform
        const transform = this.getComponent(UITransform);

        // 获取容器的UIOpacity组件
        const opacity = this.scoreDetailContainer.getComponent(UIOpacity);

        // 创建并行动作
        const fadeOut = tween(opacity).to(this._animDuration, { opacity: 0 });
        const heightChange = tween(transform).to(this._animDuration, { height: this.original_height });

        // 执行并行动作
        fadeOut.start();
        heightChange.call(() => {
            // 动画完成后启用按钮,隐藏容器
            this.ctrlBtn.interactable = true;
            this.scoreDetailContainer.active = false;
            this._isExpanded = false;

            let oldScale = this.btnArrow.getScale();
            let newScale = oldScale.clone();
            newScale.x = newScale.x * -1;   
            this.btnArrow.setScale(newScale);
        }).start();

    }
}



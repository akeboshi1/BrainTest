import { _decorator, Component, instantiate, Label, Node, Prefab } from 'cc';
import { BasePanel } from '../../resources/scripts/Core/UI/BasePanel';
import { SceneManager } from '../../resources/scripts/Core/Manager/Scene/SceneManager';
import { DataProvider } from '../../resources/scripts/Core/Data/DataProvider';
const { ccclass, property } = _decorator;

/**
 * 手指操节完成界面数据结构
 */
export interface IFingerGameCompleteData {
    /** 节名称 */
    name: string;
    /** 
     * 评价状态
     * 1: 优
     * 2: 良
     * 3: 中
     * 0或null: 完成但未评价
     */
    status: number | null;
}



@ccclass('FingerGameCompletePanel')
export class FingerGameCompletePanel extends BasePanel {
    public static NAME = 'FingerGameCompletePanel';

    @property(Prefab)
    private detailPrefab:Prefab = null;

    @property(Node)
    private detailContainer:Node = null;

    @property(Label)
    private titleLabel:Label = null;

    @property(Node)
    private finishIconNode:Node = null;

    private _data:DataProvider<IFingerGameCompleteData[]> = null;

    start() {

    }

    restore(data:DataProvider<IFingerGameCompleteData[]>): void {
        this.startWaittingAnim();
        this._data = data;
        data.addListener(this.onDataChange.bind(this));
    }

    onDestroy(){
        if(this._data){
            this._data.removeAllListeners();
            this._data = null;
        }
    }

    private startWaittingAnim(){
        this.titleLabel.string = "正在统计总分...";
        this.finishIconNode.active = false;
        let count = 1;
        this.unscheduleAllCallbacks();
        this.schedule(() => {
            let dots = '.'.repeat(count);
            this.titleLabel.string = "正在统计总分" + dots;
            count = (count % 3) + 1;
        }, 0.5);
    }

    private onDataChange(data:IFingerGameCompleteData[]){
        this.unscheduleAllCallbacks();

        this.finishIconNode.active = true;
        this.titleLabel.string = "恭喜完成练习!";
        // 清空容器
        this.detailContainer.removeAllChildren();

        // 遍历数据创建详情项
        data.forEach(item => {
            const detailNode = instantiate(this.detailPrefab);
            const finishNode = detailNode.getChildByName("finishNode");
            const scoreNode = detailNode.getChildByName('scoreNode');

            let bo = item.status == null || item.status == 0;
            finishNode.active = bo;
            scoreNode.active = !bo;

            // 设置名称
            const nameLabel = detailNode.getChildByName('name').getComponent(Label);
            nameLabel.string = item.name;

            // 设置状态
            const statusLabel = scoreNode.getChildByName('status').getComponent(Label);
            switch(item.status) {
                case 1:
                    statusLabel.string = '优';
                    break;
                case 2: 
                    statusLabel.string = '良';
                    break;
                case 3:
                    statusLabel.string = '中';
                    break;
                case 0:
                case null:
                    statusLabel.string = '✔';
                    break;
            }

            // 添加到容器
            this.detailContainer.addChild(detailNode);
        });
    }

    onClickFinish(){
        SceneManager.getInstance().backToHall();
    }
}



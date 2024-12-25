import {_decorator,Node,Label} from "cc";
import LayerPanel, {UrlInfo} from "../../Common/manage/Layer/LayerPanel";

const {ccclass} = _decorator;

@ccclass
export default class GameInfoView extends LayerPanel {

    public static getUrl(): UrlInfo {
        return {
            bundle: "gameInfoView",
            name: "View/gameInfoView/prefab/gameInfoView"
        }
    }

    private gold: Node = null;

    private stamina: Node = null;

    private diamond: Node = null;

    private gold_add_button: Node = null;
    private stamina_add_button: Node = null;

    private residue_node: Node = null;
    private residue_sprite: Node = null;

    private animationTime: number = null;
    private gold_num: number = null;
    private stamina_num: number = 0;
    private diamond_num: number = 0;
    private timeouts: Map<string, number[]> = new Map<string, number[]>();

    private stamina_minute: number = 0;
    private stamina_second: number = 0;

    private static gameInfoViewIns: GameInfoView = null;

    public static INS(): GameInfoView {
        return this.gameInfoViewIns;
    }

    initUI(): void {

    }

    show(param: any): void {

    }

    hide() {

    }

    /**
     * 监听金币是否改变
     * @param dt
     * @protected
     */
    protected update(dt: number) {
    }


    private customPadStart(str, targetLength, padString) {
        str = String(str); // 将输入转换为字符串
        padString = String(padString || ' '); // 默认使用空格填充

        if (str.length >= targetLength) {
            return str;
        } else {
            const padding = padString.repeat(targetLength - str.length).slice(0, targetLength - str.length);
            return padding + str;
        }
    }



    public changeResidue(minute: number, second: number) {
        // this.stamina_minute = minute;
        // this.stamina_second = second;
    }

    /**
     * 修改金币动画
     * @param type
     * @param num
     * @private
     */
    private changeAnimation(type: string, num: number) {
        this.clearTimeOut(type);
        let num_bas = Math.abs(num);
        let time = this.animationTime / num_bas;
        let allTime = 0;   //累计耗时间
        let num_ = this[type + "_num"];
        this[type + "_num"] += num;
        for (let i = 1; i <= num_bas; i++) {
            if (num < 0) {
                let arr = this.timeouts.get(type);
                arr[i] = window.setTimeout(() => {
                    this[type].getComponent(Label).string = (num_ - i).toString();
                }, allTime * 1000);
                allTime += time;
            } else {
                let arr = this.timeouts.get(type);
                arr[i] = window.setTimeout(() => {
                    this[type].getComponent(Label).string = (num_ + i).toString();
                }, allTime * 1000);
                allTime += time;
            }
        }
    }

    /**
     * 清空所有动画
     * @param type
     * @private
     */
    private clearTimeOut(type: string) {
        //停止所有关于 该类型改变的值
        let timeouts = this.timeouts.get(type);
        for (let i = 0; i < timeouts.length; i++) {
            if (this.timeouts[i]) {
                window.clearTimeout(timeouts[i]);
            }
        }
        this[type].getComponent(Label).string = this[type + "_num"].toString();   //直接赋值
        this.timeouts.set(type, []);
    }
}

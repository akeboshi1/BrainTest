
import LayerUI from "./LayerUI";
import GameLog from "../GameLogMgr";

import {_decorator,Asset} from "cc";
const {ccclass} = _decorator;

@ccclass
export default class LayerPanel extends LayerUI {
    public static getUrl(): UrlInfo {
        GameLog.error("需要重写getURL");
        return null
    }

    // private _gameBox: WechatGameBox = null
    //动态加载的资源  ,将需要清除的动态资源放在asset中，在该面板销毁的时候，会自动释放这些资源
    public assets: Asset [] = []

    /**
     *
     *  面板初始化,第一次生成的时候调用
     */
    public initUI(){

    }

    /**
     *
     * 面板显示 每次显示都调用 可以进行相关初始化（UI、事件）会在onload，start之前调用
     * @param param 面板显示参数
     */
    public show(param: any): void{

    }

    /**
     * 面板隐藏  每次因此都调用
     */
    public hide(){

    }


    protected moreGameUrl(): string {
        return "more_game"
    }

    /**
     * gameBox 的路径，如果后续需要定制的化 ， 可在View中重写
     */
    protected gameBoxUrl(): string {
        return "GameBox"
    }

    /**
     *  初始化gameBox
     */
    public initGameBox() {
        // 处理 gameBox
        // if (this._gameBox != null) {
        //     console.log("no destroy ")
        //     this.showGameBox()
        //     return
        // }

        let nodeList = [];
        let node = this.getNode(this.gameBoxUrl());
        if (node) {
            node.children.forEach((value) => {
                nodeList.push(value);
            });
            // this._gameBox = new WechatApi.gameBox();
            // this._gameBox.init(nodeList, 1, Constant.EXPORT_TYPE.VIEW_BOX, true, this);
        }
    }

    public noInitGameBox() {
        let node = this.getNode(this.gameBoxUrl())
        if (node) {
            node.active = false
        }
    }

    // public showGameBox() {
    //     if (this._gameBox) {
    //         this._gameBox.show()
    //     }
    // }
    //
    // public hideGameBox() {
    //     if (this._gameBox) {
    //         this._gameBox.hide()
    //     }
    // }

    public initMoreGame(f: Function) {
        let moreGame = this.getNode(this.moreGameUrl())
        this.onTouch(moreGame, f)
    }

    public onDestroyDo() {

    }
}


export interface UrlInfo {
    bundle: string,
    name: string,
}

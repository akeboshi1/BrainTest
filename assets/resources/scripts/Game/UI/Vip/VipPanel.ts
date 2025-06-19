import { BasePanel } from "db://assets/resources/scripts/Core/UI/BasePanel";

import { _decorator, Label, Node, ScrollView,Sprite,resources,SpriteFrame, tween, UIOpacity, Vec3 } from "cc";
import { SceneManager } from "../../../Core/Manager/Scene/SceneManager";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";
const { ccclass, property } = _decorator;


@ccclass('VipPanel')
export class VipPanel extends BasePanel {

    //===== 通用
    @property(Node)
    backBtn: Node;

    @property(Label)
    titleLable: Label;

    @property(Label)
    descLabel: Label;

    @property(Label)
    detailLabel: Label;

    @property(Node)
    renewalBtn: Node;

    @property(Label)
    renewalBtnLabel: Label;

    @property(Node)
    childNode: Node;

    @property(ScrollView)
    scrollView: ScrollView;

    @property(Node)
    containerNode: Node;

    //===== 会员类型
    @property(Node)
    typeNode: Node;

    @property(Node)
    mouthBtn: Node

    @property(Label)
    mouthNameLabel: Label;

    @property(Label)
    mouthPriceLabel: Label;

    @property(Node)
    yearBtn: Node;

    @property(Label)
    yearNameLabel: Label;

    @property(Label)
    yearPriceLabel: Label;

    @property(Label)
    selectLabel: Label;

    //===== 权益
    @property(Node)
    quanyiNode: Node;

    //===== select
    @property(Node)
    selectNode:Node;

    @property(Node)
    selectBGNode:Node;


    public static NAME: string = "VipPanel";

    constructor() {
        super();
        this.name = VipPanel.NAME;
    }

    onLoad(): void {

    }

    start() {

    }

    onEnable(): void {

    }

    onDisable(): void {
    }

    onDestroy(): void {
    }

    backHandler() {
        SceneManager.getInstance().backToHall();
    }

    buyHandler() {
        this.quanyiNode.active = !this.quanyiNode.active;
    }

    private _select = 0;

    cardClick(event,index:number){
        this._select = Number(index);
        this.selectLabel.string = this._select == 0 ? "已选择月卡" : "已选择年卡";
        let mouthBtnSprite = this.mouthBtn.getComponent(Sprite);
        this.changeBtnFrame(mouthBtnSprite, this._select == 0 ? 1 : 0).then();
        let yearBtnSprite = this.yearBtn.getComponent(Sprite);
        this.changeBtnFrame(yearBtnSprite,this._select == 0 ? 0 : 1).then();

    }


    openSelect(){
        this.selectNode.active = true;
        this.playSelectOpenAnimation();
    }

    okClick(){
        this.playSelectCloseAnimation(() => {
            this.selectNode.active = false;
        });
        
        //todo 提取选择数据
    }

    cancelClick(){
        this.playSelectCloseAnimation(() => {
            this.selectNode.active = false;
        });
    }

    renewalHandler() {

    }

    /**
     * 播放选择面板打开动画
     */
    private playSelectOpenAnimation() {
        // 设置初始状态
        this.selectBGNode.setPosition(this.selectBGNode.position.x, -1444, this.selectBGNode.position.z);
        const uiOpacity = this.selectBGNode.getComponent(UIOpacity);
        if (uiOpacity) {
            uiOpacity.opacity = 0;
        }
        
        // 执行打开动画
        tween(this.selectBGNode)
            .to(0.3, { 
                position: new Vec3(this.selectBGNode.position.x, -478, this.selectBGNode.position.z)
            })
            .start();
            
        if (uiOpacity) {
            tween(uiOpacity)
                .to(0.3, { opacity: 255 })
                .start();
        }
    }

    /**
     * 播放选择面板关闭动画
     * @param callback 动画完成后的回调
     */
    private playSelectCloseAnimation(callback?: () => void) {
        const uiOpacity = this.selectBGNode.getComponent(UIOpacity);
        
        tween(this.selectBGNode)
            .to(0.3, { 
                position: new Vec3(this.selectBGNode.position.x, -1444, this.selectBGNode.position.z)
            })
            .call(() => {
                if (callback) {
                    callback();
                }
            })
            .start();
            
        if (uiOpacity) {
            tween(uiOpacity)
                .to(0.3, { opacity: 0 })
                .start();
        }
    }


    private async changeBtnFrame(btnSprite:Sprite,index: number = 0): Promise<void> {
        let url: string = "";
        switch (index) {
            case 0:
                url = "textureV2/vip/rect_white/spriteFrame"
                break
            case 1:
                url = "textureV2/vip/rect_orange/spriteFrame"
                break;
        }

        return new Promise<void>((resolve, reject) => {
            resources.load(url, SpriteFrame, (err, sp) => {
                if (err) {
                    DebugLog.instance.error(err);
                    reject(err);
                    return;
                }
                btnSprite.spriteFrame = sp;
                resolve();
            });
        });
    }

 

}
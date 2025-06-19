import { BasePanel } from "db://assets/resources/scripts/Core/UI/BasePanel";

import { _decorator, Label, Node, ScrollView,Sprite,resources,SpriteFrame, tween, UIOpacity, Vec3,EditBox } from "cc";
import { SceneManager } from "../../../Core/Manager/Scene/SceneManager";
import {DebugLog} from "db://assets/resources/scripts/Core/Util/DebugLog";
import { SelectDate } from "./SelectDate";
import { AlertManager } from "../../../Core/Manager/Alert/AlertManager";
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

    //===== address
    @property(Node)
    addressNode:Node;

    @property(ScrollView)
    addressScrollView:ScrollView;

    @property(Node)
    newAddressNode:Node;

    @property(Node)
    bigaddAddressBtn:Node;

    @property(Node)
    addAddressBtn:Node;    

    @property(Label)
    addressLabel:Label;

    @property(Node)
    addressBtn:Node;

    @property(EditBox)
    addressInput: EditBox;

    @property(EditBox)
    PhoneInput: EditBox;

    @property(EditBox)
    nameInput: EditBox;

    @property(Node)
    defaultBtn:Node;


    //===== select
    @property(Node)
    selectNode:Node;

    @property(Node)
    selectBGNode:Node;

    @property(SelectDate)
    selectDateComponent:SelectDate;

    



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
        if(this.addressNode.active){
            if(this.newAddressNode.active){
                this.newAddressNode.active = false;
                this.addressScrollView.node.active = true;
                this.addAddressBtn.active = true;
                this.bigaddAddressBtn.getChildByName("label").getComponent(Label).string = "新建收货地址";
            }else{
                this.addressNode.active = false;
            }
            return;
        }
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
        let url = this._select == 0 ? "textureV2/vip/rect_orange/spriteFrame" : "textureV2/vip/rect_white/spriteFrame";
        this.changeBtnFrame(mouthBtnSprite, url).then();
        let yearBtnSprite = this.yearBtn.getComponent(Sprite);
        this.changeBtnFrame(yearBtnSprite,url).then();

    }


    openSelect(){
        this.selectNode.active = true;
        
        // 设置SelectDate组件的回调（可选，用于实时预览）
        if (this.selectDateComponent) {
            this.selectDateComponent.callback = (province: string, city: string, district: string) => {
                // 这里可以添加实时预览逻辑，目前留空
            };
        }
        
        this.playSelectOpenAnimation();
    }

    okClick(){
        // 获取选择的地址数据
        if (this.selectDateComponent) {
            const selectedAddress = this.selectDateComponent.getCurrentAddress();
            if (this.addressLabel) {
                this.addressLabel.string = selectedAddress;
            }
        }
        
        this.playSelectCloseAnimation(() => {
            this.selectNode.active = false;
        });
    }

    cancelClick(){
        this.playSelectCloseAnimation(() => {
            this.selectNode.active = false;
        });
    }

    private _defaultBoo = false;
    selectDefaultHandler(){
       // 设置默认地址

       this._defaultBoo = !this._defaultBoo;
       let url = this._defaultBoo ? "textureV2/vip/completeIcon/spriteFrame" : "textureV2/vip/selectBG/spriteFrame";
       this.changeBtnFrame(this.defaultBtn.getComponent(Sprite),url).then();
    }

    addNewAddressHandler(){
        if(this.newAddressNode.active){
            if(this.nameInput.string == ""||this.nameInput.string == "请输入收货人姓名"){
                AlertManager.getInstance().showSocketAlert('请输入收货人姓名');
                return;
            }
            if(this.PhoneInput.string == ""||this.PhoneInput.string == "请输入收货人手机号码"){
                AlertManager.getInstance().showSocketAlert('请输入收货人电话');
                return;
            }
            if(this.addressLabel.string == ""||this.addressLabel.string == "请选择"){
                AlertManager.getInstance().showSocketAlert('请输入收货地址');
                return;
            }
            if(this.addressInput.string == ""||this.addressInput.string == "请输入道路，门牌号，小区，楼栋号，单元室等"){
                AlertManager.getInstance().showSocketAlert('请输入详细收货地址');
                return;
            }
            this.backHandler();
            return;
        }
       
        this.addressScrollView.node.active = false;
        this.addAddressBtn.active = false;
        this.newAddressNode.active = true;
        this.bigaddAddressBtn.getChildByName("label").getComponent(Label).string = "保存";
    }



    renewalHandler() {

    }

    // addAddressHandler(){
    //     this.newAddressNode.active = true;
    // }

    /**
     * 设置地址显示文本
     * @param address 地址字符串
     */
    setAddressText(address: string) {
        if (this.addressLabel) {
            this.addressLabel.string = address;
        }
    }

    /**
     * 根据地址字符串设置SelectDate组件的选择状态
     * @param address 格式为 "省份 城市 区县" 的地址字符串
     */
    setSelectDateFromAddress(address: string) {
        if (this.selectDateComponent && address) {
            const parts = address.split(' ');
            if (parts.length >= 3) {
                const addressString = `${parts[0]}-${parts[1]}-${parts[2]}`;
                this.selectDateComponent.scrollToSelection(addressString);
            }
        }
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


    private async changeBtnFrame(btnSprite:Sprite,url): Promise<void> {
        // let url: string = "";
        // switch (index) {
        //     case 0:
        //         url = "textureV2/vip/rect_white/spriteFrame"
        //         break
        //     case 1:
        //         url = "textureV2/vip/rect_orange/spriteFrame"
        //         break;
        // }

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
import { BasePanel } from "db://assets/resources/scripts/Core/UI/BasePanel";

import { _decorator, Prefab, instantiate, Label, Node, ScrollView, Sprite, resources, SpriteFrame, tween, UIOpacity, Vec3, EditBox ,RichText } from "cc";
import { SceneManager } from "../../../Core/Manager/Scene/SceneManager";
import { DebugLog } from "db://assets/resources/scripts/Core/Util/DebugLog";
import { SelectDate } from "./SelectDate";
import { AlertManager } from "../../../Core/Manager/Alert/AlertManager";
import { AlertType } from "db://assets/resources/scripts/Game/UI/Alert/GameAlert";
import { VipEvent, VipModel, VipOrder, VipType } from "./VipModel";
import { Global } from "../../../Core/Manager/Config/Global";
import { PersonalCenterManager } from "../../PersonalCenterManager/PersonalCenterManager";
import { UIManager } from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
import { EventManager } from "../../../Core/Manager/Event/EventManager";
import { TaskManager } from "../../Task/TaskManager";
import { UserInfoData } from "../../PersonalCenterManager/UserInfoData";
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
    //---------------------------------------

    @property(Node)
    dayBtn: Node;

    @property(Label)
    dayNameLabel: Label;

    @property(Label)
    dayPriceLabel: Label;

    @property(Label)
    dayDiscountLabel: Label;

    @property(Label)
    dayFreeGiveLabel: Label;

    @property(Node)
    mouthBtn: Node

    @property(Label)
    mouthNameLabel: Label;

    @property(Label)
    mouthPriceLabel: Label;

    @property(Label)
    mouthDiscountLabel: Label;

    @property(Label)
    mouthFreeGiveLabel: Label;

    @property(Node)
    weekBtn: Node;

    @property(Label)
    weekNameLabel: Label;

    @property(Label)
    weekPriceLabel: Label;

    @property(Label)
    weekDiscountLabel: Label;

    @property(Label)
    weekFreeGiveLabel: Label;

    //---------------------------------------

    @property(RichText)
    selectLabel: RichText;

    @property(Node)
    permanentNode: Node;

    //===== 权益
    @property(Node)
    quanyiNode: Node;

    // ===== buy
    @property(Node)
    buyNode: Node;

    @property(Label)
    buyNodeAddressLabel: Label;

    @property(Label)
    buyNodeNameLabel: Label;

    @property(Node)
    alipayNode: Node;

    @property(Node)
    wechatNode: Node;

    @property(Node)
    scanNode: Node;

    //===== address
    @property(Node)
    addressNode: Node;

    @property(ScrollView)
    addressScrollView: ScrollView;

    @property(Node)
    addressScrollViewContent: Node;

    @property(Node)
    newAddressNode: Node;

    @property(Node)
    bigaddAddressBtn: Node;

    @property(Node)
    addAddressBtn: Node;

    @property(Label)
    addressLabel: Label;

    @property(Node)
    addressBtn: Node;

    @property(EditBox)
    addressInput: EditBox;

    @property(EditBox)
    PhoneInput: EditBox;

    @property(EditBox)
    nameInput: EditBox;

    @property(Node)
    defaultBtn: Node;


    //===== select
    @property(Node)
    selectNode: Node;

    @property(Node)
    selectBGNode: Node;

    @property(SelectDate)
    selectDateComponent: SelectDate;

    //===== 结算
    @property(Node)
    settlementNode: Node;

    @property(Node)
    iconNode: Node;

    @property(Label)
    label0: Label;

    @property(Label)
    label1: Label;

    @property(Label)
    label2:Label;

    @property(Node)
    timeNode:Node;

    @property(Label)
    timeLabel:Label;

    @property(Node)
    gotoBtn:Node;


    private _vipModel: VipModel;

    private _addressItemPrefab: Prefab;

    public static NAME: string = "VipPanel";

    private _waveNodes: Node[] = [];
    private _waveTime: number = 0;
    private _isWaveAnimating: boolean = false;

    // 默认地址相关变量
    private _defaultAddress: string = "";
    private _defaultAddressName: string = "";
    private _defaultPhone: string = "";
    // 当前正在编辑的地址信息，用于跟踪是否为默认地址
    private _currentEditingAddress: string = "";
    private _currentEditingName: string = "";

    // 支付方式选择相关变量
    private _selectedPaymentType: number = -1; // -1表示未选择，0=支付宝，1=微信，2=扫码

    constructor() {
        super();
        this.name = VipPanel.NAME;
    }

    onLoad(): void {
        let self = this;
        resources.load("prefab/VipPanel/addressItem", Prefab, (err, prefab) => {
            if (err) {
                DebugLog.instance.error(err);
                return;
            }
            self._addressItemPrefab = prefab;
        });
        this._vipModel = new VipModel();
        this._vipModel.init();


    }

    start() {
        this.settlementNode.active = false;
        this.buyNode.active = false;
        this.addressNode.active = false;
        this.typeNode.active = true;
        this.renewalBtn.active = true;
        this.childNode.active = true;
        this._vipModel.requestGetVipData();
        let userInfoData = PersonalCenterManager.getInstance().userInfoData;
        if (userInfoData.is_member) {
            // 会员
            this.quanyiNode.active = false;
            if (userInfoData.getMemberRemainingDays() <= 3) {
                this.descLabel.node.active = true;
                this.descLabel.string = "您的会员将在" + userInfoData.getMemberRemainingDays() + "天后到期";
            } else {
                this.descLabel.node.active = false;
            }
            this.permanentNode.active = true;
            this.renewalBtnLabel.string = "点击续费";
        } else {
            // 非会员
            this.descLabel.node.active = false;
            this.quanyiNode.active = true;
            this.permanentNode.active = true;
            this.renewalBtnLabel.string = "确认协议并开通";


        }
    }

    onEnable(): void {
        EventManager.getInstance().on(VipEvent.VIP_GET_DATA, this.onVipGetData.bind(this), this);
        EventManager.getInstance().on(VipEvent.VIP_ORDER_CREATED, this.onVipOrderCreated.bind(this), this);
        EventManager.getInstance().on(VipEvent.VIP_PAY_RESULT, this.onVipPayResult.bind(this), this);
        EventManager.getInstance().on(VipEvent.VIP_GET_ORDER, this.onVipGetOrder.bind(this), this);
    }

    onDisable(): void {
        EventManager.getInstance().off(VipEvent.VIP_GET_DATA, this);
        EventManager.getInstance().off(VipEvent.VIP_ORDER_CREATED, this);
        EventManager.getInstance().off(VipEvent.VIP_PAY_RESULT, this);
        EventManager.getInstance().off(VipEvent.VIP_GET_ORDER, this);
    }

    /**
     * 获取vip数据
     */
    private onVipGetData() {
        let vipDatas = this._vipModel.vipDatas;
        console.log("vipDatas",vipDatas);
        let len = vipDatas.length;
        for (let i: number = 0; i < len; i++) {
            let vipData = vipDatas[i];
            if (vipData.periodUnit == VipType.Day) {
             // this.dayBtn.active = true;
               this.dayPriceLabel.string = `${vipData.discountPrice}`;
               this.dayNameLabel.string = `可乐派-${vipData.name}`;
               this.dayDiscountLabel.string = `¥${vipData.price}`;
               this.dayFreeGiveLabel.string = `额外赠送${vipData.bonusDay}天`;
            } else if (vipData.periodUnit == VipType.Mouth) {
                // this.mouthBtn.active = true;
                this.mouthPriceLabel.string = `${vipData.discountPrice}`;
                this.mouthNameLabel.string = `可乐派-${vipData.name}`;
                this.mouthDiscountLabel.string = `¥${vipData.price}`;
                this.mouthFreeGiveLabel.string = `额外赠送${vipData.bonusDay}天`;
            }else if (vipData.periodUnit == VipType.Week) {
                this.weekPriceLabel.string = `${vipData.discountPrice}`;
                this.weekNameLabel.string = `可乐派-${vipData.name}`;
                this.weekDiscountLabel.string = `¥${vipData.price}`;
                this.weekFreeGiveLabel.string = `额外赠送${vipData.bonusDay}天`;
            }
        }
        let _vipData = this._vipModel.vipDatas[0];
        this._select = _vipData.id;
        this.selectLabel.string = `*您已选择<color=#000000><b><size=40>${_vipData.name}</size></b></color>模式`;        
        this.setBtnFrame(_vipData.periodUnit);
    }
    setBtnFrame(name: string) {
        const selectedBtn = name == VipType.Mouth ? this.mouthBtn : 
                          name == VipType.Week ? this.weekBtn : 
                          this.dayBtn;
        let selectedBtnSprite = selectedBtn.getComponent(Sprite);
        this.changeBtnFrame(selectedBtnSprite, "textureV2/userCenter/member1/spriteFrame").then();
        [this.mouthBtn, this.weekBtn, this.dayBtn].forEach(btn => {
            if (btn !== selectedBtn) {
                this.changeBtnFrame(btn.getComponent(Sprite), "textureV2/userCenter/member2/spriteFrame").then();
            }
        });
    }

    /**
     * 创建订单返回
     */
    private onVipOrderCreated(data) {
        // 创建订单完成后，并拉起微信支付
        this._vipModel.requestWxPay(data);
    }

    /**
     * 支付返回
     * @param orderId 
     */
    private onVipPayResult(orderId) {
        // 支付完成后，查询订单
        this.typeNode.active = false;
        this.renewalBtn.active = false;
        this.descLabel.node.active = false;
        this.childNode.active = false;

        this.settlementNode.active = true;
        this.timeNode.active = false;
        this.gotoBtn.active = false;
        this.label0.node.active = true;
        this.label1.node.active = false;
        this.label2.node.active = false;
        this.iconNode.active = true;



        // this.createWaveTextAnimation("正在查询订单...", this.label0);
        // this._vipModel.requestGetOrder(orderId);
    }

    /**
     * 获取订单返回
     */
    private onVipGetOrder(vipOrder: VipOrder) {
        this.gotoBtn.active = true;
        let btnLabel = this.gotoBtn.getChildByName("label").getComponent(Label);
        if (vipOrder.status == 1) {
            
            
            this.label1.node.active = true;
            this.label2.node.active = true;
            this.timeNode.active = true;
            const userData: UserInfoData = PersonalCenterManager.getInstance().userInfoData;
            this.createWaveTextAnimation(`您的会员有效期:${vipOrder.validDays}天`, this.label0);
            this.label1.string = `${vipOrder.validStartDate} 至 ${vipOrder.validEndDate}`;
            this.timeLabel.string = `您的会员剩余:${vipOrder.validLostDays}天`;
            if(!userData.has_initial_tier){
                btnLabel.string = "立即开始初次评测";
            }else{
                btnLabel.string = "立即开始今日训练";
            }
            let icon = this.iconNode.getComponent(Sprite);
            if (icon) this.changeBtnFrame(icon, "textureV2/vip/completeIcon/spriteFrame").then(() => {
                this.gotoBtn.on(Node.EventType.TOUCH_END, () => {
                    if(TaskManager.getInstance().getCurTaskId == -1){
                        if(!userData.has_initial_tier){  
                            EventManager.getInstance().on(TaskManager.RequestInitTaskCallback, ()=>{
                                SceneManager.getInstance().backToSkewersGameCenter();
                            }, this,true);
                            TaskManager.getInstance().requestInitLevalTask();
                        }else{
                            EventManager.getInstance().on(TaskManager.TaskListRequestCallBack, ()=>{
                                SceneManager.getInstance().backToTaskProgress();
                            }, this,true);
                            TaskManager.getInstance().requestTaskList();
                        }
                    }else{
                        SceneManager.getInstance().backToTaskProgress();
                    }
                }, this);
            });
        } else {
            this.gotoBtn.active = true;
            this.label1.node.active = false;
            this.label2.node.active = false;
            this.timeNode.active = false;
           
            btnLabel.string = "返回首页";
            this.gotoBtn.on(Node.EventType.TOUCH_END, () => {
                SceneManager.getInstance().backToHall();
            }, this);
            this.createWaveTextAnimation("未查询到订单状态", this.label0);
        }

    }



    onDestroy(): void {
    }

    backHandler() {
        if (this.addressNode.active) {
            if (this.newAddressNode.active) {
                this.newAddressNode.active = false;
                this.addressScrollView.node.active = true;
                this.addAddressBtn.active = true;
                this.bigaddAddressBtn.getChildByName("label").getComponent(Label).string = "新建收货地址";
            } else {
                this.addressNode.active = false;
            }
            return;
        }

        // 移除VIP面板节点
        UIManager.getInstance().hidePanel(VipPanel.NAME);
    }

    buyHandler() {

        // 先发起请求创建订单
        this._vipModel.requestCreateOrder(this._select);



        // // 如果buyNode已经激活，直接调用showSettleMent
        // if (this.buyNode.active) {
        //     this.showSettleMent();
        //     return;
        // }

        // this.typeNode.active = false;
        // this.renewalBtn.active = true;
        // this.descLabel.node.active = false;
        // this.childNode.active = true;
        // this.permanentNode.active = false;
        // this.backBtn.active = false;
        // this.quanyiNode.active = false;
        // this.addressNode.active = false;
        // this.buyNode.active = true;
        // this.settlementNode.active = false;
    }

    showAddress() {
        this.typeNode.active = false;
        this.renewalBtn.active = false;
        this.descLabel.node.active = false;
        this.childNode.active = true;
        this.permanentNode.active = false;
        this.backBtn.active = false;
        this.quanyiNode.active = false;
        this.addressNode.active = true;
        this.buyNode.active = false;
        this.settlementNode.active = false;
    }

    selectBuyType(evetn, data) {
        // 如果点击的是当前已选中的支付方式，则不做任何操作
        if (this._selectedPaymentType === Number(data)) {
            return;
        }

        // 更新选中的支付方式
        this._selectedPaymentType = Number(data);

        // 重置所有支付方式按钮的选中状态
        this.resetPaymentButtons();

        // 根据选择的支付方式设置对应的按钮为选中状态
        switch (this._selectedPaymentType) {
            case 0: // 支付宝
                this.setPaymentButtonSelected(this.alipayNode, true);
                break;
            case 1: // 微信
                this.setPaymentButtonSelected(this.wechatNode, true);
                break;
            case 2: // 扫码
                this.setPaymentButtonSelected(this.scanNode, true);
                break;
        }

        DebugLog.instance.log(`选择支付方式: ${this._selectedPaymentType}`);
    }

    // private showSettleMent() {
    //     this.typeNode.active = false;
    //     this.renewalBtn.active = false;
    //     this.descLabel.node.active = false;
    //     this.childNode.active = false;
    //     this.settlementNode.active = true;
    //     this.createWaveTextAnimation("正在确认支付结果...", this.label0);
    //     let icon = this.iconNode.getComponent(Sprite);
    //     // 5秒后更新支付状态
    //     this.scheduleOnce(() => {
    //         this.createWaveTextAnimation("支付成功", this.label0);
    //         this.label1.node.active = true;
    //         this.createWaveTextAnimation("正在为您返回首页...", this.label1);
    //         if (icon) this.changeBtnFrame(icon, "textureV2/vip/completeIcon/spriteFrame").then(() => {
    //             // 再过5秒跳转到首页
    //             this.scheduleOnce(() => {
    //                 SceneManager.getInstance().backToHall();
    //             }, 5);
    //         });


    //     }, 5);
    // }

    private _select = 0;

    cardClick(event, index: number) {
        let vipData = this._vipModel.vipDatas[Number(index)];
        this._select = vipData.id;
        this.selectLabel.string = `*您已选择<color=#000000><b><size=40>${vipData.name}</size></b></color>模式`;

        this.setBtnFrame(vipData.periodUnit);
    
        // let mouthBtnSprite = this.mouthBtn.getComponent(Sprite);
        // let yearBtnSprite = this.yearBtn.getComponent(Sprite);

        // if (vipData.periodUnit != "month") {
        //     // 选择月卡：月卡显示橙色，年卡显示白色
        //     this.changeBtnFrame(mouthBtnSprite, "textureV2/vip/rect_orange/spriteFrame").then();
        //     this.changeBtnFrame(yearBtnSprite, "textureV2/vip/rect_white/spriteFrame").then();
        // } else {
        //     // 选择年卡：月卡显示白色，年卡显示橙色
        //     this.changeBtnFrame(mouthBtnSprite, "textureV2/vip/rect_white/spriteFrame").then();
        //     this.changeBtnFrame(yearBtnSprite, "textureV2/vip/rect_orange/spriteFrame").then();
        // }
    }


    openSelect() {
        this.selectNode.active = true;

        // 设置SelectDate组件的回调（可选，用于实时预览）
        if (this.selectDateComponent) {
            this.selectDateComponent.callback = (province: string, city: string, district: string) => {
                // 这里可以添加实时预览逻辑，目前留空
            };
        }

        this.playSelectOpenAnimation();
    }

    okClick() {
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

    cancelClick() {
        this.playSelectCloseAnimation(() => {
            this.selectNode.active = false;
        });
    }

    private _defaultBoo = false;
    selectDefaultHandler() {
        // 设置默认地址
        this._defaultBoo = !this._defaultBoo;
        let url = this._defaultBoo ? "textureV2/vip/completeIcon/spriteFrame" : "textureV2/vip/selectBG/spriteFrame";
        this.changeBtnFrame(this.defaultBtn.getComponent(Sprite), url).then();

        // 如果设置为默认地址，保存当前正在编辑的地址信息
        if (this._defaultBoo) {
            this._currentEditingAddress = this.addressLabel.string + " " + this.addressInput.string;
            this._currentEditingName = this.nameInput.string;
            this._defaultPhone = this.PhoneInput.string;
        }
    }

    addNewAddressHandler() {
        if (this.newAddressNode.active) {
            if (this.nameInput.string == "" || this.nameInput.string == "请输入收货人姓名") {
                AlertManager.getInstance().showSocketAlert('请输入收货人姓名');
                return;
            }
            if (this.PhoneInput.string == "" || this.PhoneInput.string == "请输入收货人手机号码") {
                AlertManager.getInstance().showSocketAlert('请输入收货人电话');
                return;
            }
            if (this.addressLabel.string == "" || this.addressLabel.string == "请选择") {
                AlertManager.getInstance().showSocketAlert('请输入收货地址');
                return;
            }
            if (this.addressInput.string == "" || this.addressInput.string == "请输入道路，门牌号，小区，楼栋号，单元室等") {
                AlertManager.getInstance().showSocketAlert('请输入详细收货地址');
                return;
            }


            // 实例化地址条目预制体
            let node = instantiate(this._addressItemPrefab);
            this.addressScrollViewContent.addChild(node);
            node.active = true;

            // 获取节点中的组件
            let nameLabel = node.getChildByName("nameLabel")?.getComponent(Label);
            let addressLabel = node.getChildByName("addressLabel")?.getComponent(Label);
            let changeBtn = node.getChildByName("changeBtn")?.getComponent(Sprite);
            let selectBtn = node.getChildByName("selectBtn")?.getComponent(Sprite);

            // 设置文本内容
            if (nameLabel) {
                nameLabel.string = this.nameInput.string;
            }
            if (addressLabel) {
                // 将手机号信息包含在地址文本中，格式：地址 + 手机号
                addressLabel.string = this.addressLabel.string + " " + this.addressInput.string + " " + this.PhoneInput.string;
            }

            // 检查是否为默认地址，如果是则设置selectIcon为completeIcon
            let currentAddress = this.addressLabel.string + " " + this.addressInput.string + " " + this.PhoneInput.string;
            let currentName = this.nameInput.string;
            if (this.isDefaultAddress(currentName, currentAddress)) {
                if (selectBtn) {
                    this.changeBtnFrame(selectBtn, "textureV2/vip/completeIcon/spriteFrame").then();
                }
            }

            // 为按钮添加点击事件
            let changeBtnNode = node.getChildByName("changeBtn");
            let selectBtnNode = node.getChildByName("selectBtn");

            if (changeBtnNode) {
                changeBtnNode.on(Node.EventType.TOUCH_END, () => {
                    this.onChangeBtnClick(node);
                }, this);
            }

            if (selectBtnNode) {
                selectBtnNode.on(Node.EventType.TOUCH_END, () => {
                    this.onSelectBtnClick(node);
                }, this);
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


    private async changeBtnFrame(btnSprite: Sprite, url): Promise<void> {
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

    /**
     * 修改按钮点击事件处理
     * @param addressNode 地址条目节点
     */
    private onChangeBtnClick(addressNode: Node) {
        // 获取当前地址信息
        let nameLabel = addressNode.getChildByName("nameLabel")?.getComponent(Label);
        let addressLabel = addressNode.getChildByName("addressLabel")?.getComponent(Label);

        // 填充到编辑表单中
        if (nameLabel) {
            this.nameInput.string = nameLabel.string;
        }
        if (addressLabel) {
            // 解析地址信息，包括手机号
            let addressText = addressLabel.string;
            let parts = addressText.split(' ');
            if (parts.length >= 4) {
                // 假设格式为：省 市 区 详细地址 手机号
                let phoneNumber = parts[parts.length - 1]; // 最后一个部分为手机号
                this.PhoneInput.string = phoneNumber;

                // 重新组合地址部分（省 市 区 详细地址）
                let addressParts = parts.slice(0, parts.length - 1);
                if (addressParts.length >= 3) {
                    // 前三个部分为省市区
                    this.addressLabel.string = addressParts.slice(0, 3).join(' ');
                    // 剩余部分为详细地址
                    this.addressInput.string = addressParts.slice(3).join(' ');
                }
            }
        }

        // 检查当前地址是否为默认地址
        if (nameLabel && addressLabel) {
            let currentName = nameLabel.string;
            let currentAddress = addressLabel.string;
            this._defaultBoo = this.isDefaultAddress(currentName, currentAddress);

            // 更新defaultBtn的图标
            let url = this._defaultBoo ? "textureV2/vip/completeIcon/spriteFrame" : "textureV2/vip/selectBG/spriteFrame";
            this.changeBtnFrame(this.defaultBtn.getComponent(Sprite), url).then();
        }

        // 切换到编辑模式
        this.addressScrollView.node.active = false;
        this.addAddressBtn.active = false;
        this.newAddressNode.active = true;
        this.bigaddAddressBtn.getChildByName("label").getComponent(Label).string = "修改";

        // 移除原节点
        addressNode.removeFromParent();
        addressNode.destroy();
    }

    /**
     * 选择按钮点击事件处理
     * @param addressNode 地址条目节点
     */
    private onSelectBtnClick(addressNode: Node) {
        // 获取当前地址信息
        let nameLabel = addressNode.getChildByName("nameLabel")?.getComponent(Label);
        let addressLabel = addressNode.getChildByName("addressLabel")?.getComponent(Label);

        // 设置为默认地址
        if (nameLabel && addressLabel) {
            // 清除之前的默认地址状态
            this._defaultBoo = false;
            this._currentEditingAddress = "";
            this._currentEditingName = "";

            // 保存默认地址信息
            this._defaultAddressName = nameLabel.string;
            this._defaultAddress = addressLabel.string;

            // 解析地址文本中的手机号信息
            let addressText = addressLabel.string;
            let parts = addressText.split(' ');
            if (parts.length >= 4) {
                // 假设格式为：省 市 区 详细地址 手机号
                this._defaultPhone = parts[parts.length - 1]; // 最后一个部分为手机号
            }

            // 更新 buyNode 上的地址显示
            this.updateBuyNodeAddressDisplay();

            DebugLog.instance.log(`设置默认地址: ${nameLabel.string} - ${addressLabel.string}`);

            // 更新UI显示，例如高亮显示选中的地址
            this.updateSelectedAddress(addressNode);

            // 返回 buyNode
            this.backToBuyNode();
        }
    }

    /**
     * 更新选中地址的显示状态
     * @param selectedNode 选中的地址节点
     */
    private updateSelectedAddress(selectedNode: Node) {
        // 遍历所有地址条目，重置选中状态
        let children = this.addressScrollViewContent.children;
        for (let child of children) {
            let selectBtn = child.getChildByName("selectBtn")?.getComponent(Sprite);
            if (selectBtn) {
                // 重置为未选中状态
                this.changeBtnFrame(selectBtn, "textureV2/vip/selectBG/spriteFrame").then();
            }
        }

        // 设置当前节点为选中状态
        let currentSelectBtn = selectedNode.getChildByName("selectBtn")?.getComponent(Sprite);
        if (currentSelectBtn) {
            this.changeBtnFrame(currentSelectBtn, "textureV2/vip/completeIcon/spriteFrame").then();
        }
    }

    private createWaveTextAnimation(text: string, targetLabel?: Label) {
        // 如果没有传入targetLabel，默认使用label0
        const label = targetLabel || this.label0;

        DebugLog.instance.log(`开始创建波浪动画: ${text}`);

        // 先停止之前的波浪动画
        this._isWaveAnimating = false;
        this._waveNodes = [];

        // 清空label节点下的所有子节点
        label.node.removeAllChildren();

        // 隐藏原始label组件，但保持节点可见
        label.enabled = false;

        // 为每个字符创建独立的Label节点
        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            // 创建字符节点
            const charNode = new Node(`char_${i}`);
            label.node.addChild(charNode);

            // 添加Label组件
            const charLabel = charNode.addComponent(Label);
            charLabel.string = char;

            // 复制原始label的属性
            charLabel.fontSize = label.fontSize;
            charLabel.fontFamily = label.fontFamily;
            charLabel.color = label.color;
            charLabel.horizontalAlign = label.horizontalAlign;
            charLabel.verticalAlign = label.verticalAlign;

            // 设置位置（水平排列，居中显示）
            const charWidth = charLabel.fontSize * 1.2; // 增加字符间距
            const totalWidth = text.length * charWidth;
            const startX = -totalWidth / 2 + charWidth / 2;
            charNode.setPosition(startX + i * charWidth, 0, 0);

            // 只有省略号才添加到波浪节点数组中进行动画
            if (char === '.') {
                this._waveNodes.push(charNode);
                DebugLog.instance.log(`创建省略号节点: ${char}, 位置: ${charNode.position.x}, ${charNode.position.y}`);
            } else {
                DebugLog.instance.log(`创建文字节点: ${char}, 位置: ${charNode.position.x}, ${charNode.position.y}`);
            }
        }

        // 开始波浪动画
        this._waveTime = 0;
        this._isWaveAnimating = true;
    }

    update(deltaTime: number) {
        if (this._isWaveAnimating && this._waveNodes.length > 0) {
            this._waveTime += deltaTime;

            for (let i = 0; i < this._waveNodes.length; i++) {
                const charNode = this._waveNodes[i];
                const originalY = 0;
                const waveHeight = 15;
                const waveSpeed = 5.0; // 波浪速度
                const delay = i * 0.3; // 每个字符的延迟

                // 计算波浪位置
                const time = this._waveTime - delay;
                if (time > 0) {
                    const waveY = originalY + Math.sin(time * waveSpeed) * waveHeight;
                    charNode.setPosition(charNode.position.x, waveY, charNode.position.z);
                }
            }
        }
    }

    private stopWaveTextAnimation(targetLabel?: Label) {
        // 如果没有传入targetLabel，默认使用label0
        const label = targetLabel || this.label0;

        DebugLog.instance.log(`停止波浪动画`);

        // 停止波浪动画
        this._isWaveAnimating = false;

        // 清空波浪节点数组
        this._waveNodes = [];

        // 清空label节点下的所有子节点
        label.node.removeAllChildren();

        // 恢复原始label组件
        label.enabled = true;
    }

    /**
     * 更新 buyNode 上的地址显示
     */
    private updateBuyNodeAddressDisplay() {
        if (this.buyNodeAddressLabel) {
            if (this._defaultAddress && this._defaultAddressName) {
                this.buyNodeAddressLabel.string = `${this._defaultAddressName} ${this._defaultAddress}`;
            } else {
                this.buyNodeAddressLabel.string = "请选择收货地址";
            }
        }
    }

    /**
     * 返回到 buyNode
     */
    private backToBuyNode() {
        this.typeNode.active = false;
        this.renewalBtn.active = true;
        this.descLabel.node.active = false;
        this.childNode.active = true;
        this.permanentNode.active = false;
        this.quanyiNode.active = false;
        this.addressNode.active = false;
        this.buyNode.active = true;
        this.settlementNode.active = false;

        // 更新 buyNode 上的显示信息
        this.updateBuyNodeDisplay();
    }

    /**
     * 更新 buyNode 上的显示信息
     */
    private updateBuyNodeDisplay() {
        // 更新姓名和手机号显示
        if (this.buyNodeNameLabel) {
            if (this._defaultAddressName && this._defaultPhone) {
                this.buyNodeNameLabel.string = `${this._defaultAddressName}   ${this._defaultPhone}`;
            } else {
                this.buyNodeNameLabel.string = "请选择收货人信息";
            }
        }

        // 更新地址显示
        if (this.buyNodeAddressLabel) {
            if (this._defaultAddress) {
                // 移除手机号，只显示地址部分
                let addressParts = this._defaultAddress.split(' ');
                if (addressParts.length > 1) {
                    // 移除最后一个部分（手机号）
                    addressParts.pop();
                    this.buyNodeAddressLabel.string = addressParts.join(' ');
                } else {
                    this.buyNodeAddressLabel.string = this._defaultAddress;
                }
            } else {
                this.buyNodeAddressLabel.string = "请选择收货地址";
            }
        }
    }

    /**
     * 判断给定的地址是否为默认地址
     * @param name 收货人姓名
     * @param address 完整地址
     * @returns 是否为默认地址
     */
    private isDefaultAddress(name: string, address: string): boolean {
        // 检查是否与保存的默认地址信息匹配
        return this._defaultAddressName === name && this._defaultAddress === address;
    }

    /**
     * 重置所有支付方式按钮的选中状态
     */
    private resetPaymentButtons() {
        this.setPaymentButtonSelected(this.alipayNode, false);
        this.setPaymentButtonSelected(this.wechatNode, false);
        this.setPaymentButtonSelected(this.scanNode, false);
    }

    /**
     * 设置支付方式按钮的选中状态
     * @param buttonNode 按钮节点
     * @param isSelected 是否选中
     */
    private setPaymentButtonSelected(buttonNode: Node, isSelected: boolean) {
        if (!buttonNode) {
            DebugLog.instance.error(`支付方式按钮节点不存在`);
            return;
        }

        let buttonSprite = buttonNode.getComponent(Sprite);
        if (!buttonSprite) {
            DebugLog.instance.error(`支付方式按钮 ${buttonNode.name} 未找到 Sprite 组件`);
            return;
        }

        // 根据选中状态设置不同的图标
        let iconUrl = isSelected ? "textureV2/vip/completeIcon/spriteFrame" : "textureV2/vip/selectBG/spriteFrame";
        this.changeBtnFrame(buttonSprite, iconUrl).then(() => {
            DebugLog.instance.log(`设置支付方式按钮 ${buttonNode.name} 选中状态: ${isSelected}`);
        }).catch((err) => {
            DebugLog.instance.error(`设置支付方式按钮图标失败: ${err}`);
        });
    }

}
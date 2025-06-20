import { BasePanel } from "db://assets/resources/scripts/Core/UI/BasePanel";

import { _decorator, Prefab, instantiate, Label, Node, ScrollView, Sprite, resources, SpriteFrame, tween, UIOpacity, Vec3, EditBox } from "cc";
import { SceneManager } from "../../../Core/Manager/Scene/SceneManager";
import { DebugLog } from "db://assets/resources/scripts/Core/Util/DebugLog";
import { SelectDate } from "./SelectDate";
import { AlertManager } from "../../../Core/Manager/Alert/AlertManager";
import { AlertType } from "db://assets/resources/scripts/Game/UI/Alert/GameAlert";
import { VipEvent, VipModel, VipType } from "./VipModel";
import { Global } from "../../../Core/Manager/Config/Global";
import { PersonalCenterManager } from "../../PersonalCenterManager/PersonalCenterManager";
import {UIManager} from "db://assets/resources/scripts/Core/Manager/UI/UIManager";
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

    @property(Node)
    permanentNode:Node;

    //===== 权益
    @property(Node)
    quanyiNode: Node;

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
    settlementNode:Node;


    private _vipModel: VipModel;

    private _addressItemPrefab: Prefab;

    public static NAME: string = "VipPanel";

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
       this._vipModel.requestVipData();
       let userInfoData = PersonalCenterManager.getInstance().userInfoData;
       if (userInfoData.member) {
           // 会员
           this.typeNode.active = true;
           this.quanyiNode.active = false;
           if (userInfoData.getMemberRemainingDays() <= 3) {
               this.descLabel.node.active = true;
               this.descLabel.string = "您的会员将在" + userInfoData.getMemberRemainingDays() + "天后到期";
           }else{
               this.descLabel.node.active = false;
           }
           this.renewalBtnLabel.string = "点击续费";
       } else {
           // 非会员
           this.typeNode.active = true;
           this.quanyiNode.active = true;
           this.renewalBtnLabel.string = "确认协议并开通";
       }
    }

    onEnable(): void {
       
        this._vipModel.on(VipEvent.VIP_DATA_UPDATED, this.onVipDataUpdated.bind(this), this,true);
        // this._vipModel.on(VipEvent.ADDRESS_ADDED,this.onAddAddress.bind(this),this);
        // this._vipModel.on(VipEvent.ADDRESS_DELETED,this.onDeletedAddress.bind(this),this);
    }

    onDisable(): void {
        this._vipModel.offAllByContext(this);
    }

    private onVipDataUpdated(data: any) {
        let vipDatas = data.vipDatas;
        let len = vipDatas.length;
        for (let i: number = 0; i < len; i++) {
            let vipData = vipDatas[i];
            if (vipData.type == VipType.Day) {
                this.mouthBtn.active = true;
            } else if (vipData.type == VipType.Mouth) {
                this.yearBtn.active = true;
            }
        }
        
        // 默认选择月卡
        this._select = 0;
        this.selectLabel.string = "已选择月卡";
        
        // 设置按钮颜色：月卡橙色，年卡白色
        let mouthBtnSprite = this.mouthBtn.getComponent(Sprite);
        let yearBtnSprite = this.yearBtn.getComponent(Sprite);
        
        if (mouthBtnSprite) {
            this.changeBtnFrame(mouthBtnSprite, "textureV2/vip/rect_orange/spriteFrame").then();
        }
        if (yearBtnSprite) {
            this.changeBtnFrame(yearBtnSprite, "textureV2/vip/rect_white/spriteFrame").then();
        }
    }

    private onAddAddress() {

    }

    private onDeletedAddress() {

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
        this.typeNode.active = false;
        this.renewalBtn.active = false;
        this.descLabel.node.active = false;
        this.childNode.active = false;
        this.settlementNode.active = true;
    }

    private _select = 0;

    cardClick(event, index: number) {
        this._select = Number(index);
        this.selectLabel.string = this._select == 0 ? "已选择月卡" : "已选择日卡";
        
        let mouthBtnSprite = this.mouthBtn.getComponent(Sprite);
        let yearBtnSprite = this.yearBtn.getComponent(Sprite);
        
        if (this._select == 0) {
            // 选择月卡：月卡显示橙色，年卡显示白色
            this.changeBtnFrame(mouthBtnSprite, "textureV2/vip/rect_orange/spriteFrame").then();
            this.changeBtnFrame(yearBtnSprite, "textureV2/vip/rect_white/spriteFrame").then();
        } else {
            // 选择年卡：月卡显示白色，年卡显示橙色
            this.changeBtnFrame(mouthBtnSprite, "textureV2/vip/rect_white/spriteFrame").then();
            this.changeBtnFrame(yearBtnSprite, "textureV2/vip/rect_orange/spriteFrame").then();
        }
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
                addressLabel.string = this.addressLabel.string + " " + this.addressInput.string;
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
            // 解析地址信息，可能需要根据实际格式调整
            let addressText = addressLabel.string;
            // 这里可以根据实际地址格式进行解析
            // 例如：将完整地址分解为省市区和详细地址
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
            // 可以在这里保存选中的地址信息
            DebugLog.instance.log(`选中地址: ${nameLabel.string} - ${addressLabel.string}`);

            // 更新UI显示，例如高亮显示选中的地址
            this.updateSelectedAddress(addressNode);
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



}
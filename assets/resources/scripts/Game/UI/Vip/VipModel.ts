import { native, sys } from "cc";
import { AlertManager, AlertData } from "../../../Core/Manager/Alert/AlertManager";
import { EventManager } from "../../../Core/Manager/Event/EventManager";
import { SocketData } from "../../../Core/Manager/Net/SocketData";
import { SocketManager } from "../../../Core/Manager/Net/SocketManager";
import { DebugLog } from "../../../Core/Util/DebugLog";
import { NativeEvent } from "../../../Core/Manager/Event/NativeEvent";
import { NativeEventManager } from "../../../Core/Manager/Event/NativeEventManager";
import { UserInfoData } from "../../PersonalCenterManager/UserInfoData";
import { PersonalCenterManager } from "../../PersonalCenterManager/PersonalCenterManager";

export enum VipType {
    /**
     * 非会员
     */
    // None = 0,
    /**
     * 日卡会员
     */
    Day = 'day',
    Week = 'week',
    Mouth = 'month',
    /**
     * 年卡会员
     */
    // Year = 3,
    /**
     * 永久会员
     */
    // Forever = 4,
}

// VIP相关事件枚举
export enum VipEvent {

    /**
     * 获取VIP数据
     */
    VIP_GET_DATA = "VIP_GET_DATA",

    /**
     * 创建订单
     */
    VIP_ORDER_CREATED = "VIP_ORDER_CREATED",

    /**
     * 查询订单
     */
    VIP_GET_ORDER = "VIP_GET_ORDER",

    /**
     * 支付结果
     */
    VIP_PAY_RESULT = "VIP_PAY_RESULT",
}

export class VipData {

    /**
     * 会员卡名字
     */
    public name: string = "";

    /**
     * 会员卡消费金额
     */
    public price: number = 0;

    /**
     * 会员类型
     */
    // public type: string = '';

    /**
     * 会员卡ID
     */
    public id: number = 0;

    /**
     * 赠送天数
     */
    public bonusDay: number = 0;

    /**
     * 折扣价格
     */
    public discountPrice: number = 0;

    /**
     * 描述
     */
    public description: string = "";

    /**
     * 周期单位 (day, month, year)
     */
    public periodUnit: string = "";

    /**
     * 周期数量
     */
    public periodCount: number = 0;


    constructor() {
    }

    /**
     * 从服务器数据刷新VIP数据
     * @param data 服务器返回的数据
     */
    refrehData(data: any) {
        if (!data) return;

        // 基础信息
        this.id = data['id'] || 0;
        this.name = data['name'] || "";
        this.price = data['price'] || 0;
        this.discountPrice = data['discount_price'] || 0;
        this.description = data['description'] || "";
        this.periodUnit = data['period_unit'] || "";
        this.periodCount = data['period_count'] || 0;
        this.bonusDay = data['bonus_days'] || 0;
        // 根据周期单位设置会员类型
    }

    /**
     * 根据周期单位设置会员类型
     */

    /**
     * 获取显示价格（优先显示折扣价）
     */
    getDisplayPrice(): number {
        return this.discountPrice > 0 ? this.discountPrice : this.price;
    }

    /**
     * 是否有折扣
     */
    hasDiscount(): boolean {
        return this.discountPrice > 0 && this.discountPrice < this.price;
    }

    /**
     * 获取折扣百分比
     */
    getDiscountPercentage(): number {
        if (!this.hasDiscount()) return 0;
        return Math.round((1 - this.discountPrice / this.price) * 100);
    }

    /**
     * 获取周期显示文本
     */
    getPeriodDisplayText(): string {
        const unitMap = {
            "day": "天",
            "month": "月",
            "year": "年"
        };

        const unitText = unitMap[this.periodUnit] || this.periodUnit;
        return `${this.periodCount}${unitText}`;
    }
}

export class VipOrder {
    /**
     * 订单id
     */
    public id: number = 0;
    /**
     * 订单金额
     */
    public amount: number = 0;
    /**
     * 订单描述
     */
    public desc: string = "";
    /**
     * 随机数字
     */
    public noncestr: string = "";

    /**
     * 订单是否创建成功
     */
    public status: number = 0; // 0 未成功 1 成功
    /**
     * 订单创建时间
     */
    public created_at: string = ""; //"2025-07-09 12:42:03",
    /**
     * 订单完成时间
     */
    public finished_at: string = null  // 完成时间

    /**
     * 会员有效期(天)
     */
    public validDays:number = 0;

    /**
     * 会员开启时间
     */
    public validStartDate:string = "";

    /**
     * 会员结束时间
     */
    public validEndDate:string = "";


    /**
     * 会员剩余天数
     */
    public validLostDays:string = "";

}


export class VipModel {

    private _vipDatas: VipData[];

    public get vipDatas(): VipData[] {
        if (!this._vipDatas) {
            this._vipDatas = [];
        }
        return this._vipDatas;
    }


    /**
     * 请求会员计划
     */
    public static MemberShip_Get_Plans: string = "membership.get_plans";


    /**
     * 创建订单
     */
    public static MemberShip_Create_Order: string = "membership.create_order";


    /**
     * 查询订单
     */
    public static MemberShip_Get_Order: string = "membership.get_order";


    constructor() {
    }

    init() {
        this.clearData();
    }


    //===== 请求协议
    /**
     * 请求会员权限等一些数据
     */
    requestGetVipData() {
        let requestData: SocketData = new SocketData({
            action: VipModel.MemberShip_Get_Plans
        });
        EventManager.getInstance().on(VipModel.MemberShip_Get_Plans, this.requestGetVipDataCallBack.bind(this), this, true);
        SocketManager.getInstance().send(requestData);
    }

    private requestGetVipDataCallBack(data: SocketData) {
        let status = data.status;
        if (status == 0) {
            AlertManager.getInstance().showSocketAlert(data.message);
            return;
        }

        let results = data.data["result"];
        let len = results.length;
        for (let i: number = 0; i < len; i++) {
            let vipdata = new VipData();
            vipdata.refrehData(results[i]);
            this.vipDatas.push(vipdata);
        }
        EventManager.getInstance().emit(VipEvent.VIP_GET_DATA);
    }


    /**
     * 请求生成订单
     */
    requestCreateOrder(id: number) {
        let requestData: SocketData = new SocketData({
            action: VipModel.MemberShip_Create_Order,
            data: {
                plan_id: id
            }
        });
        EventManager.getInstance().on(VipModel.MemberShip_Create_Order, this.requestCreateOrderCallBack.bind(this), this, true);
        SocketManager.getInstance().send(requestData);
    }

    private requestCreateOrderCallBack(data: SocketData) {
        let status = data.status;
        if (status == 0) {
            AlertManager.getInstance().showSocketAlert(data.message);
            return;
        }
        let id = data.data["order_id"];
        let amount = data.data["order_amount"];
        let desc = data.data["order_desc"];
        let noncestr = data.data["nonce_str"];
        EventManager.getInstance().emit(VipEvent.VIP_ORDER_CREATED,{
            order_id: id,
            order_amount: amount,
            order_desc: desc,
            nonce_str: noncestr
        });
    }


    private _preResultID:string = "";
    /**
     * 请求拉起微信支付
     * @param data
     */
    public requestWxPay(data) {
        this._preResultID = data.order_id;
        if (sys.platform === sys.Platform.ANDROID) {
            DebugLog.instance.error(`请求拉起微信支付`);
            // 由于服务端没有实现支付结果回调，直接发送支付请求
            native.bridge.sendToNative(NativeEvent.WXPAY, JSON.stringify(data));

            // 直接弹出主动查询订单的弹窗
            this.showOrderQueryAlert(data.order_id);
        }else{

            this.showOrderQueryAlert(data.order_id);
            // var testData = {
            //     result:1,
            //     order_id:data.order_id
            // }

            // this.payResultCallBack(JSON.stringify(testData));
        }
    }

    /**
     * 显示主动查询订单的弹窗
     * @param orderId 订单ID
     */
    private showOrderQueryAlert(orderId: number) {
        const alertData: AlertData = new AlertData();
        alertData.title = "主动查询订单";
        alertData.message = "支付请求已发送，请点击按钮查询订单状态";
        alertData.cancelButtonVisible = false;
        alertData.confirmButtonText = "查询订单";
        alertData.confirmCb = () => {
            // 点击查询订单按钮时调用requestGetOrder方法
            this.requestGetOrder(orderId);
        };

        AlertManager.getInstance().showAlert(alertData);
    }


    private payResultCallBack(data) {
        DebugLog.instance.error(`返回支付结果`);
        if (sys.platform === sys.Platform.ANDROID) {
            NativeEventManager.getInstance().off(NativeEvent.PAYMENTResult, this);
        }
        let payData = JSON.parse(data);
        let status = payData.result;
        if(status == 0){
            AlertManager.getInstance().showSocketAlert("支付失败");
            return;
        }
        let orderId = payData.order_id;
        if(orderId == this._preResultID){
            EventManager.getInstance().emit(VipEvent.VIP_PAY_RESULT, orderId);
        }else{
            AlertManager.getInstance().showSocketAlert("当前订单过期");
        }
    }


    /**
     * 请求查询订单
     * @param id 订单id
     */
    public requestGetOrder(id: number) {
        let requestData: SocketData = new SocketData({
            action: VipModel.MemberShip_Get_Order,
            data: {
                order_id: id
            }
        });
        EventManager.getInstance().on(VipModel.MemberShip_Get_Order, this.requestGetOrderCallBack.bind(this), this, true);
        SocketManager.getInstance().send(requestData);
    }

    private requestGetOrderCallBack(data: SocketData) {
        let _status = data.status;
        if (_status == 0) {
            AlertManager.getInstance().showSocketAlert(data.message);
            return;
        }
        let vipOrder = new VipOrder();
        vipOrder.id = data.data["order_id"];
        vipOrder.amount = data.data["order_amount"];
        vipOrder.desc = data.data["order_desc"];
        vipOrder.noncestr = data.data["nonce_str"];
        vipOrder.status = data.data["status"];
        vipOrder.created_at = data.data["created_at"];
        vipOrder.finished_at = data.data["finished_at"];
        if(data.data["detail"]){
            vipOrder.validDays = data.data["detail"]["plan_valid_days"];
            vipOrder.validStartDate = data.data["detail"]["start_date"];
            vipOrder.validEndDate = data.data["detail"]["end_date"];
            vipOrder.validLostDays = data.data["detail"]["membership_valid_days"];
        }

        // 手动刷新下人物信息
        PersonalCenterManager.getInstance().requestUserInfo();

        // 当订单查询成功时，模拟支付结果回调
        if (vipOrder.status == 1) {
            // 模拟支付成功的回调
            const mockPayData = {
                result: 1,
                order_id: vipOrder.id
            };
            this.payResultCallBack(JSON.stringify(mockPayData));
        }

        EventManager.getInstance().emit(VipEvent.VIP_GET_ORDER,vipOrder);
    }


    clearData() {
        // VipModel本身不需要清理事件，因为使用的是EventManager
        // 但可以在这里清理数据
        this._vipDatas = null;
    }

    /**
     * 销毁时清理
     */
    destroy() {
        this.clearData();
    }

}
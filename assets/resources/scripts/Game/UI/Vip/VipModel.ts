import { AlertData, AlertManager } from "../../../Core/Manager/Alert/AlertManager";
import { EventManager } from "../../../Core/Manager/Event/EventManager";
import { SocketData } from "../../../Core/Manager/Net/SocketData";
import { SocketManager } from "../../../Core/Manager/Net/SocketManager";
import { DebugLog } from "../../../Core/Util/DebugLog";

export enum VipType {
    /**
     * 非会员
     */
    None = 0,
    /**
     * 日卡会员
     */
    Day = 1,
    /**
     * 月卡会员
     */
    Mouth = 2,
    /**
     * 年卡会员
     */
    Year = 3,
    /**
     * 永久会员
     */
    Forever = 4,
}

// VIP相关事件枚举
export enum VipEvent {
    /**
     * VIP数据更新
     */
    VIP_DATA_UPDATED = "VIP_DATA_UPDATED",
    /**
     * VIP开通成功
     */
    VIP_OPEN_SUCCESS = "VIP_OPEN_SUCCESS",
    /**
     * VIP续费成功
     */
    VIP_RENEWAL_SUCCESS = "VIP_RENEWAL_SUCCESS",
    /**
     * 地址添加成功
     */
    ADDRESS_ADDED = "ADDRESS_ADDED",
    /**
     * 地址删除成功
     */
    ADDRESS_DELETED = "ADDRESS_DELETED",
    /**
     * 默认地址变更
     */
    DEFAULT_ADDRESS_CHANGED = "DEFAULT_ADDRESS_CHANGED",
    /**
     * VIP权限变更
     */
    VIP_PERMISSION_CHANGED = "VIP_PERMISSION_CHANGED"
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
    public type: number = 0;

    /**
     * 会员卡ID
     */
    public id: number = 0;

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

        // 根据周期单位设置会员类型
        this.setVipTypeByPeriodUnit();
    }

    /**
     * 根据周期单位设置会员类型
     */
    private setVipTypeByPeriodUnit() {
        switch (this.periodUnit.toLowerCase()) {
            case "day":
                this.type = VipType.Day;
                break;
            case "month":
                this.type = VipType.Mouth;
                break;
            case "year":
                this.type = VipType.Year;
                break;
            default:
                this.type = VipType.None;
                break;
        }
    }

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

export class VipAddress {


    public name: string = "";
    public address: string = "";
    public phone: string = "";

    /**
     * 是否是默认地址
     */
    public isDefault: boolean = false;



    constructor() {
    }
}

export class VipModel {

    public vipDatas: VipData[];

    public vipAddresses: VipAddress[];

    /**
     * 默认地址
     */
    public defaultAddress: VipAddress;

    /**
     * 请求会员计划
     */
    public static MemberShip_Get_Plans: string = "membership.get_plans";


    public static MemberShip_Buy: string = "membership.buy";


    constructor() {
    }

    init() {
        this.clearData();
    }

    addAddress(address: VipAddress) {
        this.vipAddresses.push(address);
        // 使用EventManager派发地址添加事件，将VipModel作为数据的一部分传递
        EventManager.getInstance().emit(VipEvent.ADDRESS_ADDED, {
            address: address,
            vipModel: this
        });
    }

    /**
     * 删除地址
     * @param address 要删除的地址
     */
    removeAddress(address: VipAddress) {
        const index = this.vipAddresses.findIndex(addr => addr === address);
        if (index !== -1) {
            this.vipAddresses.splice(index, 1);
            // 使用EventManager派发地址删除事件，将VipModel作为数据的一部分传递
            EventManager.getInstance().emit(VipEvent.ADDRESS_DELETED, {
                address: address,
                vipModel: this
            });
        }
    }

    /**
     * 设置默认地址
     * @param address 要设置为默认的地址
     */
    setDefaultAddress(address: VipAddress) {
        // 先取消其他地址的默认状态
        this.vipAddresses.forEach(addr => {
            addr.isDefault = false;
        });

        // 设置新的默认地址
        address.isDefault = true;
        this.defaultAddress = address;

        // 使用EventManager派发默认地址变更事件，将VipModel作为数据的一部分传递
        EventManager.getInstance().emit(VipEvent.DEFAULT_ADDRESS_CHANGED, {
            address: address,
            vipModel: this
        });
    }

    /**
     * 更新VIP数据
     * @param vipDatas 新的VIP数据
     */
    updateVipData(vipDatas: VipData[]) {
        this.vipDatas = vipDatas;
        // 使用EventManager派发VIP数据更新事件，将VipModel作为数据的一部分传递
        EventManager.getInstance().emit(VipEvent.VIP_DATA_UPDATED, {
            vipDatas: vipDatas,
            vipModel: this
        });
    }

    //===== 事件监听便捷方法 =====

    /**
     * 添加事件监听
     * @param eventName 事件名称
     * @param callback 回调函数
     * @param context 上下文对象
     * @param isOnce 是否只触发一次
     */
    on(eventName: string, callback: Function, context: any, isOnce: boolean = false) {
        EventManager.getInstance().on(eventName, callback, context, isOnce);
    }

    /**
     * 添加只触发一次的事件监听
     * @param eventName 事件名称
     * @param callback 回调函数
     * @param context 上下文对象
     */
    once(eventName: string, callback: Function, context: any) {
        EventManager.getInstance().once(eventName, callback, context);
    }

    /**
     * 移除事件监听
     * @param eventName 事件名称
     * @param context 上下文对象
     */
    off(eventName: string, context: any) {
        EventManager.getInstance().off(eventName, context);
    }

    /**
     * 移除指定上下文的所有事件监听
     * @param context 上下文对象
     */
    offAllByContext(context: any) {
        EventManager.getInstance().offAllByContext(context);
    }

    /**
     * 获取指定事件的监听器数量
     * @param eventName 事件名称
     */
    getListenerCount(eventName: string): number {
        return EventManager.getInstance().getListenerCount(eventName);
    }

    /**
     * 判断是否存在指定事件的监听器
     * @param eventName 事件名称
     */
    hasListener(eventName: string): boolean {
        return EventManager.getInstance().hasListener(eventName);
    }

    //===== 请求协议
    /**
     * 请求会员权限等一些数据
     */
    requestVipData() {
        let requestData: SocketData = new SocketData({
            action: VipModel.MemberShip_Get_Plans
        });
        EventManager.getInstance().on(VipModel.MemberShip_Get_Plans, this.requestVipDataCallBack.bind(this), this, true);
        SocketManager.getInstance().send(requestData);
    }

    private requestVipDataCallBack(data:SocketData) {
        let status = data.status;
        if(status == 0){
            DebugLog.instance.error(data.message);
            const ad: AlertData = new AlertData();
            ad.title = "提示";
            ad.message = data.message;
            AlertManager.getInstance().showAlert(ad);
            return;
        }

        let results = data.data["result"];
        let len = results.length;
        for(let i:number=0;i<len;i++){
           let vipdata = new VipData();
           vipdata.refrehData(results[i]);
           this.vipDatas.push(vipdata);
        }
        EventManager.getInstance().emit(VipEvent.VIP_DATA_UPDATED, {
            vipDatas: this.vipDatas,
            vipModel: this
        });
    }

    /**
     * 开通会员
     */
    requestOpenVip() {
        // 模拟开通成功后派发事件
        setTimeout(() => {
            EventManager.getInstance().emit(VipEvent.VIP_OPEN_SUCCESS, {
                success: true,
                vipModel: this
            });
            EventManager.getInstance().emit(VipEvent.VIP_PERMISSION_CHANGED, {
                hasVip: true,
                vipModel: this
            });
        }, 100);
    }

    /**
     * 续费会员
     */
    requestRenewalVip() {
        // 模拟续费成功后派发事件
        setTimeout(() => {
            EventManager.getInstance().emit(VipEvent.VIP_RENEWAL_SUCCESS, {
                success: true,
                vipModel: this
            });
        }, 100);
    }

    clearData() {
        // VipModel本身不需要清理事件，因为使用的是EventManager
        // 但可以在这里清理数据
        this.vipDatas = [];
        this.vipAddresses = [];
        this.defaultAddress = null;
    }

    /**
     * 销毁时清理
     */
    destroy() {
        this.clearData();
    }
}
import { StringUtil } from "../../Core/Util/StringUtil";
import { TimeUtil } from "../../Core/Util/TimeUtil";
import { PersonalCenterManager } from "./PersonalCenterManager";

export class UserInfoData {
    public id: string = "";
    public nickname: string = "";
    public gender: number = 0;
    public full_name: string = "";
    public mp_no: string = "";
    public is_invited: boolean;
    public birthday: string = "";
    public education: string = "";
    public trained_days: number = 0;
    /**
     * 是否完成初测  false 没完成  true 完成
     */
    public has_initial_tier:boolean = false;
    public is_org_user:boolean = false;
    public is_member: boolean;
    public member_startTime: string = "";
    public member_endTime: string = "";
    public member_Expired: boolean = false;
    
    // 首页配置缓存
    public indexPageConfigCache: any = null;
    public indexPageConfigCacheTime: number = 0; // 缓存时间戳
    

    constructor(data) {
        this.id = data["id"];
        this.nickname = data["nickname"];
        this.gender = data["gender"];
        this.full_name = data["full_name"];
        this.mp_no = data["mp_no"];
        this.is_invited = data["is_invited"];
        this.birthday = data["birthday"];
        this.education = data["education"];
        this.trained_days = data["trained_days"];
        this.has_initial_tier = data["has_initial_tier"];
        this.is_member = data["is_member"];
        this.is_org_user = data["is_org_user"];
        if(data["member"]){
            this.member_startTime = data["member"]["start_at"];
            this.member_endTime = data["member"]["expired_at"];
        }


        // 判断会员是否过期
        this.checkMemberExpired();
    }

    /**
     * 更新用户信息数据
     * @param newData 新的数据对象
     */
    public updateData(newData: any): void {

        // 更新所有字段
        if (newData["id"] !== undefined) this.id = newData["id"];
        if (newData["nickname"] !== undefined) this.nickname = newData["nickname"];
        if (newData["gender"] !== undefined) this.gender = newData["gender"];
        if (newData["full_name"] !== undefined) this.full_name = newData["full_name"];
        if (newData["mp_no"] !== undefined) this.mp_no = newData["mp_no"];
        if (newData["is_invited"] !== undefined) this.is_invited = newData["is_invited"];
        if (newData["birthday"] !== undefined) this.birthday = newData["birthday"];
        if (newData["education"] !== undefined) this.education = newData["education"];
        if (newData["trained_days"] !== undefined) this.trained_days = newData["trained_days"];
        if (newData["has_initial_tier"] !== undefined) this.has_initial_tier = newData["has_initial_tier"];
        if (newData["is_member"] !== undefined) this.is_member = newData["is_member"];
        if (newData["is_org_user"] !== undefined) this.is_org_user = newData["is_org_user"];

        // 更新会员信息
        if (newData["member"]) {
            if (newData["member"]["start_at"] !== undefined) {
                this.member_startTime = newData["member"]["start_at"];
            }
            if (newData["member"]["expired_at"] !== undefined) {
                this.member_endTime = newData["member"]["expired_at"];
            }
        }
        
        // 更新首页配置缓存
        if (newData["indexPageConfigCache"] !== undefined) {
            this.indexPageConfigCache = newData["indexPageConfigCache"];
        }
        if (newData["indexPageConfigCacheTime"] !== undefined) {
            this.indexPageConfigCacheTime = newData["indexPageConfigCacheTime"];
        }

        // 重新检查会员过期状态
        this.checkMemberExpired();
        // 通知PersonalCenterManager数据已更新
        this.notifyDataChanged();
    }

    /**
     * 设置首页配置缓存
     * @param config 配置数据
     */
    public setIndexPageConfigCache(config: any): void {
        this.indexPageConfigCache = config;
        this.indexPageConfigCacheTime = Date.now();
        this.notifyDataChanged();
    }

    /**
     * 获取首页配置缓存
     * @param maxAge 最大缓存时间（毫秒），默认24小时
     * @returns 配置数据或null
     */
    public getIndexPageConfigCache(maxAge: number = 24 * 60 * 60 * 1000): any {
        if (!this.indexPageConfigCache || !this.indexPageConfigCacheTime) {
            return null;
        }
        
        const now = Date.now();
        if (now - this.indexPageConfigCacheTime > maxAge) {
            // 缓存过期，清除缓存
            this.indexPageConfigCache = null;
            this.indexPageConfigCacheTime = 0;
            return null;
        }
        
        return this.indexPageConfigCache;
    }

    /**
     * 清除首页配置缓存
     */
    public clearIndexPageConfigCache(): void {
        this.indexPageConfigCache = null;
        this.indexPageConfigCacheTime = 0;
        this.notifyDataChanged();
    }

    /**
     * 通知PersonalCenterManager数据已变化
     */
    private notifyDataChanged(): void {
        // 触发数据变化事件，让PersonalCenterManager知道数据已更新
        PersonalCenterManager.getInstance().onUserInfoDataChanged(this);
    }

    /**
     * 检查会员是否过期
     * 判断当前时间是否在 member_startTime 和 member_endTime 之间
     */
    private checkMemberExpired(): void {
        if (!this.is_member || !this.member_startTime || !this.member_endTime) {
            this.member_Expired = true;
            return;
        }

        try {
            // 获取当前时间
            const now = new Date();
            const currentDateStr = StringUtil.formatDate(now);

            // 转换时间字符串为Date对象进行比较
            const startDate = TimeUtil.changeStrToTime(this.member_startTime.toString());//new Date(this.member_startTime.toString());
            const endDate = TimeUtil.changeStrToTime(this.member_endTime.toString());//new Date(this.member_endTime.toString());
            const currentDate = TimeUtil.changeStrToTime(currentDateStr)

            // 判断当前时间是否在会员有效期内
            this.member_Expired = !(currentDate >= startDate && currentDate <= endDate);

        } catch (error) {
            console.error("检查会员过期状态时出错:", error);
            this.member_Expired = true;
        }
    }


    /**
     * 获取会员剩余天数
     */
    public getMemberRemainingDays(): number {
        if (!this.is_member || this.member_Expired || !this.member_endTime) {
            return 0;
        }

        try {
            const now = new Date();
            const endDate = new Date(this.member_endTime.toString());
            const diffTime = endDate.getTime() - now.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return Math.max(0, diffDays);
        } catch (error) {
            console.error("计算会员剩余天数时出错:", error);
            return 0;
        }
    }
}

export class ReportChartData {
    public cog_ability: String = "";
    public cog_ability_desc: String = "";
    public score: Number = 0;
    public age_group_percentile: Number = 0;
    constructor(data) {
        this.cog_ability = data["cog_ability"];
        this.cog_ability_desc = data["cog_ability_desc"];
        this.score = data["score"];
        this.age_group_percentile = data["age_group_percentile"];
    }
}







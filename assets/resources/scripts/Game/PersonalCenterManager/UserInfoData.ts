import { StringUtil } from "../../Core/Util/StringUtil";
import { TimeUtil } from "../../Core/Util/TimeUtil";

export class UserInfoData {
    public id: String = "";
    public nickname: String = "";
    public gender: Number = 0;
    public full_name: String = "";
    public mp_no: String = "";
    public is_invited: Boolean;
    public birthday: String = "";
    public education: String = "";
    public trained_days: number = 0;
    public has_initial_tier:boolean = false;
    public member: Boolean;
    public member_startTime: String = "";
    public member_endTime: String = "";
    public member_Expired: boolean = false;

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
        this.member = data["is_member"];
        this.member_startTime = data["member_startTime"]||undefined;
        this.member_endTime = data["member_endTime"]||undefined;

        // 判断会员是否过期
        this.checkMemberExpired();
    }

    /**
     * 检查会员是否过期
     * 判断当前时间是否在 member_startTime 和 member_endTime 之间
     */
    private checkMemberExpired(): void {
        if (!this.member || !this.member_startTime || !this.member_endTime) {
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
        if (!this.member || this.member_Expired || !this.member_endTime) {
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







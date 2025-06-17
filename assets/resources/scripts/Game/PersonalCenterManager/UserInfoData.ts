
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







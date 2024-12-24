
export class UserInfoData{
    public id:String = "";
    public nickname:String = "";
    public gender:Number = 0;
    public full_name:String = "";
    public mp_no:String = "";
    public is_invited:Boolean ;
    public birthday:String = "";
    
    refrehData(data: any) {
        this.id = data["id"];
        this.nickname = data["nickname"];
        this.gender = data["gender"];
        this.full_name=data["full_name"];
        this.mp_no = data["mp_no"];
        this.is_invited = data["is_invited"];
        this.birthday = data["birthday"];
    }
}




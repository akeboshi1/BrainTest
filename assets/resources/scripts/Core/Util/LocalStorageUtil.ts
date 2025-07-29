export class LocalStorageUtil {
    static set(key:LocalStorageKeyEnum,value:string){
        localStorage.setItem(key,value);
    }

    static get(key:LocalStorageKeyEnum):string{
        return localStorage.getItem(key);
    }

    static remove(key:LocalStorageKeyEnum){
        localStorage.removeItem(key);
    }

    static clean(){
        // localStorage.clear();
        localStorage.removeItem(LocalStorageKeyEnum.USER_TOKEN);
        localStorage.removeItem(LocalStorageKeyEnum.USER_TOKEN_EXPIREDTIME);
        localStorage.removeItem(LocalStorageKeyEnum.USER_PHONENUM);
        localStorage.removeItem(LocalStorageKeyEnum.USER_DEFAULT_LOGIN_STATUS);
    }
    

}


export enum LocalStorageKeyEnum {
    USER_TOKEN = "user.token",
    USER_TOKEN_EXPIREDTIME = "user.token.EXPIREDTIME",
    USER_PHONENUM = "user.phonenum",
    USER_DEFAULT_LOGIN_STATUS = "0",//0：默认验证码登录，1：默认机构登录
    INSTITUTION_CODE = "user.institutionCode",
    IS_FIRST_LOGIN = "user.isFirstLogin"
}
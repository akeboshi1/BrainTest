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
        localStorage.clear();
    }
    

}


export enum LocalStorageKeyEnum {
    USER_TOKEN = "user.token",
    USER_TOKEN_EXPIREDTIME = "user.token.EXPIREDTIME",
    USER_PHONENUM = "user.phonenum",
    USER_DEFAULT_LOGIN_STATUS = "0",//0：默认验证码登录，1：默认机构登录
    INSTITUTION_CODE = "user.institutionCode",
    IS_FIRST_LOGIN = "user.isFirstLogin",
    IS_PRE_PUBLISH_TEST = "app.isPrePublishTest",
    ORGANIZATION_TOKEN = "user.organizationToken",
    ORGANIZATION_TOKEN_EXPIREDTIME = "user.organizationToken.EXPIREDTIME",
    ORGANIZATION_NAME = "user.organizationName",
    GAME_STATE = "game.state",
    PENDING_REQUESTS = "game.pendingRequests",
    VIP_XIEYI = "user.vipXieyi",
}
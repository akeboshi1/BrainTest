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
}
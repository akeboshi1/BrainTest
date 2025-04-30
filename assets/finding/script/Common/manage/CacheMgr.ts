import Global from "../FindingGlobal";

class CachesMgr {
    private static instance: CachesMgr;
    private cache: Map<string, any> = new Map();

    constructor() {
        let string = Object.keys(this)
        for (let i = 0; i < string.length; i++) {
            if (string[i][0] != "_") {
                continue
            }
            this.getData(string[i])
        }
    }

    public static getInstance(): CachesMgr {
        if (!CachesMgr.instance) {
            CachesMgr.instance = new CachesMgr();
        }
        return CachesMgr.instance;
    }

    private _userId: number = 0;
    private _checkpoint: number = 0;  //关卡
    private _gold: number = 0; //金币
    private _diamond: number = 0; //钻石
    private _stamina: number = 20;

    private _user_code: string = "";
    private _openId: string = "";

    private _lastTimeLogin: number = 0;
    private _hit: any[] = [] //提示字符串
    private _userInfo: any = null;
    private _newUser: boolean = false;

    public nowCheckPoint: number = - 1 ;

    private _isNeedHint: boolean = true;
    private _isAuth: boolean = false;   // 玩家是否授权

    private _addTime: number = 0;
    private _hint: number = 0;
    private _signInCount: number = 0;
    private _currTimestamp: number = null;

    private _setting: CustomData = {
        hintNum: 5,
        setting: {
            music: 1,
            audio: 1,
            vibrate: 1,
        }
    }

    get signInCount(): number {
        return this._signInCount;
    }

    set signInCount(value: number){
        this.saveData("_signInCount", value);
        this._signInCount = value;
    }

    get currTimestamp(): number{
        return this._currTimestamp;
    }

    set currTimestamp(value: number){
        this.saveData("_currTimestamp", value);
        this._currTimestamp = value;
    }

    get addTime(): number {
        return this._addTime;
    }

    set addTime(value: number) {
        this.saveData("_addTime", value);
        this._addTime = value;
    }

    get hint(): number {
        return this._hint;
    }

    set hint(value: number) {
        this.saveData("_hint", value);
        this._hint = value;
    }

    get isNeedHint(): boolean {
        return this._isNeedHint;
    }

    set isNeedHint(value: boolean) {
        this._isNeedHint = value;
        this.saveData("_isNeedHint", value, false);
    }

    get isAuth(): boolean {
        return this._isAuth;
    }

    set isAuth(value: boolean) {
        this.saveData("_isAuth", value, false);
        this._isAuth = value;
    }

    get userId(): number {
        return this._userId;
    }

    set userId(value: number) {
        this.saveData("_userId", value, false);
        this._userId = value;
    }

    get setting(): CustomData {
        return this._setting;
    }

    set setting(value: CustomData) {
        this.saveData("_setting", value)
        this._setting = value;
    }

    get userInfo(): any {
        return this._userInfo;
    }

    set userInfo(value: any) {
        this.saveData("_userInfo", value, false)
        this._userInfo = value;
    }

    get newUser(): boolean {
        return this._newUser;
    }

    set newUser(value: boolean) {
        this.saveData("_newUser", value, false)
        this._newUser = value;
    }

    get hit(): any[] {
        return this._hit;
    }

    set hit(value: any[]) {
        this.saveData("_hit", value, false)
        this._hit = value;
    }

    get lastTimeLogin(): number {
        return this._lastTimeLogin;
    }

    set lastTimeLogin(value: number) {
        this.saveData("_lastTimeLogin", value, false)
        this._lastTimeLogin = value;
    }

    get stamina(): number {
        return this._stamina;
    }

    set stamina(value: number) {
        if (value > Global.config.gameInfo.maxStamina) {
            this._stamina = Global.config.gameInfo.maxStamina;
        } else {
            this._stamina = value;
        }
        this.saveData("_stamina", this._stamina);
    }

    get checkpoint(): number {
        return Number(this._checkpoint);
    }

    public hard:number=1;

    set checkpoint(value: number) {
        this._checkpoint = value;
    }


    get user_code(): string {
        return this._user_code;
    }

    set user_code(value: string) {
        this.saveData("_user_codes", value, false)
        this._user_code = value;
    }

    get openId(): string {
        return this._openId;
    }

    set openId(value: string) {
        this.saveData("_openId", value, false)
        this._openId = value;
    }

    private saveData(key: string, value: any, isSend: boolean = true) {
        this.cache.set(key, value);
    }

    private getData(key: string): boolean {
        let result = true;
        if (!this.cache.has(key)) {
            result = false;
            this.saveData(key, this[key], false);
            return result;
        }
        this[key] = this.cache.get(key);
        return result;
    }

    private _strMapToObj(strMap) {
        let obj = Object.create(null);
        strMap.forEach((v, k) => {
            obj[k] = v;
        })
        return obj;
    }

    /**
     *map转换为json
     */
    private _mapToJson(map) {
        return JSON.stringify(this._strMapToObj(map));
    }

    private _objToStrMap(obj) {
        let strMap = new Map();
        for (let k of Object.keys(obj)) {
            strMap.set(k, obj[k]);
        }
        return strMap;
    }

    /**
     *json转换为map
     */
    private _jsonToMap(jsonStr) {
        return this._objToStrMap(JSON.parse(jsonStr));
    }

    /**
     * @private 同步信息到服务端
     */
    public updateData() {
        let data = {
            checkpoint: this._checkpoint,
            diamond: this._diamond,
            gold: this._gold,
            setting: JSON.stringify(this._setting),
            stamina: this.stamina,
            userId: this.userId
        }
    }

    public clear(): void {
        this.cache.clear();

        this._userId = 0;
        this._checkpoint = 0;
        this._gold = 0;
        this._diamond = 0;
        this._stamina = 20;
        this._user_code = "";
        this._openId = "";
        this._lastTimeLogin = 0;
        this._hit = [];
        this._userInfo = null;
        this._newUser = false;
        this.nowCheckPoint = -1;
        this._isNeedHint = true;
        this._isAuth = false;
        this._addTime = 0;
        this._hint = 0;
        this._signInCount = 0;
        this._currTimestamp = null;
        this._setting = {
            hintNum: 5,
            setting: {
                music: 1,
                audio: 1,
                vibrate: 1,
            }
        };

        const properties = Object.keys(this).filter(key => key.startsWith('_'));
        properties.forEach(key => {
            this.saveData(key, this[key], false);
        });

        console.log('找茬缓存数据已清理完成');
    }

    public getCache(key: string): any {
        return this.cache.get(key);
    }

    public setCache(key: string, value: any): void {
        this.cache.set(key, value);
    }

    public deleteCache(key: string): boolean {
        return this.cache.delete(key);
    }

    public hasCache(key: string): boolean {
        return this.cache.has(key);
    }

    public getCacheKeys(): string[] {
        return Array.from(this.cache.keys());
    }

    public getCacheValues(): any[] {
        return Array.from(this.cache.values());
    }
}

export default CachesMgr.getInstance();

interface Setting {
    music: number,  // 音乐音量大小 0 -1
    audio: number,  // 音效音量大小
    vibrate: number // 是否震动
}

interface CustomData {
    hintNum: number  //免费提示数据
    setting: Setting
}

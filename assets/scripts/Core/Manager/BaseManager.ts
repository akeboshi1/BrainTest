import {DebugLog} from "../../Core/Util/DebugLog";

export class BaseManager {

    protected maps:{[key:string]:object};

    constructor() {
    }
    public init(){
        this.maps = {};
    }

    set(key:string,value:object){
        this.maps[key]=value;
        DebugLog.instance.log(this.maps[key]);
    }

    get(key:string) {
        return this.maps[key];
    }

    has(key:string) {
        return key in this.maps;
    }

    delete(key: string) {
        delete this.maps[key];
    }

    update(){

    }

    destory(){
       this.maps={};
    }
}
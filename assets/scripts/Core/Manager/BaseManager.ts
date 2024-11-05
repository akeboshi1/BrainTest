import {BasePanel} from "db://assets/scripts/Core/UI/BasePanel";

export class BaseManager {

    protected maps:{[key:string]:BasePanel};

    constructor() {
    }
    public init(){
        this.maps = {};
    }

    set(key:string,value:BasePanel){
        this.maps[key]=value;
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
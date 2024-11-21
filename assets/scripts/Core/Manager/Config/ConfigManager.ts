
import {loader,JsonAsset,TextAsset} from "cc";
import {BaseManager} from "../BaseManager";
import {DebugLog} from "../../../Core/Util/DebugLog";

export class ConfigManager extends BaseManager {
    private bInit: boolean = false; //是否加载完毕

    private static _instance: ConfigManager = null;

    public static getInstance() {
        if (!this._instance) {
            this._instance = new ConfigManager();
        }
        return this._instance;
    }


    async loadConfig() {
        if (this.bInit) return;

        this.bInit = true;
        DebugLog.instance.log("配置加载完成")
    }


    async loadJson(filepath:string) :Promise<any>{
        return new Promise((resolve, reject) => {
            type kv = { key: string, value: string };
            loader.loadRes("config/" + filepath, JsonAsset, (err, conf: JsonAsset) => {
                if (err) {
                    DebugLog.instance.error(err)
                    reject();
                    return;
                }
                resolve(conf.json);
            })
        })
    }


    async readConfig (filepath: string, c: any) :Promise<any> {
        return new Promise((resolve, reject) => {
            type kv = { key: string, value: string };
            loader.loadRes("config/" + filepath, TextAsset, (err, conf: TextAsset) => {
                if (err) {
                    DebugLog.instance.error(err)
                    reject();
                    return;
                }

                var arr = conf.text.split("\r\n");
                var templatestr = arr[1].split(",");
                var template: Array<kv> = [];

                for (var i = 0; i < templatestr.length; ++i) {
                    var tmp = templatestr[i].split(":");
                    if (tmp.length == 2)
                        template.push({ key: tmp[0], value: tmp[1] });
                    else
                        template.push({ key: "key" + i, value: "string" });
                }

                var items = [];
                for (var i = 2; i < arr.length; ++i) {
                    if (arr[i] != "") {
                        var datas = arr[i].split(",");
                        var item = new c();
                        for (var j = 0; j < datas.length; ++j) {
                            var value: any = datas[j];
                            // DebugLog.instance.log(i,j)
                            switch (template[j].value) {
                                case "number":
                                    value = Number(value);
                                    break;
                                case "string":
                                    value = value.trim();
                                    break;
                                case "boolean":
                                    value = Number(value) == 1;
                                    break;
                                case "table":
                                    value = value.split(":");
                                    break;
                                case "inttable":
                                    value = value.split(":");
                                    for (var v = 0; v < value.length; ++v) {
                                        value[v] = Number(value[v]);
                                    }
                                    break;
                                case "lnumber"://大数据处理
                                    value = Number(value);
                                    break
                            }
                            item[template[j].key] = value;
                        }
                        items.push(item);
                    }
                }
                resolve(items);
            })
        })
    }

}


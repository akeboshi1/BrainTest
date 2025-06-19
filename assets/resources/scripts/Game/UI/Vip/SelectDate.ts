import { _decorator, Component, Node, find } from 'cc';
import { ScrollViewExt } from './ScrollViewExt';
const { ccclass, property } = _decorator;

// 城市数据定义
const cityArr = ['北京市', '上海市', '广东省', '浙江省'];

const curCityArr = {
    '北京市': ['北京市'],
    '上海市': ['上海市'], 
    '广东省': ['广州市', '深圳市', '珠海市', '东莞市', '佛山市'],
    '浙江省': ['杭州市', '宁波市', '温州市', '嘉兴市', '湖州市', '绍兴市', '金华市', '台州市']
};

const placeArr = {
    '北京市': ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区', '通州区', '昌平区', '大兴区', '房山区'],
    '上海市': ['黄浦区', '静安区', '徐汇区', '长宁区', '普陀区', '虹口区', '杨浦区', '宝山区', '闵行区', '嘉定区'],
    '广州市': ['荔湾区', '越秀区', '海珠区', '天河区', '白云区', '黄埔区', '番禺区', '花都区', '南沙区', '从化区', '增城区'],
    '深圳市': ['罗湖区', '福田区', '南山区', '宝安区', '龙岗区', '盐田区', '龙华区', '坪山区', '光明区', '大鹏新区'],
    '珠海市': ['香洲区', '斗门区', '金湾区', '横琴新区', '保税区', '高新区', '万山区'],
    '东莞市': ['莞城街道', '南城街道', '东城街道', '万江街道', '石碣镇', '石龙镇', '茶山镇', '石排镇', '企石镇', '横沥镇'],
    '佛山市': ['禅城区', '南海区', '顺德区', '高明区', '三水区'],
    '杭州市': ['上城区', '拱墅区', '西湖区', '滨江区', '萧山区', '余杭区', '临平区', '钱塘区', '富阳区', '临安区'],
    '宁波市': ['海曙区', '江北区', '北仑区', '镇海区', '鄞州区', '奉化区', '余姚市', '慈溪市', '宁海县', '象山县'],
    '温州市': ['鹿城区', '龙湾区', '瓯海区', '洞头区', '永嘉县', '平阳县', '苍南县', '文成县', '泰顺县', '瑞安市', '乐清市'],
    '嘉兴市': ['南湖区', '秀洲区', '嘉善县', '海盐县', '海宁市', '平湖市', '桐乡市'],
    '湖州市': ['吴兴区', '南浔区', '德清县', '长兴县', '安吉县'],
    '绍兴市': ['越城区', '柯桥区', '上虞区', '新昌县', '诸暨市', '嵊州市'],
    '金华市': ['婺城区', '金东区', '武义县', '浦江县', '磐安县', '兰溪市', '义乌市', '东阳市', '永康市'],
    '台州市': ['椒江区', '黄岩区', '路桥区', '三门县', '天台县', '仙居县', '温岭市', '临海市', '玉环市']
};

@ccclass('SelectDate')
export class SelectDate extends Component {
    @property(ScrollViewExt)
    provinceSelect: ScrollViewExt = null;
    @property(ScrollViewExt)
    citySelect: ScrollViewExt = null;
    @property(ScrollViewExt)
    districtSelect: ScrollViewExt = null;

    callback: (province: string, city: string, district: string) => void;

    private _nodes: Nodes = null;
    private _province: string = '';
    private _provinceIdx: number = 0;

    private _city: string = '';
    private _cityIdx: number = 0;

    private _district: string = '';
    private _districtIdx: number = 0;

    onLoad() {
        this._nodes = new Nodes(this.node);

        this.initMember();

        if (this.provinceSelect) {
            this.provinceSelect.dataList = cityArr.slice();
            this.provinceSelect.callback = (idx: number, data: Array<string>) => { this.onProvinceChanged(idx, data); }
        }

        // 初始化城市和区县选择器
        this.updateCityList();
        this.updateDistrictList();

        if (this._nodes.nodeMask) {
            this._nodes.nodeMask.on(Node.EventType.TOUCH_END, () => {
                this.onClose();
            })
        }
    }

    private initMember() {
        this._province = cityArr[0];
        this._provinceIdx = 0;

        this._city = curCityArr[this._province][0];
        this._cityIdx = 0;

        this._district = placeArr[this._city][0];
        this._districtIdx = 0;
    }

    private onProvinceChanged(idx: number, data: Array<string>) {
        this._province = data[idx];
        this._provinceIdx = idx;

        this.updateCityList();
    }

    private onCityChanged(idx: number, data: Array<string>) {
        this._city = data[idx];
        this._cityIdx = idx;

        this.updateDistrictList();
    }

    private onDistrictChanged(idx: number, data: Array<string>) {
        this._district = data[idx];
        this._districtIdx = idx;
    }

    private updateCityList() {
        // 更新城市列表
        const cities = curCityArr[this._province];
        
        // 确保城市选择器有回调函数
        if (this.citySelect) {
        this.citySelect.dataList = cities.slice();
            this.citySelect.callback = (idx: number, data: Array<string>) => { this.onCityChanged(idx, data); };
        }
        
        // 重置城市选择
        this._city = cities[0];
        this._cityIdx = 0;
        
        this.updateDistrictList();
    }

    private updateDistrictList() {
        // 更新行政区列表
        const districts = placeArr[this._city];
        
        // 确保区县选择器有回调函数
        if (this.districtSelect) {
        this.districtSelect.dataList = districts.slice();
            this.districtSelect.callback = (idx: number, data: Array<string>) => { this.onDistrictChanged(idx, data); };
        }
        
        // 重置行政区选择
        this._district = districts[0];
        this._districtIdx = 0;
    }

    private onClose() {
        this.callback && this.callback(this._province, this._city, this._district);
        this.node.active = false;
    }

    /**
     * 获取当前选择的地址信息
     * @returns 拼接后的地址字符串
     */
    getCurrentAddress(): string {
        return `${this._province} ${this._city} ${this._district}`;
    }

    /**
     * 获取当前选择的详细信息
     * @returns 包含省市区信息的对象
     */
    getCurrentSelection(): { province: string, city: string, district: string } {
        return {
            province: this._province,
            city: this._city,
            district: this._district
        };
    }

    scrollToSelection(option: string) {
        const parts = option.split("-");
        if (parts.length >= 3) {
            const province = parts[0];
            const city = parts[1];
            const district = parts[2];
            
            const pi = cityArr.indexOf(province);
            if (pi >= 0) {
                this.provinceSelect.scrollToSelection(pi);
                
                const cities = curCityArr[province];
                const ci = cities.indexOf(city);
                if (ci >= 0) {
                    this.citySelect.scrollToSelection(ci);
                    
                    const districts = placeArr[city];
                    const di = districts.indexOf(district);
                    if (di >= 0) {
                        this.districtSelect.scrollToSelection(di);
                    }
                }
            }
        }
    }
}

class Nodes {
    nodeMask: Node = null;

    constructor(node: Node) {
        this.nodeMask = find('mask', node);
    }
}


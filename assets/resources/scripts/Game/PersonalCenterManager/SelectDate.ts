
import { _decorator, Component, Node, find } from 'cc';
import { ScrollViewExt } from './ScrollViewExt';
const { ccclass, property } = _decorator;

let yearArr = [];
const monthArr = ['01月','02月','03月','04月','05月','06月','07月','08月','09月','10月','11月','12月'];
const dayArr = ['01日','02日','03日','04日','05日','06日','07日','08日','09日','10日','11日','12日','13日','14日','15日','16日','17日','18日','19日','20日','21日','22日','23日','24日','25日','26日','27日','28日','29日','30日','31日'];

@ccclass('SelectDate')
export class SelectDate extends Component {
    @property
    MaxYearCnt:number = 70;
    @property(ScrollViewExt)
    yearSelect:ScrollViewExt = null;
    @property(ScrollViewExt)
    monthSelect:ScrollViewExt = null;
    @property(ScrollViewExt)
    daySelect:ScrollViewExt = null;

    callback: (year:string, month:string, day:string) => void;

    private _nodes:Nodes = null;
    private _year:string = '';
    private _yearIdx:number = 0;

    private _month:string = '';
    private _monthIdx:number = 0;

    private _day:string = '';
    private _dayIdx:number = 0;

    onLoad(){
        this._nodes = new Nodes(this.node);

        this.initMember();

        if(this.yearSelect){
            this.yearSelect.dataList = yearArr.slice();
            this.yearSelect.callback = (idx:number, data:Array<string>) => { this.onYearChanged(idx, data); }
        }

        if(this.monthSelect){
            this.monthSelect.dataList = monthArr.slice();
            this.monthSelect.callback = (idx:number, data:Array<string>) => { this.onMonthChanged(idx, data); };
        }

        if(this.daySelect){
            this.daySelect.dataList = dayArr.slice();
            this.daySelect.callback = (idx:number, data:Array<string>) => { this.onDayChanged(idx, data);};
        }

        if(this._nodes.nodeMask){
            this._nodes.nodeMask.on(Node.EventType.TOUCH_END, () => {                
                this.onClose();
            })
        }
    }

    private initMember(){
        let date = new Date(1990,0,1);
        let curYear = date.getFullYear();
        yearArr = [];
        for(let i = 0; i < this.MaxYearCnt; i++){
            yearArr.unshift(`${curYear - i}年`);
        }

        this._year = yearArr[0];
        this._yearIdx = 0;

        this._month = monthArr[0];
        this._monthIdx = 0;

        this._day = dayArr[0];
        this._dayIdx = 0;
    }

    private onYearChanged(idx:number, data:Array<string>){
        this._year = data[idx];
        this._yearIdx = idx;

        this.checkMonth();
    }

    private onMonthChanged(idx:number, data:Array<string>){
        this._month = data[idx];
        this._monthIdx = idx;

        this.checkDay();
    }

    private onDayChanged(idx:number, data:Array<string>){
        this._day = data[idx];
        this._dayIdx = idx;
    }

    private checkDay(){
        let date = new Date();
        let curYear = date.getFullYear();
        let curMonth = date.getMonth() + 1;
        let curDate = date.getDate();

        let year = curYear - this.MaxYearCnt + this._yearIdx + 1;
        let month = this._monthIdx + 1;

        let len = 31;
        if([1,3,5,7,8,10,12].indexOf(month) != -1){
            len = 31;
        }else if([4,6,9,11].indexOf(month) != -1){
            len = 30;
        }else{
            if(year % 4 == 0 && year % 100 != 0 || year % 400 == 0){
                len = 29;
            }else{
                len = 28;
            }
        }

        if(year == curYear && month == curMonth){
            if(len > curDate){
                len = curDate;
            }
        }
        
        this.daySelect.dataList = len < 31? dayArr.slice(0, len - 31): dayArr.slice(0);
    }

    private checkMonth(){
        let date = new Date();
        let curYear = date.getFullYear();
        let curMonth = date.getMonth() + 1;

        let year = curYear - this.MaxYearCnt + this._yearIdx + 1;

        let len = 12;
        if(year == curYear){
            if(curMonth < len){
                len = curMonth
            }
        }
        
        this.monthSelect.dataList = len < 12? monthArr.slice(0, len - 12): monthArr.slice(0);
    }

    private onClose(){
        this.callback && this.callback(this._year.substring(0, this._year.length - 1), this._month.substring(0, this._month.length - 1), this._day.substring(0, this._day.length - 1));
        this.node.active = false;
    }

    scrollToSelection(option:string){
        let yi = yearArr.indexOf(option.split("-")[0]+"年");
        let mi = monthArr.indexOf(option.split("-")[1]+"月");
        let di = dayArr.indexOf(option.split("-")[2]+"日");
        this.yearSelect.scrollToSelection(yi);
        this.monthSelect.scrollToSelection(mi);
        this.daySelect.scrollToSelection(di);
    }
}

class Nodes {
    nodeMask:Node = null;

    constructor(node:Node){
        this.nodeMask = find('mask', node);
    }
}

